import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authentifierPatientPortail } from '@/lib/trust/portailAuth';
import { isComprehensionEnabled } from '@/lib/patient/featureFlag';
import { termeAnxiogene } from '@/lib/documents/vocabulaire';
import { logger } from '@/lib/observability/logger';
import { EVENT_CODES } from '@/lib/observability/eventCodes';
import { createRequestContext, finalizeLogContext } from '@/lib/observability/requestContext';
import {
  preparerDesaccord,
  syntheseServieAuPatient,
  type RefusDesaccord,
} from '@/lib/praticien/syntheseComprehension';

// « Ce que j'ai compris de vous » (Alliance 6.0-A, LOT-04) — route PORTAIL.
// Classe AUTH : le contrôle d'accès prime sur tout le reste.
//
// GET sert la synthèse publiée courante et les désaccords du patient ; POST
// dépose un désaccord. PAS DE PATCH, PAS DE DELETE — un désaccord ne se
// supprime pas, ne se ferme pas, ne se transforme pas en note privée. Il n'y a
// pas de verbe pour cela, et c'est la forme de l'invariant.
//
// CHEMIN SORTANT GARDÉ (carte du Socle, `documents/vocabulaire.ts`). Régime
// JOURNALISANT ici, et CONFIRMABLE à la publication côté praticien (`D-090`).
// L'asymétrie est le raisonnement même : le refus confirmable exige un humain
// pour trancher, et il y en a un au moment de publier — il n'y en a aucun au
// moment où le patient ouvre sa page. Bloquer ici afficherait une page d'erreur
// à un patient pour un texte qu'il n'a pas écrit et qu'il ne peut pas corriger.
//
// Aucun e-mail, aucune notification : le portail est en modèle « pull », le
// patient lit en venant. Tout message neuf passerait par le registre de
// gabarits, hors périmètre de ce lot — ne pas recopier
// `notifierPraticienSignalement` d'`api/portail/trust/signalement`.
//
// Aucun agrégat, aucun décompte, aucune notation : ni le nombre de désaccords,
// ni un « taux d'accord ». Compter les désaccords d'un patient poserait une
// borne sans provenance (`DC-19`/`DC-20`) et transformerait une parole en note.

export type SyntheseServie = {
  id: string;
  texte: string;
  /** Déclaration du praticien — `null` s'il n'a rien déclaré. Jamais comblée. */
  redigeeLe: string | null;
  publieeLe: string;
};

export type DesaccordServi = {
  id: string;
  idSynthese: string;
  texte: string | null;
  /** Déclaration du patient — `null` quand il n'a rien déclaré. Jamais comblée. */
  exprimeLe: string | null;
  creeLe: string;
};

export type PortailComprehensionResponse =
  | { ok: true; ouvert: true }
  | {
      ok: true;
      /**
       * `null` = aucune synthèse publiée. C'est un SILENCE, pas une réponse
       * (`DC-24`) : l'écran doit dire « votre praticien n'a rien publié pour
       * l'instant », jamais « rien à signaler ».
       */
      synthese: SyntheseServie | null;
      /** Les désaccords du patient, y compris ceux visant une version révisée. */
      desaccords: DesaccordServi[];
    }
  | { ok: true; desaccord: DesaccordServi }
  | { ok: false; reason: string; error: string };

/**
 * BORNE TECHNIQUE DE TRANSPORT — 64 Kio, en octets annoncés. Ce n'est PAS un
 * seuil : ni clinique, ni un plafond de saisie, et elle ne se substitue pas à
 * `LONGUEUR_MAX_DESACCORD` (4 000 caractères), qui reste la seule borne opposée
 * au patient et qui refuse au lieu de tronquer. Chiffre d'ingénierie, identifié
 * comme tel (`DC-20`). Précédent mot pour mot :
 * `api/portail/ce-qui-compte/route.ts`.
 */
const TAILLE_CORPS_MAX_OCTETS = 64 * 1024;

const MESSAGE_CORPS_TROP_GROS = 'Requête trop volumineuse.';

/** Borne technique sur la référence de version : un identifiant `cuid`. */
const LONGUEUR_MAX_ID = 64;

const MESSAGES_REFUS: Record<RefusDesaccord, string> = {
  texte_trop_long:
    'Ce texte est trop long. Raccourcissez-le avant d’envoyer — rien n’est coupé automatiquement.',
  synthese_absente: 'Aucune version n’est visée par ce désaccord.',
  date_invalide: 'La date indiquée n’est pas lisible.',
  date_future: 'La date indiquée est dans le futur.',
};

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<PortailComprehensionResponse>({ ok: false, reason, error }, { status });
}

/** Surface fermée : 503, jamais 404 — le chemin existe, il n'est pas ouvert. */
function surfaceFermee() {
  return echec('feature_disabled', 'Cet espace n’est pas encore ouvert.', 503);
}

/**
 * Ce qu'on a le droit d'écrire au journal — SÛR PAR CONSTRUCTION. Les erreurs
 * Prisma recopient les ARGUMENTS de la requête dans leur message
 * (`PrismaClientValidationError` rend le `data:` du `create`, donc le TEXTE du
 * désaccord). On n'en garde que la CLASSE et le marqueur Prisma (`P2002`…), ni
 * l'un ni l'autre ne pouvant porter une valeur. Patron et motif complets :
 * `api/portail/ce-qui-compte/route.ts`.
 *
 * `marqueurPrisma` et non `code` : la garde anti-diagnostic
 * (`comprehensionAppendOnly.guard.test.ts`, G3) refuse tout nom commençant par
 * « code ». C'est ici un faux positif — il s'agit d'un code d'ERREUR — mais on
 * renomme plutôt que d'assouplir une garde qui vise les codes DIAGNOSTIQUES :
 * l'exception la rendrait contournable par un nom bien choisi.
 */
function messageJournalisable(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  if (!err.name.startsWith('PrismaClient')) return err.message;
  const marqueurPrisma = (err as { code?: unknown }).code;
  return typeof marqueurPrisma === 'string' ? `${err.name} (${marqueurPrisma})` : err.name;
}

const SELECTION_SYNTHESE = {
  id: true,
  texte: true,
  redigeeLe: true,
  publieeLe: true,
  creeLe: true,
  supersedesSyntheseId: true,
} as const;

/**
 * GET — la synthèse publiée courante et les désaccords du patient.
 *
 * DRAPEAU D'ABORD, fail-closed : une surface fermée ne fait travailler ni la
 * vérification de session, ni la base. L'effet assumé — l'état du drapeau
 * devient devinable — est celui déjà arbitré au LOT-03 : ce qui ne fuit pas,
 * c'est la moindre donnée patient.
 */
export async function GET(req: Request): Promise<NextResponse<PortailComprehensionResponse>> {
  if (!isComprehensionEnabled()) return surfaceFermee();

  try {
    // `authentifierPatientPortail` et NON `authorizePortail` : celui-ci exige
    // une assignation et rendrait 404 pour un patient qui n'en a plus. Or une
    // synthèse de compréhension n'est adossée à aucun questionnaire ; précédent
    // motivé mot pour mot dans `api/portail/bilan/route.ts` — un patient dont
    // le suivi est terminé garde ses droits propres.
    const auth = await authentifierPatientPortail(req);
    if (auth.erreur) return auth.erreur as NextResponse<PortailComprehensionResponse>;
    const patient = auth.patient;

    // ── INTERRUPTEUR — « cette surface est-elle ouverte pour vous » ─────────
    //
    // Le hub du portail est un composant client : il ne peut pas lire
    // `WN_COMPREHENSION` (variable non `NEXT_PUBLIC_*`, absente du bundle
    // navigateur). C'est donc la route qui décide de la visibilité du lien —
    // même idiome qu'`api/portail/ce-qui-compte`.
    //
    // MAIS PAR UN MODE DÉDIÉ, ET C'EST LE POINT. Faire sonder la route de
    // SERVICE aurait trois effets, tous mauvais : deux `findMany` à chaque
    // visite de l'accueil ; le texte intégral de la synthèse transporté au
    // navigateur pour être jeté ; et surtout l'émission de
    // `PORTAIL_COMPREHENSION_REGISTRE_ANXIOGENE` — un événement qui dit
    // « la synthèse SERVIE emploie… » — pour une page que personne n'a
    // ouverte. L'événement deviendrait faux et son volume celui des visites.
    // C'est la version observabilité d'un accès journalisé qui n'a pas eu
    // lieu. (Revue LOT-04, M3.)
    if (new URL(req.url).searchParams.get('interrupteur') === '1') {
      return NextResponse.json<PortailComprehensionResponse>({ ok: true, ouvert: true });
    }

    const [lignes, desaccords] = await Promise.all([
      prisma.syntheseComprehension.findMany({
        where: { idPatient: patient.idPatient },
        select: SELECTION_SYNTHESE,
        orderBy: { creeLe: 'desc' },
      }),
      prisma.desaccordComprehension.findMany({
        where: { idPatient: patient.idPatient },
        select: { id: true, idSynthese: true, texte: true, exprimeLe: true, creeLe: true },
        orderBy: { creeLe: 'desc' },
      }),
    ]);

    // LE FILTRE EST DANS LE MODULE, PAS DANS LE `where`, et c'est délibéré :
    // « publiée » ne suffit pas — il faut la TÊTE publiée. Une version publiée
    // puis révisée montrerait au patient un texte que le praticien a déjà
    // corrigé. `syntheseServieAuPatient` porte cette règle et son banc.
    const servie = syntheseServieAuPatient(lignes);

    // ── RE-VÉRIFICATION AU SERVICE, RÉGIME JOURNALISANT (`D-090`) ───────────
    //
    // La publication a déjà passé la garde confirmable. Celle-ci est la
    // seconde barrière du chemin sortant : elle rattrape une ligne publiée
    // avant que le registre ne s'enrichisse, ou confirmée à tort. Elle ne
    // bloque pas — voir l'en-tête du fichier.
    //
    // BANC DE DÉBRANCHEMENT : `route.test.ts` doit ROUGIR si ce bloc disparaît.
    if (servie && termeAnxiogene(servie.texte)) {
      logger.warn({
        event: EVENT_CODES.PORTAIL_COMPREHENSION_REGISTRE_ANXIOGENE,
        domain: 'PORTAIL_PATIENT',
        // Ni le terme, ni le texte, ni l'identifiant du patient : rien de
        // clinique ni de nominatif en log.
        message: 'La synthèse de compréhension servie emploie un registre anxiogène',
        context: finalizeLogContext(createRequestContext(req), { retryable: false }),
      });
    }

    return NextResponse.json<PortailComprehensionResponse>({
      ok: true,
      synthese: servie
        ? {
            id: servie.id,
            texte: servie.texte,
            redigeeLe: servie.redigeeLe ? servie.redigeeLe.toISOString() : null,
            // Non-nul par construction : `syntheseServieAuPatient` ne rend que
            // des lignes publiées.
            publieeLe: servie.publieeLe!.toISOString(),
          }
        : null,
      desaccords: desaccords.map((ligne) => ({
        id: ligne.id,
        idSynthese: ligne.idSynthese,
        texte: ligne.texte,
        exprimeLe: ligne.exprimeLe ? ligne.exprimeLe.toISOString() : null,
        creeLe: ligne.creeLe.toISOString(),
      })),
    });
  } catch (err) {
    console.error('[portail/comprehension GET]', messageJournalisable(err));
    return echec('exception', 'Erreur technique.', 500);
  }
}

type CorpsDesaccord = {
  idSynthese?: unknown;
  texte?: unknown;
  exprimeLe?: unknown;
  /**
   * Toléré à la lecture du type, IGNORÉ à l'exécution — jamais comparé. Le
   * comparer laisserait croire qu'il compte, et un jour quelqu'un écrirait
   * `corps.idPatient ?? session.idPatient` en pensant relâcher une garde
   * décorative.
   */
  idPatient?: unknown;
};

// POST /api/portail/comprehension — dépose un désaccord. 201.
export async function POST(req: Request): Promise<NextResponse<PortailComprehensionResponse>> {
  // 1 — DRAPEAU D'ABORD, fail-closed (même motif qu'au GET).
  if (!isComprehensionEnabled()) return surfaceFermee();

  try {
    // 2 — AUTH ENSUITE, avant le corps.
    //     401 = session absente, expirée ou illisible ; 403 = cookie lisible
    //     mais COMPTE refusé (désactivé, jeton révoqué, sessions invalidées).
    const auth = await authentifierPatientPortail(req);
    if (auth.erreur) return auth.erreur as NextResponse<PortailComprehensionResponse>;
    const patient = auth.patient;

    // DOSSIER CLOS : LE DÉSACCORD RESTE AUTORISÉ, délibérément — et ici plus
    // encore qu'au LOT-03. La clôture est un état du SUIVI PRATICIEN, pas un
    // ordre de silence fait au patient ; couper la contestation à la clôture
    // permettrait de clore un dossier pour rendre sa synthèse incontestable.
    // Ne pas « corriger » cette absence de garde en la posant. La révocation du
    // compte, elle, ferme bien la route (403 ci-dessus).

    // 3 — TAILLE DU CORPS, AVANT DE LE LIRE. Deux étages : `content-length`
    //     annoncé (refus sec, rien n'est bufférisé), puis la même borne sur le
    //     texte lu — un client peut imposer un transfert `chunked` sans
    //     annonce, ou mentir. Motif complet : `ce-qui-compte/route.ts`.
    const annonce = Number(req.headers.get('content-length'));
    if (Number.isFinite(annonce) && annonce > TAILLE_CORPS_MAX_OCTETS) {
      return echec('corps_trop_gros', MESSAGE_CORPS_TROP_GROS, 400);
    }

    // 4 — CORPS.
    const brut = await req.text();
    if (brut.length > TAILLE_CORPS_MAX_OCTETS) {
      return echec('corps_trop_gros', MESSAGE_CORPS_TROP_GROS, 400);
    }
    let corps: CorpsDesaccord;
    try {
      corps = JSON.parse(brut) as CorpsDesaccord;
    } catch {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }
    if (corps === null || typeof corps !== 'object' || Array.isArray(corps)) {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }

    // 5 — VALIDATION PURE. Aucune troncature : un texte trop long est refusé.
    const preparation = preparerDesaccord({
      idPatient: patient.idPatient,
      idSynthese: typeof corps.idSynthese === 'string' ? corps.idSynthese : null,
      texte: typeof corps.texte === 'string' ? corps.texte : null,
      exprimeLe: typeof corps.exprimeLe === 'string' ? corps.exprimeLe : null,
    });
    if (!preparation.ok) {
      return echec(preparation.raison, MESSAGES_REFUS[preparation.raison], 400);
    }
    if (preparation.donnees.idSynthese.length > LONGUEUR_MAX_ID) {
      return echec('synthese_introuvable', 'Cette version est introuvable.', 404);
    }

    // 6 — LA VERSION CONTESTÉE EXISTE, APPARTIENT AU DOSSIER, ET A ÉTÉ PUBLIÉE.
    //
    //     Les trois conditions, et la troisième compte autant que les deux
    //     autres : un patient ne peut pas contester un BROUILLON qu'il n'a
    //     jamais vu. Sans elle, une référence devinée permettrait d'accrocher
    //     un désaccord à un texte que le praticien n'a pas encore assumé.
    //
    //     INEXISTANTE, D'UN AUTRE DOSSIER, OU NON PUBLIÉE : MÊME réponse, MÊME
    //     message, MÊME statut. Les distinguer ferait de la route un oracle
    //     d'existence, interrogeable avec n'importe quelle session patient
    //     (patron `agenda-alimentaire/portail.ts`).
    const visee = await prisma.syntheseComprehension.findFirst({
      // Scopé au dossier : le seul index de la table est
      // `(id_patient, cree_le)`. Un `findUnique` sur l'id seul ne l'emprunte
      // pas, et laisserait le filtre d'appartenance en aval de la lecture.
      where: {
        id: preparation.donnees.idSynthese,
        idPatient: patient.idPatient,
        publieeLe: { not: null },
      },
      select: { id: true },
    });
    if (!visee) {
      return echec('synthese_introuvable', 'Cette version est introuvable.', 404);
    }

    // 7 — ÉCRITURE UNIQUE.
    //
    // `idPatient` VIENT DE LA SESSION, JAMAIS DU CORPS (cf. `CorpsDesaccord`).
    // `creeLe` n'est PAS transmis : la base pose le présent (`@default(now())`)
    // — c'est ce qui rend un désaccord inantidatable, et c'est la seconde des
    // deux dates. `exprimeLe` reste `null` s'il l'est, jamais comblé par
    // `creeLe`, ici ni à l'affichage.
    //
    // `create` et non `upsert` : contester deux fois fait deux lignes. Rien ne
    // s'écrase, rien ne se remplace.
    const creee = await prisma.desaccordComprehension.create({
      data: {
        idPatient: patient.idPatient,
        idSynthese: preparation.donnees.idSynthese,
        texte: preparation.donnees.texte,
        exprimeLe: preparation.donnees.exprimeLe,
      },
      select: { id: true, idSynthese: true, texte: true, exprimeLe: true, creeLe: true },
    });

    return NextResponse.json<PortailComprehensionResponse>(
      {
        ok: true,
        desaccord: {
          id: creee.id,
          idSynthese: creee.idSynthese,
          texte: creee.texte,
          exprimeLe: creee.exprimeLe ? creee.exprimeLe.toISOString() : null,
          creeLe: creee.creeLe.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (err) {
    // JAMAIS le texte déposé, jamais l'e-mail du patient dans un log.
    console.error('[portail/comprehension POST]', messageJournalisable(err));
    return echec('exception', 'Erreur technique.', 500);
  }
}
