import { prisma } from '@/lib/prisma';
import type { ProtocolAction } from '@/lib/clinical-engine/types';
import {
  associationEffetIndesirableDisponible,
  interruptionEffetIndesirableActive,
} from '@/lib/clinical/safetyEffetIndesirableV1';
import { refusSaisieSantePour } from '@/lib/patient/gardeAgeServeur';
import { reconstructProtocolDraft } from '@/lib/protocol/fromPrisma';
import { resolveProtocoleDiffuse } from '@/lib/protocol/portailProtocol';
import {
  elementsDesignables,
  elementsEnPause,
  type ElementEnPause,
  type Rattachement,
  type VerdictEffetIndesirable,
  versionProgramme,
} from './pauseEffetIndesirable';

// LE CÔTÉ SERVEUR DE LA PAUSE — [[D-281]], étape 3. Le calcul est dans le
// module pur ; ici, les lectures et les deux verrous.

/**
 * Le programme diffusé du patient : son identifiant et ses actions, ou `null`.
 *
 * Résolu CÔTÉ SERVEUR par `resolveProtocoleDiffuse`, comme le portail : le
 * patient ne désigne jamais un programme, il désigne un élément de celui
 * qu'on lui a transmis. Un payload dont l'intégrité ne se vérifie pas rend
 * `null` — rien à désigner plutôt qu'une liste qu'on ne sait pas garantir.
 */
export async function programmeDiffuse(
  idPatient: string,
): Promise<{ protocolDraftId: string; version: string; actions: ProtocolAction[] } | null> {
  const diffuse = await resolveProtocoleDiffuse(idPatient);
  if (!diffuse) return null;
  const row = await prisma.protocolDraft.findUnique({
    where: { id: diffuse.protocolDraftId },
    select: { payload: true, inputHash: true },
  });
  if (!row) return null;
  try {
    const draft = reconstructProtocolDraft(row.payload, row.inputHash);
    return {
      protocolDraftId: diffuse.protocolDraftId,
      version: versionProgramme(diffuse.protocolDraftInputHash),
      actions: draft.actions,
    };
  } catch {
    return null;
  }
}

/**
 * Le patient peut-il désigner un élément ? Trois conditions, toutes fermées
 * par défaut : le drapeau de capture, un patient MAJEUR (D-283 §5, D-284 :
 * aucune surface neuve pour un dossier mineur ou sans date — il garde le
 * formulaire d'avant), un programme diffusé.
 */
export async function designationOuverte(idPatient: string): Promise<boolean> {
  if (!associationEffetIndesirableDisponible()) return false;
  return (await refusSaisieSantePour(idPatient)) === null;
}

/**
 * La liste servie au formulaire et la version du programme dont elle vient, ou
 * `null` quand la désignation est fermée.
 */
export async function designationPour(
  idPatient: string,
): Promise<{ version: string; elements: { actionId: string; title: string }[] } | null> {
  if (!(await designationOuverte(idPatient))) return null;
  const programme = await programmeDiffuse(idPatient);
  if (!programme) return null;
  const elements = elementsDesignables(programme.actions);
  return elements.length > 0 ? { version: programme.version, elements } : null;
}

/**
 * Ce qui est en pause dans les actions servies au patient — `[]` tant que la
 * règle amendée n'est pas signée (D-281 §6 : d'ici là, capture et
 * notification seulement, rien ne s'interrompt).
 */
export async function pausesServies(
  idPatient: string,
  protocolDraftId: string,
  actions: readonly ProtocolAction[],
): Promise<ElementEnPause[]> {
  if (!interruptionEffetIndesirableActive()) return [];
  const [signalements, verdicts] = await Promise.all([
    prisma.trustAdverseEffectReport.findMany({
      where: { idPatient, rattachement: { not: null } },
      select: { id: true, rattachement: true, elementActionId: true, protocolDraftId: true },
    }),
    prisma.trustAdverseEffectVerdict.findMany({
      where: { idPatient },
      select: { id: true, reportId: true, verdict: true, elementActionId: true, supersedesVerdictId: true },
    }),
  ]);
  return elementsEnPause({
    signalements: signalements.map(s => ({
      id: s.id,
      rattachement: s.rattachement as Rattachement,
      elementActionId: s.elementActionId,
      protocolDraftId: s.protocolDraftId,
    })),
    verdicts: verdicts.map(v => ({ ...v, verdict: v.verdict as VerdictEffetIndesirable['verdict'] })),
    protocolDraftId,
    actions,
  });
}
