import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  C5_DATASET_VERSION,
  buildIntrinsicFoodProfile,
  getSignedFoodCompassDistribution,
  isC5Enabled,
  type CiqualNutrientDatum,
  type ContextualFoodReading,
  type FoodCompassActionRef,
  type IntrinsicFoodProfile,
  C5_PRACTITIONER_FOODS,
  C5_PRACTITIONER_MANIFEST_HASH,
  C5_PRACTITIONER_MANIFEST_VERSION,
  C5B_PLATE_CATALOG_HASH,
  C5B_PLATE_CATALOG_VERSION,
} from '@/lib/food-compass';
import { reconstructProtocolDraft } from '@/lib/protocol/fromPrisma';
import { resolveActiveVersion } from '@/lib/protocol/versioning';
import { buildPractitionerFoodCompassReference } from '@/lib/food-compass/practitionerReference';
import { replisDepuis, replisServables } from '@/lib/clinical/replisAssietteV1';
import { getLatestPublishedJaFeasibility } from '@/lib/food-observation/feasibilityRepository';
import type { PublishedJaFeasibility } from '@/lib/food-observation/feasibility';
import type { RepliAssietteDeclare } from '@/lib/food-compass/types';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';

export const dynamic = 'force-dynamic';

// Gabarit littéral pour le journal des accès (G-TRUST-04) — jamais l'URL reçue.
const ROUTE_JOURNAL = '/api/praticien/boussole';

type SuccessResponse = {
  ok: true;
  profile: IntrinsicFoodProfile;
  reading: ContextualFoodReading | null;
  actionRef: FoodCompassActionRef | null;
  manifest: { version: typeof C5_PRACTITIONER_MANIFEST_VERSION; hash: typeof C5_PRACTITIONER_MANIFEST_HASH };
  plateCatalog: { version: typeof C5B_PLATE_CATALOG_VERSION; hash: typeof C5B_PLATE_CATALOG_HASH };
  jaFeasibility: PublishedJaFeasibility | null;
  /**
   * LES REPLIS ATTESTÉS DES ASSIETTES PRESCRITES DE CE PROTOCOLE ([[D-241]]).
   *
   * CE CHAMP ÉTAIT UN TUPLE VIDE LITTÉRAL — `[]` — donc une liste que le
   * CONTRAT lui-même interdisait de remplir. `D-216` §4 le nommait comme le
   * troisième préalable aux familles : « une famille validée resterait
   * aujourd'hui aussi invisible que l'absence actuelle ».
   *
   * IL RESTE VIDE, ET CE N'EST PLUS LA MÊME CHOSE. Il l'est parce que la table
   * de replis est vide et non signée, ce que son verrou déclare — une ABSENCE
   * DÉCLARÉE, là où c'était une absence du parcours. Le jour où une ligne sera
   * attestée, elle arrivera ici sans qu'une seule ligne de cette route change.
   */
  alternatives: readonly RepliAssietteDeclare[];
  insertionAllowed: boolean;
  insertionReason: string | null;
};
type ErrorResponse = { ok: false; reason: string; error: string };
export type PractitionerFoodCompassResponse = SuccessResponse | ErrorResponse;

function error(reason: string, message: string, status: number) {
  return NextResponse.json<ErrorResponse>({ ok: false, reason, error: message }, { status });
}

export async function GET(request: Request): Promise<NextResponse<PractitionerFoodCompassResponse>> {
  if (!isC5Enabled(process.env.WN_C5_ENABLED)) return error('not_found', 'Ressource introuvable.', 404);
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return error('unauthenticated', 'Authentification praticien requise.', 401);

  const { searchParams } = new URL(request.url);
  const idPatient = (searchParams.get('idPatient') ?? '').trim();
  const foodRef = (searchParams.get('foodRef') ?? '').trim();
  const decisionCardId = (searchParams.get('decisionCardId') ?? '').trim();
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(idPatient)
    || !/^\d{1,6}$/.test(foodRef)
    || !/^[A-Za-z0-9_:.#-]{1,200}$/.test(decisionCardId)) {
    return error('invalid_payload', 'Patient, fil de protocole ou référence alimentaire invalide.', 400);
  }
  const manifest = C5_PRACTITIONER_FOODS.find(food => food.foodRef === foodRef);
  if (!manifest) return error('food_not_found', 'Aliment non disponible dans l’Observatoire.', 404);

  try {
    // Garde factorisée (G-TRUST-04) : les deux verdicts non-`accessible`
    // rendent le 403 historique de cette route — un patient inexistant ne se
    // distingue pas d'un patient d'un autre praticien.
    const verdict = await verifierAppartenancePatient(idPatient, emailPraticien(session), {
      route: ROUTE_JOURNAL,
      methode: 'GET',
    });
    if (verdict !== 'accessible') {
      return error('forbidden', 'Patient non accessible pour ce praticien.', 403);
    }

    const [nutrientRows, protocolRows, jaFeasibility] = await Promise.all([
      prisma.ciqualNutrientValue.findMany({
        where: { datasetVersion: C5_DATASET_VERSION, ciqualCode: foodRef },
        orderBy: { nutrientCode: 'asc' },
      }),
      prisma.protocolDraft.findMany({
        where: { idPatient, decisionCardId, status: 'practitioner_reviewed' },
        orderBy: { createdAt: 'desc' },
        select: { id: true, inputHash: true, payload: true, supersedesDraftId: true, createdAt: true },
      }),
      getLatestPublishedJaFeasibility(idPatient).catch(caught => {
        console.error('[praticien/boussole JA]', caught instanceof Error ? caught.message : String(caught));
        return null;
      }),
    ]);
    if (nutrientRows.length === 0) return error('food_not_found', 'Aliment absent du référentiel.', 404);
    if (nutrientRows.length !== 16 || new Set(nutrientRows.map(row => row.nutrientCode)).size !== 16) {
      return error('reference_incomplete', 'Référentiel alimentaire incomplet.', 503);
    }

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
    let profile: IntrinsicFoodProfile;
    try {
      profile = buildIntrinsicFoodProfile({
        ciqualCode: foodRef,
        foodLabel: manifest.label,
        rows,
        distribution: getSignedFoodCompassDistribution(),
      });
    } catch {
      return error('reference_incomplete', 'Référentiel alimentaire incomplet ou incohérent.', 503);
    }

    const activeRow = resolveActiveVersion(protocolRows);
    let reading: ContextualFoodReading | null = null;
    let actionRef: FoodCompassActionRef | null = null;
    // LA SUBSTITUTION NE PART QUE D'UNE ASSIETTE PRESCRITE, et « prescrite » se
    // lit ICI : sur les actions du protocole actif, pas au catalogue. C'est la
    // garde que `D-216` §4 confiait au chemin d'intégration, et que
    // `decidePlateSubstitution` ne peut pas tenir seule — elle ne reçoit qu'une
    // référence de catalogue.
    let alternatives: readonly RepliAssietteDeclare[] = [];
    if (activeRow) {
      let draft;
      try {
        draft = reconstructProtocolDraft(activeRow.payload, activeRow.inputHash);
      } catch {
        return error('protocol_stale', 'Version active du protocole incohérente.', 409);
      }
      const servables = replisServables();
      const dejaVus = new Set<string>();
      alternatives = draft.actions.flatMap(action => {
        const prescrite = action.recommendedPlateRef?.plateCode;
        if (prescrite === undefined || dejaVus.has(prescrite)) return [];
        dejaVus.add(prescrite);
        return replisDepuis(prescrite, servables)
          .map(ligne => ({ depuis: ligne.depuis, vers: ligne.vers, degre: ligne.degre }));
      });
      const reference = buildPractitionerFoodCompassReference({
        ciqualCode: foodRef,
        foodLabel: manifest.label,
        rows,
        activeProtocol: draft,
      });
      profile = reference.profile;
      reading = reference.reading;
      actionRef = reference.actionRef;
    }

    const insertionAllowed = actionRef !== null;
    return NextResponse.json({
      ok: true,
      profile,
      reading,
      actionRef,
      manifest: { version: C5_PRACTITIONER_MANIFEST_VERSION, hash: C5_PRACTITIONER_MANIFEST_HASH },
      plateCatalog: { version: C5B_PLATE_CATALOG_VERSION, hash: C5B_PLATE_CATALOG_HASH },
      jaFeasibility,
      alternatives,
      insertionAllowed,
      insertionReason: insertionAllowed
        ? null
        : activeRow
          ? 'Profil insuffisant : insertion indisponible.'
          : 'Un protocole relu actif est requis avant toute insertion manuelle.',
    });
  } catch (caught) {
    console.error('[praticien/boussole GET]', caught instanceof Error ? caught.message : String(caught));
    return error('exception', 'Erreur technique.', 500);
  }
}
