import { describe, expect, it } from 'vitest';
import {
  codeRubrique,
  lireLigneEtiquetage,
  lireListeEtiquetage,
  MAX_LIGNES_ETIQUETAGE_LOT,
} from './etiquetageLot';

describe('codeRubrique — code ou nom à l’écran, rien d’autre', () => {
  it('lit les dix rubriques par leur nom à l’écran', () => {
    expect(codeRubrique('Question')).toBe('question');
    expect(codeRubrique('Population d’usage')).toBe('population');
    expect(codeRubrique("Population d'usage")).toBe('population');
    expect(codeRubrique('Préanalytique et contexte')).toBe('preanalytique_contexte');
    expect(codeRubrique('Résultats et conséquences')).toBe('resultats_consequences');
    expect(codeRubrique('Interprétations')).toBe('interpretations');
    expect(codeRubrique('Options')).toBe('options');
    expect(codeRubrique('Précautions')).toBe('precautions');
    expect(codeRubrique('Surveillance et arrêt')).toBe('surveillance_arret');
    expect(codeRubrique('Limites')).toBe('limites');
    expect(codeRubrique('Argument de préférence')).toBe('argument_preference');
  });

  it('lit les codes et refuse le vocabulaire abandonné des dossiers (D-321 §5)', () => {
    expect(codeRubrique('surveillance_arret')).toBe('surveillance_arret');
    expect(codeRubrique('adressage')).toBeNull();
    expect(codeRubrique('indication')).toBeNull();
    expect(codeRubrique('suivi')).toBeNull();
    expect(codeRubrique('')).toBeNull();
  });
});

describe('lireListeEtiquetage — une ligne, un claim, rien de complété', () => {
  it('lit point-virgule, tabulation et tableau markdown, et ignore en-têtes et séparateurs', () => {
    const texte = [
      '| Claim | Besoins | Rubrique |',
      '|---|---|---|',
      '| WN-CL-0001-001 | 2 | Options |',
      'WN-CL-0001-002 ; 2, 4 ; precautions',
      'WN-CL-0001-003\t2\tLimites',
      '',
      '# commentaire',
      'WN-CL-0001-004@v1.0 ; 4 2 ; Surveillance et arrêt',
    ].join('\n');
    expect(lireListeEtiquetage(texte)).toEqual({
      erreurs: [],
      lignes: [
        { claimId: 'WN-CL-0001-001', besoins: [2], rubrique: 'options' },
        { claimId: 'WN-CL-0001-002', besoins: [2, 4], rubrique: 'precautions' },
        { claimId: 'WN-CL-0001-003', besoins: [2], rubrique: 'limites' },
        { claimId: 'WN-CL-0001-004', versionClaim: 'v1.0', besoins: [2, 4], rubrique: 'surveillance_arret' },
      ],
    });
  });

  it('une ligne qui porte un claim mais se lit mal est une erreur, jamais ignorée', () => {
    const { lignes, erreurs } = lireListeEtiquetage(
      [
        'WN-CL-0001-001 ; 2',
        'WN-CL-001-001 ; 2 ; options',
        'WN-CL-0001-002 ; 2 ; adressage',
        'WN-CL-0001-003 ; 13 ; options',
        'WN-CL-0001-004 ; deux ; options',
        'WN-CL-0001-005 ; 2 ; options',
        'WN-CL-0001-005 ; 2 ; limites',
      ].join('\n'),
    );
    expect(lignes).toEqual([{ claimId: 'WN-CL-0001-005', besoins: [2], rubrique: 'options' }]);
    expect(erreurs.map((e) => e.numero)).toEqual([1, 2, 3, 4, 5, 7]);
    expect(erreurs[5].raison).toContain('déjà présent');
  });

  it('un identifiant de forme approchée devient une erreur visible, jamais ignorée', () => {
    const { lignes, erreurs } = lireListeEtiquetage('wn-cl-0001-001 ; 2 ; options\nWN_CL_0001_002 ; 2 ; options');
    expect(lignes).toEqual([]);
    expect(erreurs.map((e) => e.raison)).toEqual(['identifiant de claim illisible', 'identifiant de claim illisible']);
  });

  it('refuse au-delà de la borne technique d’un geste', () => {
    const texte = Array.from(
      { length: MAX_LIGNES_ETIQUETAGE_LOT + 1 },
      (_, i) => `WN-CL-${String(1000 + Math.floor(i / 1000)).padStart(4, '0')}-${String(i % 1000).padStart(3, '0')} ; 2 ; options`,
    ).join('\n');
    const { erreurs } = lireListeEtiquetage(texte);
    expect(erreurs).toHaveLength(1);
    expect(erreurs[0].raison).toContain(`au plus ${MAX_LIGNES_ETIQUETAGE_LOT}`);
  });
});

describe('lireLigneEtiquetage — la route relit chaque ligne reçue', () => {
  it('accepte une ligne complète et trie les besoins', () => {
    expect(lireLigneEtiquetage({ claimId: 'WN-CL-0001-001', besoins: [4, 2], rubrique: 'limites' })).toEqual({
      claimId: 'WN-CL-0001-001',
      besoins: [2, 4],
      rubrique: 'limites',
    });
  });

  it('refuse identifiant, version, besoins ou rubrique hors règle', () => {
    expect(lireLigneEtiquetage({ claimId: 'WN-CL-1-1', besoins: [2], rubrique: 'limites' })).toBeNull();
    expect(lireLigneEtiquetage({ claimId: 'WN-CL-0001-001', versionClaim: 'x', besoins: [2], rubrique: 'limites' })).toBeNull();
    expect(lireLigneEtiquetage({ claimId: 'WN-CL-0001-001', besoins: [], rubrique: 'limites' })).toBeNull();
    expect(lireLigneEtiquetage({ claimId: 'WN-CL-0001-001', besoins: [2], rubrique: 'Limites' })).toBeNull();
    expect(lireLigneEtiquetage(null)).toBeNull();
  });
});
