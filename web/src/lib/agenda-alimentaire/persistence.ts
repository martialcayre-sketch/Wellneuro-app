import { prisma } from '@/lib/prisma';
import { ensureVersionContratLue } from './contrat';
import { estDateValide, ensureJourReponses } from './jour';
import { AGENDA_ALI_CONTRACT_VERSION, type JourInput, type JourReponses, type JourRow } from './types';

// Persistance de l'agenda alimentaire — SEUL fichier du domaine à toucher
// Prisma. Table `agenda_alimentaire_jours` (migration agenda_alimentaire_v1),
// append-only : une correction est une nouvelle ligne chaînée par
// `supersedesJourId`, jamais un UPDATE.
//
// CE FICHIER NE RÉEXPORTE RIEN, contrairement à son jumeau du sommeil. Ce
// dernier sert de barre d'export parce que son domaine n'a pas d'`index.ts` ;
// l'alimentaire en a un, et il est PUR. Réexporter le domaine depuis un module
// qui importe Prisma ferait entrer Prisma dans le premier import client
// distrait — exactement ce que la séparation index/persistence existe pour
// empêcher. Pour le domaine, importer `./index` ; pour la base, ce fichier.

function ensureId(value: string, libelle: string): string {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(trimmed)) {
    throw new TypeError(`${libelle} invalide.`);
  }
  return trimmed;
}

function ensureDateJour(value: string): string {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (!estDateValide(trimmed)) {
    throw new TypeError('Date de journée invalide.');
  }
  return trimmed;
}

/**
 * Canaux d'écriture reconnus. Liste FERMÉE et fail-closed : `JourInput` déclare
 * `canal?: string`, mais une chaîne libre venue d'un appelant finirait en clair
 * dans une colonne du dossier patient. Le jumeau sommeil force `'portail'` en
 * dur et ignore le champ ; ici on honore le type sans ouvrir la porte — la
 * liste s'allonge d'une ligne le jour où un second canal existe.
 */
const CANAUX = ['portail'] as const;

function ensureCanal(value: string | undefined): string {
  if (value === undefined) return 'portail';
  if (!(CANAUX as readonly string[]).includes(value)) {
    throw new TypeError(`Canal inconnu : « ${value} ».`);
  }
  return value;
}

const SELECT_JOUR = {
  id: true,
  idPatient: true,
  idAssignation: true,
  dateJour: true,
  reponses: true,
  canal: true,
  supersedesJourId: true,
  soumisLe: true,
} as const;

type PrismaJour = {
  id: string;
  idPatient: string;
  idAssignation: string;
  dateJour: string;
  reponses: unknown;
  canal: string;
  supersedesJourId: string | null;
  soumisLe: Date;
};

/** Objet réellement écrit dans le JSONB : le contrat, plus sa version. */
type JourReponsesStockees = JourReponses & { contractVersion: string };

/**
 * Conversion en lecture. Le JSONB est RE-VALIDÉ ici, sans `exigerObligatoires` :
 * une ligne écrite sous un contrat antérieur doit rester relisible, sans quoi
 * une seule ligne bancale rendrait illisible tout l'agenda du patient.
 *
 * La version est vérifiée AVANT le contenu : lire des réponses sous des règles
 * qui ne sont pas les leurs est pire que de refuser la ligne.
 */
function toJourRow(row: PrismaJour): JourRow {
  const brut = (row.reponses ?? {}) as Record<string, unknown>;
  ensureVersionContratLue(brut.contractVersion);
  return {
    id: row.id,
    idPatient: row.idPatient,
    idAssignation: row.idAssignation,
    dateJour: row.dateJour,
    reponses: ensureJourReponses(row.reponses),
    canal: row.canal,
    supersedesJourId: row.supersedesJourId,
    soumisLe: row.soumisLe.toISOString(),
  };
}

/**
 * Écrit une journée. `create` SEUL — jamais d'`update` : l'historique d'un
 * recueil est ce qui permet de distinguer une correction d'une saisie initiale,
 * et « lignes − dates distinctes » est le taux de correction.
 */
export async function saveJour(input: JourInput): Promise<JourRow> {
  const idPatient = ensureId(input.idPatient, 'Identifiant patient');
  const idAssignation = ensureId(input.idAssignation, "Identifiant d'assignation");
  const dateJour = ensureDateJour(input.dateJour);
  const canal = ensureCanal(input.canal);
  const reponses = ensureJourReponses(input.reponses, { exigerObligatoires: true });
  const supersedesJourId =
    input.supersedesJourId != null ? ensureId(input.supersedesJourId, 'Identifiant de journée') : null;

  if (supersedesJourId) {
    // GARDE INTER-PATIENT. Sans elle, un identifiant deviné permettrait de
    // chaîner une correction sur la journée d'un AUTRE dossier : la ligne
    // supplantée sortirait de son agenda d'origine sans que rien ne le dise.
    // La date entre dans le contrôle au même titre que le patient — corriger
    // le 3 en se chaînant au 4 fabriquerait un trou et un doublon d'un coup.
    const precedente = await prisma.agendaAlimentaireJour.findUnique({
      where: { id: supersedesJourId },
      select: { idPatient: true, idAssignation: true, dateJour: true },
    });
    if (
      !precedente ||
      precedente.idPatient !== idPatient ||
      precedente.idAssignation !== idAssignation ||
      precedente.dateJour !== dateJour
    ) {
      throw new TypeError('Journée à corriger introuvable pour cet agenda.');
    }
  }

  // La version est construite AVEC son objet, typée, avant le cast : le double
  // cast du jumeau sommeil (`{ ... } as unknown as object`) efface le typage de
  // ce qui part en base. On garde la convention de la famille pour le cast —
  // c'est ce qu'écrivent `protocol/checkins.ts` et `food-observation` — mais on
  // type ce qui la précède.
  const stockees: JourReponsesStockees = {
    contractVersion: AGENDA_ALI_CONTRACT_VERSION,
    ...reponses,
  };

  const cree = await prisma.agendaAlimentaireJour.create({
    data: {
      idPatient,
      idAssignation,
      dateJour,
      reponses: stockees as unknown as object,
      canal,
      supersedesJourId,
    },
    select: SELECT_JOUR,
  });
  return toJourRow(cree);
}

/**
 * Résultat d'une lecture. `illisibles` n'est PAS décoratif : voir plus bas.
 */
export type LectureJours = {
  jours: JourRow[];
  /** Lignes en base qu'on n'a pas su relire — mises en quarantaine, pas perdues. */
  illisibles: number;
  /**
   * Les DATES touchées par la quarantaine, dédoublonnées et dans l'ordre de
   * lecture. Le compte seul ne dit pas OÙ le trou se trouve, et un appelant
   * réduit à ce compte n'a d'autre choix que de refuser tout l'agenda. Or
   * `date_jour` est une COLONNE : la ligne fautive est en portée dans le `catch`
   * ci-dessous, et `SELECT_JOUR` la sélectionne déjà — la date est là, sans une
   * requête de plus. Le chemin d'écriture peut donc restreindre son refus à la
   * journée qu'il ne sait effectivement pas relire.
   *
   * Une même date peut porter plusieurs lignes illisibles (append-only) : le
   * compte et la longueur de ce tableau NE SONT PAS interchangeables.
   */
  datesIllisibles: string[];
};

/**
 * Lit les journées d'un patient, éventuellement bornées à une assignation.
 * Tri par `soumisLe` ASCENDANT : c'est l'ordre d'écriture, celui dont
 * `resolveJoursActifs` a besoin pour départager deux lignes de même date.
 *
 * ── QUARANTAINE PAR LIGNE, ET NON REJET DE LA COLLECTION ────────────────────
 * `toJourRow` lève sur une ligne qu'il ne sait pas relire. Une première version
 * de cette fonction faisait `rows.map(toJourRow)` : UNE ligne illisible faisait
 * alors disparaître TOUT l'agenda du patient. C'est précisément le mode de
 * panne que `jour.ts` refuse en toutes lettres — « refuser une ligne historique
 * un peu bancale ferait disparaître tout l'agenda du patient » — et l'introduire
 * ici était une contradiction interne, pas un arbitrage.
 *
 * Le scénario n'a rien d'exotique et ne suppose ni corruption ni attaquant :
 * un rollback de déploiement qui restaure une liste de versions lues plus
 * étroite suffit à rendre illisibles les lignes écrites entre-temps. Vingt et un
 * jours de recueil disparaîtraient de l'écran pour trois lignes.
 *
 * ── POURQUOI LE COMPTE REMONTE, ET N'EST PAS AVALÉ ──────────────────────────
 * Écarter en silence serait l'autre défaut : les seuils d'exploitabilité
 * (14 jours, 4 week-ends, 7 paires) se calculent sur ce qui remonte. Un lot
 * tronqué sans bruit pourrait franchir le seuil en ayant perdu des journées, et
 * produire un agrégat qui a l'air valide. `illisibles > 0` oblige l'appelant à
 * en décider — c'est la même règle que « null jamais 0 » appliquée à la lecture.
 *
 * Le compte remonte AVEC ses dates (`datesIllisibles`) : un appelant qui n'a que
 * le compte ne peut refuser qu'en bloc, faute de savoir laquelle des journées
 * est touchée. La date, elle, est disponible sans coût — voir `LectureJours`.
 */
export async function listJours(
  idPatientRaw: string,
  idAssignationRaw?: string,
): Promise<LectureJours> {
  const idPatient = ensureId(idPatientRaw, 'Identifiant patient');
  const where: { idPatient: string; idAssignation?: string } = { idPatient };
  if (idAssignationRaw !== undefined) {
    where.idAssignation = ensureId(idAssignationRaw, "Identifiant d'assignation");
  }
  const rows = await prisma.agendaAlimentaireJour.findMany({
    where,
    orderBy: { soumisLe: 'asc' },
    select: SELECT_JOUR,
  });

  const jours: JourRow[] = [];
  let illisibles = 0;
  const datesIllisibles = new Set<string>();
  for (const row of rows) {
    try {
      jours.push(toJourRow(row));
    } catch {
      illisibles += 1;
      // `row.dateJour` est une COLONNE, pas du JSONB : elle est lisible même
      // quand le contenu de `reponses` ne l'est pas. C'est ce qui permet à
      // l'appelant de nommer la journée en quarantaine au lieu de deviner.
      datesIllisibles.add(row.dateJour);
    }
  }
  return { jours, illisibles, datesIllisibles: [...datesIllisibles] };
}
