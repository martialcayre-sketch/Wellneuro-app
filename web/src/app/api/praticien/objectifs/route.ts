import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import type { GabaritAcces } from '@/lib/praticien/journalAcces';
import { MESSAGE_DOSSIER_CLOS, RAISON_DOSSIER_CLOS, accepteNouvelEnvoi } from '@/lib/patient/cycleDeVie';
import {
  chaineDObjectif,
  etatRatification,
  objectifsCourants,
  preparerObjectif,
  type EtatRatification,
  type RefusObjectif,
} from '@/lib/praticien/objectifNegocie';

// L'objectif négocié (Alliance 6.0-A, LOT-02) — route PRATICIEN.
//
// APPEND-ONLY : reformuler, reprioriser ou assumer un « non traité pour
// l'instant » crée une NOUVELLE ligne chaînée. Cette route ne porte ni PATCH ni
// DELETE, et c'est la forme de l'invariant : il n'y a pas de verbe pour
// écraser. La garde `objectifNegocie.guard.test.ts` (G5) l'oppose à tout
// `web/src/app/api/**` et `web/src/lib/**`.
//
// PAS DE DRAPEAU DE FONCTIONNALITÉ SUR CE LOT, et l'absence est un CHOIX, pas
// un oubli (arbitrage du responsable) : la surface est praticien, elle n'est
// visible que d'un compte authentifié du domaine, et la table est neuve — un
// drapeau n'aurait rien à protéger qu'une session ne protège déjà. Toute
// surface PATIENT de la campagne (LOT-06) relève d'un arbitrage distinct.
//
// La ratification (`ratifications_objectif`) est LUE ici et JAMAIS écrite :
// c'est un geste du patient, il appartient au LOT-06.

const ID_PATIENT_PATTERN = /^[A-Za-z0-9_-]+$/;

// Gabarit littéral pour le journal des accès (G-TRUST-04) — jamais l'URL reçue.
const ROUTE_JOURNAL = '/api/praticien/objectifs';

/** Borne technique sur la référence de version : un identifiant `cuid`. */
const LONGUEUR_MAX_ID = 64;

export type ObjectifExpose = {
  id: string;
  enoncePatient: string;
  reformulationPraticien: string | null;
  priorite: string | null;
  nonTraiteMotif: string | null;
  nonTraiteDepuisLe: string | null;
  negocieLe: string | null;
  creeLe: string;
  supersedesObjectifId: string | null;
};

/** La trajectoire d'une tête de chaîne : sa version courante puis ses
 *  antérieures. Rien n'est écrasé, donc rien n'est omis. */
export type TrajectoireObjectif = {
  idObjectif: string;
  lignes: ObjectifExpose[];
};

/**
 * Le MATÉRIAU d'ancrage : ce que le patient a déjà écrit à l'anamnèse. Il
 * s'affiche à côté de la saisie, il ne la pré-remplit pas.
 *
 * `consultationValidee` distingue « aucune consultation validée » de « champ
 * non renseigné » (`DC-24` : une donnée absente n'est jamais zéro ni normale).
 * Sans ce drapeau, l'écran ne pourrait pas dire lequel des deux il regarde.
 *
 * LA PLAINTE DOMINANTE Q_MOD_03 N'EST PAS ICI, délibérément : elle n'est
 * produite que par le POST de confirmation d'épisode, et la recalculer depuis
 * cette route serait toucher au moteur clinique.
 */
export type AncrageAnamnese = {
  consultationValidee: boolean;
  motifPrincipal: string | null;
  objectifPrioritaire: string | null;
  attentes: string[];
};

export type ObjectifsApiResponse =
  | {
      ok: true;
      objectifs: ObjectifExpose[];
      trajectoires: TrajectoireObjectif[];
      ancrage: AncrageAnamnese;
      ratifications: Record<string, EtatRatification>;
    }
  | { ok: true; objectif: ObjectifExpose }
  | { ok: false; reason: string; error: string };

// Table EXHAUSTIVE par le type, pas par convention : un motif de refus neuf
// sans message ferait rendre `error: undefined`, la clé disparaîtrait du JSON,
// et l'écran retomberait sur le message générique — le motif du refus serait
// perdu pour le praticien, sans que rien ne rougisse.
const MESSAGES_REFUS: Record<RefusObjectif, string> = {
  enonce_absent: 'L’énoncé du patient est vide.',
  enonce_trop_long: 'L’énoncé du patient est trop long.',
  reformulation_trop_longue: 'La reformulation est trop longue.',
  priorite_trop_longue: 'La priorité est trop longue.',
  motif_trop_long: 'Le motif du « non traité pour l’instant » est trop long.',
  non_traite_incomplet:
    'Un « non traité pour l’instant » porte un motif ET une date : renseignez les deux, ou aucun.',
  date_invalide: 'Date illisible.',
  date_future: 'Cette date est dans le futur : un accord à venir n’est pas un accord pris.',
};

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<ObjectifsApiResponse>({ ok: false, reason, error }, { status });
}

const SELECTION_OBJECTIF = {
  id: true,
  enoncePatient: true,
  reformulationPraticien: true,
  priorite: true,
  nonTraiteMotif: true,
  nonTraiteDepuisLe: true,
  negocieLe: true,
  creeLe: true,
  supersedesObjectifId: true,
} as const;

type LigneLue = {
  id: string;
  enoncePatient: string;
  reformulationPraticien: string | null;
  priorite: string | null;
  nonTraiteMotif: string | null;
  nonTraiteDepuisLe: Date | null;
  negocieLe: Date | null;
  creeLe: Date;
  supersedesObjectifId: string | null;
};

function exposer(ligne: LigneLue): ObjectifExpose {
  return {
    id: ligne.id,
    enoncePatient: ligne.enoncePatient,
    reformulationPraticien: ligne.reformulationPraticien,
    priorite: ligne.priorite,
    nonTraiteMotif: ligne.nonTraiteMotif,
    nonTraiteDepuisLe: ligne.nonTraiteDepuisLe ? ligne.nonTraiteDepuisLe.toISOString() : null,
    negocieLe: ligne.negocieLe ? ligne.negocieLe.toISOString() : null,
    creeLe: ligne.creeLe.toISOString(),
    supersedesObjectifId: ligne.supersedesObjectifId,
  };
}

type Garde =
  | { echec: NextResponse<ObjectifsApiResponse>; email?: undefined }
  | { echec?: undefined; email: string };

/**
 * Session, forme de l'identifiant, puis appartenance — DANS CET ORDRE, et il
 * n'est pas décoratif : `verifierAppartenancePatient` JOURNALISE l'accès au
 * dossier (G-TRUST-04). Tester la session et le format après elle ferait
 * consigner un accès qui n'a pas eu lieu (motif de
 * `biology-library/gardeProposition.ts:11-14`).
 *
 * `acces` n'est transmis que par le GET : seule la lecture du dossier est une
 * consultation à journaliser — une écriture laisse déjà sa propre trace, datée
 * et attribuée.
 */
async function garder(idPatient: string, acces?: GabaritAcces): Promise<Garde> {
  const session = await getServerSession(authOptions);
  if (!session) return { echec: echec('unauthenticated', 'Authentification requise.', 401) };

  if (!idPatient || !ID_PATIENT_PATTERN.test(idPatient) || idPatient.length > LONGUEUR_MAX_ID) {
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

  // Inatteignable aujourd'hui (`appartenance.ts` rend `autre_praticien` sur un
  // e-mail de session nul), mais un repli `''` heurterait le CHECK non-vide de
  // `praticien_email` et rendrait 500 là où 401 est la réponse juste.
  if (!email) return { echec: echec('unauthenticated', 'Authentification requise.', 401) };
  return { email };
}

/** Champ texte d'un JSON d'anamnèse. Absent, vide ou non textuel ⇒ `null`. */
function champTexte(anamnese: Record<string, unknown>, cle: string): string | null {
  const valeur = anamnese[cle];
  if (typeof valeur !== 'string') return null;
  const texte = valeur.trim();
  return texte.length === 0 ? null : texte;
}

/** Champ à choix multiples. Les entrées non textuelles sont écartées, pas devinées. */
function champListe(anamnese: Record<string, unknown>, cle: string): string[] {
  const valeur = anamnese[cle];
  if (!Array.isArray(valeur)) return [];
  return valeur
    .filter((entree): entree is string => typeof entree === 'string')
    .map((entree) => entree.trim())
    .filter((entree) => entree.length > 0);
}

const ANCRAGE_SANS_CONSULTATION: AncrageAnamnese = {
  consultationValidee: false,
  motifPrincipal: null,
  objectifPrioritaire: null,
  attentes: [],
};

// GET /api/praticien/objectifs?idPatient= — trajectoire complète + matériau.
export async function GET(req: Request): Promise<NextResponse<ObjectifsApiResponse>> {
  try {
    const { searchParams } = new URL(req.url);
    const idPatient = (searchParams.get('idPatient') ?? '').trim();
    const garde = await garder(idPatient, { route: ROUTE_JOURNAL, methode: 'GET' });
    if (garde.echec) return garde.echec;

    const [lignes, ratifications, consultation] = await Promise.all([
      prisma.objectifNegocie.findMany({
        where: { idPatient },
        select: SELECTION_OBJECTIF,
        orderBy: { creeLe: 'desc' },
      }),
      // LECTURE SEULE : le geste de ratification appartient au patient
      // (LOT-06). Cette route ne l'écrit jamais.
      prisma.ratificationObjectif.findMany({
        where: { idPatient },
        select: { id: true, idObjectif: true, sens: true, creeLe: true },
      }),
      prisma.consultation.findFirst({
        where: { idPatient, statut: 'validee' },
        select: { anamnese: true },
        orderBy: [{ dateValidation: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    const courants = objectifsCourants(lignes);

    return NextResponse.json({
      ok: true,
      objectifs: courants.map(exposer),
      // La trajectoire de CHAQUE tête, versions antérieures comprises : ce qui
      // a été reformulé reste lisible, rien n'est écrasé.
      trajectoires: courants.map((tete) => ({
        idObjectif: tete.id,
        lignes: chaineDObjectif(lignes, tete.id).map(exposer),
      })),
      ancrage: consultation ? lireAncrage(consultation.anamnese) : ANCRAGE_SANS_CONSULTATION,
      // Un état par tête, jamais un taux : `etatRatification` rend le DERNIER
      // geste porté sur cette version précise.
      ratifications: Object.fromEntries(
        courants.map((tete) => [tete.id, etatRatification(tete.id, ratifications)]),
      ),
    });
  } catch (err) {
    console.error('[praticien/objectifs GET]', messageJournalisable(err));
    return echec('exception', 'Erreur technique.', 500);
  }
}

/**
 * Les trois champs d'ancrage de l'anamnèse validée. Ils sont RECOPIÉS tels
 * quels, jamais transformés : `anamnese.ts` reste en lecture seule.
 * N'est appelée que si une consultation validée existe.
 */
/**
 * Ce qu'on a le droit d'écrire au journal — SÛR PAR CONSTRUCTION.
 *
 * DETTE NOMMÉE PAR LA REVUE DU LOT-04, SOLDÉE ICI. Les deux `catch` de cette
 * route journalisaient `err.message` brut sous un commentaire qui promettait
 * « jamais le payload ». La promesse était sincère et fausse :
 * `PrismaClientValidationError` RECOPIE le `data:` du `create` dans son message
 * — soit l'énoncé du patient, la reformulation du praticien et son e-mail. On
 * n'en garde que la CLASSE et le marqueur Prisma (`P2002`…), ni l'un ni l'autre
 * ne pouvant porter une valeur.
 *
 * `marqueurPrisma` et non `code` : la garde anti-diagnostic refuse tout nom
 * commençant par « code » — faux positif ici (c'est un code d'ERREUR), mais on
 * renomme plutôt que d'assouplir une garde contournable par un nom bien choisi.
 */
function messageJournalisable(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  if (!err.name.startsWith('PrismaClient')) return err.message;
  const marqueurPrisma = (err as { code?: unknown }).code;
  return typeof marqueurPrisma === 'string' ? `${err.name} (${marqueurPrisma})` : err.name;
}

function lireAncrage(anamnese: unknown): AncrageAnamnese {
  const source =
    anamnese !== null && typeof anamnese === 'object' && !Array.isArray(anamnese)
      ? (anamnese as Record<string, unknown>)
      : {};
  return {
    // Une consultation validée existe : à partir d'ici, un champ vide est un
    // champ NON RENSEIGNÉ, ce qui ne se dit pas comme « pas de consultation ».
    consultationValidee: true,
    motifPrincipal: champTexte(source, 'motif_principal'),
    objectifPrioritaire: champTexte(source, 'objectif_prioritaire'),
    attentes: champListe(source, 'attentes'),
  };
}

type PostBody = {
  idPatient?: string;
  enoncePatient?: string;
  reformulationPraticien?: string;
  priorite?: string;
  nonTraiteMotif?: string;
  nonTraiteDepuisLe?: string;
  negocieLe?: string;
  supersedesObjectifId?: string | null;
};

// `typeof`, et non `?? ''` : `PostBody` est un CAST, pas une validation. Un
// corps `{"enoncePatient": 123}` ferait lever `.trim()` et la route rendrait
// 500 là où elle doit rendre 400 — une entrée malformée n'est pas une panne du
// serveur, et la distinguer ainsi renseignerait un appelant hostile.
function texteDuCorps(valeur: unknown): string {
  return typeof valeur === 'string' ? valeur.trim() : '';
}

// POST /api/praticien/objectifs — dépose un objectif ou sa révision.
export async function POST(req: Request): Promise<NextResponse<ObjectifsApiResponse>> {
  try {
    let body: PostBody;
    try {
      body = (await req.json()) as PostBody;
    } catch {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }

    // `null`, `42`, `"texte"` et `[]` sont du JSON PARFAITEMENT VALIDE : le
    // `catch` ci-dessus ne les voit pas. Sans ce contrôle, `body.idPatient`
    // lève sur `null` et la route rend 500 — avant même `garder()`, donc
    // déclenchable SANS session. Le cast ne protège que les champs, pas la
    // forme du corps lui-même.
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }

    const idPatient = texteDuCorps(body.idPatient);
    const garde = await garder(idPatient);
    if (garde.echec) return garde.echec;

    // Dossier clos : un objectif négocié est une pièce du dossier, le refus
    // vit dans la ROUTE et pas seulement dans l'écran (#181).
    const patient = await prisma.patient.findUnique({
      where: { idPatient },
      select: { actif: true, suiviClotureLe: true },
    });
    if (!patient || !accepteNouvelEnvoi(patient)) {
      return echec(RAISON_DOSSIER_CLOS, MESSAGE_DOSSIER_CLOS, 409);
    }

    const referenceBrute = body.supersedesObjectifId;
    if (referenceBrute !== undefined && referenceBrute !== null && typeof referenceBrute !== 'string') {
      return echec('invalid', 'Référence de version invalide.', 400);
    }
    const supersedesObjectifId = texteDuCorps(referenceBrute);
    if (supersedesObjectifId.length > LONGUEUR_MAX_ID) {
      return echec('invalid', 'Référence de version invalide.', 400);
    }

    // LA CIBLE SE VÉRIFIE AVANT LE MODULE PUR, et c'est une conséquence de
    // l'invariant, pas un raccourci : `enonce_patient` est NOT NULL non vide
    // sur CHAQUE ligne, et pour une révision cet énoncé est RECOPIÉ depuis la
    // cible — jamais repris du corps, sinon on ferait dire au patient, ligne
    // après ligne, autre chose que ce qu'il a dit. Le module ne peut donc pas
    // préparer ses données avant que la cible soit connue.
    let cible: { enoncePatient: string } | undefined;
    if (supersedesObjectifId) {
      const [visee, dejaSupplantee] = await Promise.all([
        prisma.objectifNegocie.findUnique({
          where: { id: supersedesObjectifId },
          select: { idPatient: true, enoncePatient: true },
        }),
        prisma.objectifNegocie.findFirst({
          // Scopé au dossier, et ce n'est pas cosmétique : le seul index de la
          // table est `(id_patient, cree_le)` (`migration.sql:99`). Sans
          // `idPatient`, le prédicat ne peut pas l'emprunter et parcourt une
          // table append-only qui ne fait que croître. La cible est prouvée du
          // même dossier trois lignes plus bas, le scope est donc sûr.
          where: { idPatient, supersedesObjectifId },
          select: { id: true },
        }),
      ]);
      // INEXISTANTE OU D'UN AUTRE DOSSIER : MÊME réponse, MÊME message. Les
      // distinguer ferait de la route un oracle d'existence d'objectif,
      // interrogeable avec une session praticien quelconque (patron
      // `agenda-alimentaire/portail.ts:140-145`).
      if (!visee || visee.idPatient !== idPatient) {
        return echec('objectif_introuvable', 'Objectif à reformuler introuvable.', 404);
      }
      // Déjà reformulée : deux révisions concurrentes scinderaient la chaîne
      // en deux têtes. La lecture-puis-409 n'est pas étanche à la course — ce
      // qui passe malgré tout est RENDU VISIBLE par l'écran, jamais départagé
      // en silence (`objectifsCourants`).
      if (dejaSupplantee) {
        return echec('objectif_supplante', 'Cet objectif a déjà été reformulé. Rechargez le dossier.', 409);
      }
      cible = { enoncePatient: visee.enoncePatient };
    }

    const preparation = preparerObjectif(
      {
        idPatient,
        praticienEmail: garde.email,
        enoncePatient: texteDuCorps(body.enoncePatient),
        reformulationPraticien: texteDuCorps(body.reformulationPraticien),
        priorite: texteDuCorps(body.priorite),
        nonTraiteMotif: texteDuCorps(body.nonTraiteMotif),
        nonTraiteDepuisLe: texteDuCorps(body.nonTraiteDepuisLe),
        negocieLe: texteDuCorps(body.negocieLe),
        supersedesObjectifId: supersedesObjectifId || null,
      },
      cible,
    );
    if (!preparation.ok) {
      return echec(preparation.raison, MESSAGES_REFUS[preparation.raison], 400);
    }

    // `creeLe` n'est PAS transmis : la base pose le présent (@default(now())).
    // C'est ce qui rend une ligne d'objectif structurellement inantidatable.
    // Un seul `create`, jamais d'`update` : réviser AJOUTE une ligne.
    const creee = await prisma.objectifNegocie.create({
      data: preparation.donnees,
      select: SELECTION_OBJECTIF,
    });

    return NextResponse.json({ ok: true, objectif: exposer(creee) }, { status: 201 });
  } catch (err) {
    // Jamais le payload : il porte l'énoncé du patient et la compréhension du
    // praticien, le contenu le plus nominatif du dossier.
    console.error('[praticien/objectifs POST]', messageJournalisable(err));
    return echec('exception', 'Erreur technique.', 500);
  }
}
