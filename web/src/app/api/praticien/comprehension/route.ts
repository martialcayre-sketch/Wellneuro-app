import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import type { GabaritAcces } from '@/lib/praticien/journalAcces';
import { MESSAGE_DOSSIER_CLOS, RAISON_DOSSIER_CLOS, accepteNouvelEnvoi } from '@/lib/patient/cycleDeVie';
import { isComprehensionEnabled } from '@/lib/patient/featureFlag';
import { termeAnxiogene } from '@/lib/documents/vocabulaire';
import {
  chaineDeSynthese,
  desaccordsDeLaSynthese,
  etatDesaccord,
  preparerSynthese,
  synthesesCourantes,
  type EtatDesaccord,
  type RefusSynthese,
} from '@/lib/praticien/syntheseComprehension';

// « Ce que j'ai compris de vous » (Alliance 6.0-A, LOT-04) — route PRATICIEN.
//
// APPEND-ONLY : réviser crée une NOUVELLE ligne chaînée. Cette route ne porte
// ni PATCH ni DELETE, et c'est la forme de l'invariant — il n'y a pas de verbe
// pour écraser. La garde `comprehensionAppendOnly.guard.test.ts` l'oppose à
// tout `web/src/app/api/**` et `web/src/lib/**`.
//
// CHEMIN SORTANT GARDÉ (carte du Socle, `documents/vocabulaire.ts`). La
// publication est le geste par lequel un texte de praticien atteint un patient :
// elle passe `termeAnxiogene` sous régime CONFIRMABLE — le praticien voit le
// terme relevé et tranche lui-même, il n'est ni bloqué ni contourné en silence.
// Le régime est motivé par `D-090` ; son banc de débranchement vit dans
// `route.test.ts` et doit être VU ROUGE quand l'appel à la garde est retiré.
//
// LE DÉSACCORD EST LU ICI, JAMAIS ÉCRIT : c'est un geste du patient, il
// appartient à la route du portail. Son état (« pas encore de réponse » /
// « répondu ») est DÉRIVÉ à chaque lecture — la table n'a aucune colonne d'état
// et n'en aura pas, une colonne mutable contredirait l'append-only.
//
// L'ACCUSÉ DE LECTURE PRATICIEN vit en deux morceaux, aucun en base : « vu »
// est journalisé par `verifierAppartenancePatient` au GET (G-TRUST-04,
// `ROUTE_JOURNAL` ci-dessous) ; « répondu » est l'état dérivé ci-dessus.

const ID_PATIENT_PATTERN = /^[A-Za-z0-9_-]+$/;

// Gabarit littéral pour le journal des accès (G-TRUST-04) — jamais l'URL reçue.
// C'est LUI qui porte le versant « vu » de l'accusé de lecture : consulter les
// désaccords d'un dossier laisse une trace datée et attribuée.
const ROUTE_JOURNAL = '/api/praticien/comprehension';

/** Borne technique sur la référence de version : un identifiant `cuid`. */
const LONGUEUR_MAX_ID = 64;

export type SyntheseExposee = {
  id: string;
  texte: string;
  redigeeLe: string | null;
  publieeLe: string | null;
  creeLe: string;
  supersedesSyntheseId: string | null;
};

export type DesaccordExpose = {
  id: string;
  idSynthese: string;
  texte: string | null;
  exprimeLe: string | null;
  creeLe: string;
  etat: EtatDesaccord;
};

/** La trajectoire d'une tête de chaîne : sa version courante puis ses
 *  antérieures. Rien n'est écrasé, donc rien n'est omis. */
export type TrajectoireSynthese = {
  idSynthese: string;
  lignes: SyntheseExposee[];
};

export type ComprehensionApiResponse =
  | {
      ok: true;
      syntheses: SyntheseExposee[];
      trajectoires: TrajectoireSynthese[];
      desaccords: DesaccordExpose[];
      /**
       * L'écran doit pouvoir dire la VÉRITÉ sur ce que le patient voit. Sans
       * ce drapeau, un cockpit affichant « publiée » mentirait tant que la
       * surface patient est fermée.
       */
      surfacePatientOuverte: boolean;
    }
  | { ok: true; synthese: SyntheseExposee }
  | { ok: false; reason: string; error: string };

// Table EXHAUSTIVE par le type, pas par convention : un motif de refus neuf
// sans message ferait rendre `error: undefined`, la clé disparaîtrait du JSON,
// et l'écran retomberait sur le message générique — le motif du refus serait
// perdu pour le praticien, sans que rien ne rougisse.
const MESSAGES_REFUS: Record<RefusSynthese, string> = {
  texte_absent: 'La synthèse est vide.',
  texte_trop_long: 'La synthèse est trop longue.',
  date_invalide: 'Date illisible.',
  date_future:
    'Cette date est dans le futur : une compréhension à venir n’est pas une compréhension formée.',
};

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<ComprehensionApiResponse>({ ok: false, reason, error }, { status });
}

/**
 * Ce qu'on a le droit d'écrire au journal — SÛR PAR CONSTRUCTION, pas par
 * intention.
 *
 * Les erreurs Prisma recopient les ARGUMENTS de la requête dans leur message :
 * `PrismaClientValidationError` rend le `data:` du `create`, c'est-à-dire ici
 * les 4 000 caractères de prose clinique ET l'e-mail du praticien ;
 * `PrismaClientKnownRequestError` rend son `meta`. Journaliser `err.message`
 * brut sous un commentaire promettant « jamais le payload » ferait exactement
 * ce que `.claude/rules/db-prisma.md` interdit — et la promesse tiendrait lieu
 * de garde.
 *
 * On garde donc la CLASSE et le marqueur Prisma (`P2002`…), dont aucun ne peut
 * porter une valeur. Les erreurs non-Prisma (réseau, invariant applicatif)
 * gardent leur message : le perdre rendrait indiagnosticable tout ce qui est
 * inattendu, et elles ne voient pas le corps de la requête.
 *
 * `marqueurPrisma` et non `code` : la garde anti-diagnostic
 * (`comprehensionAppendOnly.guard.test.ts`, G3) refuse tout nom commençant par
 * « code ». Faux positif — c'est un code d'ERREUR — mais on renomme plutôt que
 * d'assouplir une garde qui vise les codes DIAGNOSTIQUES.
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

const SELECTION_DESACCORD = {
  id: true,
  idSynthese: true,
  texte: true,
  exprimeLe: true,
  creeLe: true,
} as const;

type LigneSyntheseLue = {
  id: string;
  texte: string;
  redigeeLe: Date | null;
  publieeLe: Date | null;
  creeLe: Date;
  supersedesSyntheseId: string | null;
};

type LigneDesaccordLue = {
  id: string;
  idSynthese: string;
  texte: string | null;
  exprimeLe: Date | null;
  creeLe: Date;
};

function exposer(ligne: LigneSyntheseLue): SyntheseExposee {
  return {
    id: ligne.id,
    texte: ligne.texte,
    redigeeLe: ligne.redigeeLe ? ligne.redigeeLe.toISOString() : null,
    publieeLe: ligne.publieeLe ? ligne.publieeLe.toISOString() : null,
    creeLe: ligne.creeLe.toISOString(),
    supersedesSyntheseId: ligne.supersedesSyntheseId,
  };
}

type Garde =
  | { echec: NextResponse<ComprehensionApiResponse>; email?: undefined }
  | { echec?: undefined; email: string };

/**
 * Session, forme de l'identifiant, puis appartenance — DANS CET ORDRE, et il
 * n'est pas décoratif : `verifierAppartenancePatient` JOURNALISE l'accès au
 * dossier (G-TRUST-04). Tester la session et le format après elle ferait
 * consigner un accès qui n'a pas eu lieu (patron `objectifs/route.ts`).
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

// GET /api/praticien/comprehension?idPatient= — chaînes complètes + désaccords.
export async function GET(req: Request): Promise<NextResponse<ComprehensionApiResponse>> {
  try {
    const { searchParams } = new URL(req.url);
    const idPatient = (searchParams.get('idPatient') ?? '').trim();
    const garde = await garder(idPatient, { route: ROUTE_JOURNAL, methode: 'GET' });
    if (garde.echec) return garde.echec;

    // PAS DE GARDE DE DRAPEAU SUR LA LECTURE : une liste vide côté dossier est
    // un silence honnête, un 503 ferait croire à une panne (patron LOT-03).
    const [lignes, desaccords] = await Promise.all([
      prisma.syntheseComprehension.findMany({
        where: { idPatient },
        select: SELECTION_SYNTHESE,
        orderBy: { creeLe: 'desc' },
      }),
      // LECTURE SEULE : le désaccord est un geste du patient (route portail).
      prisma.desaccordComprehension.findMany({
        where: { idPatient },
        select: SELECTION_DESACCORD,
        orderBy: { creeLe: 'desc' },
      }),
    ]);

    const courantes = synthesesCourantes(lignes);

    return NextResponse.json({
      ok: true,
      // Les têtes de chaîne, brouillons compris — le praticien voit son propre
      // travail en cours ; le patient, lui, ne verra que la tête PUBLIÉE.
      syntheses: courantes.map(exposer),
      trajectoires: courantes.map((tete) => ({
        idSynthese: tete.id,
        lignes: chaineDeSynthese(lignes, tete.id).map(exposer),
      })),
      // TOUS les désaccords du dossier, y compris ceux qui visent une version
      // depuis révisée : un désaccord ne disparaît pas parce qu'on a réécrit ce
      // qu'il contestait. Chacun porte son état dérivé.
      desaccords: desaccords.map((ligne: LigneDesaccordLue) => ({
        id: ligne.id,
        idSynthese: ligne.idSynthese,
        texte: ligne.texte,
        exprimeLe: ligne.exprimeLe ? ligne.exprimeLe.toISOString() : null,
        creeLe: ligne.creeLe.toISOString(),
        etat: etatDesaccord(ligne, lignes),
      })),
      surfacePatientOuverte: isComprehensionEnabled(),
    });
  } catch (err) {
    // Jamais le payload : il porte la compréhension du praticien et les mots du
    // patient, le contenu le plus nominatif du dossier.
    console.error('[praticien/comprehension GET]', messageJournalisable(err));
    return echec('exception', 'Erreur technique.', 500);
  }
}

type PostBody = {
  idPatient?: string;
  texte?: string;
  redigeeLe?: string;
  publier?: boolean;
  confirmerRegistre?: boolean;
  supersedesSyntheseId?: string | null;
};

// `typeof`, et non `?? ''` : `PostBody` est un CAST, pas une validation. Un
// corps `{"texte": 123}` ferait lever `.trim()` et la route rendrait 500 là où
// elle doit rendre 400 — une entrée malformée n'est pas une panne du serveur.
function texteDuCorps(valeur: unknown): string {
  return typeof valeur === 'string' ? valeur.trim() : '';
}

// POST /api/praticien/comprehension — dépose une version (brouillon ou publiée).
export async function POST(req: Request): Promise<NextResponse<ComprehensionApiResponse>> {
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
    // déclenchable SANS session.
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }

    const idPatient = texteDuCorps(body.idPatient);
    const garde = await garder(idPatient);
    if (garde.echec) return garde.echec;

    // `=== true` et non truthy : `"non"`, `1` et `{}` sont truthy en JavaScript,
    // et publier au patient ne doit pas dépendre de la coercition d'un champ mal
    // typé. Même doctrine fail-closed que le drapeau lui-même.
    const publier = body.publier === true;
    const confirmerRegistre = body.confirmerRegistre === true;

    // LE DRAPEAU GARDE LA PUBLICATION, PAS LE BROUILLON, et l'asymétrie est le
    // cœur du dispositif : publier c'est s'adresser au patient. Laisser publier
    // dans une surface fermée produirait un stock de synthèses que le praticien
    // croit remises et qui atteindraient toutes le patient d'un coup à
    // l'allumage — `D-070` vu depuis l'autre bout de la chaîne. Rédiger et
    // réviser des brouillons reste possible : c'est l'usage attendu avant
    // ouverture.
    //
    // APRÈS la garde, et non avant : un appelant sans session n'a pas à
    // apprendre l'état du drapeau ; ici la surface protégée est celle du
    // patient, pas celle-ci.
    if (publier && !isComprehensionEnabled()) {
      return echec(
        'surface_patient_fermee',
        'La surface patient n’est pas ouverte : cette synthèse peut être enregistrée en brouillon, pas publiée.',
        503,
      );
    }

    // Dossier clos : une synthèse de compréhension est une pièce du dossier, le
    // refus vit dans la ROUTE et pas seulement dans l'écran.
    const patient = await prisma.patient.findUnique({
      where: { idPatient },
      select: { actif: true, suiviClotureLe: true },
    });
    if (!patient || !accepteNouvelEnvoi(patient)) {
      return echec(RAISON_DOSSIER_CLOS, MESSAGE_DOSSIER_CLOS, 409);
    }

    const referenceBrute = body.supersedesSyntheseId;
    if (referenceBrute !== undefined && referenceBrute !== null && typeof referenceBrute !== 'string') {
      return echec('invalid', 'Référence de version invalide.', 400);
    }
    const supersedesSyntheseId = texteDuCorps(referenceBrute);
    if (supersedesSyntheseId.length > LONGUEUR_MAX_ID) {
      return echec('invalid', 'Référence de version invalide.', 400);
    }

    if (supersedesSyntheseId) {
      const [visee, dejaSupplantee] = await Promise.all([
        prisma.syntheseComprehension.findUnique({
          where: { id: supersedesSyntheseId },
          select: { idPatient: true },
        }),
        prisma.syntheseComprehension.findFirst({
          // Scopé au dossier, et ce n'est pas cosmétique : le seul index de la
          // table est `(id_patient, cree_le)`. Sans `idPatient`, le prédicat ne
          // peut pas l'emprunter et parcourt une table append-only qui ne fait
          // que croître. La cible est prouvée du même dossier juste en dessous.
          where: { idPatient, supersedesSyntheseId },
          select: { id: true },
        }),
      ]);
      // INEXISTANTE OU D'UN AUTRE DOSSIER : MÊME réponse, MÊME message. Les
      // distinguer ferait de la route un oracle d'existence, interrogeable avec
      // une session praticien quelconque.
      if (!visee || visee.idPatient !== idPatient) {
        return echec('synthese_introuvable', 'Version à réviser introuvable.', 404);
      }
      // Déjà révisée : deux révisions concurrentes scinderaient la chaîne en
      // deux têtes. La lecture-puis-409 n'est pas étanche à la course — ce qui
      // passe malgré tout est RENDU VISIBLE par l'écran, jamais départagé en
      // silence (`synthesesCourantes`).
      if (dejaSupplantee) {
        return echec(
          'synthese_supplantee',
          'Cette version a déjà été révisée. Rechargez le dossier.',
          409,
        );
      }
    }

    const preparation = preparerSynthese({
      idPatient,
      praticienEmail: garde.email,
      texte: texteDuCorps(body.texte),
      redigeeLe: texteDuCorps(body.redigeeLe),
      publier,
      supersedesSyntheseId: supersedesSyntheseId || null,
    });
    if (!preparation.ok) {
      return echec(preparation.raison, MESSAGES_REFUS[preparation.raison], 400);
    }

    // ── GARDE DE VOCABULAIRE, CHEMIN SORTANT DE LA CARTE DU SOCLE ───────────
    //
    // RÉGIME CONFIRMABLE (`D-090`), et seulement à la PUBLICATION : un
    // brouillon ne sort pas de l'application. Le praticien voit le terme relevé
    // et tranche — la garde ne réécrit rien et ne bloque rien définitivement,
    // parce que c'est une surface de dialogue où le praticien choisit ses mots
    // et où un faux positif du registre ne doit pas rendre une synthèse
    // légitime impubliable.
    //
    // BANC DE DÉBRANCHEMENT : `route.test.ts` doit ROUGIR si ces cinq lignes
    // disparaissent. Aucun test ne garde la carte de `vocabulaire.ts` elle-même.
    if (publier) {
      const terme = termeAnxiogene(preparation.donnees.texte);
      if (terme && !confirmerRegistre) {
        return echec(
          'REGISTRE_ANXIOGENE',
          `Cette synthèse emploie « ${terme} ». Elle est lue seule par le patient, souvent avant la consultation. Reformulez-la, ou renvoyez avec confirmerRegistre: true pour la publier telle quelle.`,
          409,
        );
      }
    }

    // `creeLe` n'est PAS transmis : la base pose le présent (@default(now())).
    // Un seul `create`, jamais d'`update` : réviser AJOUTE une ligne.
    const creee = await prisma.syntheseComprehension.create({
      data: preparation.donnees,
      select: SELECTION_SYNTHESE,
    });

    return NextResponse.json({ ok: true, synthese: exposer(creee) }, { status: 201 });
  } catch (err) {
    console.error('[praticien/comprehension POST]', messageJournalisable(err));
    return echec('exception', 'Erreur technique.', 500);
  }
}
