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
  etatRatification,
  objectifsCourants,
  preparerRatification,
  type EtatRatification,
  type RefusRatification,
} from '@/lib/praticien/objectifNegocie';
import { syntheseServieAuPatient } from '@/lib/praticien/syntheseComprehension';

// Le « dossier à deux voix » (Alliance 6.0-A, LOT-06) — route PORTAIL.
// Classe AUTH : le contrôle d'accès prime sur tout le reste.
//
// GET assemble les trois objets de la campagne pour le patient — l'objectif
// négocié et son état, ce qui compte pour lui, la synthèse de compréhension et
// ses désaccords. POST dépose une RATIFICATION : le geste par lequel le patient
// dit « c'est bien ça » ou « ce n'est pas exactement ça » sur l'objectif.
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
       * `null` = le bloc n'est pas ouvert (drapeau éteint), et il est alors
       * ABSENT de l'écran. Un tableau vide, lui, est un vrai silence du patient
       * ou du praticien — les deux ne se confondent pas (`DC-24`).
       */
      ceQuiCompte: EntreeServie[] | null;
      comprehension: { synthese: SyntheseServie | null; desaccords: DesaccordServi[] } | null;
    }
  | { ok: true; ratification: RatificationServie }
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
    const [objectifs, ratifications, entrees, syntheses, desaccords] = await Promise.all([
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
        etat: etatRatification(ligne.id, ratifications),
      })),
      ratifiable: tetes.length === 1,
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
};

// POST /api/portail/dossier — dépose une ratification. 201.
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

    // 5 — VALIDATION PURE, et `sens` EN FAIT PARTIE. Le CHECK en base est un
    //     filet, pas une validation : sans ce contrôle, « peut_etre » sortirait
    //     en erreur Prisma, donc en 500, pour une requête simplement malformée.
    const preparation = preparerRatification({
      idPatient: patient.idPatient,
      idObjectif: typeof corps.idObjectif === 'string' ? corps.idObjectif : null,
      sens: typeof corps.sens === 'string' ? corps.sens : null,
    });
    if (!preparation.ok) {
      return echec(preparation.raison, MESSAGES_REFUS[preparation.raison], 400);
    }
    if (preparation.donnees.idObjectif.length > LONGUEUR_MAX_ID) {
      return echec('objectif_introuvable', MESSAGE_OBJECTIF_INTROUVABLE, 404);
    }

    // 6 — TROIS VÉRIFICATIONS, ET `id_objectif` N'A PAS DE CLÉ ÉTRANGÈRE.
    //
    //     La migration assume une référence SOUPLE et renvoie explicitement ces
    //     contrôles à la route (`migration.sql:17-20`). Sans eux, une référence
    //     devinée accrocherait une ratification à n'importe quoi.
    //
    //     (a) l'objectif existe ET appartient au dossier. INEXISTANT ou D'UN
    //         AUTRE DOSSIER : MÊME réponse, MÊME message, MÊME statut — les
    //         distinguer ferait de la route un oracle d'existence, interrogeable
    //         avec n'importe quelle session patient.
    //     (b) c'est une TÊTE de chaîne : ratifier une version déjà reformulée
    //         ferait porter l'accord du patient sur un texte qui n'engage plus.
    //     (c) il n'y en a QU'UNE. Deux têtes rivales, et rien ne dit laquelle
    //         engage : ratifier « la plus récente » trancherait en silence une
    //         discordance que `DC-30` demande de signaler. L'écran le dit et ne
    //         propose rien tant qu'elle dure.
    //
    //     La lecture couvre tout le dossier, et non la seule ligne visée : sans
    //     les autres lignes, (b) et (c) sont indécidables.
    const objectifs = await prisma.objectifNegocie.findMany({
      // Scopé au dossier : le seul index de la table est `(id_patient, cree_le)`.
      where: { idPatient: patient.idPatient },
      select: { id: true, supersedesObjectifId: true, creeLe: true },
    });

    const vise = objectifs.find((ligne) => ligne.id === preparation.donnees.idObjectif);
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

    // 7 — ÉCRITURE UNIQUE, ET C'EST LE SEUL ENDROIT DE L'APPLICATION QUI ÉCRIT
    //     UNE RATIFICATION. La garde structurelle de
    //     `objectifNegocie.guard.test.ts` épingle ce fichier nommément : le
    //     geste appartient au patient, une route praticien qui créerait cette
    //     ligne fabriquerait un acte que personne n'a posé.
    //
    // `idPatient` VIENT DE LA SESSION, JAMAIS DU CORPS (cf. `CorpsRatification`).
    // AUCUNE DATE n'est transmise : `creeLe` est posée par `@default(now())`, et
    // `gesteLe` reste nulle — c'est une colonne de DÉCLARATION, et le patient ne
    // déclare pas de date, il clique. Motif complet au module.
    //
    // `create` et non `upsert` : répondre deux fois fait deux lignes. Rien ne
    // s'écrase, et c'est ainsi qu'un changement d'avis reste lisible.
    const creee = await prisma.ratificationObjectif.create({
      data: {
        idPatient: patient.idPatient,
        idObjectif: preparation.donnees.idObjectif,
        sens: preparation.donnees.sens,
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
