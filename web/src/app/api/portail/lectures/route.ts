import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readPatientSession } from '@/lib/patient-session';
import { resolvePortailPatientFromSession } from '@/lib/consultation/portail';
import { whereEnvoiVisible } from '@/lib/documents/bilanPatient';
import { syntheseServieAuPatient } from '@/lib/praticien/syntheseComprehension';
import { isComprehensionEnabled } from '@/lib/patient/featureFlag';
import { lectureFichesOuverte } from '@/lib/fiches-assiette/drapeau';
import { fichesALire } from '@/lib/fiches-assiette/servicePatient';
import { lettreAdressagePatientOuverte } from '@/lib/correspondance/lettreAdressageRemise';
import { lettreALire } from '@/lib/correspondance/lettreServicePatient';
import { courrierComplementOuvert } from '@/lib/correspondance/courrierComplementRemise';
import { courrierComplementALire } from '@/lib/correspondance/courrierComplementServicePatient';
import { lecturesAttendues, type EspeceLecture, type LectureAttendue } from '@/lib/portail/lecturesAttendues';
import { lectureProtocoleOuverte } from '@/lib/portail/lectureProtocole';
import { resolveProtocoleDiffuse } from '@/lib/protocol/portailProtocol';
import { LONGUEUR_CYCLE_REF } from '@/lib/protocol/vuePatientSurLeFil';
import { logger } from '@/lib/observability/logger';
import { classeEtCode } from '@/lib/observability/classeEtCode';
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
 * `whereEnvoiVisible` pour le bilan, `syntheseServieAuPatient` pour la synthèse,
 * `fichesALire` pour les fiches d'assiette — les mêmes fonctions que les écrans
 * eux-mêmes (`fichesALire` partage son tronc avec `fichesRemisesAuPatient`, et
 * s'arrête avant le protocole servi, dont la lecture n'a pas besoin). Deux surfaces qui recopieraient la règle finiraient par
 * diverger, ce qui est déjà arrivé sur ce dépôt. Conséquence directe : chaque
 * écran ne servant QUE le document courant, le fil porte au plus un bilan, une
 * synthèse, et une lecture par fiche d'assiette servie. Le plafond de deux
 * lectures ([[D-175]] §6) est tombé avec les fiches : un clic peut en remettre
 * trois ([[D-251]] §8).
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

/**
 * Les fiches d'assiette SERVIES à ce patient — la remise en cours de chaque
 * fiche, quand son texte part. `null` = surface fermée par
 * `WN_FICHES_ASSIETTE_LECTURE` : le drapeau est relu ici, APRÈS l'identité, et
 * une surface fermée ne produit aucune lecture.
 */
async function fichesServies(idPatient: string) {
  if (!lectureFichesOuverte()) return null;
  const fiches = await fichesALire(idPatient);
  return fiches.map(fiche => ({ id: fiche.idRemise, remiseLe: new Date(fiche.remiseLe), libelle: fiche.libelle }));
}

/**
 * Le courrier pour le médecin SERVI à ce patient ([[D-262]], LOT-03a). `null` =
 * surface fermée par `WN_LETTRE_ADRESSAGE_PATIENT`, relu ici après l'identité.
 */
async function lettresServies(idPatient: string) {
  if (!lettreAdressagePatientOuverte()) return null;
  return lettreALire(idPatient);
}

/**
 * Le courrier à remettre au médecin avant un complément ciblé SERVI à ce
 * patient ([[D-345]], J3-12h lot 4). `null` = surface fermée par
 * `WN_COURRIER_COMPLEMENT`, relu ici après l'identité.
 */
async function courriersComplementServis(idPatient: string) {
  if (!courrierComplementOuvert()) return null;
  return courrierComplementALire(idPatient);
}

export async function GET(req: Request): Promise<NextResponse<PortailLecturesResponse>> {
  const requestContext = createRequestContext(req);
  const garde = await garderAcces(req, requestContext, 'GET');
  if (garde.refus) return garde.refus;

  try {
    const [documents, fiches, lettres, courriersComplement, dejaLues] = await Promise.all([
      documentsCourants(garde.patient.idPatient),
      // Une panne des fiches tait LEURS lectures, pas celles du bilan et de la
      // synthèse : le fil retombe sur ce qu'il sait. Seule la classe de
      // l'erreur est journalisée.
      fichesServies(garde.patient.idPatient).catch((erreur: unknown) => {
        console.warn('[portail/lectures] fiches d’assiette illisibles', erreur instanceof Error ? erreur.name : 'inconnu');
        return null;
      }),
      lettresServies(garde.patient.idPatient).catch((erreur: unknown) => {
        console.warn('[portail/lectures] courrier pour le médecin illisible', ...classeEtCode(erreur));
        return null;
      }),
      courriersComplementServis(garde.patient.idPatient).catch((erreur: unknown) => {
        console.warn('[portail/lectures] courrier à remettre au médecin illisible', ...classeEtCode(erreur));
        return null;
      }),
      prisma.portailLecturePatient.findMany({
        where: { idPatient: garde.patient.idPatient },
        select: { espece: true, idObjet: true },
      }),
    ]);

    return withCorrelationHeader(
      NextResponse.json<PortailLecturesResponse>({
        ok: true,
        lectures: lecturesAttendues({
          ...documents,
          fichesServies: fiches,
          lettresServies: lettres,
          courriersComplementServis: courriersComplement,
          dejaLues,
        }),
      }),
      requestContext,
    );
  } catch (erreur) {
    logger.error({
      event: EVENT_CODES.PORTAIL_JOURNAL_QUERY_FAILED,
      domain: 'PORTAIL_PATIENT',
      message: 'Lecture des documents remis impossible',
      context: finalizeLogContext(requestContext, { statusCode: 500, retryable: true }),
      // Pas `error: erreur` : `sanitizeError` en garderait le message.
      metadata: { erreur: classeEtCode(erreur) },
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

/**
 * Le protocole se CONSIGNE mais ne s'ATTEND pas : il n'entre pas au fil du jour
 * ([[D-315]] §3), donc pas dans `EspeceLecture`, qui est l'espèce des tâches.
 */
type EspeceConsignee = EspeceLecture | 'protocole';

const ESPECES: readonly EspeceConsignee[] = [
  'bilan', 'synthese', 'fiche_assiette', 'lettre_adressage', 'courrier_complement', 'protocole',
];

function especeValide(valeur: unknown): valeur is EspeceConsignee {
  return typeof valeur === 'string' && (ESPECES as readonly string[]).includes(valeur);
}

function texteNonVide(valeur: unknown): valeur is string {
  return typeof valeur === 'string' && valeur.trim() !== '';
}

/**
 * La diffusion du protocole que l'accueil sert ([[D-315]] §2), ou `null` :
 * surface fermée par `WN_PORTAIL_LECTURE_PROTOCOLE`, aucun protocole diffusé,
 * ou version vue qui n'est plus celle en vigueur.
 *
 * LE NAVIGATEUR NE CONNAÎT PAS L'IDENTIFIANT DE L'APPROBATION, et c'est voulu :
 * la route du protocole ne lui envoie que `cycleRef`, opaque et tronquée. Il
 * renvoie donc la `cycleRef` reçue avec la vue ; le serveur la compare à la
 * diffusion en vigueur et écrit l'identifiant qu'il résout lui-même. Une
 * `cycleRef` exacte prouve que ce navigateur a reçu la vue servie : elle n'est
 * envoyée qu'avec elle.
 *
 * DEUX LIMITES ASSUMÉES ([[D-315]], amendement du 2026-10-16). (1) La règle
 * « servi » de la route du protocole (rejeu de la carte, contrat, fin de
 * cycle) n'est pas rejouée ici : une page reçue avant qu'un protocole ne
 * devienne indisponible peut encore consigner sa diffusion — l'effet reste sur
 * la trace du patient, pour son propre protocole. (2) Un même brouillon
 * ré-approuvé garde sa `cycleRef` : une page ouverte sur l'ancienne diffusion
 * consigne la nouvelle, au contenu identique. Pour cette espèce, le refus
 * « publié entre l'affichage et l'envoi » du POST ne vaut que si le brouillon
 * a changé.
 */
async function diffusionLue(idPatient: string, cycleRef: string): Promise<string | null> {
  if (!lectureProtocoleOuverte()) return null;
  const diffuse = await resolveProtocoleDiffuse(idPatient);
  if (!diffuse) return null;
  return diffuse.protocolDraftInputHash.slice(0, LONGUEUR_CYCLE_REF) === cycleRef ? diffuse.approbationId : null;
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

  const echec = (
    reason: 'corps_invalide' | 'introuvable' | 'exception',
    error: string,
    status: number,
  ) =>
    withCorrelationHeader(
      NextResponse.json<PortailLecturesResponse>({ ok: false, reason, error }, { status }),
      requestContext,
    );

  // Le corps est lu AVANT la session : l'accusé d'une surface fermée répond 404
  // sans résoudre de compte (revue Codex de #1701, P1-1). Un corps illisible
  // garde son verdict après la garde, comme avant.
  let corps: unknown;
  let corpsLisible = true;
  try {
    corps = await req.json();
  } catch {
    corpsLisible = false;
  }
  if (
    corpsLisible
    && (corps as { espece?: unknown } | null)?.espece === 'courrier_complement'
    && !courrierComplementOuvert()
  ) {
    return echec('introuvable', 'Ce document n’est pas celui qui vous est servi.', 404);
  }

  const garde = await garderAcces(req, requestContext, 'POST');
  if (garde.refus) return garde.refus;
  if (!corpsLisible) return echec('corps_invalide', 'Requête illisible.', 400);

  const { espece, idObjet, cycleRef } = (corps ?? {}) as { espece?: unknown; idObjet?: unknown; cycleRef?: unknown };
  // Le protocole se désigne par sa `cycleRef`, les documents par leur
  // identifiant de version (voir `diffusionLue`).
  if (!especeValide(espece) || !(espece === 'protocole' ? texteNonVide(cycleRef) : texteNonVide(idObjet))) {
    return echec('corps_invalide', 'Requête incomplète.', 400);
  }

  try {
    let idConsigne: string | null;
    if (espece === 'protocole') {
      idConsigne = await diffusionLue(garde.patient.idPatient, cycleRef as string);
    } else {
      let servis: string[];
      if (espece === 'fiche_assiette') {
        // Surface fermée : aucune fiche servie, donc un 404 comme pour les autres.
        servis = ((await fichesServies(garde.patient.idPatient)) ?? []).map(fiche => fiche.id);
      } else if (espece === 'lettre_adressage') {
        servis = ((await lettresServies(garde.patient.idPatient)) ?? []).map(lettre => lettre.id);
      } else if (espece === 'courrier_complement') {
        servis = ((await courriersComplementServis(garde.patient.idPatient)) ?? []).map(courrier => courrier.id);
      } else {
        const documents = await documentsCourants(garde.patient.idPatient);
        servis =
          espece === 'bilan'
            ? documents.bilansTransmis.map(b => b.id)
            : (documents.synthesesPubliees ?? []).map(s => s.id);
      }
      idConsigne = servis.includes(idObjet as string) ? (idObjet as string) : null;
    }

    if (idConsigne === null) {
      // 404 et non 403 : rien n'est révélé du dossier d'autrui. « Ce document
      // n'est pas celui que vous lisez » couvre les trois cas — autre dossier,
      // version dépassée, surface fermée — sans dire lequel.
      return echec('introuvable', 'Ce document n’est pas celui qui vous est servi.', 404);
    }

    try {
      await prisma.portailLecturePatient.create({
        // LE JOUR EST DEMANDÉ, PAS CHOISI ([[D-297]] §2). La valeur envoyée ne
        // compte pas : le trigger d'insertion la REMPLACE par le jour de Paris
        // de l'horloge de la base (migration `20261018150000`). Toute page qui
        // appelle cette route sert « Votre lecture est datée » en tête (§4) —
        // `lectureDatee.guard.test.ts`. Un doublon (`P2002`) n'écrit rien : la
        // première ouverture garde son jour (§1). Sur une base SANS le trigger,
        // cette valeur serait gardée et convertie en jour UTC — la veille entre
        // 0 h et 2 h à Paris : c'est le contrat `portail_lectures_lu_le_v1_negatif`
        // qui garantit que le trigger existe et réécrit toute valeur fournie.
        data: { idPatient: garde.patient.idPatient, espece, idObjet: idConsigne, luLe: new Date() },
        select: { idObjet: true },
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
      metadata: { erreur: classeEtCode(erreur) },
    });
    return echec('exception', 'Enregistrement impossible pour le moment.', 500);
  }
}
