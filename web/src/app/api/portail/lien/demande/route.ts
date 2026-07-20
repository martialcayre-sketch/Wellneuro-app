import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isEmailValide } from '@/lib/consultation/portail';
import { isG4LienMagiqueEnabled, isG4RedemandePatientEnabled } from '@/lib/portail/featureFlag';
import {
  MESSAGE_DEMANDE_ENVOYEE,
  ORIGINE_PATIENT,
  creerJeton,
  debutFenetreDemandes,
  debutRetentionTentatives,
  delaiAvantReponse,
  empreinteJeton,
  empreinteOrigine,
  expirationDepuis,
  origineReseau,
  plafondAtteint,
  plafondIpAtteint,
} from '@/lib/portail/lienMagique';
import { attendre } from '@/lib/portail/attente';
import { buildMagicLinkUrl, sendMagicLinkEmail } from '@/lib/consultation/email';
import { logger } from '@/lib/observability/logger';
import { EVENT_CODES } from '@/lib/observability/eventCodes';
import { createRequestContext, finalizeLogContext } from '@/lib/observability/requestContext';

// POST /api/portail/lien/demande — le patient redemande un lien d'accès.
//
// Sans ce canal, un lien de 24 h enfermerait dehors quiconque le laisse
// expirer. C'est aussi ce qu'attend SP-SPI pour la reprise à plusieurs mois.
//
// LA RÉPONSE EST TOUJOURS LA MÊME — même code, même corps, ET MÊME DURÉE — que
// l'adresse corresponde ou non à un espace patient. C'est tout l'objet de la
// route : sans cela, elle deviendrait un oracle permettant d'énumérer les
// patients. Le temps compte autant que le corps : une adresse connue déclenche
// une écriture et une poignée SMTP, une inconnue ne déclenche rien, et l'écart
// se mesure.

export type DemandeLienResponse = { ok: true; message: string } | { ok: false; error: string };

/** L'unique réponse de succès. Construite une fois, renvoyée dans tous les cas. */
function reponseIndifferenciee(): NextResponse<DemandeLienResponse> {
  return NextResponse.json({ ok: true, message: MESSAGE_DEMANDE_ENVOYEE });
}

export async function POST(req: Request): Promise<NextResponse<DemandeLienResponse> | NextResponse> {
  // DEUX drapeaux, et il faut les deux. Le canal est public et non authentifié :
  // il s'ouvre séparément de l'entrée par lien magique, pour qu'allumer G4
  // n'expose pas d'emblée une surface publique sur des adresses réelles.
  if (!isG4LienMagiqueEnabled() || !isG4RedemandePatientEnabled()) {
    return new NextResponse(null, { status: 404 });
  }

  const contexte = createRequestContext(req);
  const debutMs = Date.now();

  let email = '';
  try {
    const payload = (await req.json()) as { email?: string };
    email = (payload.email ?? '').trim().toLowerCase();
  } catch {
    return NextResponse.json({ ok: false, error: 'Requête invalide.' }, { status: 400 });
  }

  // Une adresse mal formée n'est pas une tentative d'énumération : on peut le
  // dire sans rien révéler d'un patient. Ces deux sorties se distinguent déjà
  // par leur code — leur imposer le plancher ne protégerait rien.
  if (!isEmailValide(email)) {
    return NextResponse.json({ ok: false, error: 'Adresse e-mail invalide.' }, { status: 400 });
  }

  const reponse = await traiterDemande(email, req, contexte);

  // Le plancher est appliqué ici, sur le chemin de sortie unique : aucune
  // branche ne peut lui échapper, pas même la panne.
  await attendre(delaiAvantReponse(Date.now() - debutMs));
  return reponse;
}

async function traiterDemande(
  email: string,
  req: Request,
  contexte: ReturnType<typeof createRequestContext>,
): Promise<NextResponse<DemandeLienResponse>> {
  try {
    const maintenant = new Date();

    // Cadence par ORIGINE RÉSEAU, comptée avant toute lecture de patient.
    // Le plafond par patient plus bas ne borne pas l'énumération : essayer
    // mille adresses inconnues n'atteint le plafond d'aucun patient, puisqu'il
    // n'en touche aucun. C'est ce plafond-ci qui rend l'essai en masse
    // impraticable — et il compte donc les tentatives, pas les envois.
    const empreinteIp = empreinteOrigine(origineReseau(req.headers));
    await prisma.portailDemandeTentative.create({ data: { empreinteIp } });
    const tentativesRecentes = await prisma.portailDemandeTentative.count({
      where: { empreinteIp, creeLe: { gte: debutFenetreDemandes(maintenant) } },
    });

    // Purge de ce qui est sorti de la fenêtre : au-delà, une ligne ne sert plus
    // à compter, elle ne fait que conserver une origine réseau.
    await prisma.portailDemandeTentative
      .deleteMany({ where: { creeLe: { lt: debutRetentionTentatives(maintenant) } } })
      .catch(() => undefined);

    if (plafondIpAtteint(tentativesRecentes)) {
      logger.security({
        event: EVENT_CODES.PORTAIL_LIEN_DEMANDE,
        domain: 'SECURITY',
        message: 'Tentatives de demande au-delà du plafond par origine réseau',
        context: finalizeLogContext(contexte, { statusCode: 200, retryable: false }),
      });
      // Rien n'est lu, rien n'est envoyé — et la réponse ne change pas : dire
      // « trop de tentatives » confirmerait qu'on a bien compté quelque chose.
      return reponseIndifferenciee();
    }

    const patient = await prisma.patient.findUnique({
      where: { email },
      select: { idPatient: true, prenom: true, email: true, actif: true, accessTokenRevoked: true },
    });

    // Adresse inconnue, patient inactif ou portail révoqué : on sort par la
    // même porte que le succès. Aucun code, aucun mot, aucun en-tête ne diffère.
    if (!patient || !patient.actif || patient.accessTokenRevoked) {
      logger.security({
        event: EVENT_CODES.PORTAIL_LIEN_DEMANDE,
        domain: 'SECURITY',
        message: 'Demande de lien sans destinataire éligible',
        context: finalizeLogContext(contexte, { statusCode: 200, retryable: false }),
      });
      return reponseIndifferenciee();
    }

    // Cadence bornée EN BASE, pas en mémoire de processus : en serverless
    // plusieurs instances répondent, et un compteur local ne borne rien.
    const demandesRecentes = await prisma.portailMagicLink.count({
      where: {
        idPatient: patient.idPatient,
        creePar: ORIGINE_PATIENT,
        creeLe: { gte: debutFenetreDemandes(maintenant) },
      },
    });
    if (plafondAtteint(demandesRecentes)) {
      logger.security({
        event: EVENT_CODES.PORTAIL_LIEN_DEMANDE,
        domain: 'SECURITY',
        message: 'Demande de lien au-delà du plafond horaire',
        context: finalizeLogContext(contexte, { statusCode: 200, retryable: false }),
      });
      // Plafond atteint : rien n'est créé, rien n'est envoyé — et la réponse
      // reste identique, sinon elle dirait que l'adresse existe.
      return reponseIndifferenciee();
    }

    const jeton = creerJeton();
    await prisma.portailMagicLink.create({
      data: {
        idPatient: patient.idPatient,
        jetonEmpreinte: empreinteJeton(jeton),
        expireLe: expirationDepuis(maintenant),
        creePar: ORIGINE_PATIENT,
      },
    });

    try {
      await sendMagicLinkEmail(patient.email, patient.prenom, buildMagicLinkUrl(jeton));
    } catch (e) {
      // L'échec d'envoi ne change pas la réponse : la dire au patient
      // signalerait que son adresse est connue.
      console.error('[portail/lien/demande] email:', (e as Error).message);
    }

    logger.security({
      event: EVENT_CODES.PORTAIL_LIEN_DEMANDE,
      domain: 'SECURITY',
      message: 'Lien magique émis sur demande du patient',
      context: finalizeLogContext(contexte, { statusCode: 200, retryable: false }),
    });
    return reponseIndifferenciee();
  } catch (err) {
    logger.error({
      event: EVENT_CODES.PORTAIL_LIEN_DEMANDE,
      domain: 'PORTAIL_PATIENT',
      message: 'Échec du traitement d’une demande de lien',
      context: finalizeLogContext(contexte, { statusCode: 200, retryable: true }),
      error: err,
    });
    // Même en panne, la réponse ne varie pas : une 500 sur une adresse connue
    // et une 200 sur une inconnue seraient un oracle.
    return reponseIndifferenciee();
  }
}
