import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readPatientSession } from '@/lib/patient-session';
import { resolvePortailPatientFromSession } from '@/lib/consultation/portail';
import { whereEnvoiVisible } from '@/lib/documents/bilanPatient';
import { syntheseServieAuPatient } from '@/lib/praticien/syntheseComprehension';
import { isComprehensionEnabled } from '@/lib/patient/featureFlag';
import { lecturesAttendues, type EspeceLecture, type LectureAttendue } from '@/lib/portail/lecturesAttendues';
import { logger } from '@/lib/observability/logger';
import { EVENT_CODES } from '@/lib/observability/eventCodes';
import {
  createRequestContext,
  finalizeLogContext,
  withCorrelationHeader,
} from '@/lib/observability/requestContext';

/*
 * /api/portail/lectures — ce que le praticien a remis et que le patient n'a pas
 * encore ouvert.
 *
 * ── CE QUE CETTE ROUTE SERT, ET CE QU'ELLE NE SERT PAS ─────────────────────
 *
 * Elle ne sert AUCUN CONTENU. Ni le texte d'un bilan, ni celui d'une synthèse :
 * seulement une espèce, un identifiant de version et une date de remise. Le
 * contenu reste l'affaire des écrans qui le portent, avec leurs propres gardes.
 * Un fil du jour n'a pas besoin de lire ce qu'il annonce.
 *
 * ── ELLE N'A PAS DE DRAPEAU PROPRE, ET C'EST DÉLIBÉRÉ ──────────────────────
 *
 * Ajouter un septième drapeau reviendrait à garder une DEUXIÈME fois des
 * surfaces déjà gardées : `WN_COMPREHENSION` ferme la synthèse, le bilan n'a
 * jamais eu de drapeau. Ce que cette route ajoute n'est pas un accès, c'est un
 * RAPPEL d'un accès existant. Conséquence à connaître : elle entre en service
 * au déploiement, comme le fil du jour lui-même.
 *
 * En revanche l'INVARIANT du journal vaut ici mot pour mot : une surface fermée
 * par son propre drapeau ne produit AUCUNE lecture. `synthesesPubliees` passe à
 * `null` quand `WN_COMPREHENSION` est éteint, et la dérivation n'en tire rien.
 * Le fil ne peut pas devenir la porte dérobée par laquelle une synthèse atteint
 * un patient dont l'écran est clos.
 *
 * ── LA RÈGLE DE VISIBILITÉ EST EMPRUNTÉE, JAMAIS RECOPIÉE ──────────────────
 *
 * `whereEnvoiVisible` pour le bilan, `syntheseServieAuPatient` pour la synthèse
 * — les mêmes fonctions que les écrans eux-mêmes. Deux surfaces qui
 * recopieraient la règle finiraient par diverger, ce qui est déjà arrivé sur ce
 * dépôt. Conséquence directe : chaque écran ne servant QUE le document courant,
 * le fil ne peut jamais porter plus de DEUX lectures.
 *
 * Auth : cookie de session portail, comme `api/portail/bilan`. Pas
 * d'`authorizePortail` — celui-ci exige une assignation, or un patient dont le
 * suivi est terminé n'en a plus et garde le droit de relire son dossier.
 */

export type PortailLecturesResponse =
  | { ok: true; lectures: LectureAttendue[] }
  | { ok: true; consignee: true }
  | {
      ok: false;
      reason: 'unauthenticated' | 'forbidden' | 'corps_invalide' | 'introuvable' | 'exception';
      error: string;
    };

type Garde = { refus: NextResponse<PortailLecturesResponse>; patient?: never } | { refus?: never; patient: { idPatient: string } };

async function garderAcces(
  req: Request,
  requestContext: ReturnType<typeof createRequestContext>,
  verbe: string,
): Promise<Garde> {
  const echec = (reason: 'unauthenticated' | 'forbidden', error: string, status: number) =>
    ({
      refus: withCorrelationHeader(
        NextResponse.json<PortailLecturesResponse>({ ok: false, reason, error }, { status }),
        requestContext,
      ),
    }) as Garde;

  const session = readPatientSession(req);
  if (!session) {
    logger.security({
      event: EVENT_CODES.PORTAIL_SESSION_FORBIDDEN,
      domain: 'SECURITY',
      message: `Session portail absente ou expirée (lectures ${verbe})`,
      context: finalizeLogContext(requestContext, { statusCode: 401, retryable: false }),
    });
    return echec('unauthenticated', 'Session expirée. Reconnectez-vous.', 401);
  }

  // 403 et non 401 : le cookie est lisible, c'est le COMPTE qui est refusé.
  // Répondre 401 renverrait le client au gate du portail, qui refuserait à son
  // tour — une boucle sans message. Même verdict que `api/portail/bilan`.
  const patient = await resolvePortailPatientFromSession(session);
  if (!patient) {
    logger.security({
      event: EVENT_CODES.PORTAIL_SESSION_FORBIDDEN,
      domain: 'SECURITY',
      message: `Accès portail révoqué ou incohérent (lectures ${verbe})`,
      context: finalizeLogContext(requestContext, { statusCode: 403, retryable: false }),
    });
    return echec('forbidden', 'Accès non reconnu ou révoqué.', 403);
  }

  return { patient: { idPatient: patient.idPatient } };
}

/**
 * Le document COURANT de chaque espèce, tel que son écran le sert — et rien
 * d'autre. Rendre une version dépassée ferait apparaître au fil une tâche qui
 * mènerait à un écran montrant autre chose.
 */
async function documentsCourants(idPatient: string) {
  const [envoi, synthesesBrutes] = await Promise.all([
    prisma.bookletEnvoi.findFirst({
      where: whereEnvoiVisible(idPatient),
      // `id` en second critère, comme `api/portail/bilan` : deux envois de la
      // même seconde rendraient sinon un résultat non déterministe.
      orderBy: [{ dateEnvoi: 'desc' }, { id: 'desc' }],
      select: { id: true, dateEnvoi: true },
    }),
    // LE DRAPEAU EST RELU ICI, APRÈS L'IDENTITÉ. Éteint, la surface ne produit
    // aucune lecture — `null`, et non `[]` : « fermée » n'est pas « vide ».
    isComprehensionEnabled()
      ? prisma.syntheseComprehension.findMany({
          where: { idPatient },
          // `supersedesSyntheseId` est exigé par `LigneSynthese` : c'est lui qui
          // fait la chaîne des révisions, et sans lui la règle « tête publiée »
          // ne saurait pas ce qu'elle trie.
          select: { id: true, publieeLe: true, creeLe: true, supersedesSyntheseId: true },
        })
      : Promise.resolve(null),
  ]);

  // « Publiée » ne suffit pas : il faut la TÊTE publiée. Une version publiée
  // puis révisée annoncerait au patient un texte que le praticien a corrigé.
  const servie = synthesesBrutes === null ? null : syntheseServieAuPatient(synthesesBrutes);

  return {
    bilansTransmis: envoi ? [{ id: envoi.id, envoyeLe: envoi.dateEnvoi }] : [],
    synthesesPubliees:
      synthesesBrutes === null
        ? null
        : servie && servie.publieeLe
          ? [{ id: servie.id, publieeLe: servie.publieeLe }]
          : [],
  };
}

export async function GET(req: Request): Promise<NextResponse<PortailLecturesResponse>> {
  const requestContext = createRequestContext(req);
  const garde = await garderAcces(req, requestContext, 'GET');
  if (garde.refus) return garde.refus;

  try {
    const [documents, dejaLues] = await Promise.all([
      documentsCourants(garde.patient.idPatient),
      prisma.portailLecturePatient.findMany({
        where: { idPatient: garde.patient.idPatient },
        select: { espece: true, idObjet: true },
      }),
    ]);

    return withCorrelationHeader(
      NextResponse.json<PortailLecturesResponse>({
        ok: true,
        lectures: lecturesAttendues({ ...documents, dejaLues }),
      }),
      requestContext,
    );
  } catch (erreur) {
    logger.error({
      event: EVENT_CODES.PORTAIL_JOURNAL_QUERY_FAILED,
      domain: 'PORTAIL_PATIENT',
      message: 'Lecture des documents remis impossible',
      context: finalizeLogContext(requestContext, { statusCode: 500, retryable: true }),
      error: erreur,
    });
    return withCorrelationHeader(
      NextResponse.json<PortailLecturesResponse>(
        { ok: false, reason: 'exception', error: 'Lecture impossible pour le moment.' },
        { status: 500 },
      ),
      requestContext,
    );
  }
}

const ESPECES: readonly EspeceLecture[] = ['bilan', 'synthese'];

function especeValide(valeur: unknown): valeur is EspeceLecture {
  return typeof valeur === 'string' && (ESPECES as readonly string[]).includes(valeur);
}

/*
 * POST — consigne qu'un document a été OUVERT.
 *
 * LE SERVEUR VÉRIFIE, IL NE FAIT PAS CONFIANCE AU NAVIGATEUR (`D-164`).
 * L'identifiant reçu doit être EXACTEMENT celui du document que l'écran sert en
 * ce moment à ce patient. Trois conséquences, toutes voulues :
 *
 *  — un identifiant d'un autre dossier est refusé, et n'écrit rien ;
 *  — un identifiant de version DÉPASSÉE est refusé : acquitter une synthèse
 *    déjà révisée ferait disparaître du fil la révision que le patient n'a pas
 *    lue ;
 *  — si le praticien publie entre l'affichage et l'envoi, le POST est REFUSÉ
 *    plutôt qu'appliqué à la version neuve. La tâche reste, et c'est le bon
 *    sens de l'erreur : mieux vaut redemander une lecture faite que d'effacer
 *    une lecture qui n'a pas eu lieu.
 *
 * IDEMPOTENT PAR CONSTRUCTION. La clé primaire porte le triplet ; un doublon
 * lève `P2002`, qui se lit « c'était déjà consigné » et rend 200. Une lecture
 * est un INSTANT, pas un état qu'on bascule — la rejouer ne change rien.
 */
export async function POST(req: Request): Promise<NextResponse<PortailLecturesResponse>> {
  const requestContext = createRequestContext(req);
  const garde = await garderAcces(req, requestContext, 'POST');
  if (garde.refus) return garde.refus;

  const echec = (
    reason: 'corps_invalide' | 'introuvable' | 'exception',
    error: string,
    status: number,
  ) =>
    withCorrelationHeader(
      NextResponse.json<PortailLecturesResponse>({ ok: false, reason, error }, { status }),
      requestContext,
    );

  let corps: unknown;
  try {
    corps = await req.json();
  } catch {
    return echec('corps_invalide', 'Requête illisible.', 400);
  }

  const { espece, idObjet } = (corps ?? {}) as { espece?: unknown; idObjet?: unknown };
  if (!especeValide(espece) || typeof idObjet !== 'string' || idObjet.trim() === '') {
    return echec('corps_invalide', 'Requête incomplète.', 400);
  }

  try {
    const documents = await documentsCourants(garde.patient.idPatient);
    const servis =
      espece === 'bilan'
        ? documents.bilansTransmis.map(b => b.id)
        : (documents.synthesesPubliees ?? []).map(s => s.id);

    if (!servis.includes(idObjet)) {
      // 404 et non 403 : rien n'est révélé du dossier d'autrui. « Ce document
      // n'est pas celui que vous lisez » couvre les trois cas — autre dossier,
      // version dépassée, surface fermée — sans dire lequel.
      return echec('introuvable', 'Ce document n’est pas celui qui vous est servi.', 404);
    }

    try {
      await prisma.portailLecturePatient.create({
        data: { idPatient: garde.patient.idPatient, espece, idObjet },
      });
    } catch (erreur) {
      // `P2002` — déjà consigné. Ce n'est pas une erreur : c'est le résultat.
      if (!(erreur && typeof erreur === 'object' && 'code' in erreur && erreur.code === 'P2002')) {
        throw erreur;
      }
    }

    return withCorrelationHeader(
      NextResponse.json<PortailLecturesResponse>({ ok: true, consignee: true }),
      requestContext,
    );
  } catch (erreur) {
    logger.error({
      event: EVENT_CODES.PORTAIL_JOURNAL_QUERY_FAILED,
      domain: 'PORTAIL_PATIENT',
      message: 'Consignation d’une lecture impossible',
      context: finalizeLogContext(requestContext, { statusCode: 500, retryable: true }),
      error: erreur,
    });
    return echec('exception', 'Enregistrement impossible pour le moment.', 500);
  }
}
