import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import type { GabaritAcces } from '@/lib/praticien/journalAcces';
import {
  preparerCorrespondance,
  sensExpose,
  type SensCorrespondance,
  type VerdictAncre,
} from '@/lib/praticien/correspondanceMedecin';
import {
  accepteNouvelEnvoi,
  MESSAGE_DOSSIER_CLOS,
  RAISON_DOSSIER_CLOS,
} from '@/lib/patient/cycleDeVie';
import { statutPartageMedecinTraitant } from '@/lib/trust/consentementPartage';
import { INDICATIONS_BIOLOGIE_SHA256 } from '@/lib/biology-library/indicationsBiologieV1';
import type { StatutChoix } from '@/lib/trust/types';

// Fil de correspondance médecin (C3 LOT-06, V1 = transcription praticien).
//
// UNE SEULE ROUTE, GET + POST, le sens dans le corps : consigner un envoi et
// transcrire une réponse écrivent la même table avec exactement les mêmes
// gardes — deux routes dupliqueraient `garder()` sans aucun gain de sûreté.
//
// Le médecin n'accède à rien, l'application n'envoie rien. PRATICIEN SEUL,
// garde d'appartenance appliquée.
//
// DOSSIER CLOS = CONSIGNATION REFUSÉE, POUR LES DEUX SENS (FM-2 : la
// correspondance est une pièce du dossier ; `accepteNouvelEnvoi` est le point
// de décision unique — leçon #181). Le cas réel « réponse arrivée après
// clôture » a un chemin propre : rouvrir le suivi, transcrire, reclôturer —
// la clôture est réversible. La LECTURE, elle, n'est jamais refusée : la
// clôture promet la lecture des archives.
//
// TRUST : l'état du consentement « partage médecin traitant » est EXPOSÉ,
// jamais opposé (décision utilisateur du 2026-07-22) — le partage a lieu hors
// application ; bloquer la consignation rendrait le dossier aveugle sans
// protéger personne.

const ID_PATIENT_PATTERN = /^[A-Za-z0-9_-]+$/;

// Gabarit littéral pour le journal des accès (G-TRUST-04) — jamais l'URL reçue.
const ROUTE_JOURNAL = '/api/praticien/correspondance-medecin';

/**
 * Verdict d'ancrage d'une lettre, calculé côté serveur.
 *
 * `sans_ancrage` n'est PAS `perimee` ([[DC-24]]) : une lettre sans ancre est
 * antérieure à [[D-073]], ou n'est pas un courrier biologique. La présenter
 * comme périmée ferait porter un soupçon à tout l'historique.
 *
 * `reference_inconnue` n'est PAS `perimee` non plus, et pour la même raison :
 * une ancre dont la VERSION n'est dans aucune table connue du produit n'a pas
 * bougé — c'est le produit qui ne sait pas la lire. Dire « périmée » ferait
 * de chaque lettre d'un écrivain non enregistré une fausse alerte.
 *
 * COMPOSÉ, JAMAIS RECOPIÉ : les verdicts qui attestent une ancre vivent dans
 * le domaine, qui s'en sert pour nommer les lignes du fil. Deux listes
 * auraient divergé — un verdict neuf ici, et l'écran cesserait silencieusement
 * de reconnaître l'origine des lettres qui le portent.
 */
export type VerdictAncrage = VerdictAncre | 'sans_ancrage';

export type CorrespondanceExposee = {
  id: string;
  /** `null` si la valeur en base est hors vocabulaire — voir `sensExpose`. */
  sens: SensCorrespondance | null;
  medecinLibelle: string;
  texte: string;
  idSynthese: string | null;
  echangeLe: string | null;
  consigneLe: string;
  // Seul le VERDICT traverse HTTP : ni le SHA ni la version. Servis au client,
  // ils inviteraient à recomparer côté navigateur — et à le faire mal.
  ancrage: VerdictAncrage;
};

export type CorrespondancePatientExposee = {
  id: string;
  type: string;
  objet: string;
  statut: string;
  canal: string;
  referenceType: string | null;
  referenceId: string | null;
  enregistreLe: string;
};

export type CorrespondanceMedecinApiResponse =
  | {
      ok: true;
      correspondances: CorrespondanceExposee[];
      correspondancesPatient: CorrespondancePatientExposee[];
      accepteConsignation: boolean;
      partageMedecinTraitant: StatutChoix | null;
    }
  | { ok: true; correspondance: CorrespondanceExposee }
  | { ok: false; reason: string; error: string };

const MESSAGES_REFUS: Record<string, string> = {
  sens_invalide: 'Sens de l’échange invalide (envoi ou réponse).',
  medecin_libelle_vide: 'Indiquez le médecin concerné (désignation libre).',
  medecin_libelle_email:
    'Désignez le médecin sans adresse e-mail : seule une désignation libre est conservée.',
  medecin_libelle_trop_long: 'La désignation du médecin est trop longue.',
  texte_vide: 'Le texte de l’échange est vide.',
  texte_trop_long: 'Le texte de l’échange est trop long (8 000 caractères maximum).',
  date_echange_invalide: 'Date de l’échange illisible.',
  date_echange_future: 'La date de l’échange ne peut pas être dans le futur.',
};

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<CorrespondanceMedecinApiResponse>(
    { ok: false, reason, error },
    { status },
  );
}

/**
 * ANCRAGES CONNUS — la version portée par la ligne → le SHA qu'elle doit
 * porter. UN SEUL écrivain ancré existe aujourd'hui ; la table est le verrou
 * du SECOND.
 *
 * Le verdict se rendait en dur contre la table d'indications biologiques.
 * Une lettre ancrée sur une AUTRE table signée — la lettre d'adressage, sur
 * les signaux de sécurité — aurait donc porté « ancrage périmé » sur chacune
 * de ses lignes, sans qu'aucune règle clinique n'ait bougé : une fausse
 * alerte sur toute une chaîne, produite par la seule arrivée d'un second
 * écrivain. Le verdict se rend donc PAR la version que la ligne déclare.
 *
 * COPIE ASSUMÉE des littéraux écrits par les générateurs — ici
 * `genererCourrierBiologie` (`lib/biology-library/courrier.ts`, bloc
 * `provenance`) : ces fichiers sont des tables SIGNÉES, et y ajouter un
 * export serait une modification clinique ([[DC-17]], [[DC-18]]). Deux
 * littéraux peuvent diverger en silence — et une divergence ferait dire
 * « périmée » à des lettres concordantes. Le banc de cette route épingle la
 * copie sur la source : il génère un vrai courrier et sert sa provenance
 * telle quelle. Il rougit si l'un des deux bouge. UN ÉCRIVAIN AJOUTÉ SANS SA
 * LIGNE ICI ne ment pas pour autant : il rend `reference_inconnue`.
 *
 * Une `Map` et non un objet : la clé vient de la BASE, pas du code, et une
 * ligne dont la version vaudrait `constructor` ou `toString` ferait rendre à
 * un `Record` une valeur héritée du prototype — donc « périmée » au lieu de
 * « inconnue ». `Map.get` ne connaît que ce qu'on y a mis.
 */
const SHA_ATTENDU_PAR_VERSION: ReadonlyMap<string, string> = new Map([
  ['indications-biologie-v1', INDICATIONS_BIOLOGIE_SHA256],
]);

/**
 * Le verdict se rend sur les DEUX termes, et chacun détecte autre chose — la
 * distinction vaut d'être écrite, parce qu'elle est plus étroite qu'il n'y
 * paraît (revue du 2026-08-20) :
 *
 * - le **SHA** porte toute la détection réelle de péremption. C'est
 *   `INDICATIONS_BIOLOGIE_SHA256`, le SHA VIVANT recalculé à l'import depuis
 *   les règles publiées — dès qu'une règle bouge, il ne concorde plus ;
 * - la **version** ne détecte PAS une re-signature qui bumperait
 *   `INDICATIONS_BIOLOGIE_METADATA.version` sans toucher aux règles : le
 *   littéral estampillé par `courrier.ts` est en dur, il ne dérive pas de la
 *   métadonnée. **C'est voulu, et tranché : [[D-079]] pose que LE SHA FAIT
 *   FOI** — une lettre dont le contenu de référence n'a pas bougé reste
 *   concordante, la péremption signale un écart de FOND et jamais un acte
 *   administratif. Ne pas « corriger » cet écart en faisant dériver
 *   l'estampille de la métadonnée : ce serait renverser la décision, et
 *   toucher une table signée.
 * - ce que le terme de version garde tout de même : la divergence entre ce qui
 *   est ESTAMPILLÉ et ce qui est COMPARÉ, deux littéraux qui n'ont aucune
 *   raison de différer. Un banc de cette route confronte les trois porteurs et
 *   rougit si l'un bouge.
 *
 * Non exporté : le banc doit l'éprouver À TRAVERS la route. Appelé à côté, il
 * prouverait que la fonction est juste sans rien dire de ce qui est servi.
 */
function verdictAncrage(sha: string | null, version: string | null): VerdictAncrage {
  // AU MOINS UN nul, pas « les deux nuls » : le CHECK
  // `c3_correspondance_ancrage_complet_check` (migration
  // 20260818140000_ancrage_correspondance_medecin) interdit déjà la demi-ancre
  // en base, dans les deux sens. Si elle arrivait tout de même, elle resterait
  // une donnée ABSENTE, jamais un défaut à afficher ([[DC-24]]) — cette garde
  // applicative est une défense en profondeur, et les deux sens sont éprouvés.
  if (!sha || !version) return 'sans_ancrage';
  const attendu = SHA_ATTENDU_PAR_VERSION.get(version);
  // La version inconnue sort AVANT la comparaison : sans cette porte, toute
  // ancre non enregistrée retomberait sur « périmée » — le faux positif que
  // la table existe pour supprimer.
  if (attendu === undefined) return 'reference_inconnue';
  return sha === attendu ? 'concordante' : 'perimee';
}

function exposer(ligne: {
  id: string;
  sens: string;
  medecinLibelle: string;
  texte: string;
  idSynthese: string | null;
  echangeLe: Date | null;
  consigneLe: Date;
  ancrageSha256: string | null;
  ancrageVersion: string | null;
}): CorrespondanceExposee {
  return {
    id: ligne.id,
    sens: sensExpose(ligne.sens),
    medecinLibelle: ligne.medecinLibelle,
    texte: ligne.texte,
    // Référence souple : un id disparu est exposé tel quel, l'écran le tolère
    // (constat AC-5 de la revue de la PR 1) — jamais d'échec de lecture ici.
    idSynthese: ligne.idSynthese,
    echangeLe: ligne.echangeLe ? ligne.echangeLe.toISOString() : null,
    consigneLe: ligne.consigneLe.toISOString(),
    ancrage: verdictAncrage(ligne.ancrageSha256, ligne.ancrageVersion),
  };
}

const SELECTION = {
  id: true,
  sens: true,
  medecinLibelle: true,
  texte: true,
  idSynthese: true,
  echangeLe: true,
  consigneLe: true,
  // Les deux colonnes d'ancrage de [[D-073]], et RIEN d'autre : le fil sert
  // des lettres, pas le schéma. Elles ne sortent pas d'ici — `exposer` les
  // consomme et n'expose que le verdict.
  ancrageSha256: true,
  ancrageVersion: true,
} as const;

type Garde =
  | { echec: NextResponse<CorrespondanceMedecinApiResponse>; email?: undefined }
  | { echec?: undefined; email: string };

/**
 * Session + identifiant + appartenance. Retourne l'e-mail praticien ou une
 * réponse d'échec. `acces` n'est transmis que par le GET : seule la lecture
 * du fil est une consultation de dossier à journaliser (G-TRUST-04).
 */
async function garder(idPatient: string, acces?: GabaritAcces): Promise<Garde> {
  const session = await getServerSession(authOptions);
  if (!session) return { echec: echec('unauthenticated', 'Authentification requise.', 401) };

  if (!idPatient || !ID_PATIENT_PATTERN.test(idPatient) || idPatient.length > 64) {
    return { echec: echec('invalid', 'Identifiant patient invalide.', 400) };
  }

  const email = emailPraticien(session);
  const appartenance = await verifierAppartenancePatient(idPatient, email, acces);
  if (appartenance === 'introuvable') {
    return { echec: echec('patient_not_found', 'Patient introuvable.', 404) };
  }
  if (appartenance === 'autre_praticien') {
    return { echec: echec('forbidden', 'Patient non accessible pour ce praticien.', 403) };
  }

  return { email: email ?? '' };
}

// Le fil se lit dans la chronologie de L'ÉCHANGE, pas dans celle de la saisie :
// une lettre de juin transcrite aujourd'hui se range en juin, à sa place. La
// base ne sait pas trier sur `COALESCE`, et le fil n'est pas borné (aucun
// `take`) : l'ordre se pose ici, sur la liste complète.
//
// `consigneLe` reste le repli quand la date d'échange n'a pas été renseignée,
// reste le départage à date d'échange égale, et reste AFFICHÉ dans tous les
// cas — c'est la seule des deux qui ne peut pas être antidatée. C'est aussi
// pourquoi le compteur du rail ([[D-210]]) continue, lui, de mesurer l'attente
// sur `consigneLe` : une pastille ne se fonde pas sur une date saisie à la main.
function dateDeLecture(ligne: { echangeLe: Date | null; consigneLe: Date }): number {
  return (ligne.echangeLe ?? ligne.consigneLe).getTime();
}

function ordonnerFil<T extends { echangeLe: Date | null; consigneLe: Date }>(lignes: T[]): T[] {
  return [...lignes].sort(
    (a, b) => dateDeLecture(b) - dateDeLecture(a) || b.consigneLe.getTime() - a.consigneLe.getTime(),
  );
}

// GET /api/praticien/correspondance-medecin?idPatient= — le fil, du plus
// récent au plus ancien, avec l'état du dossier et du consentement.
export async function GET(req: Request): Promise<NextResponse<CorrespondanceMedecinApiResponse>> {
  try {
    const { searchParams } = new URL(req.url);
    const idPatient = (searchParams.get('idPatient') ?? '').trim();
    const garde = await garder(idPatient, { route: ROUTE_JOURNAL, methode: 'GET' });
    if (garde.echec) return garde.echec;

    const [lignes, communicationsPatient, patient, choix] = await Promise.all([
      prisma.correspondanceMedecin.findMany({
        where: { idPatient },
        select: SELECTION,
        orderBy: { consigneLe: 'desc' },
      }),
      prisma.correspondancePatient.findMany({
        where: { idPatient },
        select: {
          id: true,
          type: true,
          objet: true,
          statut: true,
          canal: true,
          referenceType: true,
          referenceId: true,
          enregistreLe: true,
        },
        orderBy: { enregistreLe: 'desc' },
      }),
      prisma.patient.findUnique({
        where: { idPatient },
        select: { actif: true, suiviClotureLe: true },
      }),
      prisma.trustChoiceEvent.findMany({
        where: { idPatient, finalite: 'partage_medecin_traitant' },
        select: { finalite: true, statut: true, enregistreLe: true },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      correspondances: ordonnerFil(lignes).map(exposer),
      correspondancesPatient: communicationsPatient.map((ligne) => ({
        ...ligne,
        enregistreLe: ligne.enregistreLe.toISOString(),
      })),
      // Courtoisie d'écran : la décision qui fait foi reste le 409 du POST.
      accepteConsignation: patient ? accepteNouvelEnvoi(patient) : false,
      partageMedecinTraitant: statutPartageMedecinTraitant(choix),
    });
  } catch (err) {
    console.error(
      '[praticien/correspondance-medecin GET]',
      err instanceof Error ? err.message : String(err),
    );
    return echec('exception', 'Erreur technique.', 500);
  }
}

type PostBody = {
  idPatient?: string;
  sens?: string;
  medecinLibelle?: string;
  texte?: string;
  idSynthese?: string | null;
  echangeLe?: string | null;
};

// POST /api/praticien/correspondance-medecin — consigne un envoi ou transcrit
// une réponse, daté du présent par la base.
export async function POST(req: Request): Promise<NextResponse<CorrespondanceMedecinApiResponse>> {
  try {
    let body: PostBody;
    try {
      body = (await req.json()) as PostBody;
    } catch {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }

    const idPatient = (body.idPatient ?? '').trim();
    const garde = await garder(idPatient);
    if (garde.echec) return garde.echec;

    // Dossier clos : plus aucune consignation, quel que soit le sens. Le refus
    // est ici, dans la route, et non dans l'écran — sinon un appel direct le
    // contourne (#181).
    const patient = await prisma.patient.findUnique({
      where: { idPatient },
      select: { actif: true, suiviClotureLe: true },
    });
    if (!patient || !accepteNouvelEnvoi(patient)) {
      return echec(RAISON_DOSSIER_CLOS, MESSAGE_DOSSIER_CLOS, 409);
    }

    const preparation = preparerCorrespondance({
      idPatient,
      praticienEmail: garde.email,
      sens: body.sens,
      medecinLibelle: body.medecinLibelle,
      texte: body.texte,
      idSynthese: body.idSynthese,
      echangeLe: body.echangeLe,
    });
    if (!preparation.ok) {
      return echec(preparation.raison, MESSAGES_REFUS[preparation.raison], 400);
    }

    // Référence de synthèse : elle doit exister et appartenir au même patient
    // — sans révéler l'existence d'une synthèse chez autrui (même 404 dans les
    // deux cas, patron corrigeNoteId).
    const idSynthese = preparation.donnees.idSynthese;
    if (idSynthese) {
      const synthese = await prisma.syntheseIA.findUnique({
        where: { idSynthese },
        select: { idPatient: true },
      });
      if (!synthese || synthese.idPatient !== idPatient) {
        return echec('synthese_not_found', 'Synthèse introuvable pour ce patient.', 404);
      }
    }

    // `consigneLe` n'est PAS transmis : la base pose le présent
    // (@default(now())). Une consignation est structurellement inantidatable.
    const creee = await prisma.correspondanceMedecin.create({
      data: preparation.donnees,
      select: SELECTION,
    });

    return NextResponse.json({ ok: true, correspondance: exposer(creee) }, { status: 201 });
  } catch (err) {
    console.error(
      '[praticien/correspondance-medecin POST]',
      err instanceof Error ? err.message : String(err),
    );
    return echec('exception', 'Erreur technique.', 500);
  }
}
