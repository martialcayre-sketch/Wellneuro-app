import { describe, expect, it } from 'vitest';
import { canonicalSha256 } from '@/lib/clinical-engine/canonical';
import { createRecommendedPlateRef } from './contextual';
import {
  C5B_PLATE_CATALOG_HASH,
  C5B_RECOMMENDED_PLATES,
  assertCurrentRecommendedPlateRef,
  decidePlateSubstitution,
  getCurrentRecommendedPlateRef,
} from './plates';

describe('catalogue d’assiettes C5B', () => {
  it('possède et scelle les quinze entrées — trois repères, puis douze indications', () => {
    // L'ORDRE EST PART DU CONTRAT : les trois repères historiques restent en
    // TÊTE, et les douze du corpus suivent dans l'ordre de leurs protocoles
    // ([[D-230]]). Déplacer une entrée changerait `C5B_PLATE_CATALOG_HASH`, qui
    // hache la liste ORDONNÉE — sans qu'aucun contenu clinique ne bouge.
    expect(C5B_RECOMMENDED_PLATES.map(plate => plate.plateCode)).toEqual([
      'ASSIETTE_PETIT_DEJEUNER_SIMPLE',
      'ASSIETTE_DEJEUNER_EXTERIEUR',
      'ASSIETTE_SOIR_LEGER',
      'ASSIETTE_VEGETALE',
      'ASSIETTE_EPARGNE_DIGESTIVE',
      'ASSIETTE_METHYLATION',
      'ASSIETTE_DETOXICATION',
      'ASSIETTE_PROTEINEE',
      'ASSIETTE_DOPAMINERGIQUE',
      'ASSIETTE_SEROTONINERGIQUE',
      'ASSIETTE_PSYCHOBIOTIQUE',
      'ASSIETTE_ANTIOXYDANTE',
      'ASSIETTE_ANTI_INFLAMMATOIRE',
      'ASSIETTE_OMEGA_3',
      'ASSIETTE_CHRONOBIOLOGIQUE',
    ]);
    for (const plate of C5B_RECOMMENDED_PLATES) {
      const contentHash = canonicalSha256({
        catalogVersion: plate.catalogVersion,
        plateCode: plate.plateCode,
        label: plate.label,
        substitutionFamily: plate.substitutionFamily,
      });
      expect(contentHash).toBe(plate.contentHash);
      expect(createRecommendedPlateRef({
        plateCode: plate.plateCode,
        catalogVersion: plate.catalogVersion,
        contentHash,
      })).toEqual(plate.ref);
    }
    expect(canonicalSha256(C5B_RECOMMENDED_PLATES.map(({ ref: _ref, ...plate }) => plate)))
      .toBe(C5B_PLATE_CATALOG_HASH);
  });

  it('refuse les références inconnues, altérées ou caduques', () => {
    const ref = getCurrentRecommendedPlateRef('ASSIETTE_SOIR_LEGER');
    expect(assertCurrentRecommendedPlateRef(ref)).toEqual(ref);
    expect(() => assertCurrentRecommendedPlateRef({ ...ref, catalogVersion: 'catalog-v0' }))
      .toThrow(/caduque/);
    expect(() => getCurrentRecommendedPlateRef('INCONNUE')).toThrow(/inconnue/);
  });

  it('permet explicitement de ne rien proposer et interdit les familles non validées', () => {
    const source = getCurrentRecommendedPlateRef('ASSIETTE_SOIR_LEGER');
    expect(decidePlateSubstitution({ source })).toMatchObject({
      status: 'none', reason: 'no_validated_alternative', decidedBy: 'practitioner',
    });
    expect(decidePlateSubstitution({ source, noProposalReason: 'practitioner_declined' }))
      .toMatchObject({ status: 'none', reason: 'practitioner_declined' });
    expect(() => decidePlateSubstitution({
      source,
      targetPlateCode: 'ASSIETTE_DEJEUNER_EXTERIEUR',
      justification: 'Choix discuté avec le patient.',
    })).toThrow(/famille clinique validée/);
  });
});
