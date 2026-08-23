import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import type { GabaritAcces } from '@/lib/praticien/journalAcces';
import { MESSAGE_DOSSIER_CLOS, RAISON_DOSSIER_CLOS, accepteNouvelEnvoi } from '@/lib/patient/cycleDeVie';
import { dossierDansPerimetreProposition, isObjectifProposeEnabled } from '@/lib/patient/featureFlag';
import {
  MAX_PROPOSITIONS,
  assembleeCourante,
  assemblerPropositions,
  clesInterdites,
  dispositionCourante,
  preparerDisposition,
  propositionsVivantes,
  type CandidatCitable,
  type GesteDisposition,
  type PlainteCitable,
  type RefusDisposition,
} from '@/lib/praticien/propositionObjectif';

// La proposition d'objectif (Alliance 6.0-B, LOT-02) — route PRATICIEN.
//
// DEUX GESTES, ET UN SEUL D'ENTRE EUX ÉCRIT UN ÉVÉNEMENT :
//   `assembler` — le cockpit envoie ce qu'il a DÉJÀ produit (plainte
//     dominante, candidats signés, SHA du périmètre) ; la route lit l'anamnèse
//     en base, appelle le module, et n'écrit une assemblée neuve QUE si les
//     empreintes de sources ont bougé. Idempotent par construction.
//   `ecarter` — l'événement motivé, matériau du bilan LOT-06.
//
// LA REPRISE N'EST PAS ICI. Reprendre une proposition crée un OBJECTIF
// NÉGOCIÉ, et cela passe par `POST /api/praticien/objectifs` enrichi de
// `sourcePropositionId` (LOT-03). Deux routes qui créeraient un objectif
// seraient deux vérités sur ce qu'est un objectif.
//
// L'ANAMNÈSE SE LIT EN BASE, JAMAIS DANS LE CORPS DE LA REQUÊTE, et c'est la
// frontière de confiance de cette route. Les mots du patient sont ce que la
// campagne protège le plus (`enoncePatient` inviolable, `D-094`) : les
// accepter d'un client permettrait de faire dire au patient ce qu'il n'a pas
// écrit, et le fragment porterait quand même la mention « anamnèse verbatim ».
// Plainte dominante et candidats, eux, ARRIVENT du client — la carte de
// décision n'est pas persistée et G7 interdit de la recalculer ici. Ce que la
// route peut vérifier, elle le vérifie (forme, longueurs, SHA hexadécimal) ;
// ce qu'elle ne peut pas, elle ne feint pas de le faire.
//
// AUCUNE ÉCRITURE SUR LES TABLES DE 6.0-A. Ni `objectifNegocie`, ni
// `ratificationObjectif` : garde G7, vue rouge par mutation.

const ID_PATIENT_PATTERN = /^[A-Za-z0-9_-]+$/;

/** Gabarit littéral pour le journal des accès (G-TRUST-04) — jamais l'URL reçue. */
const ROUTE_JOURNAL = '/api/praticien/propositions-objectif';

/** Borne technique sur un identifiant `cuid` (patron `objectifs/route.ts`). */
const LONGUEUR_MAX_ID = 64;

/**
 * Le SHA d'un périmètre signé : 64 caractères hexadécimaux, comme partout
 * ailleurs dans le dépôt (`ORIENTATION_RULES_SHA256`, `CORPUS_CLINIQUE_SHA256`).
 *
 * CE CONTRÔLE NE PROUVE PAS L'AUTHENTICITÉ, il écarte le malformé. La route ne
 * peut pas confronter ce SHA à la table signée : elle est sous
 * `lib/clinical/`, que G7 lui interdit d'importer. C'est le prix assumé de la
 * garde, et il est écrit ici plutôt que sous-entendu.
 */
const SHA_PERIMETRE_PATTERN = /^[0-9a-f]{64}$/;

/**
 * Bornes de forme sur ce qui arrive du client. TECHNIQUES, sans sémantique
 * clinique (`DC-19`/`DC-20`) : elles empêchent un corps de requête d'être un
 * moyen de remplir la table, elles ne disent rien de ce qui est pertinent.
 *
 * `MAX_CANDIDATS_RECUS` est plus large que `MAX_PROPOSITIONS` À DESSEIN : le
 * plafond de trois est celui de la PRODUCTION (le module tronque), pas celui
 * de ce que le cockpit a le droit de raconter. Les confondre ferait rendre 400
 * à un cockpit parfaitement légitime qui aurait quatre candidats à l'écran.
 */
const MAX_CANDIDATS_RECUS = 32;
const LONGUEUR_MAX_TEXTE_RECU = 4000;
const LONGUEUR_MAX_IDENTIFIANT_RECU = 64;

/**
 * La FORME d'un identifiant reçu — règle, instrument, domaine. Couvre ce que
 * le dépôt produit réellement (`PRIO-DIG-01`, `ABST-SEC-01`, `Q_MOD_03`,
 * `digestion`, `priority:PRIO-SOM`) et rien d'autre.
 *
 * CONTRÔLE DE FORME, PAS CONFRONTATION — même registre que
 * `SHA_PERIMETRE_PATTERN`, donc sans toucher à G7. Il est là parce que la
 * route assumait de ne pas pouvoir authentifier le SHA tout en acceptant, à
 * côté, un identifiant de règle en TEXTE LIBRE : un client en session
 * praticien pouvait faire persister un fragment `regle: "Recommandation
 * Wellneuro validée"` que le GET aurait servi comme une citation sourcée, et
 * que le LOT-03 aurait laissé reprendre en objectif. Un identifiant ne
 * contient ni espace, ni phrase ; l'exiger n'authentifie rien, mais rend
 * impossible de faire passer une phrase pour une provenance.
 */
const IDENTIFIANT_PATTERN = /^[A-Za-z0-9_.:-]+$/;

export type FragmentExpose = {
  texte: string;
  source: unknown;
};

/**
 * LA FORME EXPOSÉE, ÉPINGLÉE (patron G1). Y ajouter un champ est une décision :
 * un `rang`, une `position` ou un `niveau` glissés ici cesseraient de compiler
 * contre la liste de `propositionObjectif.guard.test.ts`.
 *
 * `hashSources` N'EST PAS EXPOSÉ. C'est une mécanique de caducité, pas une
 * information d'écran ; la route dit déjà ce qui est vivant et ce qui est
 * caduc. L'exposer inviterait un client à recalculer la caducité lui-même,
 * c'est-à-dire à se donner un second juge.
 */
export type PropositionExposee = {
  id: string;
  fragments: FragmentExpose[];
  assembleeLe: string | null;
  creeLe: string;
  disposition: GesteDisposition | null;
};

export type PropositionsApiResponse =
  | {
      ok: true;
      /**
       * Les propositions SERVABLES : assemblée courante, aucun geste posé, au
       * plus trois (`D-094` §3, arbitrage 5 — plafond tenu au service comme à
       * la production).
       */
      propositions: PropositionExposee[];
      /**
       * Celles de l'assemblée courante qu'un geste a déjà disposées. Le LOT-03
       * en a besoin pour le diff proposé↔négocié : une proposition reprise ne
       * disparaît pas de l'écran, elle change d'état.
       */
      disposees: PropositionExposee[];
      /**
       * Les précédentes — sources bougées, donc caduques. Bornées elles aussi :
       * la table est append-only, un dossier ancien en accumulerait autrement
       * une charge utile sans fin.
       */
      caduques: PropositionExposee[];
    }
  | { ok: true; disposition: { id: string; geste: GesteDisposition; creeLe: string } }
  | { ok: false; reason: string; error: string };

/**
 * Table EXHAUSTIVE par le type (patron `objectifs/route.ts`) : un motif de
 * refus neuf sans message ferait rendre `error: undefined`, la clé
 * disparaîtrait du JSON, et l'écran retomberait sur un message générique — le
 * motif du refus perdu pour le praticien, sans que rien ne rougisse.
 */
const MESSAGES_REFUS: Record<RefusDisposition, string> = {
  proposition_absente: 'Aucune proposition visée.',
  geste_invalide: 'Geste inconnu.',
  motif_absent: 'Écarter une proposition demande un motif : c’est lui qui dit ce qu’il fallait changer.',
  motif_sur_reprise: 'Une reprise ne porte pas de motif d’écart.',
  motif_trop_long: 'Le motif est trop long.',
};

/**
 * Les refus qui portent sur le CONTENU d'un geste par ailleurs bien formé :
 * 422. Les autres décrivent une requête malformée : 400. La distinction n'est
 * pas cosmétique — un écran doit pouvoir afficher le premier au praticien
 * (« il manque le motif ») et traiter le second comme un bug.
 */
const REFUS_CONTENU: ReadonlySet<RefusDisposition> = new Set<RefusDisposition>([
  'motif_absent',
  'motif_sur_reprise',
  'motif_trop_long',
]);

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<PropositionsApiResponse>({ ok: false, reason, error }, { status });
}

/**
 * Ce qu'on a le droit d'écrire au journal — SÛR PAR CONSTRUCTION.
 *
 * Recopié de `objectifs/route.ts`, où la revue du LOT-04 a soldé la dette :
 * `PrismaClientValidationError` RECOPIE le `data:` du `create` dans son
 * message — ici les fragments, c'est-à-dire les mots du patient. On n'en garde
 * que la CLASSE et le marqueur Prisma, ni l'un ni l'autre ne pouvant porter
 * une valeur.
 *
 * `marqueurPrisma` et non `code` : la garde anti-diagnostic refuse tout nom
 * commençant par « code ». Faux positif ici (c'est un code d'ERREUR), mais on
 * renomme plutôt que d'assouplir une garde contournable par un nom bien choisi.
 */
function messageJournalisable(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  if (!err.name.startsWith('PrismaClient')) return err.message;
  const marqueurPrisma = (err as { code?: unknown }).code;
  return typeof marqueurPrisma === 'string' ? `${err.name} (${marqueurPrisma})` : err.name;
}

type Garde =
  | { echec: NextResponse<PropositionsApiResponse>; email?: undefined }
  | { echec?: undefined; email: string };

/**
 * Session, forme de l'identifiant, drapeaux, puis appartenance — DANS CET
 * ORDRE, et il n'est pas décoratif : `verifierAppartenancePatient` JOURNALISE
 * l'accès au dossier (G-TRUST-04). Tout ce qui peut refuser sans lire le
 * dossier doit passer AVANT, sinon on consigne un accès qui n'a pas eu lieu
 * (motif de `biology-library/gardeProposition.ts`).
 *
 * LE DRAPEAU GARDE AUSSI LA LECTURE, contrairement aux surfaces de dépôt de
 * 6.0-A : une liste vide se lirait ici « la machine n'a rien trouvé à proposer
 * sur ce dossier », c'est-à-dire un constat sur le patient, là où la vérité
 * est que personne n'a ouvert la fonctionnalité (motif écrit dans
 * `featureFlag.ts`).
 */
async function garder(idPatient: string, acces?: GabaritAcces): Promise<Garde> {
  const session = await getServerSession(authOptions);
  if (!session) return { echec: echec('unauthenticated', 'Authentification requise.', 401) };

  if (!idPatient || !ID_PATIENT_PATTERN.test(idPatient) || idPatient.length > LONGUEUR_MAX_ID) {
    return { echec: echec('invalid', 'Identifiant patient invalide.', 400) };
  }

  if (!isObjectifProposeEnabled()) {
    return { echec: echec('feature_disabled', 'Fonctionnalité non ouverte.', 503) };
  }
  // Interrupteur de repli (`D-094`) : vide = tous les dossiers. MÊME réponse
  // que le drapeau éteint — distinguer les deux dirait à l'appelant qu'un
  // dossier a été retiré du périmètre, ce qui ne le regarde pas.
  if (!dossierDansPerimetreProposition(idPatient)) {
    return { echec: echec('feature_disabled', 'Fonctionnalité non ouverte.', 503) };
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

const SELECTION_PROPOSITION = {
  id: true,
  fragments: true,
  hashSources: true,
  assembleeLe: true,
  creeLe: true,
} as const;

type LigneLue = {
  id: string;
  fragments: unknown;
  hashSources: string;
  assembleeLe: Date | null;
  creeLe: Date;
};

/**
 * Les fragments tels qu'ils sortent du JSONB. LE CHEMIN D'ÉCRITURE GARANTIT LA
 * FORME (fabriques + balayage), LA LECTURE NE LA RE-VALIDE PAS — mais elle ne
 * la PRÉSUME pas non plus : `fragments` est un JSONB libre, la table est en
 * production depuis le LOT-01, et rien n'interdit qu'une ligne y ait été
 * déposée autrement. Ce qui n'a pas la forme attendue est ÉCARTÉ, jamais
 * complété : un fragment sans source affiché comme s'il en avait une serait
 * exactement la faute que `D-094` interdit.
 */
function exposerFragments(brut: unknown): FragmentExpose[] {
  if (!Array.isArray(brut)) return [];
  return brut.flatMap((entree) => {
    if (entree === null || typeof entree !== 'object' || Array.isArray(entree)) return [];
    const { texte, source } = entree as { texte?: unknown; source?: unknown };
    if (typeof texte !== 'string' || texte.trim().length === 0) return [];
    if (source === null || source === undefined || typeof source !== 'object') return [];
    return [{ texte, source }];
  });
}

function exposer(ligne: LigneLue, disposition: GesteDisposition | null): PropositionExposee {
  return {
    id: ligne.id,
    fragments: exposerFragments(ligne.fragments),
    assembleeLe: ligne.assembleeLe ? ligne.assembleeLe.toISOString() : null,
    creeLe: ligne.creeLe.toISOString(),
    disposition,
  };
}

type LigneDispositionLue = {
  id: string;
  idProposition: string;
  geste: string;
  creeLe: Date;
};

/**
 * La vue complète d'un dossier : vivantes, disposées, caduques. Partagée par
 * le GET et par la réponse de l'assemblage, pour que les deux ne puissent pas
 * diverger — deux constructions de la même vue finiraient par ne plus dire la
 * même chose.
 */
function vueDossier(lignes: LigneLue[], dispositions: LigneDispositionLue[]) {
  const courante = assembleeCourante(lignes);
  const idsCourants = new Set(courante.map((ligne) => ligne.id));

  return {
    // UNE PROPOSITION SANS FRAGMENT N'EST RIEN À PROPOSER. Le blob est libre
    // et la table est en production depuis le LOT-01 : une ligne dont tous
    // les fragments sont écartés à la lecture existe. La servir donnerait une
    // carte vide que le praticien pourrait reprendre — la logique même de
    // `marquer`, qui refuse de citer le vide, vaut jusqu'à l'écran.
    propositions: propositionsVivantes(lignes, dispositions)
      .map((ligne) => exposer(ligne, null))
      .filter((proposition) => proposition.fragments.length > 0),
    // FILTRÉE SUR LE GESTE, ET NON SUR « CE QUI N'EST PAS VIVANT ». Les deux
    // formulations divergent dès que l'assemblée courante dépasse trois
    // lignes : le surplus non disposé serait alors tombé ici avec
    // `disposition: null`, et l'écran l'aurait lu comme « le praticien a
    // tranché ». Faire dire à un dossier qu'un geste a eu lieu quand il n'a
    // pas eu lieu est exactement ce que la campagne interdit.
    disposees: courante
      .map((ligne) => ({ ligne, geste: dispositionCourante(ligne.id, dispositions) }))
      .filter((entree): entree is { ligne: LigneLue; geste: GesteDisposition } => entree.geste !== null)
      .map((entree) => exposer(entree.ligne, entree.geste)),
    caduques: lignes
      .filter((ligne) => !idsCourants.has(ligne.id))
      .slice(0, MAX_PROPOSITIONS)
      .map((ligne) => exposer(ligne, dispositionCourante(ligne.id, dispositions))),
  };
}

async function lireDossier(idPatient: string) {
  const [lignes, dispositions] = await Promise.all([
    prisma.propositionObjectif.findMany({
      where: { idPatient },
      select: SELECTION_PROPOSITION,
      // TROIS CLÉS, ET LES TROIS SERVENT.
      //
      // `nulls: 'last'` n'est pas cosmétique : en `DESC`, PostgreSQL place les
      // NULL EN PREMIER par défaut. La colonne est nullable et ce lot traite
      // justement une ligne sans `assembleeLe` comme caduque — sans cette
      // précision, une telle ligne monopoliserait les trois créneaux de
      // `caduques` et masquerait les vraies caduques récentes.
      //
      // `id` en dernier ressort, parce que les deux premières clés sont
      // ÉGALES sur toute une assemblée : un seul `createMany` pose le même
      // `assembleeLe`, et `cree_le` vaut `CURRENT_TIMESTAMP`, identique pour
      // toutes les lignes d'un même INSERT. Sans ce départage, l'ordre servi
      // au praticien est celui que la base veut bien rendre, et il peut
      // changer d'un rechargement à l'autre. Il reste ARBITRAIRE — ce lot ne
      // persiste aucun ordre (`D-094` §3) — mais il est STABLE, et une liste
      // qui se réordonne toute seule se lirait comme une information.
      orderBy: [
        { assembleeLe: { sort: 'desc', nulls: 'last' } },
        { creeLe: 'desc' },
        { id: 'asc' },
      ],
    }),
    prisma.dispositionProposition.findMany({
      where: { idPatient },
      select: { id: true, idProposition: true, geste: true, creeLe: true },
    }),
  ]);
  return { lignes, dispositions };
}

// GET /api/praticien/propositions-objectif?idPatient=
//
// SERT LA DERNIÈRE ASSEMBLÉE ENREGISTRÉE, pas un verdict recalculé — la route
// n'a pas les candidats sous la main, et G7 lui interdit de les produire.
// `assembleeLe` voyage donc dans la réponse : l'écran doit pouvoir dire DE
// QUAND date ce qu'il montre.
//
// DETTE NOMMÉE, ET ELLE N'EST PAS DE FORME. Une assemblée qui deviendrait VIDE
// (table dépubliée, abstention devenue requise, plus aucun candidat) ne
// retire pas la précédente : il n'existe aucune ligne à écrire pour dire
// « désormais, rien ». Fermer ce cas demande une colonne ou une table
// d'assemblée — donc une migration, hors périmètre du LOT-02. En attendant,
// c'est le geste `assembler` qui fait foi, et le LOT-03 l'appelle avant
// d'afficher.
export async function GET(req: Request): Promise<NextResponse<PropositionsApiResponse>> {
  try {
    const { searchParams } = new URL(req.url);
    const idPatient = (searchParams.get('idPatient') ?? '').trim();
    const garde = await garder(idPatient, { route: ROUTE_JOURNAL, methode: 'GET' });
    if (garde.echec) return garde.echec;

    const { lignes, dispositions } = await lireDossier(idPatient);
    return NextResponse.json({ ok: true, ...vueDossier(lignes, dispositions) });
  } catch (err) {
    console.error('[praticien/propositions-objectif GET]', messageJournalisable(err));
    return echec('exception', 'Erreur technique.', 500);
  }
}

type CorpsPost = {
  action?: unknown;
  idPatient?: unknown;
  plainte?: unknown;
  candidats?: unknown;
  shaPerimetre?: unknown;
  idProposition?: unknown;
  motif?: unknown;
};

function texteDuCorps(valeur: unknown): string {
  return typeof valeur === 'string' ? valeur.trim() : '';
}

/** Un identifiant reçu du client : non vide, borné, sinon `null`. */
function identifiantRecu(valeur: unknown): string | null {
  const texte = texteDuCorps(valeur);
  if (texte.length === 0 || texte.length > LONGUEUR_MAX_IDENTIFIANT_RECU) return null;
  if (!IDENTIFIANT_PATTERN.test(texte)) return null;
  return texte;
}

type LecturePlainte = { ok: true; plainte: PlainteCitable | null } | { ok: false };

/**
 * La plainte dominante reçue du cockpit. ABSENTE EST UNE RÉPONSE VALIDE : le
 * canal de plainte n'est pas toujours mesurable, et fabriquer une plainte de
 * remplacement serait inventer (`DC-24`). MALFORMÉE, en revanche, est un refus
 * — l'accepter à moitié ferait citer un instrument sur des valeurs partielles.
 */
function lirePlainte(valeur: unknown): LecturePlainte {
  if (valeur === undefined || valeur === null) return { ok: true, plainte: null };
  if (typeof valeur !== 'object' || Array.isArray(valeur)) return { ok: false };

  const brut = valeur as { instrument?: unknown; domaine?: unknown; restitution?: unknown };
  const instrument = identifiantRecu(brut.instrument);
  const domaine = identifiantRecu(brut.domaine);
  if (!instrument || !domaine) return { ok: false };

  if (brut.restitution !== undefined && brut.restitution !== null && typeof brut.restitution !== 'string') {
    return { ok: false };
  }
  const restitution = texteDuCorps(brut.restitution);
  if (restitution.length > LONGUEUR_MAX_TEXTE_RECU) return { ok: false };

  return {
    ok: true,
    plainte: { instrument, domaine, restitution: restitution.length === 0 ? null : restitution },
  };
}

type LectureCandidats = { ok: true; candidats: CandidatCitable[] } | { ok: false };

/**
 * Les candidats reçus du cockpit. AUCUN CANDIDAT EST UNE RÉPONSE VALIDE — la
 * table peut n'être pas signée, une abstention peut être requise, aucune règle
 * peut se déclencher ; dans ces cas la machine n'a rien de signé à citer et
 * n'assemble rien.
 *
 * `rank` et `confidence` de la carte NE SONT PAS LUS, même s'ils arrivent : ce
 * qu'on ne lit pas ne peut pas se persister, donc ne peut pas se trier.
 */
function lireCandidats(valeur: unknown): LectureCandidats {
  if (valeur === undefined || valeur === null) return { ok: true, candidats: [] };
  if (!Array.isArray(valeur) || valeur.length > MAX_CANDIDATS_RECUS) return { ok: false };

  const candidats: CandidatCitable[] = [];
  for (const entree of valeur) {
    if (entree === null || typeof entree !== 'object' || Array.isArray(entree)) return { ok: false };
    const brut = entree as { regle?: unknown; texte?: unknown };
    const regle = identifiantRecu(brut.regle);
    if (!regle) return { ok: false };
    if (typeof brut.texte !== 'string') return { ok: false };
    const texte = brut.texte.trim();
    if (texte.length === 0 || texte.length > LONGUEUR_MAX_TEXTE_RECU) return { ok: false };
    candidats.push({ regle, texte });
  }
  return { ok: true, candidats };
}

/**
 * L'anamnèse citable, LUE EN BASE. Mêmes champs que l'ancrage de la route
 * objectifs, mêmes règles : un champ non textuel est écarté, pas deviné.
 *
 * Sans consultation validée, `null` — et le module n'ajoutera aucun fragment
 * d'anamnèse. Un dossier sans consultation validée n'a pas de silence à
 * combler.
 */
async function lireAnamnese(idPatient: string) {
  const consultation = await prisma.consultation.findFirst({
    where: { idPatient, statut: 'validee' },
    select: { anamnese: true, dateValidation: true, createdAt: true },
    orderBy: [{ dateValidation: 'desc' }, { createdAt: 'desc' }],
  });
  if (!consultation) return null;

  const source =
    consultation.anamnese !== null
    && typeof consultation.anamnese === 'object'
    && !Array.isArray(consultation.anamnese)
      ? (consultation.anamnese as Record<string, unknown>)
      : {};

  const champTexte = (cle: string): string | null => {
    const valeur = source[cle];
    if (typeof valeur !== 'string') return null;
    const texte = valeur.trim();
    return texte.length === 0 ? null : texte;
  };

  const attentes = Array.isArray(source.attentes)
    ? source.attentes
        .filter((entree): entree is string => typeof entree === 'string')
        .map((entree) => entree.trim())
        .filter((entree) => entree.length > 0)
    : [];

  return {
    // La date de la consultation d'où vient le verbatim : une citation se
    // date. `dateValidation` d'abord — c'est l'événement clinique ; `createdAt`
    // en repli, la colonne étant nullable.
    dateConsultation: (consultation.dateValidation ?? consultation.createdAt).toISOString(),
    motifPrincipal: champTexte('motif_principal'),
    objectifPrioritaire: champTexte('objectif_prioritaire'),
    attentes,
  };
}

// POST /api/praticien/propositions-objectif
export async function POST(req: Request): Promise<NextResponse<PropositionsApiResponse>> {
  try {
    let body: CorpsPost;
    try {
      body = (await req.json()) as CorpsPost;
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

    const action = texteDuCorps(body.action);
    if (action !== 'assembler' && action !== 'ecarter') {
      return echec('invalid', 'Action inconnue.', 400);
    }

    // LE GESTE `assembler` REND LE DOSSIER, DONC IL LE JOURNALISE.
    //
    // Le patron hérité — « une écriture laisse déjà sa propre trace, datée et
    // attribuée » (`objectifs/route.ts`) — ne s'applique pas ici, et pour deux
    // raisons distinctes. D'une part `assembler` rend EXACTEMENT le corps du
    // GET, fragments compris, c'est-à-dire les mots du patient. D'autre part
    // son cas NOMINAL n'écrit rien : l'idempotence par empreinte fait sortir
    // sans `createMany`, et `propositions_objectif` ne porte de toute façon
    // aucun `praticien_email` — la ligne dirait qu'un assemblage a eu lieu,
    // jamais qui a lu. Le chemin d'usage normal serait donc celui qui ne
    // laisse pas de trace, et le GET journalisé deviendrait facultatif.
    //
    // `ecarter`, lui, ne journalise pas : il écrit une ligne qui porte son
    // auteur et sa date, et il ne rend pas le dossier.
    const idPatient = texteDuCorps(body.idPatient);
    const garde = await garder(
      idPatient,
      action === 'assembler' ? { route: ROUTE_JOURNAL, methode: 'POST' } : undefined,
    );
    if (garde.echec) return garde.echec;

    // Dossier clos : une proposition d'objectif est une pièce du dossier, le
    // refus vit dans la ROUTE et pas seulement dans l'écran (#181).
    const patient = await prisma.patient.findUnique({
      where: { idPatient },
      select: { actif: true, suiviClotureLe: true },
    });
    if (!patient || !accepteNouvelEnvoi(patient)) {
      return echec(RAISON_DOSSIER_CLOS, MESSAGE_DOSSIER_CLOS, 409);
    }

    // `return await`, ET LE `await` N'EST PAS DÉCORATIF : `return promesse`
    // dans un `try` rend la promesse SANS l'attendre, si bien qu'un rejet
    // échappe au `catch` ci-dessous. La route propagerait alors l'erreur
    // Prisma brute — avec, dans son message, le `data:` du `createMany`,
    // c'est-à-dire les mots du patient. Le banc « rend 500 sans jamais
    // journaliser les mots du patient » l'a vu rouge.
    if (action === 'assembler') return await assembler(idPatient, body);
    return await ecarter(idPatient, garde.email, body);
  } catch (err) {
    // Jamais le payload : il porte les mots du patient.
    console.error('[praticien/propositions-objectif POST]', messageJournalisable(err));
    return echec('exception', 'Erreur technique.', 500);
  }
}

/**
 * `assembler` — recalcule, n'écrit que si les sources ont bougé.
 *
 * L'IDEMPOTENCE EST PORTÉE PAR L'EMPREINTE, pas par un verrou : deux appels
 * successifs sur les mêmes sources produisent les mêmes empreintes, donc
 * n'écrivent rien la seconde fois. C'est ce qui permet au cockpit d'appeler ce
 * geste à chaque ouverture de panneau sans faire enfler la table.
 *
 * Ce geste N'EST PAS un événement de disposition : il n'écrit jamais dans
 * `dispositions_proposition`, et jamais dans les tables de 6.0-A.
 */
async function assembler(
  idPatient: string,
  body: CorpsPost,
): Promise<NextResponse<PropositionsApiResponse>> {
  const shaPerimetre = texteDuCorps(body.shaPerimetre);
  if (shaPerimetre.length > 0 && !SHA_PERIMETRE_PATTERN.test(shaPerimetre)) {
    return echec('invalid', 'SHA de périmètre invalide.', 400);
  }

  const plainte = lirePlainte(body.plainte);
  if (!plainte.ok) return echec('invalid', 'Plainte dominante invalide.', 400);

  const candidats = lireCandidats(body.candidats);
  if (!candidats.ok) return echec('invalid', 'Candidats invalides.', 400);

  const anamnese = await lireAnamnese(idPatient);
  const assemblees = assemblerPropositions({
    anamnese,
    plainte: plainte.plainte,
    candidats: candidats.candidats,
    shaPerimetre: shaPerimetre.length === 0 ? null : shaPerimetre,
  });

  const { lignes, dispositions } = await lireDossier(idPatient);
  const courante = assembleeCourante(lignes);

  // MÊMES EMPREINTES ⇒ RIEN À ÉCRIRE. Comparaison d'ensembles et non de
  // tableaux : l'ordre des candidats n'est couvert par aucune ligne signée
  // (`D-093`), le faire compter ici lui donnerait le poids qu'on lui refuse.
  const stockees = new Set(courante.map((ligne) => ligne.hashSources));
  const fraiches = new Set(assemblees.map((proposition) => proposition.hashSources));
  const inchangees =
    assemblees.length > 0
    && stockees.size === fraiches.size
    && [...fraiches].every((hash) => stockees.has(hash));

  if (inchangees || assemblees.length === 0) {
    return NextResponse.json({ ok: true, ...vueDossier(lignes, dispositions) });
  }

  // LE BALAYAGE, DERNIER CONTRÔLE AVANT L'ÉCRITURE (arbitrage 1). Les
  // fabriques tiennent déjà la provenance ; celui-ci tient la FORME du blob,
  // que rien en base ne peut contraindre. Il porte sur la valeur RÉELLEMENT
  // sérialisée, pas sur une reconstruction — c'est le même objet qui part en
  // base juste après.
  const aEcrire = assemblees.map((proposition) => ({
    idPatient,
    fragments: proposition.fragments as unknown as object[],
    hashSources: proposition.hashSources,
  }));
  const fautives = clesInterdites(aEcrire.map((ligne) => ligne.fragments));
  if (fautives.length > 0) {
    // 500 et non 400 : le corps de la requête n'est pas en cause, c'est
    // l'assemblage qui a produit une forme interdite. Un défaut du serveur ne
    // se présente pas comme une faute de l'appelant.
    console.error('[praticien/propositions-objectif] clés interdites', fautives.join(','));
    return echec('exception', 'Erreur technique.', 500);
  }

  // UN SEUL INSTANT POUR TOUTE L'ASSEMBLÉE : `assembleeLe` est la CLÉ
  // D'ASSEMBLÉE, ce qui rend « les propositions issues du même calcul »
  // exprimable. `creeLe` reste posée par la base (`@default(now())`) — c'est
  // ce qui rend une ligne inantidatable.
  //
  // DETTE NOMMÉE — LIRE-PUIS-ÉCRIRE N'EST PAS ÉTANCHE À LA COURSE (relevée en
  // revue). Deux `assembler` concurrents — double montage React, double clic,
  // deux onglets, et le geste est appelé à chaque ouverture de panneau —
  // lisent tous deux l'état d'avant, concluent tous deux que les empreintes
  // ont bougé, et écrivent chacun leur assemblée. Le service reste JUSTE
  // (l'assemblée la plus récente gagne, l'autre devient caduque) et le
  // troisième appel re-stabilise tout par idempotence ; ce qui reste est une
  // trace en double dans une table append-only, donc un peu de bruit dans le
  // matériau du bilan LOT-06.
  //
  // Ce qui la fermerait : un index unique `(id_patient, hash_sources)` —
  // c'est-à-dire une migration, hors périmètre de ce lot — ou une transaction
  // sérialisable englobant lecture et écriture. La seconde est disponible
  // sans migration ; elle n'est pas posée ici parce qu'elle sérialiserait le
  // chemin le plus fréquent de la fonctionnalité pour un défaut qui ne
  // produit ni perte ni contre-vérité. Arbitrage à rendre au LOT-03, quand on
  // saura à quelle cadence le panneau appelle réellement.
  const assembleeLe = new Date();
  await prisma.propositionObjectif.createMany({
    data: aEcrire.map((ligne) => ({ ...ligne, assembleeLe })),
  });

  const relu = await lireDossier(idPatient);
  return NextResponse.json({ ok: true, ...vueDossier(relu.lignes, relu.dispositions) });
}

/**
 * `ecarter` — l'événement motivé. Append-only : se raviser est une ligne de
 * plus, jamais un update.
 *
 * SEUL `ecartee` PASSE PAR ICI. `reprise` est écrit par la route objectifs au
 * moment où l'objectif négocié est créé (LOT-03) : le geste et sa conséquence
 * doivent être posés ensemble, sinon un dossier peut porter une reprise sans
 * objectif — un praticien aurait « repris » quelque chose qui n'existe pas.
 */
async function ecarter(
  idPatient: string,
  praticienEmail: string,
  body: CorpsPost,
): Promise<NextResponse<PropositionsApiResponse>> {
  if (body.motif !== undefined && body.motif !== null && typeof body.motif !== 'string') {
    return echec('invalid', 'Motif invalide.', 400);
  }

  const preparation = preparerDisposition({
    idPatient,
    praticienEmail,
    idProposition: texteDuCorps(body.idProposition),
    geste: 'ecartee',
    motif: typeof body.motif === 'string' ? body.motif : null,
  });
  if (!preparation.ok) {
    const statut = REFUS_CONTENU.has(preparation.raison) ? 422 : 400;
    return echec(preparation.raison, MESSAGES_REFUS[preparation.raison], statut);
  }

  // LA PROPOSITION VISÉE DOIT EXISTER ET APPARTENIR AU DOSSIER.
  // `id_proposition` est une référence SOUPLE (sans clé étrangère, patron du
  // LOT-01) : sans ce contrôle, un écart pourrait se poser sur une proposition
  // d'un autre dossier — ou sur rien du tout.
  //
  // Le prédicat est scopé au dossier, et ce n'est pas cosmétique : le seul
  // index de la table est `(id_patient, cree_le)`. Sans `idPatient`, il ne
  // peut pas être emprunté et le parcours porte sur une table append-only qui
  // ne fait que croître.
  const visee = await prisma.propositionObjectif.findFirst({
    where: { id: preparation.donnees.idProposition, idPatient },
    select: { id: true },
  });
  // INEXISTANTE OU D'UN AUTRE DOSSIER : MÊME réponse, MÊME message. Les
  // distinguer ferait de la route un oracle d'existence, interrogeable avec
  // une session praticien quelconque.
  if (!visee) {
    return echec('proposition_introuvable', 'Proposition introuvable.', 404);
  }

  const creee = await prisma.dispositionProposition.create({
    data: preparation.donnees,
    select: { id: true, geste: true, creeLe: true },
  });

  return NextResponse.json(
    {
      ok: true,
      disposition: {
        id: creee.id,
        geste: creee.geste as GesteDisposition,
        creeLe: creee.creeLe.toISOString(),
      },
    },
    { status: 201 },
  );
}
