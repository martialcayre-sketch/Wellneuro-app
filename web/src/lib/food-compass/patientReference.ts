import type { ProtocolDiffusionApproval, ProtocolDraft } from '@/lib/clinical-engine/types';
import { prisma } from '@/lib/prisma';
import { reconstructProtocolDraft } from '@/lib/protocol/fromPrisma';
import { deriveVersionId } from '@/lib/protocol/versioning';
import { buildPatientFoodCompassView } from './contextual';
import { C5_PRACTITIONER_FOODS } from './manifest';
import { buildPractitionerFoodCompassReference } from './practitionerReference';
import { assertFoodCompassActionRef } from './refValidation';
import type { PatientFoodCompassSafeView } from './patientSafe';
import { C5_DATASET_VERSION, type CiqualNutrientDatum, type FoodCompassActionRef } from './types';

export async function resolvePatientFoodCompassView(input: {
  idPatient: string;
  approvedDraft: ProtocolDraft;
  approval: ProtocolDiffusionApproval;
  actionRef: FoodCompassActionRef;
}): Promise<PatientFoodCompassSafeView | null> {
  const foodMatch = /^ciqual-2025-v1:(\d{1,6})$/.exec(input.actionRef.foodRef);
  const manifest = foodMatch
    ? C5_PRACTITIONER_FOODS.find(food => food.foodRef === foodMatch[1])
    : undefined;
  if (!foodMatch || !manifest) return null;

  try {
    assertFoodCompassActionRef(input.actionRef, {
      protocolDraftId: input.approvedDraft.protocolDraftId,
      selectedPriorityId: input.approvedDraft.selectedPriorityId,
    });
    const sourceVersionId = deriveVersionId(
      input.actionRef.sourceProtocolDraftId,
      input.actionRef.sourceProtocolInputHash,
    );
    const [sourceRow, nutrientRows] = await Promise.all([
      prisma.protocolDraft.findUnique({
        where: { id: sourceVersionId },
        select: { idPatient: true, inputHash: true, payload: true },
      }),
      prisma.ciqualNutrientValue.findMany({
        where: { datasetVersion: C5_DATASET_VERSION, ciqualCode: manifest.foodRef },
        orderBy: { nutrientCode: 'asc' },
      }),
    ]);
    if (!sourceRow || sourceRow.idPatient !== input.idPatient) return null;
    const sourceDraft = reconstructProtocolDraft(sourceRow.payload, sourceRow.inputHash);
    const rows: CiqualNutrientDatum[] = nutrientRows.map(row => ({
      datasetVersion: row.datasetVersion,
      ciqualCode: row.ciqualCode,
      nutrientCode: row.nutrientCode,
      value: row.value === null ? null : Number(row.value),
      valueStatus: row.valueStatus as CiqualNutrientDatum['valueStatus'],
      unit: row.unit as CiqualNutrientDatum['unit'],
      sourceRef: row.sourceRef,
      sourceHash: row.sourceHash,
    }));
    const reference = buildPractitionerFoodCompassReference({
      ciqualCode: manifest.foodRef,
      foodLabel: manifest.label,
      rows,
      activeProtocol: sourceDraft,
    });
    if (!reference.actionRef || reference.actionRef.refHash !== input.actionRef.refHash) return null;

    const view = buildPatientFoodCompassView({
      profile: reference.profile,
      reading: reference.reading,
      actionRef: reference.actionRef,
      protocolDraft: input.approvedDraft,
      approval: input.approval,
      qualitativeSummary: `${manifest.label} accompagne une action alimentaire validée avec votre praticien.`,
      reasons: ['Cette lecture est reliée à l’objectif retenu pour votre accompagnement.'],
      sourceLabel: 'Table Ciqual, Anses',
      limitations: [
        'Cette lecture décrit cet aliment dans le cadre de votre accompagnement et ne remplace pas les échanges avec votre praticien.',
      ],
      alternative: null,
    });
    return {
      foodRef: manifest.foodRef,
      foodLabel: view.foodLabel,
      qualitativeSummary: view.qualitativeSummary,
      reasons: view.reasons,
      sourceLabel: view.sourceLabel,
      limitations: view.limitations,
      alternative: view.alternative,
    };
  } catch {
    return null;
  }
}
