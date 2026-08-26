import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authentifierPatientPortail } from '@/lib/trust/portailAuth';
import {
  isCeQuiCompteEnabled,
  isComprehensionEnabled,
  isDossierDeuxVoixEnabled,
} from '@/lib/patient/featureFlag';
import { termeAnxiogene } from '@/lib/documents/vocabulaire';
import { logger } from '@/lib/observability/logger';
import { EVENT_CODES } from '@/lib/observability/eventCodes';
import { createRequestContext, finalizeLogContext } from '@/lib/observability/requestContext';
import {
  ANCRE_JALON,
  EVA_MAX,
  EVA_MIN,
  LONGUEUR_MAX_AMENDEMENT,
  LONGUEUR_MAX_REPONSE_JALON,
  etatRatification,
  objectifsCourants,
  preparerAmendement,
  preparerRatification,
  preparerReponseJalon,
  type DonneesAmendement,
  type DonneesRatification,
  type DonneesReponseJalon,
  type EtatRatification,
  type RefusAmendement,
  type RefusRatification,
  type RefusReponseJalon,
} from '@/lib/praticien/objectifNegocie';
import { jalonObjectifDu, type FenetreJalonObjectif } from '@/lib/protocol/jalonObjectifDu';
import { syntheseServieAuPatient } from '@/lib/praticien/syntheseComprehension';

// Le « dossier à deux voix » (Alliance 6.0-A, LOT-06) — route PORTAIL.
// Classe AUTH : le contrôle d'accès prime sur tout le reste.
//
// GET assemble les trois objets de la campagne pour le patient — l'objectif
// négocié et son état, ce qui compte pour lui, la synthèse de compréhension et
// ses désaccords. POST dépose le GESTE du patient sur une version précise de
// son objectif.
//
// TROIS VERBES DEPUIS LE LOT-04 DE 6.0-B (`D-110`), pas deux : « c'est bien
// ça », « ce n'est pas exactement ça », et — le troisième — « le dire
// autrement », par lequel le patient écrit SA version dans ses mots.
// L'amendement va dans sa PROPRE table (`D-094` §2), sous le MÊME drapeau
// `WN_DOSSIER_DEUX_VOIX` que la ratification : c'est le même écran, le même
// écrivain unique, le même régime append-only. L'adosser à
// `WN_OBJECTIF_PROPOSE` aurait fait dépendre le droit du patient à répondre de
// l'activation de la MACHINE QUI PROPOSE — deux gestes de gouvernance que
// `D-094` §5 tient précisément séparés.
//
// « DIT AUTREMENT » N'EST NI UN ACCORD NI UN REFUS. L'état dérivé compte
// désormais quatre valeurs, et la quatrième est à part entière : la replier sur
// « contesté » ferait lire un désaccord là où le patient a fait une
// proposition (`DC-24`).
//
// ASSEMBLER N'EST PAS COMPOSER TROIS LECTURES EXISTANTES. Deux des trois
// n'existaient pas côté patient avant ce lot : l'objectif négocié n'était servi
// qu'au cockpit praticien, et `api/portail/ce-qui-compte` ne rend qu'un
// interrupteur — le patient ne pouvait pas relire ce qu'il avait déposé.
//
// PAS DE PATCH, PAS DE DELETE. Une ratification ne se retire pas : se raviser
// se dit en le disant — une ligne de plus, en sens inverse — et
// `etatRatification` lit le DERNIER geste. Il n'existe aucun verbe pour effacer
// un accord qu'on a donné, et c'est la forme de l'invariant.
//
// CHEMIN SORTANT GARDÉ, ET IL EST NEUF (carte du Socle,
// `documents/vocabulaire.ts`). Cette route sert au patient la REFORMULATION du
// praticien, que rien ne lui servait jusqu'ici. Une garde vit dans un appelant,
// pas dans un objet : la ligne de carte du LOT-04 ne couvre pas cette route.
// Régime JOURNALISANT, par application de `D-090` — le geste est un service,
// personne n'est là pour trancher, et bloquer afficherait une page d'erreur au
// patient pour un texte qu'il n'a pas écrit et ne peut pas corriger.
//
// Aucun e-mail, aucune notification : le portail reste en modèle « pull ». Rien
// ne prévient le praticien qu'une ratification est arrivée — c'est une surface
// que ce lot n'a pas cadrée, pas un oubli d'implémentation.
//
// Aucun agrégat, aucun décompte, aucune notation nulle part : ni « 3 entrées »,
// ni « 2 désaccords », ni taux d'accord. Compter la parole d'un patient la
// transformerait en mesure (`DC-19`/`DC-20`).

export type ObjectifServi = {
  id: string;
  enoncePatient: string;
  reformulationPraticien: string | null;
  priorite: string | null;
  /** Déclaration du praticien — `null` s'il n'a rien déclaré. Jamais comblée. */
  negocieLe: string | null;
  creeLe: string;
  /**
   * `en_attente` NE DIT RIEN DU PATIENT : il ne s'est pas encore prononcé.
   * Jamais « non ratifié », jamais « refusé » (`DC-24`).
   */
  etat: EtatRatification;
};

export type EntreeServie = {
  id: string;
  texte: string;
  /** Déclaration du patient — `null` quand il n'a rien déclaré. Jamais comblée. */
  saisiLe: string | null;
  creeLe: string;
};

export type SyntheseServie = {
  id: string;
  texte: string;
  redigeeLe: string | null;
  publieeLe: string;
};

export type DesaccordServi = {
  id: string;
  idSynthese: string;
  texte: string | null;
  exprimeLe: string | null;
  creeLe: string;
};

export type RatificationServie = {
  id: string;
  idObjectif: string;
  sens: string;
  creeLe: string;
};

/**
 * L'amendement, RELU PAR SON AUTEUR (Alliance 6.0-B, LOT-04, `D-110`). Le
 * patient doit pouvoir relire ce qu'il a écrit : un texte déposé qui disparaît
 * de l'écran laisse croire qu'il s'est perdu, et l'invitation à répondre lui
 * reparlerait comme s'il n'avait rien dit — le défaut exact trouvé en revue au
 * LOT-04 de 6.0-A sur les désaccords.
 *
 * `exprimeLe` N'Y EST PAS : la colonne reste nulle par construction (le patient
 * ne déclare pas de date, il écrit), et servir un champ toujours nul inviterait
 * un écran à le combler par `creeLe`.
 */
export type AmendementServi = {
  id: string;
  idObjectif: string;
  texte: string;
  creeLe: string;
};

/**
 * LA RÉPONSE D'ÉTAPE, RELUE PAR SON AUTEUR (Alliance 6.0-B, LOT-05, `D-111`).
 * Même motif qu'à l'amendement : ce que le patient a écrit doit rester visible
 * sur son écran.
 *
 * `eva` est servie BRUTE et peut valoir `null` — le patient n'a pas répondu à
 * l'échelle. `null` et `0` ne se confondent pas (`DC-24`) : l'écran affiche un
 * silence dans un cas, un zéro dans l'autre, et jamais l'un à la place de
 * l'autre. Aucune bande, aucune direction, aucune moyenne n'accompagne cette
 * valeur ici ni ailleurs.
 *
 * `reponduLe` N'Y EST PAS : la colonne reste nulle par construction, et servir
 * un champ toujours nul inviterait un écran à le combler par `creeLe`.
 */
export type ReponseJalonServie = {
  id: string;
  idObjectif: string;
  jalon: string;
  texte: string;
  eva: number | null;
  creeLe: string;
};

export type PortailDossierResponse =
  | { ok: true; ouvert: true }
  | {
      ok: true;
      /**
       * LES TÊTES DE CHAÎNE, et il peut y en avoir plusieurs. `objectifsCourants`
       * rend un tableau parce que deux reformulations concurrentes peuvent
       * scinder la chaîne — aucune contrainte `UNIQUE` n'existe en base. Une
       * discordance se SIGNALE, elle ne se départage pas en silence (`DC-30`).
       */
      objectifs: ObjectifServi[];
      /**
       * `false` dès qu'il n'y a pas EXACTEMENT une tête : rien à ratifier, ou
       * deux versions rivales dont l'écran ne peut pas dire laquelle engage.
       */
      ratifiable: boolean;
      /**
       * CE QUE LE PATIENT A ÉCRIT LUI-MÊME sur ses objectifs, tous gestes
       * confondus, du plus récent au plus ancien. Jamais filtré sur la tête
       * courante : un amendement porté sur une version depuis reformulée reste
       * SA parole, et la faire disparaître au premier geste du praticien
       * reviendrait à effacer ce qu'on prétend recueillir.
       */
      amendements: AmendementServi[];
      /**
       * CE QUE LE PATIENT A RÉPONDU À SES JALONS, du plus récent au plus
       * ancien. Jamais filtré sur la tête courante, pour le motif écrit aux
       * amendements : une réponse portée sur une version depuis reformulée
       * reste SA parole.
       */
      reponsesJalon: ReponseJalonServie[];
      /**
       * L'ÉTAPE OUVERTE AUJOURD'HUI, ou le motif qui l'en empêche — calculée
       * par le SERVEUR, jamais par l'écran. Les fenêtres viennent de
       * `JOURS_JALON`/`TOLERANCE_JOURS_JALON` : les faire calculer par le
       * client obligerait à embarquer les tables cliniques dans le bundle
       * patient, et une horloge de navigateur décalée ouvrirait une étape que
       * le serveur refuserait ensuite.
       */
      jalonDu: FenetreJalonObjectif;
      /**
       * `null` = le bloc n'est pas ouvert (drapeau éteint), et il est alors
       * ABSENT de l'écran. Un tableau vide, lui, est un vrai silence du patient
       * ou du praticien — les deux ne se confondent pas (`DC-24`).
       */
      ceQuiCompte: EntreeServie[] | null;
      comprehension: { synthese: SyntheseServie | null; desaccords: DesaccordServi[] } | null;
    }
  | { ok: true; ratification: RatificationServie }
  | { ok: true; amendement: AmendementServi }
  | { ok: true; reponseJalon: ReponseJalonServie }
  | { ok: false; reason: string; error: string };

/**
 * BORNE TECHNIQUE DE TRANSPORT — 64 Kio, en octets annoncés. Chiffre
 * d'ingénierie, identifié comme tel (`DC-20`), sans aucune sémantique clinique.
 * Précédent mot pour mot : `api/portail/comprehension/route.ts`.
 */
const TAILLE_CORPS_MAX_OCTETS = 64 * 1024;

const MESSAGE_CORPS_TROP_GROS = 'Requête trop volumineuse.';

/** Borne technique sur la référence d'objectif : un identifiant `cuid`. */
const LONGUEUR_MAX_ID = 64;

const MESSAGES_REFUS: Record<RefusRatification, string> = {
  objectif_absent: 'Aucun objectif n’est visé par cette réponse.',
  sens_invalide: 'Cette réponse n’est pas lisible.',
};

/**
 * Les refus de l'amendement. LA BORNE EST DITE, ET DITE EN CHIFFRES — l'écran
 * l'affiche aussi, mais un client qui poste sans passer par lui doit apprendre
 * pourquoi son texte est refusé, pas seulement qu'il l'est. Un refus muet sur
 * une longueur pousse à réessayer à l'identique.
 */
const MESSAGES_REFUS_AMENDEMENT: Record<RefusAmendement, string> = {
  objectif_absent: 'Aucun objectif n’est visé par ce texte.',
  texte_absent: 'Écrivez votre version de l’objectif avant de l’envoyer.',
  texte_trop_long: `Votre texte dépasse ${LONGUEUR_MAX_AMENDEMENT} caractères. Rien n’est coupé : raccourcissez-le et renvoyez-le.`,
};

/**
 * Les refus de la réponse d'étape. `jalon_absent` et `jalon_invalide` se disent
 * DIFFÉREMMENT : le premier est un champ manquant, le second une étape qui
 * n'existe pas — dont `T0`, que `resoudreJalonDu` rend pour un patient sans
 * cycle confirmé. Les confondre enverrait un client corriger le mauvais champ.
 *
 * La borne de l'EVA est dite EN CHIFFRES, et dite comme ce qu'elle est : une
 * échelle de saisie, sans interprétation (`DC-19`/`DC-20`).
 */
const MESSAGES_REFUS_REPONSE_JALON: Record<RefusReponseJalon, string> = {
  objectif_absent: 'Aucun objectif n’est visé par cette réponse.',
  jalon_absent: 'Aucune étape n’est visée par cette réponse.',
  jalon_invalide: 'Cette étape n’existe pas pour votre objectif.',
  texte_absent: 'Écrivez où vous en êtes avant d’envoyer.',
  texte_trop_long: `Votre texte dépasse ${LONGUEUR_MAX_REPONSE_JALON} caractères. Rien n’est coupé : raccourcissez-le et renvoyez-le.`,
  eva_invalide: `L’échelle attend un nombre entier entre ${EVA_MIN} et ${EVA_MAX}, ou rien du tout.`,
};

/** Le message d'un objectif introuvable, D'UN AUTRE DOSSIER, ou hors bornes. */
const MESSAGE_OBJECTIF_INTROUVABLE = 'Cet objectif est introuvable.';

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<PortailDossierResponse>({ ok: false, reason, error }, { status });
}

/** Surface fermée : 503, jamais 404 — le chemin existe, il n'est pas ouvert. */
function surfaceFermee() {
  return echec('feature_disabled', 'Cet espace n’est pas encore ouvert.', 503);
}

/**
 * Ce qu'on a le droit d'écrire au journal — SÛR PAR CONSTRUCTION. Les erreurs
 * Prisma recopient les ARGUMENTS de la requête dans leur message
 * (`PrismaClientValidationError` rend le `data:` du `create`). On n'en garde que
 * la CLASSE et le marqueur Prisma (`P2002`…), ni l'un ni l'autre ne pouvant
 * porter une valeur.
 *
 * `marqueurPrisma` et non `code` : la garde anti-diagnostic refuse tout nom
 * commençant par « code ». C'est ici un faux positif — il s'agit d'un code
 * d'ERREUR — mais on renomme plutôt que d'assouplir une garde qui vise les
 * codes DIAGNOSTIQUES : l'exception la rendrait contournable par un nom bien
 * choisi. Motif complet : `api/portail/comprehension/route.ts`.
 */
function messageJournalisable(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  if (!err.name.startsWith('PrismaClient')) return err.message;
  const marqueurPrisma = (err as { code?: unknown }).code;
  return typeof marqueurPrisma === 'string' ? `${err.name} (${marqueurPrisma})` : err.name;
}

const SELECTION_OBJECTIF = {
  id: true,
  enoncePatient: true,
  reformulationPraticien: true,
  priorite: true,
  negocieLe: true,
  supersedesObjectifId: true,
  creeLe: true,
} as const;

/**
 * GET — le dossier à deux voix du patient.
 *
 * DRAPEAU D'ABORD, fail-closed : une surface fermée ne fait travailler ni la
 * vérification de session, ni la base. L'effet assumé — l'état du drapeau
 * devient devinable — est celui déjà arbitré au LOT-03 : ce qui ne fuit pas,
 * c'est la moindre donnée patient.
 */
export async function GET(req: Request): Promise<NextResponse<PortailDossierResponse>> {
  if (!isDossierDeuxVoixEnabled()) return surfaceFermee();

  try {
    // `authentifierPatientPortail` et NON `authorizePortail` : celui-ci exige
    // une assignation et rendrait 404 pour un patient qui n'en a plus. Or aucun
    // des trois objets n'est adossé à un questionnaire ; précédent motivé mot
    // pour mot dans `api/portail/bilan/route.ts` — un patient dont le suivi est
    // terminé garde ses droits propres. Sa ratification, plus encore : le suivi
    // se clôt du côté praticien.
    const auth = await authentifierPatientPortail(req);
    if (auth.erreur) return auth.erreur as NextResponse<PortailDossierResponse>;
    const patient = auth.patient;

    // ── INTERRUPTEUR — « cette surface est-elle ouverte pour vous » ─────────
    //
    // Le hub du portail rend le lien côté SERVEUR, mais la sonde reste utile
    // aux composants clients qui ne peuvent pas lire `WN_DOSSIER_DEUX_VOIX`
    // (variable non `NEXT_PUBLIC_*`). Mode DÉDIÉ, jamais la route de service :
    // sonder le service émettrait `PORTAIL_DOSSIER_REGISTRE_ANXIOGENE` — un
    // événement qui dit « un texte a été SERVI » — pour une page que personne
    // n'a ouverte, et transporterait le dossier entier pour le jeter (revue
    // LOT-04, M3).
    if (new URL(req.url).searchParams.get('interrupteur') === '1') {
      return NextResponse.json<PortailDossierResponse>({ ok: true, ouvert: true });
    }

    const ceQuiCompteOuvert = isCeQuiCompteEnabled();
    const comprehensionOuverte = isComprehensionEnabled();

    // CHAQUE BLOC RESTE SOUMIS À SON PROPRE DRAPEAU. Un bloc fermé n'est pas lu
    // du tout — pas lu puis masqué : une lecture inutile en base est une
    // lecture de données patient qui n'avait pas lieu d'être.
    //
    // L'objectif négocié, lui, n'a AUCUN drapeau (choix commenté du LOT-02 :
    // c'était une surface praticien). C'est CETTE route qui l'ouvre au patient,
    // et c'est `WN_DOSSIER_DEUX_VOIX` qui la garde.
    const [
      objectifs,
      ratifications,
      amendements,
      reponsesJalon,
      ancreT0,
      entrees,
      syntheses,
      desaccords,
    ] = await Promise.all([
      prisma.objectifNegocie.findMany({
        where: { idPatient: patient.idPatient },
        select: SELECTION_OBJECTIF,
        orderBy: { creeLe: 'desc' },
      }),
      prisma.ratificationObjectif.findMany({
        where: { idPatient: patient.idPatient },
        select: { id: true, idObjectif: true, sens: true, creeLe: true },
        orderBy: { creeLe: 'desc' },
      }),
      // AUCUN DRAPEAU PROPRE : l'amendement est gardé par
      // `WN_DOSSIER_DEUX_VOIX`, comme la ratification (`D-110`) — le contrôle
      // est déjà passé en tête de route.
      prisma.amendementObjectif.findMany({
        where: { idPatient: patient.idPatient },
        select: { id: true, idObjectif: true, texte: true, creeLe: true },
        orderBy: { creeLe: 'desc' },
      }),
      // Même régime : la réponse d'étape est gardée par `WN_DOSSIER_DEUX_VOIX`
      // (`D-111`), pas par un drapeau propre. `eva` est sélectionnée telle
      // quelle — aucune transformation, aucun repli sur zéro.
      prisma.reponseJalonObjectif.findMany({
        where: { idPatient: patient.idPatient },
        select: { id: true, idObjectif: true, jalon: true, texte: true, eva: true, creeLe: true },
        orderBy: { creeLe: 'desc' },
      }),
      // L'ANCRE DES FENÊTRES : le T0 confirmé LE PLUS RÉCENT (`D-111` §6).
      // Une seule ligne, deux colonnes — la route patient n'a besoin de rien
      // d'autre, et surtout pas de reconstruire une trajectoire complète, qui
      // rejouerait le calcul d'équilibre pour afficher une question.
      prisma.assessmentEpisode.findFirst({
        where: { idPatient: patient.idPatient, milestone: ANCRE_JALON },
        select: { confirmedAt: true },
        orderBy: { confirmedAt: 'desc' },
      }),
      ceQuiCompteOuvert
        ? prisma.entreeCeQuiCompte.findMany({
            where: { idPatient: patient.idPatient },
            select: { id: true, texte: true, saisiLe: true, creeLe: true },
            orderBy: { creeLe: 'desc' },
          })
        : Promise.resolve(null),
      comprehensionOuverte
        ? prisma.syntheseComprehension.findMany({
            where: { idPatient: patient.idPatient },
            select: {
              id: true,
              texte: true,
              redigeeLe: true,
              publieeLe: true,
              creeLe: true,
              supersedesSyntheseId: true,
            },
            orderBy: { creeLe: 'desc' },
          })
        : Promise.resolve(null),
      comprehensionOuverte
        ? prisma.desaccordComprehension.findMany({
            where: { idPatient: patient.idPatient },
            select: { id: true, idSynthese: true, texte: true, exprimeLe: true, creeLe: true },
            orderBy: { creeLe: 'desc' },
          })
        : Promise.resolve(null),
    ]);

    const tetes = objectifsCourants(objectifs);
    // LE FILTRE EST DANS LE MODULE, PAS DANS LE `where` : « publiée » ne suffit
    // pas, c'est la publiée LA PLUS RÉCENTE qui est servie — et un brouillon de
    // révision ne retire rien au patient (défaut trouvé en revue au LOT-04).
    const servie = syntheses ? syntheseServieAuPatient(syntheses) : undefined;

    // ── RE-VÉRIFICATION AU SERVICE, RÉGIME JOURNALISANT (`D-090`) ───────────
    //
    // Elle porte sur TOUT texte praticien qui part par cette route, et il y en
    // a TROIS — pas deux. `priorite` est un LIBELLÉ LIBRE écrit par le
    // praticien (`objectifNegocie.ts`, 200 caractères), servi au patient et
    // rendu tel quel : « urgent » ou « grave » y sortirait par un chemin neuf
    // sans qu'aucune ligne de journal ne parte, alors que `RACINES_ANXIOGENES`
    // l'attrape. Une garde qui n'énumère pas tous les champs d'un objet laisse
    // le champ oublié hors du chemin qu'elle prétend couvrir. Elle ne bloque
    // pas — voir l'en-tête du fichier.
    //
    // LES AMENDEMENTS N'Y ENTRENT PAS, ET C'EST DÉLIBÉRÉ. La garde porte sur le
    // registre du PRATICIEN — un texte qu'il écrit et que le patient subit. Un
    // amendement est la parole du patient, rendue au patient qui l'a écrite :
    // en signaler le registre reviendrait à faire dire au journal que sa façon
    // de parler de lui-même pose problème.
    //
    // BANC DE DÉBRANCHEMENT : `route.test.ts` doit ROUGIR si ce bloc disparaît.
    const textesPraticienServis = [
      ...tetes.map((ligne) => ligne.reformulationPraticien),
      ...tetes.map((ligne) => ligne.priorite),
      servie ? servie.texte : null,
    ].filter((texte): texte is string => texte !== null);

    if (textesPraticienServis.some((texte) => termeAnxiogene(texte))) {
      logger.warn({
        event: EVENT_CODES.PORTAIL_DOSSIER_REGISTRE_ANXIOGENE,
        domain: 'PORTAIL_PATIENT',
        // Ni le terme, ni le texte, ni l'identifiant du patient : rien de
        // clinique ni de nominatif en log.
        message: 'Un texte du praticien servi au dossier à deux voix emploie un registre anxiogène',
        context: finalizeLogContext(createRequestContext(req), { retryable: false }),
      });
    }

    return NextResponse.json<PortailDossierResponse>({
      ok: true,
      objectifs: tetes.map((ligne) => ({
        id: ligne.id,
        enoncePatient: ligne.enoncePatient,
        reformulationPraticien: ligne.reformulationPraticien,
        priorite: ligne.priorite,
        negocieLe: ligne.negocieLe ? ligne.negocieLe.toISOString() : null,
        creeLe: ligne.creeLe.toISOString(),
        // LES DEUX TABLES, JAMAIS UNE SEULE : un patient qui vient d'écrire sa
        // version après avoir ratifié ne doit pas relire « vous avez répondu :
        // c'est bien ça ».
        //
        // ET DEUX SEULEMENT — `reponsesJalon` n'entre PAS dans cet état, et ce
        // n'est pas un oubli. Dire où l'on en est n'est ni ratifier, ni
        // contester, ni reformuler : c'est parler de son avancée, pas du texte
        // de l'objectif. L'y verser ferait passer un patient en retard pour un
        // patient qui conteste son objectif.
        etat: etatRatification(ligne.id, ratifications, amendements),
      })),
      ratifiable: tetes.length === 1,
      amendements: amendements.map((ligne) => ({
        id: ligne.id,
        idObjectif: ligne.idObjectif,
        texte: ligne.texte,
        creeLe: ligne.creeLe.toISOString(),
      })),
      reponsesJalon: reponsesJalon.map((ligne) => ({
        id: ligne.id,
        idObjectif: ligne.idObjectif,
        jalon: ligne.jalon,
        texte: ligne.texte,
        // BRUTE, et `null` reste `null` : pas de `?? 0`, pas de moyenne, pas de
        // bande. C'est le régime de `D-088`, et il ne s'élargit pas ici.
        eva: ligne.eva,
        creeLe: ligne.creeLe.toISOString(),
      })),
      jalonDu: jalonObjectifDu(ancreT0?.confirmedAt ?? null, new Date()),
      ceQuiCompte: entrees
        ? entrees.map((ligne) => ({
            id: ligne.id,
            texte: ligne.texte,
            saisiLe: ligne.saisiLe ? ligne.saisiLe.toISOString() : null,
            creeLe: ligne.creeLe.toISOString(),
          }))
        : null,
      comprehension: comprehensionOuverte
        ? {
            synthese: servie
              ? {
                  id: servie.id,
                  texte: servie.texte,
                  redigeeLe: servie.redigeeLe ? servie.redigeeLe.toISOString() : null,
                  // Non-nul par construction : `syntheseServieAuPatient` ne rend
                  // que des lignes publiées.
                  publieeLe: servie.publieeLe!.toISOString(),
                }
              : null,
            desaccords: (desaccords ?? []).map((ligne) => ({
              id: ligne.id,
              idSynthese: ligne.idSynthese,
              texte: ligne.texte,
              exprimeLe: ligne.exprimeLe ? ligne.exprimeLe.toISOString() : null,
              creeLe: ligne.creeLe.toISOString(),
            })),
          }
        : null,
    });
  } catch (err) {
    console.error('[portail/dossier GET]', messageJournalisable(err));
    return echec('exception', 'Erreur technique.', 500);
  }
}

type CorpsRatification = {
  idObjectif?: unknown;
  sens?: unknown;
  /**
   * Toléré à la lecture du type, IGNORÉ à l'exécution — jamais comparé. Le
   * comparer laisserait croire qu'il compte, et un jour quelqu'un écrirait
   * `corps.idPatient ?? session.idPatient` en pensant relâcher une garde
   * décorative.
   */
  idPatient?: unknown;
  /**
   * LE GESTE (Alliance 6.0-B, LOT-04). Absent ⇒ `ratification` : le champ est
   * arrivé APRÈS le premier écrivain, et un onglet resté ouvert sur l'ancien
   * écran ne doit pas voir son « c'est bien ça » refusé pour un champ qu'il
   * ignore. Toute autre valeur qu'une des trois connues est REFUSÉE, jamais
   * repliée sur le défaut : deviner le geste d'un patient à partir d'un mot
   * qu'on ne comprend pas est exactement ce qu'on s'interdit.
   */
  geste?: unknown;
  /** Le texte de l'amendement ou de la réponse d'étape, selon le geste. */
  texte?: unknown;
  /** L'étape visée — lue du seul geste `reponse_jalon`. */
  jalon?: unknown;
  /**
   * L'EVA — lue du seul geste `reponse_jalon`, et FACULTATIVE. Absente, elle
   * vaut `null` en base, jamais `0` (`DC-24`).
   */
  eva?: unknown;
};

/** Les trois gestes du patient sur cette route. Liste fermée. */
const GESTES = ['ratification', 'amendement', 'reponse_jalon'] as const;
type Geste = (typeof GESTES)[number];

/**
 * LES TROIS VÉRIFICATIONS D'UNE VERSION VISÉE, partagées par les deux gestes —
 * et elles le sont parce que les deux portent sur le même objet : une version
 * précise d'objectif. Les dupliquer aurait laissé l'un des deux chemins dériver
 * (le patron du LOT-03 : « une garde corrigée ne corrige pas sa sœur »).
 *
 * `id_objectif` N'A PAS DE CLÉ ÉTRANGÈRE. La migration assume une référence
 * SOUPLE et renvoie explicitement ces contrôles à la route
 * (`migration.sql:17-20`). Sans eux, une référence devinée accrocherait le
 * geste à n'importe quoi.
 *
 * (a) l'objectif existe ET appartient au dossier. INEXISTANT ou D'UN AUTRE
 *     DOSSIER : MÊME réponse, MÊME message, MÊME statut — les distinguer ferait
 *     de la route un oracle d'existence, interrogeable avec n'importe quelle
 *     session patient.
 * (b) c'est une TÊTE de chaîne : répondre à une version déjà reformulée ferait
 *     porter le geste du patient sur un texte qui n'engage plus.
 * (c) il n'y en a QU'UNE. Deux têtes rivales, et rien ne dit laquelle engage :
 *     trancher « la plus récente » réglerait en silence une discordance que
 *     `DC-30` demande de signaler. L'écran le dit et ne propose rien tant
 *     qu'elle dure.
 *
 * La lecture couvre tout le dossier, et non la seule ligne visée : sans les
 * autres lignes, (b) et (c) sont indécidables.
 */
async function verifierVersionVisee(
  idPatient: string,
  idObjectif: string,
): Promise<NextResponse<PortailDossierResponse> | null> {
  const objectifs = await prisma.objectifNegocie.findMany({
    // Scopé au dossier : le seul index de la table est `(id_patient, cree_le)`.
    where: { idPatient },
    select: { id: true, supersedesObjectifId: true, creeLe: true },
  });

  const vise = objectifs.find((ligne) => ligne.id === idObjectif);
  if (!vise) {
    return echec('objectif_introuvable', MESSAGE_OBJECTIF_INTROUVABLE, 404);
  }

  const tetes = objectifsCourants(objectifs);
  if (tetes.length > 1) {
    return echec(
      'objectif_discordant',
      'Deux versions de votre objectif coexistent. Votre praticien doit les départager avant que vous puissiez répondre.',
      409,
    );
  }
  if (!tetes.some((ligne) => ligne.id === vise.id)) {
    return echec(
      'objectif_supplante',
      'Cette version de votre objectif a été reformulée depuis. Rechargez la page pour répondre à la version courante.',
      409,
    );
  }

  return null;
}

// POST /api/portail/dossier — dépose une ratification ou un amendement. 201.
export async function POST(req: Request): Promise<NextResponse<PortailDossierResponse>> {
  // 1 — DRAPEAU D'ABORD, fail-closed (même motif qu'au GET). Il garde le geste
  //     autant que l'affichage : « invisible et écrivable » est la pire des
  //     combinaisons, et c'est ici la seule écriture patient irréversible de la
  //     campagne.
  if (!isDossierDeuxVoixEnabled()) return surfaceFermee();

  try {
    // 2 — AUTH ENSUITE, avant le corps.
    const auth = await authentifierPatientPortail(req);
    if (auth.erreur) return auth.erreur as NextResponse<PortailDossierResponse>;
    const patient = auth.patient;

    // DOSSIER CLOS : LA RATIFICATION RESTE AUTORISÉE, délibérément. La clôture
    // est un état du SUIVI PRATICIEN, pas un ordre de silence fait au patient ;
    // couper le geste à la clôture permettrait de clore un dossier pour rendre
    // son objectif incontestable. Ne pas « corriger » cette absence de garde en
    // la posant. La révocation du compte, elle, ferme bien la route (403).

    // 3 — TAILLE DU CORPS, AVANT DE LE LIRE. Deux étages : `content-length`
    //     annoncé (refus sec, rien n'est bufférisé), puis la même borne sur le
    //     texte lu — un client peut imposer un transfert `chunked` sans
    //     annonce, ou mentir.
    const annonce = Number(req.headers.get('content-length'));
    if (Number.isFinite(annonce) && annonce > TAILLE_CORPS_MAX_OCTETS) {
      return echec('corps_trop_gros', MESSAGE_CORPS_TROP_GROS, 400);
    }

    // 4 — CORPS.
    const brut = await req.text();
    if (brut.length > TAILLE_CORPS_MAX_OCTETS) {
      return echec('corps_trop_gros', MESSAGE_CORPS_TROP_GROS, 400);
    }
    let corps: CorpsRatification;
    try {
      corps = JSON.parse(brut) as CorpsRatification;
    } catch {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }
    if (corps === null || typeof corps !== 'object' || Array.isArray(corps)) {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }

    // 5 — LE GESTE, AVANT TOUTE VALIDATION DE CHAMP. Deux gestes vivent dans ce
    //     POST, et la validation de l'un n'est pas celle de l'autre : lire
    //     `sens` sur un amendement rendrait « cette réponse n'est pas lisible »
    //     à un patient qui vient d'écrire trois paragraphes.
    const gesteBrut = corps.geste === undefined || corps.geste === null ? 'ratification' : corps.geste;
    if (typeof gesteBrut !== 'string' || !(GESTES as readonly string[]).includes(gesteBrut)) {
      return echec('geste_invalide', 'Ce geste n’est pas lisible.', 400);
    }
    const geste = gesteBrut as Geste;

    // 6 — VALIDATION PURE. Pour la ratification, `sens` EN FAIT PARTIE : le
    //     CHECK en base est un filet, pas une validation — sans ce contrôle,
    //     « peut_etre » sortirait en erreur Prisma, donc en 500, pour une
    //     requête simplement malformée.
    //
    //     Le résultat est RE-ÉTIQUETÉ par son geste plutôt que déduit de la
    //     présence d'un champ : `'texte' in donnees` marcherait aujourd'hui et
    //     cesserait de marcher le jour où l'une des deux formes gagne un champ
    //     homonyme — une lecture de forme n'est pas une lecture d'intention.
    let prepare:
      | { geste: 'amendement'; donnees: DonneesAmendement }
      | { geste: 'ratification'; donnees: DonneesRatification }
      | { geste: 'reponse_jalon'; donnees: DonneesReponseJalon };

    if (geste === 'reponse_jalon') {
      // `jalon` et `eva` PASSENT BRUTS au module pur, sans pré-filtrage de type
      // ici. C'est délibéré : un `typeof corps.eva === 'number' ? … : null`
      // transformerait « 5.5 » et « "5" » en ABSENCE d'EVA — donc en réponse
      // acceptée sans échelle, alors que le patient en a saisi une. Le module
      // distingue l'absence du refus ; la route ne doit pas écraser cette
      // distinction en chemin.
      const preparation = preparerReponseJalon({
        idPatient: patient.idPatient,
        idObjectif: typeof corps.idObjectif === 'string' ? corps.idObjectif : null,
        jalon: corps.jalon,
        texte: typeof corps.texte === 'string' ? corps.texte : null,
        eva: corps.eva,
      });
      if (!preparation.ok) {
        return echec(preparation.raison, MESSAGES_REFUS_REPONSE_JALON[preparation.raison], 400);
      }
      prepare = { geste, donnees: preparation.donnees };
    } else if (geste === 'amendement') {
      const preparation = preparerAmendement({
        idPatient: patient.idPatient,
        idObjectif: typeof corps.idObjectif === 'string' ? corps.idObjectif : null,
        texte: typeof corps.texte === 'string' ? corps.texte : null,
      });
      if (!preparation.ok) {
        return echec(preparation.raison, MESSAGES_REFUS_AMENDEMENT[preparation.raison], 400);
      }
      prepare = { geste, donnees: preparation.donnees };
    } else {
      const preparation = preparerRatification({
        idPatient: patient.idPatient,
        idObjectif: typeof corps.idObjectif === 'string' ? corps.idObjectif : null,
        sens: typeof corps.sens === 'string' ? corps.sens : null,
      });
      if (!preparation.ok) {
        return echec(preparation.raison, MESSAGES_REFUS[preparation.raison], 400);
      }
      prepare = { geste, donnees: preparation.donnees };
    }

    if (prepare.donnees.idObjectif.length > LONGUEUR_MAX_ID) {
      return echec('objectif_introuvable', MESSAGE_OBJECTIF_INTROUVABLE, 404);
    }

    // 7 — LES TROIS VÉRIFICATIONS DE LA VERSION VISÉE, communes aux deux gestes.
    const refus = await verifierVersionVisee(patient.idPatient, prepare.donnees.idObjectif);
    if (refus) return refus;

    // 8 — ÉCRITURE UNIQUE, ET C'EST LE SEUL ENDROIT DE L'APPLICATION QUI ÉCRIT
    //     UNE RATIFICATION, UN AMENDEMENT OU UNE RÉPONSE D'ÉTAPE. La garde
    //     structurelle de `objectifNegocie.guard.test.ts` épingle ce fichier
    //     nommément pour les TROIS tables : les gestes appartiennent au patient,
    //     et une route praticien qui créerait ces lignes fabriquerait des actes
    //     que personne n'a posés.
    //
    // `idPatient` VIENT DE LA SESSION, JAMAIS DU CORPS (cf. `CorpsRatification`).
    // AUCUNE DATE n'est transmise : `creeLe` est posée par `@default(now())`, et
    // `gesteLe`/`exprimeLe` restent nulles — ce sont des colonnes de
    // DÉCLARATION, et le patient ne déclare pas de date, il clique ou il écrit.
    // Motif complet au module.
    //
    // `create` et non `upsert` : répondre deux fois fait deux lignes. Rien ne
    // s'écrase, et c'est ainsi qu'un changement d'avis reste lisible.
    // 7 bis — LA FENÊTRE, POUR LE SEUL GESTE QUI EN A UNE.
    //
    // Le module pur a vérifié que le jalon EXISTE ; il ne peut pas vérifier
    // qu'il est OUVERT — cela demande l'ancre, donc la base. Sans ce contrôle,
    // un client posterait un `J90` le troisième jour : la ligne serait valide
    // en base (le CHECK ne connaît que la taxonomie) et daterait un point
    // d'étape d'un moment que le patient n'a pas vécu. Le praticien lirait
    // ensuite ce récit comme s'il avait eu lieu à sa date.
    //
    // L'ÉCRAN NE SUFFIT PAS À GARDER CETTE BORNE : il n'affiche que l'étape
    // ouverte, mais une horloge de navigateur décalée, un onglet resté ouvert
    // une semaine, ou un POST direct contournent l'écran — pas ceci.
    if (prepare.geste === 'reponse_jalon') {
      const ancre = await prisma.assessmentEpisode.findFirst({
        where: { idPatient: patient.idPatient, milestone: ANCRE_JALON },
        select: { confirmedAt: true },
        orderBy: { confirmedAt: 'desc' },
      });
      const fenetre = jalonObjectifDu(ancre?.confirmedAt ?? null, new Date());
      if (fenetre.statut !== 'ouverte' || fenetre.jalon !== prepare.donnees.jalon) {
        return echec(
          'jalon_ferme',
          'Cette étape n’est pas ouverte en ce moment. Rechargez la page pour voir où vous en êtes.',
          409,
        );
      }

      const reponse = await prisma.reponseJalonObjectif.create({
        data: {
          idPatient: patient.idPatient,
          idObjectif: prepare.donnees.idObjectif,
          jalon: prepare.donnees.jalon,
          texte: prepare.donnees.texte,
          // `null` explicite quand l'échelle n'a pas été remplie. La colonne
          // n'a PAS de DEFAULT : rien ne viendrait y poser un zéro à notre
          // place, et rien ne doit y en poser un ici non plus.
          eva: prepare.donnees.eva,
        },
        select: { id: true, idObjectif: true, jalon: true, texte: true, eva: true, creeLe: true },
      });

      return NextResponse.json<PortailDossierResponse>(
        {
          ok: true,
          reponseJalon: {
            id: reponse.id,
            idObjectif: reponse.idObjectif,
            jalon: reponse.jalon,
            texte: reponse.texte,
            eva: reponse.eva,
            creeLe: reponse.creeLe.toISOString(),
          },
        },
        { status: 201 },
      );
    }

    if (prepare.geste === 'amendement') {
      const amendement = await prisma.amendementObjectif.create({
        data: {
          idPatient: patient.idPatient,
          idObjectif: prepare.donnees.idObjectif,
          texte: prepare.donnees.texte,
        },
        select: { id: true, idObjectif: true, texte: true, creeLe: true },
      });

      return NextResponse.json<PortailDossierResponse>(
        {
          ok: true,
          amendement: {
            id: amendement.id,
            idObjectif: amendement.idObjectif,
            texte: amendement.texte,
            creeLe: amendement.creeLe.toISOString(),
          },
        },
        { status: 201 },
      );
    }

    const creee = await prisma.ratificationObjectif.create({
      data: {
        idPatient: patient.idPatient,
        idObjectif: prepare.donnees.idObjectif,
        sens: prepare.donnees.sens,
      },
      select: { id: true, idObjectif: true, sens: true, creeLe: true },
    });

    return NextResponse.json<PortailDossierResponse>(
      {
        ok: true,
        ratification: {
          id: creee.id,
          idObjectif: creee.idObjectif,
          sens: creee.sens,
          creeLe: creee.creeLe.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (err) {
    // JAMAIS le contenu du dossier, jamais l'e-mail du patient dans un log.
    console.error('[portail/dossier POST]', messageJournalisable(err));
    return echec('exception', 'Erreur technique.', 500);
  }
}
