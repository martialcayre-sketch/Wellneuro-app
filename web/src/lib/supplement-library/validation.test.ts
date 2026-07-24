import { describe, expect, it } from 'vitest';
import {
  contenuSha256ForFiche,
  parseSupplementIngestPayload,
  type SupplementFicheInput,
} from '@/lib/supplement-library/validation';

function ficheBrute(overrides: Record<string, unknown> = {}) {
  return {
    nomCommercial: 'Magnésium marin 300',
    marque: 'Laboratoire Fictif',
    sourceProvenance: 'complalim',
    sourceIdentifiant: 'complalim-12345',
    sourceUrl: 'https://www.data.gouv.fr/…',
    niveauCompletude: 'partielle',
    donneesManquantes: ['mode d’emploi non renseigné'],
    incertitudes: 'champ plantes non décodable',
    labels: ['clean_label'],
    allergenes: [],
    excipients: ['stéarate de magnésium'],
    compositions: [
      { ingredientId: 'ing_magnesium', formeId: 'forme_bisglycinate', doseParPortion: 300, unite: 'mg', position: 0 },
      { ingredientId: 'ing_vitamine_b6', doseParPortion: 1.4, unite: 'mg', position: 1 },
    ],
    ...overrides,
  };
}

describe('validation ingestion compléments', () => {
  it('accepte une fiche conforme et calcule une empreinte sha256', () => {
    const payload = parseSupplementIngestPayload({ fiches: [ficheBrute()] });
    expect(payload.fiches).toHaveLength(1);
    expect(payload.fiches[0].contenuSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(payload.fiches[0].marche).toBe('FR');
  });

  it('refuse une provenance hors vocabulaire', () => {
    expect(() =>
      parseSupplementIngestPayload({ fiches: [ficheBrute({ sourceProvenance: 'wikipedia' })] }),
    ).toThrow(/sourceProvenance.*hors vocabulaire/);
  });

  it('refuse un niveau de complétude hors vocabulaire', () => {
    expect(() =>
      parseSupplementIngestPayload({ fiches: [ficheBrute({ niveauCompletude: 'excellente' })] }),
    ).toThrow(/niveauCompletude.*hors vocabulaire/);
  });

  it('refuse une unité de composition hors vocabulaire', () => {
    const fiche = ficheBrute({
      compositions: [{ ingredientId: 'ing_x', doseParPortion: 10, unite: 'cuillère' }],
    });
    expect(() => parseSupplementIngestPayload({ fiches: [fiche] })).toThrow(/unite.*hors vocabulaire/);
  });

  it('refuse une dose sans unité (et réciproquement)', () => {
    const doseSeule = ficheBrute({ compositions: [{ ingredientId: 'ing_x', doseParPortion: 10 }] });
    expect(() => parseSupplementIngestPayload({ fiches: [doseSeule] })).toThrow(/dose et unité/);
    const uniteSeule = ficheBrute({ compositions: [{ ingredientId: 'ing_x', unite: 'mg' }] });
    expect(() => parseSupplementIngestPayload({ fiches: [uniteSeule] })).toThrow(/dose et unité/);
  });

  it('refuse une composition en double (même ingrédient + forme)', () => {
    const fiche = ficheBrute({
      compositions: [
        { ingredientId: 'ing_x', doseParPortion: 10, unite: 'mg' },
        { ingredientId: 'ing_x', doseParPortion: 20, unite: 'mg' },
      ],
    });
    expect(() => parseSupplementIngestPayload({ fiches: [fiche] })).toThrow(/en double/);
  });

  it('refuse un champ requis manquant', () => {
    const sansMarque = ficheBrute();
    delete (sansMarque as Record<string, unknown>).marque;
    expect(() => parseSupplementIngestPayload({ fiches: [sansMarque] })).toThrow(/marque est requis/);
  });

  it('refuse un lot vide et un même produit source dupliqué dans la requête', () => {
    expect(() => parseSupplementIngestPayload({ fiches: [] })).toThrow(/liste non vide/);
    expect(() =>
      parseSupplementIngestPayload({ fiches: [ficheBrute(), ficheBrute()] }),
    ).toThrow(/dupliqué dans la requête/);
  });

  it('accepte une fiche sans composition résolue (brouillon, résolution différée)', () => {
    const payload = parseSupplementIngestPayload({ fiches: [ficheBrute({ compositions: [] })] });
    expect(payload.fiches[0].compositions).toHaveLength(0);
  });

  it('empreinte déterministe : insensible à l’ordre des composants', () => {
    const base = parseSupplementIngestPayload({ fiches: [ficheBrute()] }).fiches[0];
    const inverse = parseSupplementIngestPayload({
      fiches: [
        ficheBrute({
          compositions: [
            { ingredientId: 'ing_vitamine_b6', doseParPortion: 1.4, unite: 'mg', position: 1 },
            { ingredientId: 'ing_magnesium', formeId: 'forme_bisglycinate', doseParPortion: 300, unite: 'mg', position: 0 },
          ],
        }),
      ],
    }).fiches[0];
    expect(inverse.contenuSha256).toBe(base.contenuSha256);
  });

  it('empreinte déterministe : change si une dose change', () => {
    const base = parseSupplementIngestPayload({ fiches: [ficheBrute()] }).fiches[0];
    const doseModifiee = parseSupplementIngestPayload({
      fiches: [
        ficheBrute({
          compositions: [
            { ingredientId: 'ing_magnesium', formeId: 'forme_bisglycinate', doseParPortion: 200, unite: 'mg', position: 0 },
            { ingredientId: 'ing_vitamine_b6', doseParPortion: 1.4, unite: 'mg', position: 1 },
          ],
        }),
      ],
    }).fiches[0];
    expect(doseModifiee.contenuSha256).not.toBe(base.contenuSha256);
  });

  it('empreinte indépendante des champs de cycle de vie (statut, signataire)', () => {
    const propre: Omit<SupplementFicheInput, 'contenuSha256'> = {
      nomCommercial: 'X',
      marque: 'Y',
      marche: 'FR',
      sourceProvenance: 'dgccrf',
      sourceIdentifiant: 'dgccrf-1',
      sourceUrl: undefined,
      niveauCompletude: 'lacunaire',
      donneesManquantes: [],
      incertitudes: undefined,
      labels: [],
      allergenes: [],
      excipients: [],
      compositions: [],
    };
    const pollue = { ...propre, statutFiche: 'verifiee', verifiePar: 'praticien' } as unknown as Omit<
      SupplementFicheInput,
      'contenuSha256'
    >;
    expect(contenuSha256ForFiche(pollue)).toBe(contenuSha256ForFiche(propre));
  });
});
