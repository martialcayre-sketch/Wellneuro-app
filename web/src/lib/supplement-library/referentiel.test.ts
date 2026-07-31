import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, tx } = vi.hoisted(() => {
  const tx = {
    supplementIngredient: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    supplementIngredientForme: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    clinicalRule: {
      create: vi.fn(), update: vi.fn(), upsert: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(), updateMany: vi.fn(),
    },
    ingredientFunctionalThreshold: {
      create: vi.fn(), update: vi.fn(), upsert: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(), updateMany: vi.fn(),
    },
    supplementSafetyAlert: {
      create: vi.fn(), update: vi.fn(), upsert: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(), updateMany: vi.fn(),
    },
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

  it('refuse « saisie_praticien » : cette voie est un import EXTERNE', () => {
    // La provenance est lue telle quelle dans le message de conflit. Laisser un
    // porteur du secret estampiller ses lignes « saisie praticien » leur
    // donnerait, à la lecture, une autorité qu'elles n'ont pas.
    expect(() => parseReferentielPayload(payload({ provenance: 'saisie_praticien' })))
      .toThrow(/hors vocabulaire/);
  });

  it('borne le nombre total de FORMES, que la taille de lot ne compte pas', () => {
    const gros = Array.from({ length: 200 }, (_, i) => ({
      ...SELENIUM,
      sourceIdentifiant: `substance:${i}`,
      code: `code-${i}`,
      formes: Array.from({ length: 30 }, (_, j) => ({
        sourceIdentifiant: `form_of_supply:${i * 30 + j}`, code: `f-${i}-${j}`, labelFr: `Forme ${i}-${j}`,
      })),
    }));
    expect(() => parseReferentielPayload(payload({ ingredients: gros }))).toThrow(/formes.*découper en lots/);
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
    tx.supplementIngredientForme.findFirst.mockResolvedValue(null);
    tx.supplementIngredientForme.findUnique.mockResolvedValue(null);
  });

  /** L'ingrédient est déjà en base, apparié par sa source. */
  const ingredientDejaLa = (over: Record<string, unknown> = {}) => {
    tx.supplementIngredient.findFirst.mockResolvedValue({
      id: 'ing_se', code: 'selenium', nomFr: 'sélénium', ...over,
    });
    tx.supplementIngredient.findUnique.mockResolvedValue({
      id: 'ing_se', sourceProvenance: 'complalim', sourceIdentifiant: 'substance:303',
    });
  };
  /** Les deux formes sont déjà en base, appariées par leur IDENTIFIANT source. */
  const formesDejaLa = (over: (f: typeof SELENIUM.formes[number]) => Record<string, unknown> = () => ({})) => {
    tx.supplementIngredientForme.findFirst.mockImplementation(async ({ where }) => {
      const f = SELENIUM.formes.find((x) => x.sourceIdentifiant === where.sourceIdentifiant);
      return f ? { id: `f_${f.code}`, code: f.code, labelFr: f.labelFr, ...over(f) } : null;
    });
  };

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
    ingredientDejaLa();
    formesDejaLa();

    const bilan = await ingestReferentiel(parseReferentielPayload(payload()));
    expect(bilan).toMatchObject({ ingredientsCrees: 0, ingredientsInchanges: 1, formesCreees: 0, formesInchangees: 2 });
    expect(tx.supplementIngredient.create).not.toHaveBeenCalled();
    expect(tx.supplementIngredient.update).not.toHaveBeenCalled();
    expect(tx.supplementIngredientForme.create).not.toHaveBeenCalled();
    expect(tx.supplementIngredientForme.update).not.toHaveBeenCalled();
  });

  it('met à jour un nom officiel qui a changé, sans recréer', async () => {
    ingredientDejaLa({ nomFr: 'ancien nom' });
    formesDejaLa();
    const bilan = await ingestReferentiel(parseReferentielPayload(payload()));
    expect(bilan.ingredientsMisAJour).toBe(1);
    expect(tx.supplementIngredient.create).not.toHaveBeenCalled();
  });

  it('apparie la forme par sa SOURCE, pas par son code — un libellé renommé ne crée pas de doublon', async () => {
    // Le code d'une forme est fabriqué depuis son nom officiel : si le nom
    // change en amont, le code change. Apparier par le code créerait une
    // SECONDE ligne, l'ancienne demeurant (rien n'est jamais désactivé ici),
    // et les compositions déjà écrites resteraient accrochées à l'obsolète.
    ingredientDejaLa();
    formesDejaLa((f) => ({ code: `${f.code}-ancien`, labelFr: 'Ancien libellé officiel' }));

    const bilan = await ingestReferentiel(parseReferentielPayload(payload()));
    expect(tx.supplementIngredientForme.create).not.toHaveBeenCalled();
    expect(bilan.formesMisesAJour).toBe(2);
    // Seul le libellé bouge : le code en place est conservé, et la divergence
    // est RENDUE plutôt que subie.
    for (const [appel] of tx.supplementIngredientForme.update.mock.calls) {
      expect(Object.keys(appel.data)).toEqual(['labelFr']);
    }
    expect(bilan.codesConserves).toHaveLength(2);
    expect(bilan.codesConserves[0]).toMatch(/conservé/);
  });

  it('ne réécrit JAMAIS le code d’un ingrédient existant, et rend la divergence', async () => {
    // `code` est la chaîne que les règles cliniques manipulent, et que
    // `ProtocolReviewFlag.ingredientsConcernes` stocke dénormalisée. Un
    // renommage désapparierait silencieusement un drapeau de sécurité.
    ingredientDejaLa({ code: 'selenium', nomFr: 'sélénium' });
    formesDejaLa();
    const bilan = await ingestReferentiel(parseReferentielPayload(payload({
      ingredients: [{ ...SELENIUM, code: 'selenium-substance-303' }],
    })));
    expect(tx.supplementIngredient.update).not.toHaveBeenCalled();
    expect(bilan.codesConserves).toEqual([
      expect.stringContaining('« selenium » conservé'),
    ]);
  });

  it('REFUSE d’écraser une forme saisie à la main qui porte le même code', async () => {
    // Symétrique de la garde côté ingrédient. Réécrire substituerait une autre
    // substance chimique sous le même identifiant de ligne, et les
    // compositions qui la désignent changeraient de sens sans que rien ne le note.
    ingredientDejaLa();
    tx.supplementIngredientForme.findFirst.mockResolvedValue(null);
    tx.supplementIngredientForme.findUnique.mockResolvedValue({
      sourceProvenance: null, sourceIdentifiant: null,
    });
    await expect(ingestReferentiel(parseReferentielPayload(payload())))
      .rejects.toThrow(/code de forme.*déjà porté.*saisie manuelle/);
    expect(tx.supplementIngredientForme.create).not.toHaveBeenCalled();
  });

  it('rend un BILAN PARTIEL quand le lot s’arrête sur un conflit', async () => {
    // Un lot interrompu à mi-parcours laisse derrière lui ce qu'il a commité.
    // Sans ce bilan, l'opérateur relance à l'aveugle.
    const AUTRE = { ...SELENIUM, sourceIdentifiant: 'substance:999', code: 'zinc', formes: [] };
    tx.supplementIngredient.findFirst.mockResolvedValue(null);
    tx.supplementIngredient.findUnique.mockImplementation(async ({ where }) => (
      where.code === 'zinc' ? { id: 'ing_autre', sourceProvenance: null, sourceIdentifiant: null } : null
    ));

    const erreur = await ingestReferentiel(parseReferentielPayload(payload({
      ingredients: [{ ...SELENIUM, formes: [] }, AUTRE],
    }))).catch((e) => e);

    expect(erreur).toBeInstanceOf(ReferentielPayloadInvalide);
    // Le premier ingrédient EST passé : le bilan doit le dire.
    expect(erreur.bilanPartiel).toMatchObject({ ok: false, ingredientsCrees: 1 });
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
    // La frontière du lot : il pose le vocabulaire, pas le jugement. La garde
    // porte sur TOUS les verbes d'écriture, pas seulement `create` : un futur
    // `clinicalRule.update` franchirait la frontière tout aussi bien.
    await ingestReferentiel(parseReferentielPayload(payload()));
    for (const modele of [tx.clinicalRule, tx.ingredientFunctionalThreshold, tx.supplementSafetyAlert]) {
      for (const verbe of ['create', 'update', 'upsert', 'delete', 'deleteMany', 'updateMany'] as const) {
        expect(modele[verbe], verbe).not.toHaveBeenCalled();
      }
    }
  });

  it('ne désactive ni ne supprime rien — un retrait est un geste praticien signé', async () => {
    ingredientDejaLa();
    await ingestReferentiel(parseReferentielPayload(payload({ ingredients: [{ ...SELENIUM, formes: [] }] })));
    const ecritures = tx.supplementIngredient.update.mock.calls.map(([a]) => JSON.stringify(a.data));
    for (const e of ecritures) expect(e).not.toMatch(/"actif":\s*false/);
  });
});
