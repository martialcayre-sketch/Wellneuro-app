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
      { ingredientId: 'ing_magnesium', formeId: 'forme_bisglycinate', doseParDjr: 300, unite: 'mg', position: 0 },
      { ingredientId: 'ing_vitamine_b6', doseParDjr: 1.4, unite: 'mg', position: 1 },
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

  // L'empreinte sérialise ses CLÉS : les renommer change le hash. Le renommage
  // `doseParPortion` → `doseParDjr` (2026-07-31) a pu être répercuté ici sans
  // coût, et le test suivant dit pourquoi. Valeur calculée par une
  // implémentation indépendante ; elle ne doit plus bouger sans décision.
  it('empreinte FIGÉE : la valeur exacte ne change pas au gré des renommages', () => {
    const payload = parseSupplementIngestPayload({ fiches: [ficheBrute()] });
    expect(payload.fiches[0].contenuSha256).toBe(
      '5e738fd10391be7bceae6e4c83cb42e83da030eb764859895c82e3bc3fb95ca2',
    );
  });

  // La fenêtre qui a rendu le renommage gratuit, et qui se referme. Les 140 148
  // fiches en base ont TOUTES été ingérées avec `compositions: []` : le JSON
  // haché y contient `"composition":[]`, et aucun nom de clé de composition n'y
  // figure. Aucune empreinte stockée n'a donc bougé. Dès la première
  // composition écrite, ce test décrira encore la vérité mais le renommage,
  // lui, coûtera 140 148 fiches « modifiées » sans qu'aucune formulation ait
  // changé.
  it('une fiche SANS composition garde l’empreinte qu’elle avait AVANT le renommage', () => {
    const sansComposition = parseSupplementIngestPayload({
      fiches: [ficheBrute({ compositions: [] })],
    });
    // Valeur produite par le code d'AVANT le renommage, et inchangée après :
    // c'est la preuve que les empreintes stockées n'ont pas bougé.
    expect(sansComposition.fiches[0].contenuSha256).toBe(
      '81d3aafbc108bd10b712da829b064fa686261f281c1ab1270f051d452b5b464e',
    );
  });

  // Les 21 805 lignes de micro-organismes de Compl'Alim portent une quantité
  // sans unité (l'UFC y est implicite) : sans cette unité au vocabulaire, le
  // CHECK qui apparie dose et unité n'a d'autre issue que de jeter la dose.
  it('accepte UFC — sinon 21 478 dosages probiotiques sont inécrivables', () => {
    const fiche = ficheBrute({
      compositions: [{ ingredientId: 'ing_l_rhamnosus', doseParDjr: 2e9, unite: 'UFC' }],
    });
    const payload = parseSupplementIngestPayload({ fiches: [fiche] });
    expect(payload.fiches[0].compositions[0]).toMatchObject({ doseParDjr: 2e9, unite: 'UFC' });
  });

  // `ml` minuscule couvre 19 330 lignes de la source. La base n'admet qu'une
  // graphie : c'est à l'import de normaliser, pas au vocabulaire de s'élargir.
  it('refuse `ml` minuscule — la normalisation est le travail de l’import', () => {
    const fiche = ficheBrute({
      compositions: [{ ingredientId: 'ing_x', doseParDjr: 10, unite: 'ml' }],
    });
    expect(() => parseSupplementIngestPayload({ fiches: [fiche] })).toThrow(/unite.*hors vocabulaire/);
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
      compositions: [{ ingredientId: 'ing_x', doseParDjr: 10, unite: 'cuillère' }],
    });
    expect(() => parseSupplementIngestPayload({ fiches: [fiche] })).toThrow(/unite.*hors vocabulaire/);
  });

  it('refuse une dose sans unité (et réciproquement)', () => {
    const doseSeule = ficheBrute({ compositions: [{ ingredientId: 'ing_x', doseParDjr: 10 }] });
    expect(() => parseSupplementIngestPayload({ fiches: [doseSeule] })).toThrow(/dose et unité/);
    const uniteSeule = ficheBrute({ compositions: [{ ingredientId: 'ing_x', unite: 'mg' }] });
    expect(() => parseSupplementIngestPayload({ fiches: [uniteSeule] })).toThrow(/dose et unité/);
  });

  it('refuse une composition en double (même ingrédient + forme)', () => {
    const fiche = ficheBrute({
      compositions: [
        { ingredientId: 'ing_x', doseParDjr: 10, unite: 'mg' },
        { ingredientId: 'ing_x', doseParDjr: 20, unite: 'mg' },
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
            { ingredientId: 'ing_vitamine_b6', doseParDjr: 1.4, unite: 'mg', position: 1 },
            { ingredientId: 'ing_magnesium', formeId: 'forme_bisglycinate', doseParDjr: 300, unite: 'mg', position: 0 },
          ],
        }),
      ],
    }).fiches[0];
    expect(inverse.contenuSha256).toBe(base.contenuSha256);
  });

  // Revue #352 R1 : l'ordre inversé SANS position explicite (parseComposition
  // assigne alors position = index) doit produire le même hash — position est
  // exclue de l'empreinte.
  it('empreinte déterministe : ordre inversé sans position explicite', () => {
    const base = parseSupplementIngestPayload({
      fiches: [ficheBrute({
        compositions: [
          { ingredientId: 'ing_magnesium', formeId: 'forme_bisglycinate', doseParDjr: 300, unite: 'mg' },
          { ingredientId: 'ing_vitamine_b6', doseParDjr: 1.4, unite: 'mg' },
        ],
      })],
    }).fiches[0];
    const inverse = parseSupplementIngestPayload({
      fiches: [ficheBrute({
        compositions: [
          { ingredientId: 'ing_vitamine_b6', doseParDjr: 1.4, unite: 'mg' },
          { ingredientId: 'ing_magnesium', formeId: 'forme_bisglycinate', doseParDjr: 300, unite: 'mg' },
        ],
      })],
    }).fiches[0];
    expect(inverse.contenuSha256).toBe(base.contenuSha256);
  });

  // Invariant n°11 contre entrée HOSTILE : un payload qui tente d'injecter un
  // statut vérifié, un signataire, ou une empreinte cliente est neutralisé —
  // les champs de cycle de vie ne sont jamais lus du payload, le hash est
  // recalculé serveur (revue #352, T1).
  it('neutralise un payload hostile (statut vérifié, signataire, hash client)', () => {
    const hostile = parseSupplementIngestPayload({
      fiches: [ficheBrute({
        statutFiche: 'verifiee',
        verifiePar: 'attaquant@example.com',
        verifieLe: '2020-01-01T00:00:00.000Z',
        dateDerniereVerification: '2020-01-01T00:00:00.000Z',
        actif: false,
        contenuSha256: 'f'.repeat(64),
      })],
    }).fiches[0];
    const propre = parseSupplementIngestPayload({ fiches: [ficheBrute()] }).fiches[0];
    // Le hash est celui recalculé serveur (identique à la fiche propre), jamais
    // celui fourni par le client.
    expect(hostile.contenuSha256).toBe(propre.contenuSha256);
    expect(hostile.contenuSha256).not.toBe('f'.repeat(64));
    // Aucun champ de cycle de vie n'a survécu au parse.
    const brut = hostile as unknown as Record<string, unknown>;
    expect(brut.statutFiche).toBeUndefined();
    expect(brut.verifiePar).toBeUndefined();
    expect(brut.verifieLe).toBeUndefined();
    expect(brut.dateDerniereVerification).toBeUndefined();
  });

  it('empreinte déterministe : change si une dose change', () => {
    const base = parseSupplementIngestPayload({ fiches: [ficheBrute()] }).fiches[0];
    const doseModifiee = parseSupplementIngestPayload({
      fiches: [
        ficheBrute({
          compositions: [
            { ingredientId: 'ing_magnesium', formeId: 'forme_bisglycinate', doseParDjr: 200, unite: 'mg', position: 0 },
            { ingredientId: 'ing_vitamine_b6', doseParDjr: 1.4, unite: 'mg', position: 1 },
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
