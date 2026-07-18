import { prisma } from '@/lib/prisma';
import {
  CHECKIN_CONTRACT_VERSION,
  ensurePointEtape,
  ensureReponses,
  type CheckinInput,
  type CheckinRow,
} from './checkinDomain';

// Persistance des check-ins J7/J14/J21 (C2A LOT-04). Le domaine pur (catalogue,
// validation, planification, chaînage) vit dans `checkinDomain.ts` — réexporté
// ici pour les routes serveur. Écriture append-only : une correction est une
// NOUVELLE ligne chaînée via `supersedesCheckinId`, jamais un `update` (§8.5).
// La table `protocol_checkins` existe depuis LOT-02 — aucune migration ici.

// Réexports du domaine pour les appelants serveur (routes).
export * from './checkinDomain';

// ─── Validation d'identifiants (persistance seule) ───────────────────────────
function ensurePatientId(value: string): string {
  const trimmed = value.trim();
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(trimmed)) {
    throw new TypeError('Identifiant patient invalide.');
  }
  return trimmed;
}

function ensureAssignationId(value: string): string {
  const trimmed = value.trim();
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(trimmed)) {
    throw new TypeError('Identifiant d’assignation invalide.');
  }
  return trimmed;
}

// L'id de version de protocole peut contenir `#`/`:`/`.` (cf. deriveVersionId).
function ensureDraftId(value: string): string {
  const trimmed = value.trim();
  if (!/^[A-Za-z0-9_:.#-]{1,200}$/.test(trimmed)) {
    throw new TypeError('Identifiant de protocole invalide.');
  }
  return trimmed;
}

function ensureCheckinId(value: string): string {
  const trimmed = value.trim();
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(trimmed)) {
    throw new TypeError('Identifiant de check-in invalide.');
  }
  return trimmed;
}

// ─── Mapping ligne Prisma → CheckinRow ───────────────────────────────────────
const SELECT_CHECKIN = {
  id: true,
  idPatient: true,
  idAssignation: true,
  protocolDraftId: true,
  pointEtape: true,
  reponses: true,
  canal: true,
  supersedesCheckinId: true,
  soumisLe: true,
} as const;

type PrismaCheckin = {
  id: string;
  idPatient: string;
  idAssignation: string;
  protocolDraftId: string;
  pointEtape: string;
  reponses: unknown;
  canal: string;
  supersedesCheckinId: string | null;
  soumisLe: Date;
};

// Re-vérifie le payload JSONB en lecture (défense en profondeur).
function toCheckinRow(row: PrismaCheckin): CheckinRow {
  return {
    id: row.id,
    idPatient: row.idPatient,
    idAssignation: row.idAssignation,
    protocolDraftId: row.protocolDraftId,
    pointEtape: ensurePointEtape(row.pointEtape),
    reponses: ensureReponses(row.reponses),
    canal: row.canal,
    supersedesCheckinId: row.supersedesCheckinId,
    soumisLe: row.soumisLe.toISOString(),
  };
}

// Enregistre un check-in (append-only). Une correction chaîne la ligne
// supplantée via `supersedesCheckinId` (jamais d'`update`).
export async function saveCheckin(input: CheckinInput): Promise<CheckinRow> {
  const idPatient = ensurePatientId(input.idPatient);
  const idAssignation = ensureAssignationId(input.idAssignation);
  const protocolDraftId = ensureDraftId(input.protocolDraftId);
  const pointEtape = ensurePointEtape(input.pointEtape);
  const reponses = ensureReponses(input.reponses);
  const supersedesCheckinId =
    input.supersedesCheckinId != null ? ensureCheckinId(input.supersedesCheckinId) : null;

  // Une correction doit viser un check-in réel du même patient / protocole /
  // point d'étape — jamais une ligne d'un autre patient (garde inter-patient).
  if (supersedesCheckinId) {
    const previous = await prisma.protocolCheckin.findUnique({
      where: { id: supersedesCheckinId },
      select: { idPatient: true, protocolDraftId: true, pointEtape: true },
    });
    if (
      !previous ||
      previous.idPatient !== idPatient ||
      previous.protocolDraftId !== protocolDraftId ||
      previous.pointEtape !== pointEtape
    ) {
      throw new TypeError('Check-in à corriger introuvable pour ce protocole.');
    }
  }

  const created = await prisma.protocolCheckin.create({
    data: {
      idPatient,
      idAssignation,
      protocolDraftId,
      pointEtape,
      reponses: { contractVersion: CHECKIN_CONTRACT_VERSION, ...reponses } as unknown as object,
      canal: 'portail',
      supersedesCheckinId,
    },
    select: SELECT_CHECKIN,
  });
  return toCheckinRow(created);
}

// Liste les check-ins d'un patient (optionnellement bornés à un protocole),
// les plus récents d'abord.
export async function listCheckins(
  idPatientRaw: string,
  protocolDraftIdRaw?: string,
): Promise<CheckinRow[]> {
  const idPatient = ensurePatientId(idPatientRaw);
  const where: { idPatient: string; protocolDraftId?: string } = { idPatient };
  if (protocolDraftIdRaw !== undefined) {
    where.protocolDraftId = ensureDraftId(protocolDraftIdRaw);
  }
  const rows = await prisma.protocolCheckin.findMany({
    where,
    orderBy: { soumisLe: 'desc' },
    select: SELECT_CHECKIN,
  });
  return rows.map(toCheckinRow);
}
