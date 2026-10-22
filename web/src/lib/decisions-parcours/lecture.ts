// La LECTURE des décisions de parcours d'un dossier ([[D-343]] §8), et des
// versions du protocole auxquelles elles s'ancrent. Le praticien du dossier
// seul, au cockpit : aucune autre surface ne lit ces lignes (banc
// `lecteursDecisionsParcours.guard.test.ts`). Les fils se dérivent dans
// `fils.ts` (pur).

import type { PrismaClient } from '@/generated/prisma';
import { EXCLURE_INSTANTANES_JA } from '@/lib/food-observation/contract';
import { lireVersionsDiffusees } from '@/lib/protocol/calendriersPersistes';
import { reconstructProtocolDraft } from '@/lib/protocol/fromPrisma';
import type { ActionDeVersion, DecisionLue, VersionLue } from './fils';
import type { Issue, Nature, Source } from './liste';

const jour = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

export async function lireDecisionsDuDossier(
  client: Pick<PrismaClient, 'decisionParcours'>,
  idPatient: string,
): Promise<DecisionLue[]> {
  const lignes = await client.decisionParcours.findMany({ where: { idPatient }, orderBy: { ordre: 'asc' } });
  return lignes.map(l => ({
    id: l.id,
    ordre: l.ordre.toString(),
    acte: l.acte === 'retrait' ? 'retrait' : 'pose',
    idVersion: l.idVersion,
    idAction: l.idAction,
    nature: l.nature as Nature | null,
    issue: l.issue as Issue | null,
    motif: l.motif,
    note: l.note,
    evenementLe: jour(l.evenementLe),
    evenementInconnu: l.evenementInconnu,
    source: l.source as Source | null,
    idVersionSuivante: l.idVersionSuivante,
    idLigneRemplacee: l.idLigneRemplacee,
    praticienEmail: l.praticienEmail,
    acteLe: l.acteLe.toISOString(),
  }));
}

/** Les actions d'un contenu de version, ou `null` s'il ne se relit pas. */
export function actionsDeLaVersion(payload: unknown, inputHash: string): ActionDeVersion[] | null {
  try {
    return reconstructProtocolDraft(payload, inputHash).actions.map(a => ({ actionId: a.actionId, titre: a.title }));
  } catch {
    return null;
  }
}

/**
 * Les versions du protocole du dossier, de la plus récente à la plus
 * ancienne — jamais un instantané du carnet alimentaire, qui vit dans la même
 * table sans être une version ([[D-255]] §3).
 */
export async function lireVersionsDuDossier(
  client: Pick<PrismaClient, 'protocolDraft' | 'protocolDiffusionApproval'>,
  idPatient: string,
): Promise<VersionLue[]> {
  const [lignes, diffusees] = await Promise.all([
    client.protocolDraft.findMany({
      where: { idPatient, ...EXCLURE_INSTANTANES_JA },
      select: { id: true, createdAt: true, payload: true, inputHash: true },
      orderBy: { createdAt: 'desc' },
    }),
    lireVersionsDiffusees(client, idPatient),
  ]);
  return lignes.map(v => ({
    id: v.id,
    creeLe: v.createdAt.toISOString(),
    diffuseeLe: diffusees.get(v.id)?.toISOString() ?? null,
    actions: actionsDeLaVersion(v.payload, v.inputHash),
  }));
}
