import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emailPraticien, filtrePatientsDuPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import { AGENDA_ALI_ID } from '@/lib/agenda-alimentaire/types';
import { jourCourantLocal } from '@/lib/patient-access';
import { messageNirInvalide, verifierNir } from '@/lib/patient/nir';

const MAX_ASSIGNATIONS = 40;

// Statuts filtrables côté serveur. Le filtre vivait côté client, appliqué APRÈS
// la troncature à `MAX_ASSIGNATIONS` : filtrer une liste déjà tronquée ne cache
// pas des lignes en trop, il en cache en moins — et sans le dire. Au 2026-07-29,
// 8 assignations « En attente » tombaient hors des 40 plus récentes et devenaient
// donc invisibles ET inannulables depuis le tableau praticien.
const STATUTS_ASSIGNATION = ['En attente', 'Complété', 'Annulée'] as const;

// Statuts de RÉPONSE filtrables côté serveur — autre colonne, même défaut.
// `FichePatientPanel` filtrait `modification_demandee` en mémoire APRÈS la
// troncature à `MAX_ASSIGNATIONS`, et sur les assignations de TOUS les patients :
// une demande de correction au-delà du 40ᵉ rang n'apparaissait nulle part, et
// n'était donc jamais débloquée — le questionnaire restait verrouillé côté
// patient sans que rien ne le signale au praticien.
//
// Les quatre valeurs sont celles qu'écrit le code : `non_rempli` (défaut du
// schéma), `verrouille` (soumission patient, clôture d'agenda),
// `modification_demandee` (demande de correction du patient) et `deverrouille`
// (déblocage praticien). Au 2026-07-29, la base n'en porte que deux
// (`verrouille` 65, `non_rempli` 28) et aucune valeur hors de cette liste.
const STATUTS_REPONSES = ['non_rempli', 'verrouille', 'modification_demandee', 'deverrouille'] as const;

// Une valeur inconnue est IGNORÉE, pas rejetée : même choix que `sortBy` plus
// bas. Un 400 sur un paramètre d'affichage priverait le praticien de sa liste
// entière pour une faute de frappe dans une URL.
function valeurAutorisee(
  searchParams: URLSearchParams,
  cle: string,
  autorisees: readonly string[],
): string | null {
  const brut = searchParams.get(cle);
  return autorisees.includes(brut ?? '') ? brut : null;
}

type Patient = {
  idPatient: string;
  email: string;
  prenom: string;
  nom: string;
  telephone: string;
  actif: string;
  // Clôture de suivi (IDP2). DISTINCT de `actif` : un dossier clos garde son
  // accès en lecture, un dossier inactif le perd. L'écran ne peut pas déduire
  // l'un de l'autre — d'où ce champ, et non un booléen de plus.
  suiviClotureLe: string | null;
  // Accès au portail révoqué par le praticien (`accessTokenRevoked`). DISTINCT
  // d'`actif` comme de `suiviClotureLe`, et non déductible de l'un ni de
  // l'autre : `D-126` §2 a tranché que désactiver un dossier ne pose PAS ce
  // drapeau. Sans ce champ, la seule surface qui montrait la révocation était
  // l'encart « Nouveaux patients », borné à 30 jours — au 31ᵉ, le praticien ne
  // voyait plus l'état qu'un envoi de lien allait lever.
  accesRevoque: boolean;
  // LE DOSSIER ADMINISTRATIF (LOT-05). Cinq champs qui étaient saisis à la
  // création et ne se corrigeaient plus jamais, ou qui n'existaient pas du
  // tout. Tous NULLABLES et servis en chaîne vide quand ils manquent — sauf
  // `dateNaissance`, servie `null`, parce qu'une date vide n'est pas une date
  // et qu'un champ date ne sait pas afficher « ».
  //
  // `nir` EST SERVI EN CLAIR, comme toute autre donnée du dossier : arbitrage
  // du responsable, 2026-09-16. Ce qui le protège est ce qui protège le reste —
  // RLS deny-all, garde d'appartenance, journal des accès —, pas un masquage
  // d'affichage qui n'aurait trompé que le praticien.
  dateNaissance: string | null;
  adresse: string;
  nir: string;
  medecinTraitantNom: string;
  medecinTraitantCoordonnees: string;
};

type Assignation = {
  idAssignation: string;
  idPatient: string;
  emailPatient: string;
  idQuestionnaire: string;
  titre: string;
  dateAssignation: string;
  statut: string;
  statutReponses: string;
  correctionCommentaire: string | null;
  correctionDemandeeDate: string | null;
  // Échéance telle qu'elle est STOCKÉE (`AAAA-MM-JJ`), pour être AFFICHÉE — et
  // pour cela seulement. L'écran ne recalcule JAMAIS l'expiration à partir
  // d'elle : `isDeadlineExpired` construit une date sans fuseau, donc évaluée
  // dans un navigateur elle se lit à l'heure du NAVIGATEUR — à Paris l'été, le
  // client déclarait l'expiration ~2 h avant le serveur. C'est le serveur qui
  // décide, par `echeanceDepassee` ; ce champ ne sert qu'à écrire la date sous
  // les yeux du praticien. Optionnel comme les deux champs suivants.
  dateLimite?: string | null;
  // Fait, pas verdict : « au moins une QuestionnaireReponse existe pour cette
  // assignation », jamais « annulable » — la décision d'autorisation reste
  // dans `estAnnulable` (lib/praticien/annulabilite.ts), pas dans ce DTO de
  // liste. Optionnel comme `assignationsMeta` (cf. commentaire plus bas) : un
  // client déployé avant ce champ doit pouvoir constater son absence plutôt
  // que la supposer.
  aPassation?: boolean;
  // Tri-état, `null` n'est PAS `0` : `null` = cette assignation n'est pas un
  // agenda alimentaire (`Q_ALI_09`), il n'y a rien à dire ; `0` = c'en est un,
  // sans aucune journée notée — et ça se dit. Compte de DATES distinctes, pas
  // de lignes : le modèle est append-only, une journée corrigée porte deux
  // lignes `agenda_alimentaire_jours` pour une seule date. Fait d'affichage
  // seul, comme `aPassation` : n'entre dans aucune décision d'autorisation.
  nbJourneesAgenda?: number | null;
};

export type PatientsPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

// Distinct de `PatientsPagination`, qui décrit les patients. `total` est le
// nombre d'assignations répondant au filtre EN BASE ; `assignations.length` est
// ce que la troncature en a laissé. Sans ce compte, le client ne peut pas savoir
// qu'il est tronqué — et affiche un plafond comme s'il était un total.
export type AssignationsMeta = {
  total: number;
  plafond: number;
  statut: string | null;
  // Écho des deux autres filtres. Facultatifs à dessein : ils décrivent ce que
  // CE serveur a appliqué, et un client déployé avant eux doit pouvoir constater
  // leur absence plutôt que la supposer. Le client s'en sert pour vérifier que
  // sa demande a bien été honorée avant de conclure quoi que ce soit sur la
  // troncature — un `total` de 93 sous un filtre ignoré se lirait sinon comme
  // une troncature massive.
  statutReponses?: string | null;
  idPatient?: string | null;
  // Écho du filtre d'échéance. Même raison que les deux au-dessus : le client
  // doit pouvoir constater qu'un serveur antérieur l'a IGNORÉ, plutôt que de
  // lire une liste non filtrée comme une liste filtrée — et d'offrir un
  // déblocage sur des assignations dont l'échéance court encore.
  echeanceDepassee?: boolean;
};

export type PatientsApiResponse = {
  patients: Patient[];
  assignations: Assignation[];
  assignationsMeta?: AssignationsMeta;
  pagination?: PatientsPagination;
  unavailable?: boolean;
  reason?: 'unauthenticated' | 'exception';
};

export type CreatePatientResponse = {
  success: boolean;
  patient?: Patient;
  error?: string;
  reason?: 'unauthenticated' | 'invalid_payload' | 'duplicate_email' | 'exception';
};

export type PatchPatientResponse = {
  success: boolean;
  error?: string;
  // `duplicate_email` s'ajoute au LOT-05, avec l'e-mail modifiable : même
  // motif que celui de `POST`, et le MÊME nom — l'écran ne doit pas avoir à
  // savoir si le conflit vient d'une création ou d'une correction.
  reason?:
    | 'unauthenticated'
    | 'invalid_payload'
    | 'patient_not_found'
    | 'forbidden'
    | 'duplicate_email'
    | 'exception';
};

// Il n'y a PAS de `DeletePatientResponse` ni de handler `DELETE` ici, et c'est
// délibéré (2026-07-21, LOT-01b). La route existait, n'avait plus d'appelant
// depuis que « Supprimer » a rejoint le menu sous son vrai nom, et surtout elle
// écrivait `actif: false` : un verbe DELETE qui ne détruisait rien, désormais
// voisin d'un effacement qui détruit vraiment. Désactiver un dossier se fait
// par `PATCH { actif: 'NON' }`, qui dit ce qu'il fait ; l'effacement par
// `POST /api/praticien/patients/cycle-de-vie`.

// Prochain idPatient au format PATnnn, dérivé du max courant en base.
async function nextIdPatient(): Promise<string> {
  const patients = await prisma.patient.findMany({ select: { idPatient: true } });
  const maxId = patients.reduce((max, p) => {
    const m = /^PAT(\d+)$/.exec(p.idPatient);
    if (!m) return max;
    return Math.max(max, Number(m[1]));
  }, 0);
  return `PAT${String(maxId + 1).padStart(3, '0')}`;
}

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export async function GET(req: Request): Promise<NextResponse<PatientsApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { patients: [], assignations: [], unavailable: true, reason: 'unauthenticated' },
      { status: 401 }
    );
  }

  const email = emailPraticien(session);
  if (!email) {
    return NextResponse.json(
      { patients: [], assignations: [], unavailable: true, reason: 'unauthenticated' },
      { status: 401 }
    );
  }

  // `page` absent = comportement historique (liste complète, non paginée),
  // conservé pour les appelants qui ont besoin de tous les patients (ex.
  // le sélecteur de la nouvelle assignation). `page` présent = pagination
  // serveur avec recherche/tri, pour l'affichage tabulaire.
  const { searchParams } = new URL(req.url);
  const pageParam = Number(searchParams.get('page'));
  const isPaginated = Number.isInteger(pageParam) && pageParam >= 1;

  // Un seul `where` pour la liste ET pour le compte : c'est la seule façon que
  // « 40 sur 48 » parle du même ensemble que les 40 lignes rendues. La garde de
  // portée praticien reste en tête — le filtre de statut s'y ajoute, il ne la
  // remplace pas.
  const statut = valeurAutorisee(searchParams, 'statut', STATUTS_ASSIGNATION);
  const statutReponses = valeurAutorisee(searchParams, 'statutReponses', STATUTS_REPONSES);
  // Restriction à un patient. Contrairement aux statuts, une valeur inconnue
  // n'est PAS ignorée : l'ignorer rendrait les assignations de TOUS les patients
  // à un appelant qui en demande un seul, et la fiche afficherait alors les
  // demandes de correction d'un autre dossier. Le filtre est donc appliqué tel
  // quel — une valeur qui ne correspond à rien rend une liste vide, jamais celle
  // d'autrui. La garde de portée praticien reste en tête du `where` : elle n'est
  // pas remplacée, un idPatient d'un autre praticien ne rend rien.
  const idPatientDemande = (searchParams.get('idPatient') ?? '').trim().slice(0, 100) || null;
  // ── ÉCHÉANCE DÉPASSÉE : LE FILTRE EST EN BASE, JAMAIS DANS L'ÉCRAN ────────
  //
  // Troisième filtre remonté côté serveur, et pour la troisième fois la même
  // raison : filtrer en mémoire une liste déjà tronquée à `MAX_ASSIGNATIONS`
  // ne cache pas des lignes en trop, il en cache en moins — sans le dire.
  //
  // `date_limite` est une colonne TEXTE `AAAA-MM-JJ` : l'ordre lexicographique
  // y est l'ordre chronologique, donc « échue » s'écrit `< aujourd'hui`. Le
  // `not: null` n'est pas décoratif — sans lui, une assignation SANS échéance
  // dépendrait de la façon dont le moteur compare `NULL`, alors que la règle du
  // portail est explicite : pas d'échéance, jamais expirée.
  //
  // `jourCourantLocal` lit l'horodatage LOCAL du serveur, comme
  // `isDeadlineExpired` lit le sien ; `patient-access.guard.test.ts` tient les
  // deux règles d'accord, et c'est lui seul qui les tient.
  const echeanceDepassee = searchParams.get('echeanceDepassee') === '1';
  const whereAssignations = {
    patient: filtrePatientsDuPraticien(email),
    ...(statut ? { statut } : {}),
    ...(statutReponses ? { statutReponses } : {}),
    ...(idPatientDemande ? { idPatient: idPatientDemande } : {}),
    ...(echeanceDepassee ? { dateLimite: { not: null, lt: jourCourantLocal() } } : {}),
  };

  try {
    if (isPaginated) {
      const page = pageParam;
      const pageSize = clamp(Number(searchParams.get('pageSize')) || DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
      const search = (searchParams.get('search') ?? '').trim().slice(0, 200);
      const sortBy = searchParams.get('sortBy') === 'email' ? 'email' : 'nom';

      const where = {
        ...filtrePatientsDuPraticien(email),
        ...(search
          ? {
              OR: [
                { nom: { contains: search, mode: 'insensitive' as const } },
                { prenom: { contains: search, mode: 'insensitive' as const } },
                { email: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      };
      const orderBy =
        sortBy === 'email'
          ? [{ email: 'asc' as const }]
          : [{ nom: 'asc' as const }, { prenom: 'asc' as const }];

      const [dbPatients, total, dbAssignations, totalAssignations] = await Promise.all([
        prisma.patient.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
        prisma.patient.count({ where }),
        prisma.assignation.findMany({
          where: whereAssignations,
          orderBy: { dateAssignation: 'desc' },
          take: MAX_ASSIGNATIONS,
        }),
        prisma.assignation.count({ where: whereAssignations }),
      ]);
      // Les deux comptages sont indépendants : en série ils ajouteraient deux
      // allers-retours à la page au lieu d'un. Même raison que le `Promise.all`
      // ci-dessus — le coût d'une requête de plus ne se voit qu'en prod.
      const [idsAvecPassation, nbJourneesParAssignation] = await Promise.all([
        idsAssignationsAvecPassation(dbAssignations.map(a => a.idAssignation)),
        nbJourneesAgendaParAssignation(
          dbAssignations.filter(a => a.idQuestionnaire === AGENDA_ALI_ID).map(a => a.idAssignation),
        ),
      ]);

      return NextResponse.json({
        patients: dbPatients.map(patientToDto),
        assignations: dbAssignations.map(a => assignationToDto(a, idsAvecPassation, nbJourneesParAssignation)),
        assignationsMeta: {
          total: totalAssignations,
          plafond: MAX_ASSIGNATIONS,
          statut,
          statutReponses,
          echeanceDepassee,
          idPatient: idPatientDemande,
        },
        pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
      });
    }

    const [dbPatients, dbAssignations, totalAssignations] = await Promise.all([
      prisma.patient.findMany({ where: filtrePatientsDuPraticien(email), orderBy: [{ nom: 'asc' }, { prenom: 'asc' }] }),
      prisma.assignation.findMany({
        where: whereAssignations,
        orderBy: { dateAssignation: 'desc' },
        take: MAX_ASSIGNATIONS,
      }),
      prisma.assignation.count({ where: whereAssignations }),
    ]);
    // Même parallélisation que la branche paginée ci-dessus.
    const [idsAvecPassationNonPaginee, nbJourneesParAssignationNonPaginee] = await Promise.all([
      idsAssignationsAvecPassation(dbAssignations.map(a => a.idAssignation)),
      nbJourneesAgendaParAssignation(
        dbAssignations.filter(a => a.idQuestionnaire === AGENDA_ALI_ID).map(a => a.idAssignation),
      ),
    ]);

    return NextResponse.json({
      patients: dbPatients.map(patientToDto),
      assignations: dbAssignations.map(a => assignationToDto(a, idsAvecPassationNonPaginee, nbJourneesParAssignationNonPaginee)),
      assignationsMeta: {
        total: totalAssignations,
        plafond: MAX_ASSIGNATIONS,
        statut,
        statutReponses,
        echeanceDepassee,
        idPatient: idPatientDemande,
      },
    });
  } catch (err) {
    console.error('[patients GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({
      patients: [],
      assignations: [],
      unavailable: true,
      reason: 'exception',
    });
  }
}

function patientToDto(p: {
  idPatient: string;
  email: string;
  prenom: string;
  nom: string;
  telephone: string | null;
  actif: boolean;
  suiviClotureLe: Date | null;
  accessTokenRevoked: boolean;
  dateNaissance: string | null;
  adresse: string | null;
  nir: string | null;
  medecinTraitantNom: string | null;
  medecinTraitantCoordonnees: string | null;
}): Patient {
  return {
    idPatient: p.idPatient,
    email: p.email,
    prenom: p.prenom,
    nom: p.nom,
    telephone: p.telephone ?? '',
    actif: p.actif ? 'OUI' : 'NON',
    suiviClotureLe: p.suiviClotureLe ? p.suiviClotureLe.toISOString() : null,
    // Même nom que celui déjà servi par `api/praticien/nouveaux-patients`
    // (`SourceNouveauPatient.accesRevoque`) : deux noms pour le même fait
    // obligeraient l'écran à savoir de quelle route vient sa ligne.
    accesRevoque: p.accessTokenRevoked,
    // `dateNaissance` est stockée en chaîne `AAAA-MM-JJ` (pas en `DateTime`) :
    // elle est servie telle quelle, sans passer par un fuseau qui la déplacerait
    // d'un jour. `null` quand elle manque, jamais '' — voir le DTO.
    dateNaissance: p.dateNaissance,
    adresse: p.adresse ?? '',
    nir: p.nir ?? '',
    medecinTraitantNom: p.medecinTraitantNom ?? '',
    medecinTraitantCoordonnees: p.medecinTraitantCoordonnees ?? '',
  };
}

function assignationToDto(
  a: {
    idAssignation: string;
    idPatient: string;
    emailPatient: string;
    idQuestionnaire: string;
    titre: string;
    dateAssignation: Date;
    statut: string;
    statutReponses: string;
    dateLimite: string | null;
    correctionCommentaire: string | null;
    correctionDemandeeDate: Date | null;
  },
  idsAvecPassation: Set<string>,
  nbJourneesParAssignation: Map<string, number>,
): Assignation {
  return {
    idAssignation: a.idAssignation,
    idPatient: a.idPatient,
    emailPatient: a.emailPatient,
    idQuestionnaire: a.idQuestionnaire,
    titre: a.titre,
    dateAssignation: a.dateAssignation.toISOString(),
    statut: a.statut,
    statutReponses: a.statutReponses,
    dateLimite: a.dateLimite ?? null,
    correctionCommentaire: a.correctionCommentaire ?? null,
    correctionDemandeeDate: a.correctionDemandeeDate ? a.correctionDemandeeDate.toISOString() : null,
    aPassation: idsAvecPassation.has(a.idAssignation),
    nbJourneesAgenda: a.idQuestionnaire === AGENDA_ALI_ID ? (nbJourneesParAssignation.get(a.idAssignation) ?? 0) : null,
  };
}

// Une seule requête pour toute la page, jamais un `count` par ligne : sur
// `MAX_ASSIGNATIONS` lignes, N requêtes contre 1 est le genre de coût qui ne
// se voit qu'en prod. `distinct` suffit — seule l'EXISTENCE d'au moins une
// réponse compte, pas leur nombre exact.
async function idsAssignationsAvecPassation(idsAssignation: string[]): Promise<Set<string>> {
  if (idsAssignation.length === 0) return new Set();
  const reponses = await prisma.questionnaireReponse.findMany({
    where: { idAssignation: { in: idsAssignation } },
    select: { idAssignation: true },
    distinct: ['idAssignation'],
  });
  return new Set(reponses.map(r => r.idAssignation).filter((id): id is string => id !== null));
}

// Sœur de `idsAssignationsAvecPassation` juste au-dessus, même raison : une
// seule requête groupée pour toute la page, jamais un `count` par assignation
// — sur `MAX_ASSIGNATIONS` lignes, N requêtes contre 1 est le genre de coût
// qui ne se voit qu'en prod. N'est appelée qu'avec des ids d'agenda alimentaire
// (`idQuestionnaire === AGENDA_ALI_ID`) déjà filtrés par l'appelant.
//
// Compte des DATES distinctes, pas des lignes : la table est append-only, une
// journée corrigée porte deux lignes `agenda_alimentaire_jours` pour une seule
// date (`supersedesJourId` chaîne la correction) — le praticien veut le nombre
// de journées de saisie, pas le nombre d'écritures.
//
// **Ce compte n'est PAS celui de `fenetre.nbRenseignees`**, qui alimente
// « N journées notées » sur la fiche : celui-là ne retient que les lignes
// RELUES (JSONB valide, date au format), quarantaine exclue. Celui-ci prend
// toutes les lignes enregistrées — c'est le bon chiffre pour « qu'est-ce que
// l'annulation emporte ? », et c'en est un autre. D'où un libellé distinct
// côté modale (« journée de saisie »), pour que deux nombres ne se
// contredisent pas derrière le même mot.
//
// Le `WHERE id_assignation IN (…)` s'appuie sur l'index
// `agd_ali_assignation_date_idx`, déjà présent : aucune dette d'index créée.
// En revanche, où Prisma applique `distinct` — en base ou dans le moteur de
// requête — n'est vérifié par rien ici, d'où la déduplication applicative
// ci-dessous, qui rend le résultat vrai dans les deux hypothèses.
async function nbJourneesAgendaParAssignation(idsAgenda: string[]): Promise<Map<string, number>> {
  if (idsAgenda.length === 0) return new Map();
  const jours = await prisma.agendaAlimentaireJour.findMany({
    where: { idAssignation: { in: idsAgenda } },
    select: { idAssignation: true, dateJour: true },
    distinct: ['idAssignation', 'dateJour'],
  });
  // Déduplication applicative : c'est ELLE qui porte la correction, `distinct`
  // n'étant pas garanti côté base (voir l'en-tête). Le test du comptage prouve
  // donc cette moitié-là, pas l'autre.
  const vues = new Set<string>();
  const compte = new Map<string, number>();
  for (const j of jours) {
    const cle = `${j.idAssignation}::${j.dateJour}`;
    if (vues.has(cle)) continue;
    vues.add(cle);
    compte.set(j.idAssignation, (compte.get(j.idAssignation) ?? 0) + 1);
  }
  return compte;
}

export async function POST(req: Request): Promise<NextResponse<CreatePatientResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { success: false, reason: 'unauthenticated', error: 'Session absente.' },
      { status: 401 }
    );
  }

  type CreatePatientPayload = {
    prenom?: string;
    nom?: string;
    email?: string;
    telephone?: string;
    dateNaissance?: string;
  };

  let payload: CreatePatientPayload;
  try {
    payload = (await req.json()) as CreatePatientPayload;
  } catch {
    return NextResponse.json(
      { success: false, reason: 'invalid_payload', error: 'JSON invalide.' },
      { status: 400 }
    );
  }

  const prenom = (payload.prenom ?? '').trim().slice(0, 100);
  const nom = (payload.nom ?? '').trim().slice(0, 100);
  const email = (payload.email ?? '').trim().toLowerCase().slice(0, 254);
  const telephone = (payload.telephone ?? '').trim().slice(0, 30);
  const dateNaissance = (payload.dateNaissance ?? '').trim();

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isDateValid = !dateNaissance || /^\d{4}-\d{2}-\d{2}$/.test(dateNaissance);
  if (!prenom || !nom || !isEmailValid || !isDateValid) {
    return NextResponse.json(
      {
        success: false,
        reason: 'invalid_payload',
        error: !prenom || !nom
          ? 'Prénom et nom sont requis.'
          : !isEmailValid
            ? 'Email invalide.'
            : 'Date de naissance invalide (format attendu : AAAA-MM-JJ).',
      },
      { status: 400 }
    );
  }

  try {
    const existing = await prisma.patient.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { success: false, reason: 'duplicate_email', error: 'Un patient avec cet email existe déjà.' },
        { status: 409 }
      );
    }

    const idPatient = await nextIdPatient();
    const praticienEmail = (session.user?.email ?? '').toLowerCase();

    await prisma.patient.create({
      data: {
        idPatient,
        email,
        prenom,
        nom,
        dateNaissance: dateNaissance || null,
        telephone: telephone || null,
        praticienEmail,
        actif: true,
      },
    });

    return NextResponse.json({
      success: true,
      patient: {
        idPatient,
        email,
        prenom,
        nom,
        telephone,
        actif: 'OUI',
        suiviClotureLe: null,
        // Le défaut Prisma (`@default(false)`) : un dossier neuf n'est jamais révoqué.
        accesRevoque: false,
        dateNaissance: dateNaissance || null,
        // Le dossier administratif ne se saisit pas à la création : il se
        // renseigne ensuite, par `PATCH`. Ces quatre champs partent donc vides,
        // et ils partent quand même — un client qui reçoit un DTO amputé devrait
        // deviner s'il manque parce que c'est vide ou parce que la route est
        // ancienne.
        adresse: '',
        nir: '',
        medecinTraitantNom: '',
        medecinTraitantCoordonnees: '',
      },
    });
  } catch (err) {
    // Collision rare sur idPatient (créations quasi simultanées) : contrainte unique Prisma P2002
    if ((err as { code?: string }).code === 'P2002') {
      return NextResponse.json({
        success: false,
        reason: 'exception',
        error: 'Conflit lors de la génération du numéro patient, réessayez.',
      });
    }
    console.error('[patients POST]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({
      success: false,
      reason: 'exception',
      error: 'Erreur technique lors de la création du patient.',
    });
  }
}

type PatchPatientPayload = {
  idPatient?: string;
  prenom?: string;
  nom?: string;
  email?: string;
  dateNaissance?: string;
  telephone?: string;
  adresse?: string;
  nir?: string;
  medecinTraitantNom?: string;
  medecinTraitantCoordonnees?: string;
  actif?: 'OUI' | 'NON';
};

// LES CHAMPS TEXTE FACULTATIFS DU DOSSIER, ET LEUR BORNE.
//
// La borne n'est pas décorative : la base porte un `CHECK` par champ
// (`patients_adresse_non_vide` et ses deux voisins, LOT-03) qui refuse au-delà.
// Tronquer ici plutôt que laisser la base rejeter, c'est la différence entre
// « adresse trop longue » et une erreur technique opaque — et c'est le même
// geste que `POST` fait déjà sur prénom, nom et téléphone.
//
// UNE CHAÎNE VIDE EFFACE, elle ne bloque pas. Le `CHECK` refuse `''` mais
// accepte `NULL` : un praticien qui vide le champ veut retirer le
// renseignement, pas déclencher une erreur. `|| null` fait cette traduction, et
// c'est la seule façon de RETIRER une adresse une fois saisie.
const BORNES_DOSSIER = {
  adresse: 500,
  medecinTraitantNom: 200,
  medecinTraitantCoordonnees: 500,
} as const;

const LIBELLES_DOSSIER = {
  adresse: 'L’adresse postale',
  medecinTraitantNom: 'Le nom du médecin traitant',
  medecinTraitantCoordonnees: 'Les coordonnées du médecin traitant',
} as const;

/**
 * Sentinelle d'un payload mal typé.
 *
 * `JSON.parse` rend ce qu'on lui donne : un client qui envoie
 * `{ "adresse": 42 }` produisait un `42.trim is not a function`, donc une
 * exception, donc un **500** — là où c'est une requête invalide, et rien
 * d'autre (constat de revue, 2026-09-16). Un 500 dit « le serveur est en
 * panne » ; il ne l'était pas.
 */
const MAL_TYPE = Symbol('champ non textuel');

function texteDuPayload(valeur: unknown): string | undefined | typeof MAL_TYPE {
  if (valeur === undefined) return undefined;
  return typeof valeur === 'string' ? valeur : MAL_TYPE;
}

export async function PATCH(req: Request): Promise<NextResponse<PatchPatientResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { success: false, reason: 'unauthenticated', error: 'Session absente.' },
      { status: 401 }
    );
  }

  let payload: PatchPatientPayload;
  try {
    payload = (await req.json()) as PatchPatientPayload;
  } catch {
    return NextResponse.json(
      { success: false, reason: 'invalid_payload', error: 'JSON invalide.' },
      { status: 400 }
    );
  }

  // TOUS LES CHAMPS TEXTE PASSENT PAR `texteDuPayload` : un client qui envoie un
  // nombre ou un objet obtient un 400 explicite, et non plus une exception
  // rendue en 500 (constat de revue, 2026-09-16).
  const CHAMPS_TEXTE = [
    'idPatient',
    'prenom',
    'nom',
    'email',
    'dateNaissance',
    'telephone',
    'adresse',
    'nir',
    'medecinTraitantNom',
    'medecinTraitantCoordonnees',
  ] as const;
  const brut: Partial<Record<(typeof CHAMPS_TEXTE)[number], string>> = {};
  for (const cle of CHAMPS_TEXTE) {
    const valeur = texteDuPayload((payload as Record<string, unknown>)[cle]);
    if (valeur === MAL_TYPE) {
      return NextResponse.json(
        { success: false, reason: 'invalid_payload', error: `Champ ${cle} invalide : texte attendu.` },
        { status: 400 }
      );
    }
    if (valeur !== undefined) brut[cle] = valeur;
  }

  const idPatient = (brut.idPatient ?? '').trim();
  const telephone = (brut.telephone ?? '').trim().slice(0, 30);
  const actif = payload.actif;

  // TOUS CES CHAMPS SONT FACULTATIFS AU PAYLOAD, ET C'EST CE QUI PERMET AUX
  // ANCIENS APPELANTS DE SURVIVRE. `undefined` veut dire « ne touche pas », `''`
  // veut dire « efface » : le formulaire de désactivation n'envoie qu'`actif`, et
  // il ne doit pas effacer l'adresse au passage. Chaque champ est donc lu avec
  // `payload.x !== undefined` plus bas, jamais par la vérité de sa valeur.
  const prenom = brut.prenom === undefined ? undefined : brut.prenom.trim().slice(0, 100);
  const nom = brut.nom === undefined ? undefined : brut.nom.trim().slice(0, 100);
  const email =
    brut.email === undefined ? undefined : brut.email.trim().toLowerCase().slice(0, 254);
  const dateNaissance = brut.dateNaissance === undefined ? undefined : brut.dateNaissance.trim();
  const nirSaisi = brut.nir === undefined ? undefined : brut.nir.trim();

  // PRÉNOM ET NOM NE S'EFFACENT PAS. Le modèle les porte en `String` non
  // nullable, et un dossier sans nom n'est plus un dossier : il faudrait alors
  // le retrouver par son seul identifiant. `POST` les exige à la création pour
  // la même raison ; les vider par `PATCH` aurait contourné cette exigence.
  if ((prenom !== undefined && !prenom) || (nom !== undefined && !nom)) {
    return NextResponse.json(
      { success: false, reason: 'invalid_payload', error: 'Prénom et nom ne peuvent pas être vidés.' },
      { status: 400 }
    );
  }
  if (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { success: false, reason: 'invalid_payload', error: 'Email invalide.' },
      { status: 400 }
    );
  }
  if (dateNaissance !== undefined && dateNaissance && !/^\d{4}-\d{2}-\d{2}$/.test(dateNaissance)) {
    return NextResponse.json(
      {
        success: false,
        reason: 'invalid_payload',
        error: 'Date de naissance invalide (format attendu : AAAA-MM-JJ).',
      },
      { status: 400 }
    );
  }

  // TRONQUER UNE ADRESSE, C'EST FABRIQUER UNE ADRESSE FAUSSE.
  //
  // `POST` tronque prénom, nom et téléphone, et ce choix se défend là-bas. Ici
  // il ne se défend plus : une adresse postale coupée à 500 caractères reste
  // une adresse — lisible, plausible, et incomplète —, et ces champs servent à
  // ÉCRIRE AUX GENS. On ne peut pas refuser un NIR douteux au nom de « jamais
  // une donnée fausse » et rogner une adresse dans la même route.
  //
  // La borne est celle du `CHECK` de la base : refuser ici rend un message que
  // le praticien comprend, là où la base rendrait une erreur technique.
  for (const cle of ['adresse', 'medecinTraitantNom', 'medecinTraitantCoordonnees'] as const) {
    const valeur = brut[cle];
    if (valeur !== undefined && valeur.trim().length > BORNES_DOSSIER[cle]) {
      return NextResponse.json(
        {
          success: false,
          reason: 'invalid_payload',
          error: `${LIBELLES_DOSSIER[cle]} dépasse ${BORNES_DOSSIER[cle]} caractères. Raccourcissez-la plutôt qu'elle ne soit coupée.`,
        },
        { status: 400 }
      );
    }
  }

  // LE NIR EST REFUSÉ SUR SA CLÉ, PAS SEULEMENT SUR SA FORME — et c'est tout
  // l'intérêt. La base garde la forme ; un numéro bien formé et faux passerait,
  // et finirait sur un courrier ou une demande de prise en charge. Le message
  // distingue les deux motifs : le praticien doit savoir s'il a mal compté les
  // chiffres ou mal recopié la clé.
  let nir: string | null | undefined;
  if (nirSaisi !== undefined) {
    if (!nirSaisi) {
      nir = null;
    } else {
      const verdict = verifierNir(nirSaisi);
      if (!verdict.valide) {
        return NextResponse.json(
          { success: false, reason: 'invalid_payload', error: messageNirInvalide(verdict.motif) },
          { status: 400 }
        );
      }
      nir = verdict.nir;
    }
  }

  // Même forme d'identifiant que `DELETE` (plus bas) et que la route
  // `cycle-de-vie` : `/^PAT\d+$/` rejetait les identifiants à tiret bas, dont
  // le patient fictif `PAT_SEED_03` — « Modifier » était donc inopérant sur le
  // dossier de seed. L'appartenance reste vérifiée juste en dessous.
  if (!idPatient || !/^[A-Za-z0-9_-]+$/.test(idPatient)) {
    return NextResponse.json(
      { success: false, reason: 'invalid_payload', error: 'idPatient invalide.' },
      { status: 400 }
    );
  }
  if (actif !== undefined && actif !== 'OUI' && actif !== 'NON') {
    return NextResponse.json(
      { success: false, reason: 'invalid_payload', error: 'Valeur actif invalide (OUI ou NON).' },
      { status: 400 }
    );
  }

  const verdict = await verifierAppartenancePatient(idPatient, emailPraticien(session));
  if (verdict === 'introuvable') {
    return NextResponse.json({ success: false, reason: 'patient_not_found', error: 'Patient introuvable.' }, { status: 404 });
  }
  if (verdict === 'autre_praticien') {
    return NextResponse.json({ success: false, reason: 'forbidden', error: 'Patient non accessible.' }, { status: 403 });
  }

  try {
    const maintenant = new Date();

    // `undefined` = « ne touche pas », `''` = « efface ». Le formulaire de
    // désactivation n'envoie qu'`actif` : sans cette distinction, enregistrer
    // une désactivation viderait l'adresse et le médecin traitant au passage.
    // PLUS DE TRONCATURE : la borne est refusée plus haut, explicitement. Cette
    // fonction ne fait plus que traduire « vide » en `null`, ce que le `CHECK`
    // de la base exige — il refuse `''` et accepte `NULL`, et c'est la seule
    // façon de RETIRER un renseignement saisi par erreur.
    const videVautNull = (valeur: string) => valeur.trim() || null;
    const donneesPatient = {
      ...(prenom !== undefined && { prenom }),
      ...(nom !== undefined && { nom }),
      ...(email !== undefined && { email }),
      ...(dateNaissance !== undefined && { dateNaissance: dateNaissance || null }),
      ...(payload.telephone !== undefined && { telephone: telephone || null }),
      ...(payload.adresse !== undefined && {
        adresse: videVautNull(payload.adresse),
      }),
      ...(nir !== undefined && { nir }),
      ...(payload.medecinTraitantNom !== undefined && {
        medecinTraitantNom: videVautNull(payload.medecinTraitantNom),
      }),
      ...(payload.medecinTraitantCoordonnees !== undefined && {
        medecinTraitantCoordonnees: videVautNull(payload.medecinTraitantCoordonnees),
      }),
      ...(actif !== undefined && { actif: actif === 'OUI' }),
    };

    // L'E-MAIL EST RECOPIÉ DANS CINQ TABLES, ET UNE ROUTE PRATICIEN INTERROGE
    // PAR LUI. C'est le fait qui rend ce changement-là différent de tous les
    // autres champs de ce formulaire.
    //
    // `GET /api/praticien/reponses` filtre `questionnaireReponse` sur
    // `emailPatient` (route.ts). Changer l'adresse du dossier sans réécrire les
    // copies rendrait donc MUETTES toutes les réponses déjà reçues : le
    // praticien verrait une liste vide, et rien ne lui dirait que ses données
    // sont là mais introuvables. Quatre tables portent `email_patient` —
    // `consultations`, `assignations`, `questionnaire_reponses`,
    // `syntheses_ia` — et les quatre se réécrivent ici.
    //
    // `booklet_envois.email_patient_masque` N'EST PAS TOUCHÉ, et ce n'est pas un
    // oubli. Cette colonne atteste qu'un envoi est RÉELLEMENT PARTI à cette
    // adresse-là, à cette date-là. La réécrire falsifierait une trace : le
    // livret est parti à l'ancienne adresse, et c'est ce qui s'est passé.
    //
    // La lecture de l'ancienne adresse n'a lieu QUE si le payload en porte une :
    // le formulaire de désactivation et la correction d'un téléphone ne paient
    // pas une requête de plus pour un champ qu'ils ne touchent pas.
    const ancien =
      email === undefined
        ? null
        : await prisma.patient.findUnique({ where: { idPatient }, select: { email: true } });
    // Une adresse RÉÉCRITE À L'IDENTIQUE n'est pas un changement : réécrire les
    // quatre tables pour rien ferait payer N écritures à un simple ré-
    // enregistrement du formulaire.
    const emailChange = ancien !== null && email !== ancien.email;

    if (emailChange) {
      // Le contrôle explicite sert le MESSAGE ; la contrainte unique sert la
      // COURSE. Deux enregistrements simultanés vers la même adresse passeraient
      // tous deux ce test — d'où le `P2002` rattrapé plus bas, qui rend le même
      // 409 plutôt qu'une erreur technique.
      const occupe = await prisma.patient.findUnique({
        where: { email: email as string },
        select: { idPatient: true },
      });
      if (occupe && occupe.idPatient !== idPatient) {
        return NextResponse.json(
          {
            success: false,
            reason: 'duplicate_email',
            error: 'Un autre patient utilise déjà cet email.',
          },
          { status: 409 }
        );
      }
    }

    // LES QUATRE COPIES, RÉÉCRITES DANS LA MÊME TRANSACTION QUE LE DOSSIER.
    // `updateMany` et non `update` : il y a N lignes par patient, et zéro est un
    // cas normal — un dossier neuf n'a ni consultation ni réponse.
    //
    // Le filtre est `idPatient` et NON l'ancienne adresse : c'est le dossier qui
    // fait foi. Filtrer sur `emailPatient: ancien.email` aurait laissé sur place
    // toute ligne dont la copie avait déjà dérivé — exactement les lignes qu'il
    // faut réparer.
    const reecrituresEmail = emailChange
      ? [
          prisma.consultation.updateMany({
            where: { idPatient },
            data: { emailPatient: email as string },
          }),
          prisma.assignation.updateMany({
            where: { idPatient },
            data: { emailPatient: email as string },
          }),
          prisma.questionnaireReponse.updateMany({
            where: { idPatient },
            data: { emailPatient: email as string },
          }),
          prisma.syntheseIA.updateMany({
            where: { idPatient },
            data: { emailPatient: email as string },
          }),
        ]
      : [];

    if (actif === 'NON') {
      // DÉSACTIVER, C'EST FERMER LES LIENS EN VOL. Le dialogue de confirmation
      // le promet déjà — « ses liens cesseront de fonctionner » — et le code ne
      // le tenait pas : un lien émis avant la désactivation restait ouvrable
      // jusqu'à 24 h après, et l'atterrissage le brûlait avant de le refuser.
      //
      // ON FERME PAR L'HORIZON, PAS PAR L'ÉVÉNEMENT — et depuis `D-128` la
      // RÉVOCATION AUSSI : les deux gestes praticien sont devenus le même, au
      // mot près (`api/praticien/token` DELETE). Ce commentaire a d'abord dit
      // le contraire, parce que la révocation datait alors `consommeLe` et
      // payait ce choix par une égalité stricte avec `sessionsInvalidesAvant`,
      // seul moyen pour `api/praticien/nouveaux-patients` d'écarter un tampon
      // de fermeture. Recopier CE geste-là ici aurait fait de la désactivation
      // le second écrivain de `sessionsInvalidesAvant`, colonne à emplacement
      // unique dont chaque date écrase la précédente : on aurait refermé une
      // porte en rouvrant l'autre. `D-128` a réglé la question à la racine, en
      // retirant l'écrivain plutôt qu'en ajoutant une colonne.
      //
      // `expireLe` ne dilue pas `consommeLe`, seule trace d'entrée du versant
      // patient, et sa valeur est dérivée (`creeLe + 24 h`) : l'avancer ne
      // détruit aucun fait, `creeLe` le reconstruit. Une colonne dit une
      // chose : `expireLe` dit « jusqu'à quand ce lien ouvre », `consommeLe`
      // dit « le patient est entré ».
      //
      // FILTRE MONOTONE ET IDEMPOTENT. `expireLe: { gt: maintenant }` ne
      // rallonge jamais un lien et ne touche rien au second passage — ce qui
      // compte, parce que le formulaire « Modifier » renvoie `actif` à CHAQUE
      // enregistrement : sans ce filtre, une simple correction de téléphone sur
      // un dossier déjà inactif réécrirait des lignes.
      //
      // TRANSACTION : les deux écritures commitent ENSEMBLE, donc aucun lecteur
      // ne voit « liens fermés, dossier encore actif », ni l'inverse. C'est la
      // transaction qui l'assure, PAS l'ordre : sous READ COMMITTED aucun état
      // intermédiaire n'est visible, quel que soit l'ordre des deux écritures.
      //
      // L'ORDRE, LUI, SERT À AUTRE CHOSE. Il est identique à celui de la
      // révocation (`api/praticien/token` DELETE : `patient`, puis
      // `portailMagicLink`). Deux gestes concurrents sur le même dossier
      // prennent donc leurs verrous dans le même sens — pas d'interblocage.
      await prisma.$transaction([
        prisma.patient.update({ where: { idPatient }, data: donneesPatient }),
        ...reecrituresEmail,
        prisma.portailMagicLink.updateMany({
          where: { idPatient, consommeLe: null, expireLe: { gt: maintenant } },
          data: { expireLe: maintenant },
        }),
      ]);
    } else if (reecrituresEmail.length > 0) {
      // MÊME EXIGENCE DE TRANSACTION, POUR UNE AUTRE RAISON. Ici rien ne se
      // ferme ; ce qui compte est qu'aucun lecteur ne voie le dossier porter la
      // nouvelle adresse pendant que ses réponses portent encore l'ancienne.
      // Entre ces deux écritures, `GET /api/praticien/reponses` interrogé sur
      // la nouvelle adresse rendrait une liste VIDE — et un praticien lisant
      // une liste vide conclut qu'il n'y a rien, pas qu'il est arrivé au
      // mauvais moment.
      await prisma.$transaction([
        prisma.patient.update({ where: { idPatient }, data: donneesPatient }),
        ...reecrituresEmail,
      ]);
    } else {
      // Réactivation, ou champs du dossier seuls : l'écriture d'origine,
      // inchangée. La réactivation ne défait RIEN — un lien fermé ne se rouvre
      // pas, il se réémet (`api/praticien/token`). Voir `D-126`.
      await prisma.patient.update({ where: { idPatient }, data: donneesPatient });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if ((err as { code?: string }).code === 'P2025') {
      return NextResponse.json(
        { success: false, reason: 'patient_not_found', error: 'Patient introuvable.' },
        { status: 404 }
      );
    }
    // LA COURSE QUE LE CONTRÔLE EXPLICITE NE COUVRE PAS. Deux enregistrements
    // simultanés vers la même adresse passent tous deux le `findUnique` ; c'est
    // la contrainte unique qui tranche, et son refus doit dire la même chose
    // que l'autre chemin plutôt qu'« erreur technique ».
    if ((err as { code?: string }).code === 'P2002') {
      return NextResponse.json(
        {
          success: false,
          reason: 'duplicate_email',
          error: 'Un autre patient utilise déjà cet email.',
        },
        { status: 409 }
      );
    }
    console.error('[patients PATCH]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({
      success: false,
      reason: 'exception',
      error: 'Erreur technique lors de la modification du patient.',
    });
  }
}
