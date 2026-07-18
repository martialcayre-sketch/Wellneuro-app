import type { RecommendedPlateRef } from './types';

export const C5B_PLATE_CATALOG_VERSION = 'c5b-plate-catalog-v1' as const;
export const C5B_PLATE_CATALOG_HASH = '7f8440bea95ead9b10ec0c7aa7b894a532f0e9c5891378efcbf6234aa9a8f117' as const;

export type C5bRecommendedPlate = {
  catalogVersion: typeof C5B_PLATE_CATALOG_VERSION;
  plateCode: string;
  label: string;
  /** Null tant qu'aucune famille d'équivalence clinique n'a été validée. */
  substitutionFamily: string | null;
  contentHash: string;
  ref: RecommendedPlateRef;
};

/**
 * Catalogue C5B V1. Il reprend sans enrichissement clinique les trois repères
 * historiquement codés dans JA5-03. Le contenu précis de l'assiette reste une
 * décision manuelle du praticien ; aucune composition n'est inventée ici.
 */
export const C5B_RECOMMENDED_PLATES: readonly C5bRecommendedPlate[] = [
  {
    catalogVersion: C5B_PLATE_CATALOG_VERSION,
    plateCode: 'ASSIETTE_PETIT_DEJEUNER_SIMPLE',
    label: 'Assiette recommandée — Petit-déjeuner simple',
    substitutionFamily: null,
    contentHash: '2c3650b80985de2819205a8e982e27a6dd26feb2fdd9eda6ba6f8dc36ddd3cdc',
    ref: {
      contractVersion: 'c5-recommended-plate-ref-v1',
      plateCode: 'ASSIETTE_PETIT_DEJEUNER_SIMPLE',
      catalogVersion: C5B_PLATE_CATALOG_VERSION,
      contentHash: '2c3650b80985de2819205a8e982e27a6dd26feb2fdd9eda6ba6f8dc36ddd3cdc',
      refHash: '7f89d226226fc7c411b8c1ac640126b4bca2978844e26388305adb7dfa8e34ea',
    },
  },
  {
    catalogVersion: C5B_PLATE_CATALOG_VERSION,
    plateCode: 'ASSIETTE_DEJEUNER_EXTERIEUR',
    label: 'Assiette recommandée — Déjeuner extérieur',
    substitutionFamily: null,
    contentHash: 'd063a62aad641c68955331754e7f6ea098dddfbd3fd2de44ba58bee5e0d232db',
    ref: {
      contractVersion: 'c5-recommended-plate-ref-v1',
      plateCode: 'ASSIETTE_DEJEUNER_EXTERIEUR',
      catalogVersion: C5B_PLATE_CATALOG_VERSION,
      contentHash: 'd063a62aad641c68955331754e7f6ea098dddfbd3fd2de44ba58bee5e0d232db',
      refHash: 'd070a4eb1884a015f2b0676ed2d5413ef71edbd5d308056c2b3c02db45f5adb7',
    },
  },
  {
    catalogVersion: C5B_PLATE_CATALOG_VERSION,
    plateCode: 'ASSIETTE_SOIR_LEGER',
    label: 'Assiette recommandée — Soir léger',
    substitutionFamily: null,
    contentHash: '4140aa2ca64887edd7cce0e40661f49d77b51fbda6d575ca2a0c32ba1baf9454',
    ref: {
      contractVersion: 'c5-recommended-plate-ref-v1',
      plateCode: 'ASSIETTE_SOIR_LEGER',
      catalogVersion: C5B_PLATE_CATALOG_VERSION,
      contentHash: '4140aa2ca64887edd7cce0e40661f49d77b51fbda6d575ca2a0c32ba1baf9454',
      refHash: 'de3ddfaba871e778f84cca076247bf4e30a230121c974faa06bc797811d34e86',
    },
  },
] as const;

export function getRecommendedPlate(plateCode: string): C5bRecommendedPlate | null {
  return C5B_RECOMMENDED_PLATES.find(plate => plate.plateCode === plateCode) ?? null;
}

export function getCurrentRecommendedPlateRef(plateCode: string): RecommendedPlateRef {
  const plate = getRecommendedPlate(plateCode);
  if (!plate) throw new TypeError('Référence d’assiette inconnue.');
  return { ...plate.ref };
}

export function assertCurrentRecommendedPlateRef(value: unknown): RecommendedPlateRef {
  if (!value || typeof value !== 'object') throw new TypeError('Référence d’assiette invalide.');
  const candidate = value as Partial<RecommendedPlateRef>;
  const plate = typeof candidate.plateCode === 'string' ? getRecommendedPlate(candidate.plateCode) : null;
  if (!plate
    || candidate.contractVersion !== plate.ref.contractVersion
    || candidate.catalogVersion !== plate.ref.catalogVersion
    || candidate.contentHash !== plate.ref.contentHash
    || candidate.refHash !== plate.ref.refHash) {
    throw new TypeError('Référence d’assiette inconnue ou caduque.');
  }
  return { ...plate.ref };
}

export type PlateSubstitutionDecision =
  | {
      status: 'none';
      source: RecommendedPlateRef;
      reason: 'practitioner_declined' | 'no_validated_alternative';
      decidedBy: 'practitioner';
    }
  | {
      status: 'proposed';
      source: RecommendedPlateRef;
      target: RecommendedPlateRef;
      substitutionFamily: string;
      justification: string;
      decidedBy: 'practitioner';
    };

/** Aucune proposition automatique : la cible est toujours un choix praticien. */
export function decidePlateSubstitution(input: {
  source: RecommendedPlateRef;
  targetPlateCode?: string | null;
  justification?: string;
  noProposalReason?: 'practitioner_declined' | 'no_validated_alternative';
}): PlateSubstitutionDecision {
  const source = assertCurrentRecommendedPlateRef(input.source);
  const sourcePlate = getRecommendedPlate(source.plateCode)!;
  if (!input.targetPlateCode) {
    return {
      status: 'none',
      source,
      reason: input.noProposalReason ?? 'no_validated_alternative',
      decidedBy: 'practitioner',
    };
  }
  const target = getRecommendedPlate(input.targetPlateCode);
  if (!target || target.plateCode === source.plateCode) {
    throw new TypeError('Assiette de substitution invalide.');
  }
  if (!sourcePlate.substitutionFamily
    || target.substitutionFamily !== sourcePlate.substitutionFamily) {
    throw new TypeError('La substitution n’appartient pas à une famille clinique validée.');
  }
  const justification = input.justification?.trim() ?? '';
  if (justification.length < 10) {
    throw new TypeError('Une justification praticien explicite est requise.');
  }
  return {
    status: 'proposed',
    source,
    target: { ...target.ref },
    substitutionFamily: sourcePlate.substitutionFamily,
    justification,
    decidedBy: 'practitioner',
  };
}
