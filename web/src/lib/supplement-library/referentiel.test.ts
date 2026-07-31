import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, tx } = vi.hoisted(() => {
  const tx = {
    supplementIngredient: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    supplementIngredientForme: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    clinicalRule: { create: vi.fn(), update: vi.fn() },
    ingredientFunctionalThreshold: { create: vi.fn(), update: vi.fn() },
    supplementSafetyAlert: { create: vi.fn(), update: vi.fn() },
  };
  return { tx, prisma: { $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)) } };
});
vi.mock('@/lib/prisma', () => ({ prisma }));

import {
  ReferentielPayloadInvalide,
  ingestReferentiel,
  parseReferentielPayload,
} from '@/lib/supplement-library/referentiel';

/** Le cas d'ancrage : un libellé dont la LECTURE conduirait au mauvais nutriment. */
const SELENIUM = {
  sourceIdentifiant: 'substance:303',
  code: 'selenium',
  nomFr: 'sélénium',
  formes: [
    { sourceIdentifiant: 'form_of_supply:86', code: 'hydrogenoselenite-de-sodium', labelFr: 'Hydrogénosélénite de sodium' },
    { sourceIdentifiant: 'form_of_supply:122', code: 'l-selenomethionine', labelFr: 'L-sélénométhionine' },
  ],
};
const payload = (over: Record<string, unknown> = {}) => ({ provenance: 'complalim', ingredients: [SELENIUM], ...over });

describe('parseReferentielPayload', () => {
  it('accepte un lot conforme', () => {
    const p = parseReferentielPayload(payload());
    expect(p.provenance).toBe('complalim');
    expect(p.ingredients[0].formes).toHaveLength(2);
  });

  it('accepte un ingrédient sans aucune forme', () => {
    expect(parseReferentielPayload(payload({ ingredients: [{ ...SELENIUM, formes: [] }] })).ingredients[0].formes)
      .toEqual([]);
  });

  it.each([
    ['payload non-objet', 'nope'],
    ['provenance absente', { ingredients: [SELENIUM] }],
    ['ingredients absent', { provenance: 'complalim' }],
    ['ingredients vide', { provenance: 'complalim', ingredients: [] }],
  ])('refuse : %s', (_titre, brut) => {
    expect(() => parseReferentielPayload(brut)).toThrow(ReferentielPayloadInvalide);
  });

  it('refuse une provenance hors vocabulaire, en la nommant', () => {
    expect(() => parseReferentielPayload(payload({ provenance: 'wikipedia' })))
      .toThrow(/wikipedia.*hors vocabulaire/i);
  });

  it('EXIGE un espace de noms dans l’identifiant source', () => {
    // Sans lui, la substance 303 et la plante 303 collisionnent sur l'index
    // unique : deux ingrédients sans rapport fusionneraient en silence.
    expect(() => parseReferentielPayload(payload({ ingredients: [{ ...SELENIUM, sourceIdentifiant: '303' }] })))
      .toThrow(/sourceIdentifiant/);
  });

  it('refuse un code non lisible (ce sont les règles cliniques qui le manipulent)', () => {
    expect(() => parseReferentielPayload(payload({ ingredients: [{ ...SELENIUM, code: 'Sélénium !' }] })))
      .toThrow(/code/);
  });

  it('refuse un identifiant en double DANS le lot', () => {
    // Sinon l'écriture échoue à mi-parcours sur l'index unique, sans dire pourquoi.
    expect(() => parseReferentielPayload(payload({ ingredients: [SELENIUM, { ...SELENIUM, code: 'autre' }] })))
      .toThrow(/deux fois dans le lot/);
  });

  it('refuse un code en double DANS le lot', () => {
    expect(() => parseReferentielPayload(payload({
      ingredients: [SELENIUM, { ...SELENIUM, sourceIdentifiant: 'substance:999' }],
    }))).toThrow(/deux fois dans le lot/);
  });

  it('refuse deux formes de même code pour un même ingrédient', () => {
    expect(() => parseReferentielPayload(payload({
      ingredients: [{ ...SELENIUM, formes: [SELENIUM.formes[0], { ...SELENIUM.formes[1], code: SELENIUM.formes[0].code }] }],
    }))).toThrow(/deux fois pour le même ingrédient/);
  });

  it('refuse un lot au-delà de la taille maximale', () => {
    const gros = Array.from({ length: 501 }, (_, i) => ({
      ...SELENIUM, sourceIdentifiant: `substance:${i}`, code: `code-${i}`,
    }));
    expect(() => parseReferentielPayload(payload({ ingredients: gros }))).toThrow(/découper en lots/);
  });
});

describe('ingestReferentiel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tx.supplementIngredient.findFirst.mockResolvedValue(null);
    tx.supplementIngredient.findUnique.mockResolvedValue(null);
    tx.supplementIngredient.create.mockResolvedValue({ id: 'ing_se' });
    tx.supplementIngredientForme.findUnique.mockResolvedValue(null);
  });

  it('crée l’ingrédient et ses formes, avec leur provenance', async () => {
    const bilan = await ingestReferentiel(parseReferentielPayload(payload()));
    expect(bilan).toMatchObject({ ok: true, ingredientsCrees: 1, formesCreees: 2 });
    expect(tx.supplementIngredient.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        sourceProvenance: 'complalim', sourceIdentifiant: 'substance:303', code: 'selenium',
      }),
    }));
  });

  it('rattache la forme à l’ingrédient DONNÉ, jamais à ce que son libellé suggère', async () => {
    // Ancrage clinique du lot. « Hydrogénosélénite de sodium » se lit
    // « sodium » ; le nutriment est le SÉLÉNIUM. Le service suit la relation
    // officielle reçue, il ne relit pas le libellé — sans quoi on reproduirait
    // l'erreur que la source, elle, ne commet pas.
    await ingestReferentiel(parseReferentielPayload(payload()));
    const formes = tx.supplementIngredientForme.create.mock.calls.map(([a]) => a.data);
    expect(formes).toHaveLength(2);
    for (const f of formes) expect(f.ingredientId).toBe('ing_se');
    expect(formes.map((f) => f.labelFr)).toContain('Hydrogénosélénite de sodium');
  });

  it('est IDEMPOTENT : rejouer le même lot n’écrit rien', async () => {
    tx.supplementIngredient.findFirst.mockResolvedValue({ id: 'ing_se', code: 'selenium', nomFr: 'sélénium' });
    tx.supplementIngredient.findUnique.mockResolvedValue({ id: 'ing_se', sourceProvenance: 'complalim', sourceIdentifiant: 'substance:303' });
    tx.supplementIngredientForme.findUnique.mockImplementation(async ({ where }) => ({
      id: `f_${where.ingredientId_code.code}`,
      labelFr: SELENIUM.formes.find((f) => f.code === where.ingredientId_code.code)!.labelFr,
      sourceIdentifiant: SELENIUM.formes.find((f) => f.code === where.ingredientId_code.code)!.sourceIdentifiant,
    }));

    const bilan = await ingestReferentiel(parseReferentielPayload(payload()));
    expect(bilan).toMatchObject({ ingredientsCrees: 0, ingredientsInchanges: 1, formesCreees: 0, formesInchangees: 2 });
    expect(tx.supplementIngredient.create).not.toHaveBeenCalled();
    expect(tx.supplementIngredient.update).not.toHaveBeenCalled();
    expect(tx.supplementIngredientForme.create).not.toHaveBeenCalled();
    expect(tx.supplementIngredientForme.update).not.toHaveBeenCalled();
  });

  it('met à jour un nom officiel qui a changé, sans recréer', async () => {
    tx.supplementIngredient.findFirst.mockResolvedValue({ id: 'ing_se', code: 'selenium', nomFr: 'ancien nom' });
    tx.supplementIngredient.findUnique.mockResolvedValue({ id: 'ing_se', sourceProvenance: 'complalim', sourceIdentifiant: 'substance:303' });
    const bilan = await ingestReferentiel(parseReferentielPayload(payload()));
    expect(bilan.ingredientsMisAJour).toBe(1);
    expect(tx.supplementIngredient.create).not.toHaveBeenCalled();
  });

  it('REFUSE de détourner un code déjà porté par une autre entrée', async () => {
    // Y compris une entrée saisie à la main par le praticien : la voie
    // d'ingestion n'écrase pas son travail, elle s'arrête et le nomme.
    tx.supplementIngredient.findFirst.mockResolvedValue(null);
    tx.supplementIngredient.findUnique.mockResolvedValue({
      id: 'ing_autre', sourceProvenance: null, sourceIdentifiant: null,
    });
    await expect(ingestReferentiel(parseReferentielPayload(payload())))
      .rejects.toThrow(/appartient déjà à une autre entrée/);
    expect(tx.supplementIngredient.create).not.toHaveBeenCalled();
  });

  it('n’écrit JAMAIS de jugement clinique — ni règle, ni seuil, ni alerte', async () => {
    // La frontière du lot : il pose le vocabulaire, pas le jugement.
    await ingestReferentiel(parseReferentielPayload(payload()));
    expect(tx.clinicalRule.create).not.toHaveBeenCalled();
    expect(tx.ingredientFunctionalThreshold.create).not.toHaveBeenCalled();
    expect(tx.supplementSafetyAlert.create).not.toHaveBeenCalled();
  });

  it('ne désactive ni ne supprime rien — un retrait est un geste praticien signé', async () => {
    tx.supplementIngredient.findFirst.mockResolvedValue({ id: 'ing_se', code: 'selenium', nomFr: 'sélénium' });
    tx.supplementIngredient.findUnique.mockResolvedValue({ id: 'ing_se', sourceProvenance: 'complalim', sourceIdentifiant: 'substance:303' });
    await ingestReferentiel(parseReferentielPayload(payload({ ingredients: [{ ...SELENIUM, formes: [] }] })));
    const ecritures = tx.supplementIngredient.update.mock.calls.map(([a]) => JSON.stringify(a.data));
    for (const e of ecritures) expect(e).not.toMatch(/"actif":\s*false/);
  });
});
