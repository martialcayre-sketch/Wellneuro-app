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

  // LA SUBSTITUTION EST ORIENTÉE DEPUIS [[D-241]]. Le cas d'origine prenait
  // `ASSIETTE_SOIR_LEGER` pour source — un repère de MOMENT DE REPAS, que rien
  // ne prescrit. Il butait alors sur l'absence de famille ; il bute désormais,
  // plus tôt et pour une meilleure raison, sur l'axe.
  it('permet explicitement de ne rien proposer — et l’absence est DÉCLARÉE, pas subie', () => {
    const source = getCurrentRecommendedPlateRef('ASSIETTE_DOPAMINERGIQUE');
    expect(decidePlateSubstitution({ source, replis: [] })).toMatchObject({
      status: 'none', reason: 'no_validated_alternative', decidedBy: 'practitioner',
    });
    expect(decidePlateSubstitution({ source, replis: [], noProposalReason: 'practitioner_declined' }))
      .toMatchObject({ status: 'none', reason: 'practitioner_declined' });
  });

  it('refuse une cible qu’AUCUN repli attesté ne désigne', () => {
    expect(() => decidePlateSubstitution({
      source: getCurrentRecommendedPlateRef('ASSIETTE_DOPAMINERGIQUE'),
      replis: [],
      targetPlateCode: 'ASSIETTE_SEROTONINERGIQUE',
      justification: 'Choix discuté avec le patient.',
    })).toThrow(/Aucun repli attesté/);
  });

  it('LA DIRECTION NE SE LIT QUE DANS UN SENS — c’est tout l’objet du lot', () => {
    // Trois assiettes déclarées dans une famille valaient SIX substitutions.
    // Ici, une ligne `depuis A vers B` n'autorise QUE A→B.
    const replis = [{ depuis: 'ASSIETTE_DOPAMINERGIQUE', vers: 'ASSIETTE_SEROTONINERGIQUE', degre: 'acceptable' }] as const;
    const aVersB = decidePlateSubstitution({
      source: getCurrentRecommendedPlateRef('ASSIETTE_DOPAMINERGIQUE'),
      replis,
      targetPlateCode: 'ASSIETTE_SEROTONINERGIQUE',
      justification: 'Repli discuté avec le patient.',
    });
    expect(aVersB).toMatchObject({
      status: 'proposed',
      repli: { depuis: 'ASSIETTE_DOPAMINERGIQUE', vers: 'ASSIETTE_SEROTONINERGIQUE', degre: 'acceptable' },
      decidedBy: 'practitioner',
    });
    expect(aVersB.status === 'proposed' && aVersB.target.plateCode).toBe('ASSIETTE_SEROTONINERGIQUE');

    expect(() => decidePlateSubstitution({
      source: getCurrentRecommendedPlateRef('ASSIETTE_SEROTONINERGIQUE'),
      replis,
      targetPlateCode: 'ASSIETTE_DOPAMINERGIQUE',
      justification: 'Repli discuté avec le patient.',
    })).toThrow(/Aucun repli attesté/);
  });

  it('l’AXE est garde aux deux bouts — un repère de repas ne se replie ni ne sert de repli', () => {
    const replis = [
      { depuis: 'ASSIETTE_SOIR_LEGER', vers: 'ASSIETTE_DOPAMINERGIQUE', degre: 'proche' },
      { depuis: 'ASSIETTE_DOPAMINERGIQUE', vers: 'ASSIETTE_SOIR_LEGER', degre: 'proche' },
    ] as const;
    expect(() => decidePlateSubstitution({
      source: getCurrentRecommendedPlateRef('ASSIETTE_SOIR_LEGER'),
      replis,
      targetPlateCode: 'ASSIETTE_DOPAMINERGIQUE',
      justification: 'Repli discuté avec le patient.',
    })).toThrow(/ne se replie pas/);
    expect(() => decidePlateSubstitution({
      source: getCurrentRecommendedPlateRef('ASSIETTE_DOPAMINERGIQUE'),
      replis,
      targetPlateCode: 'ASSIETTE_SOIR_LEGER',
      justification: 'Repli discuté avec le patient.',
    })).toThrow(/servir de repli/);
  });

  it('la justification praticien reste exigée, même sur un repli attesté', () => {
    expect(() => decidePlateSubstitution({
      source: getCurrentRecommendedPlateRef('ASSIETTE_DOPAMINERGIQUE'),
      replis: [{ depuis: 'ASSIETTE_DOPAMINERGIQUE', vers: 'ASSIETTE_SEROTONINERGIQUE', degre: 'proche' }],
      targetPlateCode: 'ASSIETTE_SEROTONINERGIQUE',
      // Le seuil est `< 10` : « trop court » en fait exactement 10 et PASSE.
      justification: 'court',
    })).toThrow(/justification praticien/);
  });
});
