import { prisma } from '@/lib/prisma';
import { contratDeLAgenda, estDateValide, ensureNuitReponses } from './nuit';
import type { NuitInput, NuitRow } from './types';

// Persistance des nuits d'agenda du sommeil (Q_SOM_09). Le domaine pur
// (validation, chaînage, fenêtre, agrégats) vit dans les autres modules ;
// ce fichier est le seul à toucher Prisma. Écriture append-only : une correction
// est une NOUVELLE ligne chaînée via `supersedesNuitId`, jamais un `update`.
// La table `agenda_sommeil_nuits` provient de la migration `agenda_sommeil_v1`.

// Réexports du domaine pour les appelants serveur (routes).
export * from './types';
export * from './nuit';
export * from './fenetre';
export * from './agregats';

// ─── Validation d'identifiants (persistance seule) ───────────────────────────
function ensureId(value: string, libelle: string): string {
  const trimmed = value.trim();
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(trimmed)) {
    throw new TypeError(`${libelle} invalide.`);
  }
  return trimmed;
}

function ensureDateNuit(value: string): string {
  const trimmed = value.trim();
  if (!estDateValide(trimmed)) throw new TypeError('Date de nuit invalide.');
  return trimmed;
}

// ─── Mapping ligne Prisma → NuitRow ──────────────────────────────────────────
const SELECT_NUIT = {
  id: true,
  idPatient: true,
  idAssignation: true,
  dateNuit: true,
  reponses: true,
  canal: true,
  supersedesNuitId: true,
  soumisLe: true,
} as const;

type PrismaNuit = {
  id: string;
  idPatient: string;
  idAssignation: string;
  dateNuit: string;
  reponses: unknown;
  canal: string;
  supersedesNuitId: string | null;
  soumisLe: Date;
};

// Contrat inscrit dans le JSON d'une ligne (`contractVersion`), s'il y est.
function contratLu(reponses: unknown): string | undefined {
  const version =
    reponses && typeof reponses === 'object'
      ? (reponses as Record<string, unknown>).contractVersion
      : undefined;
  return typeof version === 'string' ? version : undefined;
}

// Re-valide le payload JSONB en lecture (défense en profondeur).
function toNuitRow(row: PrismaNuit): NuitRow {
  const contrat = contratLu(row.reponses);
  return {
    id: row.id,
    idPatient: row.idPatient,
    idAssignation: row.idAssignation,
    dateNuit: row.dateNuit,
    reponses: ensureNuitReponses(row.reponses),
    canal: row.canal,
    supersedesNuitId: row.supersedesNuitId,
    soumisLe: row.soumisLe.toISOString(),
    ...(contrat !== undefined ? { contrat } : {}),
  };
}

// Enregistre une nuit (append-only). Une correction chaîne la ligne supplantée
// via `supersedesNuitId` (jamais d'`update`).
export async function saveNuit(input: NuitInput): Promise<NuitRow> {
  const idPatient = ensureId(input.idPatient, 'Identifiant patient');
  const idAssignation = ensureId(input.idAssignation, "Identifiant d'assignation");
  const dateNuit = ensureDateNuit(input.dateNuit);
  // L'agenda garde le contrat de sa PREMIÈRE nuit ([[D-272]] §3) : v4 s'il n'en
  // a aucune, v3 s'il a été ouvert avant la v4. Lu ici, au seul point
  // d'écriture, pour qu'aucun client ne puisse le choisir.
  const premiere = await prisma.agendaSommeilNuit.findFirst({
    where: { idPatient, idAssignation },
    orderBy: { soumisLe: 'asc' },
    select: { reponses: true, soumisLe: true },
  });
  const contrat = contratDeLAgenda(
    !premiere
      ? []
      : [{ contrat: contratLu(premiere.reponses), soumisLe: premiere.soumisLe.toISOString() }],
  );
  // Écriture : éveil nocturne, aide au sommeil et modes de coucher et de lever
  // sont obligatoires (v2), et les classes d'éveil héritées y sont refusées.
  // C'est le seul point où l'exiger empêche l'agrégation d'inventer un zéro plus
  // tard. « Je ne sais pas » n'y passe qu'en v4.
  const reponses = ensureNuitReponses(input.reponses, { exigerObligatoires: true, contrat });
  const supersedesNuitId =
    input.supersedesNuitId != null ? ensureId(input.supersedesNuitId, 'Identifiant de nuit') : null;

  // Une correction doit viser une nuit réelle du même patient / même assignation
  // / même date — jamais la ligne d'un autre patient (garde inter-patient).
  if (supersedesNuitId) {
    const previous = await prisma.agendaSommeilNuit.findUnique({
      where: { id: supersedesNuitId },
      select: { idPatient: true, idAssignation: true, dateNuit: true },
    });
    if (
      !previous ||
      previous.idPatient !== idPatient ||
      previous.idAssignation !== idAssignation ||
      previous.dateNuit !== dateNuit
    ) {
      throw new TypeError('Nuit à corriger introuvable pour cet agenda.');
    }
  }

  const created = await prisma.agendaSommeilNuit.create({
    data: {
      idPatient,
      idAssignation,
      dateNuit,
      reponses: { contractVersion: contrat, ...reponses } as unknown as object,
      canal: 'portail',
      supersedesNuitId,
    },
    select: SELECT_NUIT,
  });
  return toNuitRow(created);
}

// Liste les nuits d'un patient (optionnellement bornées à une assignation), les
// plus anciennes d'abord (ordre naturel de recueil). Le chaînage est résolu par
// `resolveNuitsActives` côté appelant.
export async function listNuits(
  idPatientRaw: string,
  idAssignationRaw?: string,
): Promise<NuitRow[]> {
  const idPatient = ensureId(idPatientRaw, 'Identifiant patient');
  const where: { idPatient: string; idAssignation?: string } = { idPatient };
  if (idAssignationRaw !== undefined) {
    where.idAssignation = ensureId(idAssignationRaw, "Identifiant d'assignation");
  }
  const rows = await prisma.agendaSommeilNuit.findMany({
    where,
    orderBy: { soumisLe: 'asc' },
    select: SELECT_NUIT,
  });
  return rows.map(toNuitRow);
}
