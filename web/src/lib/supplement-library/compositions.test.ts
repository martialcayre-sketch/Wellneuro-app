// Banc du chemin d'ÉCRITURE des compositions. Il n'existait pas : 446 lignes
// décidaient de 138 728 écritures sans un seul test, quand ses deux frères
// (`ingest.test.ts`, `referentiel.test.ts`) en ont chacun un. Même patron
// qu'eux — Prisma mocké, aucune base, aucune donnée patient.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, tx, modelesTouches } = vi.hoisted(() => {
  const modeles = {
    supplementProduct: { findFirst: vi.fn(), update: vi.fn() },
    supplementProductComposition: { findMany: vi.fn(), create: vi.fn() },
    supplementIngredient: { findFirst: vi.fn() },
    supplementIngredientForme: { findFirst: vi.fn() },
  };
  // Le `tx` remis à `ingestCompositions` ENREGISTRE les modèles qu'on lui
  // demande. `Object.keys(tx)` ne disait que ce que le mock déclare — une
  // tautologie de forme. Ce Proxy dit ce que le code a réellement TOUCHÉ, ce
  // qui est la seule chose que la garde « aucune table de jugement clinique »
  // prétend vérifier.
  const modelesTouches = new Set<string>();
  const tx = new Proxy(modeles, {
    get(cible, prop, recepteur) {
      if (typeof prop === 'string') modelesTouches.add(prop);
      return Reflect.get(cible, prop, recepteur);
    },
  });
  return {
    tx,
    modelesTouches,
    prisma: { $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)) },
  };
});
vi.mock('@/lib/prisma', () => ({ prisma }));

/** Les seuls modèles que cette voie a le droit de toucher. */
const MODELES_AUTORISES = [
  'supplementIngredient',
  'supplementIngredientForme',
  'supplementProduct',
  'supplementProductComposition',
];

import {
  CompositionsPayloadInvalide,
  ingestCompositions,
  parseCompositionsPayload,
} from '@/lib/supplement-library/compositions';

const LIGNE = {
  ingredientSourceIdentifiant: 'substance:348',
  formeSourceIdentifiant: null,
  doseParDjr: 500,
  unite: 'mg',
  position: 0,
};

const produit = (over: Record<string, unknown> = {}) => ({
  sourceIdentifiant: '12345',
  sourceLignes: 1,
  lignes: [{ ...LIGNE }],
  ...over,
});

const payload = (over: Record<string, unknown> = {}) => ({
  provenance: 'complalim',
  produits: [produit()],
  ...over,
});

describe('parseCompositionsPayload — refus nommés', () => {
  it('accepte un lot conforme, versionFormulation OMISE', () => {
    const p = parseCompositionsPayload(payload());
    expect(p.provenance).toBe('complalim');
    // L'omission n'est pas une erreur : elle vaut « la version courante », et
    // c'est le cas NOMINAL. Le numéro explicite est le cas de reprise.
    expect(p.produits[0].versionFormulation).toBeNull();
    expect(p.produits[0].lignes).toHaveLength(1);
  });

  it('conserve une versionFormulation explicite — elle fait autorité', () => {
    const p = parseCompositionsPayload(payload({ produits: [produit({ versionFormulation: 4 })] }));
    expect(p.produits[0].versionFormulation).toBe(4);
  });

  it.each([
    ['payload non-objet', 'nope'],
    ['provenance absente', { produits: [produit()] }],
    ['produits absent', { provenance: 'complalim' }],
    ['produits vide', { provenance: 'complalim', produits: [] }],
    ['produits non-tableau', { provenance: 'complalim', produits: {} }],
    ['sourceIdentifiant absent', payload({ produits: [{ sourceLignes: 0, lignes: [] }] })],
    ['sourceLignes absent', payload({ produits: [{ sourceIdentifiant: '1', lignes: [] }] })],
    ['lignes non-tableau', payload({ produits: [produit({ lignes: 'nope' })] })],
  ])('refuse : %s', (_titre, brut) => {
    expect(() => parseCompositionsPayload(brut)).toThrow(CompositionsPayloadInvalide);
  });

  it('refuse une provenance hors vocabulaire, en la nommant', () => {
    expect(() => parseCompositionsPayload(payload({ provenance: 'wikipedia' }))).toThrow(
      /wikipedia.*hors vocabulaire/i,
    );
  });

  it('refuse « saisie_praticien » : cette voie est un import EXTERNE', () => {
    // Laisser un porteur du secret estampiller ses lignes « saisie praticien »
    // leur donnerait, à la lecture, l'autorité d'un geste signé.
    expect(() => parseCompositionsPayload(payload({ provenance: 'saisie_praticien' }))).toThrow(
      /hors vocabulaire/,
    );
  });

  it('refuse une versionFormulation présente mais < 1 — omettre et se tromper diffèrent', () => {
    expect(() => parseCompositionsPayload(payload({ produits: [produit({ versionFormulation: 0 })] }))).toThrow(
      /versionFormulation/,
    );
  });

  it('refuse au-delà de SUPPLEMENTS_MAX_BATCH_SIZE produits', () => {
    const produits = Array.from({ length: 501 }, (_, i) => produit({ sourceIdentifiant: String(i) }));
    expect(() => parseCompositionsPayload(payload({ produits }))).toThrow(/découper en lots/);
  });

  it('refuse au-delà de la borne de LIGNES, même sous la borne de produits', () => {
    // Deux produits seulement — la borne de produits ne mord pas —, mais 5 200
    // lignes. Borner une seule des deux grandeurs laisse passer un lot que
    // l'écriture ne tiendrait pas.
    const gros = (id: string) =>
      produit({
        sourceIdentifiant: id,
        sourceLignes: 2600,
        lignes: Array.from({ length: 2600 }, (_, i) => ({
          ...LIGNE,
          ingredientSourceIdentifiant: `substance:${i}`,
          position: i,
        })),
      });
    expect(() => parseCompositionsPayload(payload({ produits: [gros('a'), gros('b')] }))).toThrow(
      /5200 lignes.*découper en lots/,
    );
  });

  it('refuse un doublon de produit DANS le lot', () => {
    expect(() =>
      parseCompositionsPayload(payload({ produits: [produit(), produit()] })),
    ).toThrow(/apparaît deux fois dans le lot/);
  });

  it('refuse un même produit présent AVEC et SANS versionFormulation', () => {
    // « Courante » désigne une des versions explicites, on ne sait pas laquelle
    // avant d'avoir lu le pointeur : les deux entrées viseraient peut-être la
    // même ligne, et la seconde repartirait en « divergente » sans raison
    // lisible.
    expect(() =>
      parseCompositionsPayload(payload({ produits: [produit(), produit({ versionFormulation: 2 })] })),
    ).toThrow(/avec ET sans versionFormulation/);
  });

  it('accepte le même produit sous DEUX versions explicites distinctes', () => {
    const p = parseCompositionsPayload(
      payload({ produits: [produit({ versionFormulation: 1 }), produit({ versionFormulation: 2 })] }),
    );
    expect(p.produits.map((x) => x.versionFormulation)).toEqual([1, 2]);
  });

  it('refuse deux lignes de même (ingrédient, forme) pour un produit', () => {
    // Aucune fusion n'est honnête : additionner inventerait une quantité, en
    // jeter une en perdrait une.
    expect(() =>
      parseCompositionsPayload(
        payload({
          produits: [produit({ sourceLignes: 2, lignes: [{ ...LIGNE }, { ...LIGNE, position: 1 }] })],
        }),
      ),
    ).toThrow(/apparaît deux fois pour ce produit/);
  });

  it('refuse plus de lignes écrites que la source n’en déclare', () => {
    // Le dénominateur ne peut pas être plus petit que le numérateur : sinon la
    // preuve d'intégrité dépasse 100 % et un produit incomplet passe intègre.
    expect(() => parseCompositionsPayload(payload({ produits: [produit({ sourceLignes: 0 })] }))).toThrow(
      /dénominateur ne peut pas être plus petit/,
    );
  });

  it('accepte sourceLignes STRICTEMENT supérieur : c’est le cas partiel', () => {
    const p = parseCompositionsPayload(payload({ produits: [produit({ sourceLignes: 9 })] }));
    expect(p.produits[0].sourceLignes).toBe(9);
  });

  it.each([
    ['dose sans unité', { doseParDjr: 500, unite: null }],
    ['unité sans dose', { doseParDjr: null, unite: 'mg' }],
  ])('refuse la paire dépareillée : %s', (_titre, over) => {
    expect(() =>
      parseCompositionsPayload(payload({ produits: [produit({ lignes: [{ ...LIGNE, ...over }] })] })),
    ).toThrow(/dose et unité vont par paire/);
  });

  it('accepte une ligne SANS dose ni unité — l’absence des deux est licite', () => {
    const p = parseCompositionsPayload(
      payload({ produits: [produit({ lignes: [{ ...LIGNE, doseParDjr: null, unite: null }] })] }),
    );
    expect(p.produits[0].lignes[0]).toMatchObject({ doseParDjr: null, unite: null });
  });

  it('refuse une unité hors vocabulaire', () => {
    expect(() =>
      parseCompositionsPayload(payload({ produits: [produit({ lignes: [{ ...LIGNE, unite: 'cuillère' }] })] })),
    ).toThrow(/hors vocabulaire/);
  });

  it('refuse une dose négative', () => {
    expect(() =>
      parseCompositionsPayload(payload({ produits: [produit({ lignes: [{ ...LIGNE, doseParDjr: -1 }] })] })),
    ).toThrow(/nombre fini positif/);
  });

  it('refuse un identifiant d’ingrédient sans espace de noms', () => {
    // La substance 356 et la plante 356 sont deux ingrédients sans rapport ;
    // seul le préfixe les distingue.
    expect(() =>
      parseCompositionsPayload(
        payload({ produits: [produit({ lignes: [{ ...LIGNE, ingredientSourceIdentifiant: '356' }] })] }),
      ),
    ).toThrow(/ne respecte pas le format attendu/);
  });

  // SUPPRIMÉ : « CompositionsPayloadInvalide ne porte AUCUN bilan partiel ».
  // Il construisait l'erreur et relisait ses propres clés — une tautologie de
  // forme, qui ne visitait jamais l'état du défaut. Ce que le lot promet
  // réellement, c'est qu'un 422 ne rende AUCUN inventaire : c'est le corps de
  // la réponse qui le prouve, et `route.test.ts` le vérifie sur un vrai refus
  // (`expect(Object.keys(json)).toEqual(['error'])`). Un test qui ne peut pas
  // rougir vaut moins que pas de test.

  it('refuse une forme mal formée, mais accepte `null`', () => {
    expect(() =>
      parseCompositionsPayload(
        payload({ produits: [produit({ lignes: [{ ...LIGNE, formeSourceIdentifiant: 'forme-86' }] })] }),
      ),
    ).toThrow(/formeSourceIdentifiant/);
    expect(parseCompositionsPayload(payload()).produits[0].lignes[0].formeSourceIdentifiant).toBeNull();
  });
});

describe('ingestCompositions — écriture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    modelesTouches.clear();
    tx.supplementProduct.findFirst.mockResolvedValue({
      id: 'prod_1',
      versionFormulation: 3,
      statutFiche: 'importee',
      compositionSourceLignes: 1,
    });
    tx.supplementProductComposition.findMany.mockResolvedValue([]);
    tx.supplementIngredient.findFirst.mockResolvedValue({ id: 'ing_1' });
    tx.supplementIngredientForme.findFirst.mockResolvedValue({ id: 'forme_1' });
    tx.supplementProductComposition.create.mockResolvedValue({});
    tx.supplementProduct.update.mockResolvedValue({});
  });

  it('version OMISE → le produit est cherché par le POINTEUR de version courante', async () => {
    // Le catalogue ne sert que la version pointée (`construireWhere`,
    // catalogue.ts) et l'ingestion INCRÉMENTE la version à chaque changement de
    // contenu. Chercher par un numéro en dur écrirait sur une ligne que plus
    // personne ne lit : succès compté, fiche restée coquille.
    await ingestCompositions(parseCompositionsPayload(payload()));
    expect(tx.supplementProduct.findFirst.mock.calls[0][0].where).toEqual({
      sourceProvenance: 'complalim',
      sourceIdentifiant: '12345',
      versionCourante: { isNot: null },
    });
  });

  it('version EXPLICITE → recherche par numéro, sans passer par le pointeur', async () => {
    await ingestCompositions(parseCompositionsPayload(payload({ produits: [produit({ versionFormulation: 2 })] })));
    expect(tx.supplementProduct.findFirst.mock.calls[0][0].where).toEqual({
      sourceProvenance: 'complalim',
      sourceIdentifiant: '12345',
      versionFormulation: 2,
    });
  });

  it('écrit les lignes ET le dénominateur dans la MÊME transaction', async () => {
    const bilan = await ingestCompositions(
      parseCompositionsPayload(
        payload({
          produits: [
            produit({
              sourceLignes: 7,
              lignes: [
                { ...LIGNE },
                { ...LIGNE, ingredientSourceIdentifiant: 'plante:12', position: 1 },
              ],
            }),
          ],
        }),
      ),
    );

    expect(bilan.produitsEcrits).toBe(1);
    expect(bilan.lignesCreees).toBe(2);
    expect(tx.supplementProductComposition.create).toHaveBeenCalledTimes(2);
    // Le dénominateur part avec les lignes : écrit à part, il existerait une
    // fenêtre où la fiche annonce 7 lignes déclarées et n'en porte aucune.
    expect(tx.supplementProduct.update).toHaveBeenCalledWith({
      where: { id: 'prod_1' },
      data: { compositionSourceLignes: 7 },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('fiche INACTIVE → sautée et NOMMÉE, jamais comptée comme écrite', async () => {
    // Le catalogue pose DEUX conditions (`construireWhere`) : le pointeur de
    // version courante ET `statutFiche != 'inactive'`. N'en garder qu'une
    // écrivait une composition sur une fiche que plus aucun écran ne sert :
    // `produitsEcrits` la comptait, personne ne la lisait — exactement l'échec
    // silencieux que ce critère existe pour fermer.
    tx.supplementProduct.findFirst.mockResolvedValue({
      id: 'prod_1',
      versionFormulation: 3,
      statutFiche: 'inactive',
      compositionSourceLignes: null,
    });

    const bilan = await ingestCompositions(parseCompositionsPayload(payload()));

    expect(bilan.produitsEcrits).toBe(0);
    expect(bilan.lignesCreees).toBe(0);
    expect(tx.supplementProductComposition.create).not.toHaveBeenCalled();
    expect(tx.supplementProduct.update).not.toHaveBeenCalled();
    // Nommée, et pour sa VRAIE cause : « fiche inactive » et « aucune fiche en
    // base » appellent deux gestes de reprise différents.
    expect(bilan.produitsIncomplets[0]).toMatch(/^12345#3 : fiche « inactive » — le catalogue ne la sert pas/);
  });

  it('produit absent en base → rapporté, jamais créé', async () => {
    tx.supplementProduct.findFirst.mockResolvedValue(null);
    const bilan = await ingestCompositions(parseCompositionsPayload(payload()));

    expect(bilan.produitsEcrits).toBe(0);
    expect(bilan.produitsIncomplets).toEqual(['12345#courante : aucune fiche produit en base.']);
    expect(tx.supplementProductComposition.create).not.toHaveBeenCalled();
    expect(tx.supplementProduct.update).not.toHaveBeenCalled();
  });

  it('un ingrédient manquant saute le produit ENTIER — pas une seule ligne écrite', async () => {
    // La règle qui compte : une composition partielle ne se distingue pas d'une
    // complète, et la sentinelle de cumul sommerait sur un sous-ensemble en
    // croyant tenir le tout — une alerte manquerait, dans le sens rassurant.
    tx.supplementIngredient.findFirst
      .mockResolvedValueOnce({ id: 'ing_1' })
      .mockResolvedValueOnce(null);

    const bilan = await ingestCompositions(
      parseCompositionsPayload(
        payload({
          produits: [
            produit({
              sourceLignes: 2,
              lignes: [{ ...LIGNE }, { ...LIGNE, ingredientSourceIdentifiant: 'plante:12', position: 1 }],
            }),
          ],
        }),
      ),
    );

    expect(bilan.produitsEcrits).toBe(0);
    expect(bilan.lignesCreees).toBe(0);
    expect(tx.supplementProductComposition.create).not.toHaveBeenCalled();
    expect(tx.supplementProduct.update).not.toHaveBeenCalled();
    // Nommé par sa version RÉSOLUE (3), pas par « courante » : le bilan doit
    // dire sur quelle ligne on aurait écrit.
    expect(bilan.produitsIncomplets[0]).toMatch(/^12345#3 : ingrédient plante:12 absent du référentiel\.$/);
  });

  it('une forme manquante saute aussi le produit entier', async () => {
    tx.supplementIngredientForme.findFirst.mockResolvedValue(null);
    const bilan = await ingestCompositions(
      parseCompositionsPayload(
        payload({
          produits: [produit({ lignes: [{ ...LIGNE, formeSourceIdentifiant: 'form_of_supply:86' }] })],
        }),
      ),
    );
    expect(bilan.lignesCreees).toBe(0);
    expect(bilan.produitsIncomplets[0]).toMatch(/forme form_of_supply:86 sous substance:348 absent/);
  });

  it('IDEMPOTENCE : rejouer le même lot rend « inchangé » et ne duplique aucune ligne', async () => {
    tx.supplementProductComposition.findMany.mockResolvedValue([
      { ingredientId: 'ing_1', formeId: null, doseParDjr: 500, unite: 'mg' },
    ]);

    const bilan = await ingestCompositions(parseCompositionsPayload(payload()));

    expect(bilan.produitsInchanges).toBe(1);
    expect(bilan.produitsEcrits).toBe(0);
    expect(bilan.lignesCreees).toBe(0);
    expect(bilan.produitsDivergents).toEqual([]);
    expect(tx.supplementProductComposition.create).not.toHaveBeenCalled();
    // Ni réécriture du dénominateur : il est DÉJÀ juste (1 en base, 1 déclaré).
    // Rien n'a bougé, rien ne s'écrit.
    expect(bilan.produitsDenominateurCorrige).toBe(0);
    expect(tx.supplementProduct.update).not.toHaveBeenCalled();
  });

  it('REJEU RÉPARATEUR : mêmes lignes, dénominateur divergent → le champ est corrigé', async () => {
    // Sans ce chemin, un dénominateur écrit faux était DÉFINITIF : le rejeu
    // revenait en `produitsInchanges` sans toucher au champ, et l'append-only
    // interdisait de reprendre les lignes. Un `integre` faux à l'écran —
    // « Compatible », « Aucun cumul » — serait resté faux pour toujours.
    //
    // `compositionSourceLignes` est une colonne SCALAIRE du produit, pas une
    // ligne de composition : la corriger ne viole aucun append-only.
    tx.supplementProduct.findFirst.mockResolvedValue({
      id: 'prod_1',
      versionFormulation: 3,
      statutFiche: 'importee',
      compositionSourceLignes: 1, // écrit à 1 par un transport fautif…
    });
    tx.supplementProductComposition.findMany.mockResolvedValue([
      { ingredientId: 'ing_1', formeId: null, doseParDjr: 500, unite: 'mg' },
    ]);

    // …alors que la source en déclare 2 (une ligne perdue sur un doublon
    // divergent). Les LIGNES, elles, sont identiques.
    const bilan = await ingestCompositions(parseCompositionsPayload(payload({ produits: [produit({ sourceLignes: 2 })] })));

    expect(bilan.produitsInchanges).toBe(1);
    expect(bilan.produitsDenominateurCorrige).toBe(1);
    expect(bilan.produitsEcrits).toBe(0);
    expect(bilan.lignesCreees).toBe(0);
    // Aucune ligne réécrite — c'est bien le seul champ qui bouge.
    expect(tx.supplementProductComposition.create).not.toHaveBeenCalled();
    expect(tx.supplementProduct.update).toHaveBeenCalledWith({
      where: { id: 'prod_1' },
      data: { compositionSourceLignes: 2 },
    });
  });

  it('un dénominateur divergent sur une composition DIVERGENTE n’est pas corrigé', async () => {
    // Le numérateur lui-même est en litige : corriger le dénominateur seul
    // fabriquerait un rapport entre deux grandeurs qui ne se correspondent pas.
    // On saute, et on rapporte — comme pour les lignes.
    tx.supplementProductComposition.findMany.mockResolvedValue([
      { ingredientId: 'ing_1', formeId: null, doseParDjr: 250, unite: 'mg' },
    ]);

    const bilan = await ingestCompositions(parseCompositionsPayload(payload({ produits: [produit({ sourceLignes: 2 })] })));

    expect(bilan.produitsDenominateurCorrige).toBe(0);
    expect(tx.supplementProduct.update).not.toHaveBeenCalled();
    expect(bilan.produitsDivergents).toHaveLength(1);
  });

  it('une composition DIVERGENTE est sautée et rapportée, jamais écrasée', async () => {
    // Append-only : écraser ferait muter, sous les yeux de la sentinelle de
    // cumul, une composition qu'un praticien a peut-être déjà lue. Une
    // reformulation se dépose sous une nouvelle versionFormulation.
    tx.supplementProductComposition.findMany.mockResolvedValue([
      { ingredientId: 'ing_1', formeId: null, doseParDjr: 250, unite: 'mg' },
    ]);

    const bilan = await ingestCompositions(parseCompositionsPayload(payload()));

    expect(bilan.produitsInchanges).toBe(0);
    expect(bilan.produitsEcrits).toBe(0);
    expect(tx.supplementProductComposition.create).not.toHaveBeenCalled();
    expect(tx.supplementProduct.update).not.toHaveBeenCalled();
    expect(bilan.produitsDivergents[0]).toMatch(/^12345#3 : 1 ligne\(s\) déjà écrites, 1 proposée\(s\)/);
  });

  it('n’écrit dans AUCUNE table de jugement clinique — sur TOUTES les branches', async () => {
    // L'assertion précédente portait sur les clés du MOCK (`Object.keys(tx)`) :
    // une tautologie de forme, qui aurait été verte quoi que fasse le code. Et
    // elle ne parcourait que le chemin nominal — une écriture clinique posée
    // dans la branche divergente, inchangée ou incomplète serait passée.
    //
    // Ici, `tx` enregistre chaque modèle réellement demandé, et les SIX
    // branches sont parcourues. Toucher `supplementSafetyAlert`,
    // `clinicalRule` ou `ingredientFunctionalThreshold` où que ce soit ferait
    // apparaître le nom dans l'ensemble.
    const rejouer = () => ingestCompositions(parseCompositionsPayload(payload()));

    // 1. Nominal — écriture complète.
    await rejouer();

    // 2. Inchangé, dénominateur déjà juste.
    tx.supplementProductComposition.findMany.mockResolvedValue([
      { ingredientId: 'ing_1', formeId: null, doseParDjr: 500, unite: 'mg' },
    ]);
    await rejouer();

    // 3. Inchangé, dénominateur corrigé.
    await ingestCompositions(parseCompositionsPayload(payload({ produits: [produit({ sourceLignes: 4 })] })));

    // 4. Divergent.
    tx.supplementProductComposition.findMany.mockResolvedValue([
      { ingredientId: 'ing_1', formeId: null, doseParDjr: 250, unite: 'mg' },
    ]);
    await rejouer();

    // 5. Fiche inactive.
    tx.supplementProductComposition.findMany.mockResolvedValue([]);
    tx.supplementProduct.findFirst.mockResolvedValue({
      id: 'prod_1',
      versionFormulation: 3,
      statutFiche: 'inactive',
      compositionSourceLignes: null,
    });
    await rejouer();

    // 6. Produit absent en base.
    tx.supplementProduct.findFirst.mockResolvedValue(null);
    await rejouer();

    expect([...modelesTouches].sort()).toEqual(MODELES_AUTORISES);
  });
});
