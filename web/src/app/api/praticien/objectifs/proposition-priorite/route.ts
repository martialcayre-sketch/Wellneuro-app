import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import { MESSAGE_DOSSIER_CLOS, RAISON_DOSSIER_CLOS, accepteNouvelEnvoi } from '@/lib/patient/cycleDeVie';
import { isDossierDeuxVoixEnabled } from '@/lib/patient/featureFlag';
import { lireMatierePriorite } from '@/lib/objectif/matierePriorite';
import { VERSION_CONSIGNE, proposerPriorite } from '@/lib/objectif/propositionPriorite';

/**
 * LA PROPOSITION DE PRIORITÉ — `D-167` §3 et §11.
 *
 * DEUX VERBES, DEUX GESTES DIFFÉRENTS, et il faut les tenir séparés :
 *
 *   - `GET` LIT ce qui existe déjà et N'APPELLE JAMAIS le modèle. Ouvrir un
 *     cockpit ne doit rien coûter et ne doit pas faire parler la machine la
 *     première (`D-167` §3 amendé : l'appel part sur un GESTE) ;
 *   - `POST` PRODUIT un tirage. C'est le bouton « Proposer une priorité », et
 *     c'est aussi le bouton « une autre » : le second écrit une ligne de plus,
 *     de rang suivant, il n'écrase rien.
 *
 * CE QUE `GET` REND QUAND IL N'Y A RIEN À RENDRE. Jamais un silence : `D-167`
 * §3 exige qu'une ligne DISE ce qui manque, et §15 rappelle pourquoi — un écran
 * qui affirme une cause qu'il n'a pas vérifiée est le défaut corrigé deux fois
 * le 2026-09-10. La réponse distingue donc « aucune synthèse validée »,
 * « aucun dépôt patient » et « rien n'a encore été proposé ».
 *
 * LA PROPOSITION EST FIGÉE, ET C'EST `GET` QUI LE REND VRAI. Un modèle n'est pas
 * déterministe : sans cette lecture, un rechargement rendrait une phrase
 * différente. Le tirage servi est le DERNIER pour le couple de sources courant
 * et la version de consigne courante — un couple qui change ne correspond à
 * rien, et le champ revient vide avec son bouton (`D-167` §12 : aucun écran
 * « périmée », le cas est rendu inatteignable par la cadence de `D-166`).
 */

const ROUTE_JOURNAL = '/api/praticien/objectifs/proposition-priorite';
const ID_PATIENT_PATTERN = /^[A-Za-z0-9_-]+$/;
const LONGUEUR_MAX_ID = 64;
const TAILLE_CORPS_MAX_OCTETS = 8 * 1024;

/** Ce qui manque, nommé — jamais deviné. */
export type ManquePriorite = 'synthese_validee' | 'depot_patient';

export type PropositionExposee = {
  texte: string;
  rang: number;
  creeLe: string;
  idSynthese: string;
  idDepot: string;
  versionConsigne: string;
};

/**
 * LA MATIÈRE CITABLE, servie avec la proposition — `D-167` §1 et §2.
 *
 * DEUX CITATIONS, ET LEUR PROVENANCE. L'énoncé se pré-remplit du dépôt patient
 * VERBATIM, la reformulation du `narratif_patient` d'une synthèse validée. Les
 * identifiants voyagent avec les textes parce que l'écriture les enregistrera :
 * une citation dont on ne peut plus nommer la source n'est plus une citation.
 *
 * ELLE PASSE PAR LE MÊME ADAPTATEUR BORNÉ que l'appel. Ajouter ici une seconde
 * lecture de `syntheses_ia` ferait une seconde frontière à garder, et c'est
 * toujours la moins relue qui laisse fuir `axes_prioritaires`.
 */
export type MatiereCitable = {
  enonce: { texte: string; idDepot: string };
  reformulation: { texte: string; idSynthese: string };
};

export type PropositionApiResponse =
  | { ok: true; etat: 'proposee'; proposition: PropositionExposee; matiere: MatiereCitable }
  | { ok: true; etat: 'aucune'; matiere: MatiereCitable }
  | { ok: true; etat: 'sources_manquantes'; manque: ManquePriorite[] }
  | { ok: false; reason: string; error: string };

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<PropositionApiResponse>({ ok: false, reason, error }, { status });
}

/**
 * Les contrôles communs aux deux verbes.
 *
 * ÉCRITS UNE FOIS. Les dupliquer entre `GET` et `POST` laisserait l'un dériver
 * de l'autre — et c'est toujours le verbe le moins relu qui garde le trou.
 */
async function porte(
  req: Request,
  methode: 'GET' | 'POST',
  idPatient: string,
): Promise<NextResponse<PropositionApiResponse> | { email: string }> {
  if (!isDossierDeuxVoixEnabled()) {
    return echec('feature_disabled', 'Cet espace n’est pas encore ouvert.', 503);
  }

  const session = await getServerSession(authOptions);
  if (!session) return echec('unauthenticated', 'Authentification requise.', 401);

  if (!idPatient || !ID_PATIENT_PATTERN.test(idPatient) || idPatient.length > LONGUEUR_MAX_ID) {
    return echec('invalid', 'Identifiant patient invalide.', 400);
  }

  const email = emailPraticien(session);
  const appartenance = await verifierAppartenancePatient(idPatient, email, {
    route: ROUTE_JOURNAL,
    methode,
  });
  if (appartenance === 'introuvable') return echec('patient_not_found', 'Patient introuvable.', 404);
  if (appartenance === 'autre_praticien') {
    return echec('forbidden', 'Patient non accessible pour ce praticien.', 403);
  }
  if (!email) return echec('unauthenticated', 'Authentification requise.', 401);

  return { email };
}

/** Ce qui manque, à partir de ce qui a été lu. */
function manques(synthese: unknown, depot: unknown): ManquePriorite[] {
  const liste: ManquePriorite[] = [];
  if (synthese === null) liste.push('synthese_validee');
  if (depot === null) liste.push('depot_patient');
  return liste;
}

// GET ?idPatient=… — lit la proposition figée. N'APPELLE JAMAIS le modèle.
export async function GET(req: Request): Promise<NextResponse<PropositionApiResponse>> {
  try {
    const idPatient = (new URL(req.url).searchParams.get('idPatient') ?? '').trim();
    const gardee = await porte(req, 'GET', idPatient);
    if (gardee instanceof NextResponse) return gardee;

    const { synthese, depot } = await lireMatierePriorite(idPatient);
    const manquants = manques(synthese, depot);
    if (manquants.length > 0) {
      return NextResponse.json<PropositionApiResponse>({
        ok: true,
        etat: 'sources_manquantes',
        manque: manquants,
      });
    }
    // Les deux sont là : le typage ne le sait pas encore, `manques` l'a prouvé.
    if (synthese === null || depot === null) {
      return echec('invalid', 'Matière incohérente.', 500);
    }

    const ligne = await prisma.propositionPrioriteIA.findFirst({
      where: {
        idPatient,
        idSynthese: synthese.idSynthese,
        idDepot: depot.idDepot,
        versionConsigne: VERSION_CONSIGNE,
      },
      orderBy: { rang: 'desc' },
      select: { texte: true, rang: true, creeLe: true },
    });
    const matiere: MatiereCitable = {
      enonce: { texte: depot.texte, idDepot: depot.idDepot },
      reformulation: { texte: synthese.narratifPatient, idSynthese: synthese.idSynthese },
    };

    if (ligne === null) {
      return NextResponse.json<PropositionApiResponse>({ ok: true, etat: 'aucune', matiere });
    }

    return NextResponse.json<PropositionApiResponse>({
      ok: true,
      etat: 'proposee',
      matiere,
      proposition: {
        texte: ligne.texte,
        rang: ligne.rang,
        creeLe: ligne.creeLe.toISOString(),
        idSynthese: synthese.idSynthese,
        idDepot: depot.idDepot,
        versionConsigne: VERSION_CONSIGNE,
      },
    });
  } catch {
    return echec('server_error', 'La proposition n’a pas pu être lue.', 500);
  }
}

// POST — produit un tirage. Bouton « Proposer », et bouton « une autre ». 201.
export async function POST(req: Request): Promise<NextResponse<PropositionApiResponse>> {
  try {
    const annonce = Number(req.headers.get('content-length') ?? '0');
    if (Number.isFinite(annonce) && annonce > TAILLE_CORPS_MAX_OCTETS) {
      return echec('payload_too_large', 'Requête trop volumineuse.', 413);
    }

    let corps: Record<string, unknown>;
    try {
      corps = (await req.json()) as Record<string, unknown>;
    } catch {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }

    const idPatient = typeof corps.idPatient === 'string' ? corps.idPatient.trim() : '';
    const gardee = await porte(req, 'POST', idPatient);
    if (gardee instanceof NextResponse) return gardee;

    const patient = await prisma.patient.findUnique({
      where: { idPatient },
      select: { actif: true, suiviClotureLe: true },
    });
    if (patient && !accepteNouvelEnvoi(patient)) {
      return echec(RAISON_DOSSIER_CLOS, MESSAGE_DOSSIER_CLOS, 409);
    }

    const { synthese, depot } = await lireMatierePriorite(idPatient);
    const manquants = manques(synthese, depot);
    if (manquants.length > 0) {
      // LES DEUX PIÈCES SONT EXIGÉES (`D-167` §3 amendé). 409 et non 400 : la
      // demande est bien formée, c'est l'état du dossier qui s'y oppose.
      return NextResponse.json<PropositionApiResponse>(
        { ok: true, etat: 'sources_manquantes', manque: manquants },
        { status: 409 },
      );
    }
    if (synthese === null || depot === null) return echec('invalid', 'Matière incohérente.', 500);

    const resultat = await proposerPriorite(synthese, depot);
    if (!resultat.ok) {
      // CHAQUE MOTIF A SA PHRASE. Les confondre ferait dire à l'écran une cause
      // qu'il n'a pas vérifiée — le défaut fermé par `D-167` §15.
      const message =
        resultat.motif === 'trop_longue'
          ? 'La proposition dépassait 200 caractères : elle a été refusée plutôt que coupée.'
          : resultat.motif === 'vide'
            ? 'Aucune formulation n’a été produite.'
            : 'La proposition n’a pas pu être produite.';
      return echec(`proposition_${resultat.motif}`, message, 502);
    }

    // LE RANG SUIVANT. Deux demandes simultanées se disputeraient le même rang ;
    // l'index unique de la table tranche, et le second appel échoue plutôt que
    // d'écraser — un tirage perdu vaut mieux qu'un tirage effacé.
    const dernier = await prisma.propositionPrioriteIA.findFirst({
      where: {
        idPatient,
        idSynthese: synthese.idSynthese,
        idDepot: depot.idDepot,
        versionConsigne: resultat.versionConsigne,
      },
      orderBy: { rang: 'desc' },
      select: { rang: true },
    });
    const rang = (dernier?.rang ?? 0) + 1;

    const ligne = await prisma.propositionPrioriteIA.create({
      data: {
        idPatient,
        idSynthese: synthese.idSynthese,
        idDepot: depot.idDepot,
        versionConsigne: resultat.versionConsigne,
        modele: resultat.modele,
        rang,
        texte: resultat.texte,
      },
      select: { texte: true, rang: true, creeLe: true },
    });

    return NextResponse.json<PropositionApiResponse>(
      {
        ok: true,
        etat: 'proposee',
        matiere: {
          enonce: { texte: depot.texte, idDepot: depot.idDepot },
          reformulation: { texte: synthese.narratifPatient, idSynthese: synthese.idSynthese },
        },
        proposition: {
          texte: ligne.texte,
          rang: ligne.rang,
          creeLe: ligne.creeLe.toISOString(),
          idSynthese: synthese.idSynthese,
          idDepot: depot.idDepot,
          versionConsigne: resultat.versionConsigne,
        },
      },
      { status: 201 },
    );
  } catch {
    return echec('server_error', 'La proposition n’a pas pu être enregistrée.', 500);
  }
}
