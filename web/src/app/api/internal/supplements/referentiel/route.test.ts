import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getConfig, isAuthorized, ingest } = vi.hoisted(() => ({
  getConfig: vi.fn(),
  isAuthorized: vi.fn(),
  ingest: vi.fn(),
}));

// La VRAIE validation est chargée plus bas (c'est elle qu'on veut voir
// refuser) ; elle importe le module Prisma, qui exige DATABASE_URL au
// chargement. On le neutralise : ce test n'atteint jamais la base.
vi.mock('@/lib/prisma', () => ({ prisma: {} }));

vi.mock('@/lib/supplement-library/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/supplement-library/config')>();
  return { ...actual, getSupplementLibraryConfig: getConfig };
});
vi.mock('@/lib/supplement-library/auth', () => ({ isAuthorizedSupplementsRequest: isAuthorized }));
vi.mock('@/lib/supplement-library/referentiel', async (importOriginal) => {
  // La validation reste la VRAIE : c'est elle qu'on veut voir refuser.
  const actual = await importOriginal<typeof import('@/lib/supplement-library/referentiel')>();
  return { ...actual, ingestReferentiel: ingest };
});

import { POST } from './route';

const LOT = {
  provenance: 'complalim',
  ingredients: [{
    sourceIdentifiant: 'substance:303', code: 'selenium', nomFr: 'sélénium',
    formes: [{ sourceIdentifiant: 'form_of_supply:86', code: 'hydrogenoselenite-de-sodium', labelFr: 'Hydrogénosélénite de sodium' }],
  }],
};

function requete(body: unknown, opts: { json?: boolean } = {}) {
  return new Request('http://localhost/api/internal/supplements/referentiel', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer secret-de-test' },
    body: opts.json === false ? '{ pas du json' : JSON.stringify(body),
  });
}

describe('POST /api/internal/supplements/referentiel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getConfig.mockReturnValue({ enabled: true, internalSecret: 'x'.repeat(32) });
    isAuthorized.mockReturnValue(true);
    ingest.mockResolvedValue({
      ok: true, ingredientsCrees: 1, ingredientsMisAJour: 0, ingredientsInchanges: 0,
      formesCreees: 1, formesMisesAJour: 0, formesInchangees: 0,
    });
  });

  it('ingère un lot conforme', async () => {
    const res = await POST(requete(LOT));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.statut).toBe('REFERENTIEL_INGERE');
    expect(json.resume.ingredientsCrees).toBe(1);
  });

  it('répond 503 quand le secret n’est pas configuré, AVANT toute authentification', async () => {
    getConfig.mockImplementation(() => { throw new Error('SUPPLEMENTS_INTERNAL_SECRET absent'); });
    const res = await POST(requete(LOT));
    expect(res.status).toBe(503);
    // Fail-closed : la cause exacte ne fuit pas, et on n'a rien tenté d'écrire.
    expect((await res.json()).error).not.toMatch(/SUPPLEMENTS_INTERNAL_SECRET/);
    expect(isAuthorized).not.toHaveBeenCalled();
    expect(ingest).not.toHaveBeenCalled();
  });

  it('répond 401 sans jeton valide, et n’écrit rien', async () => {
    isAuthorized.mockReturnValue(false);
    const res = await POST(requete(LOT));
    expect(res.status).toBe(401);
    expect(ingest).not.toHaveBeenCalled();
  });

  it('répond 400 sur un corps qui n’est pas du JSON', async () => {
    const res = await POST(requete(LOT, { json: false }));
    expect(res.status).toBe(400);
    expect(ingest).not.toHaveBeenCalled();
  });

  it.each([
    ['provenance inconnue', { ...LOT, provenance: 'wikipedia' }],
    ['identifiant sans espace de noms', { ...LOT, ingredients: [{ ...LOT.ingredients[0], sourceIdentifiant: '303' }] }],
    ['code illisible', { ...LOT, ingredients: [{ ...LOT.ingredients[0], code: 'Sélénium !' }] }],
    ['aucun ingrédient', { provenance: 'complalim', ingredients: [] }],
  ])('répond 422 et n’écrit rien : %s', async (_titre, corps) => {
    const res = await POST(requete(corps));
    expect(res.status).toBe(422);
    expect(ingest).not.toHaveBeenCalled();
  });

  it('traduit un conflit de code en 422 explicite, pas en panne', async () => {
    const { ReferentielPayloadInvalide } = await import('@/lib/supplement-library/referentiel');
    ingest.mockRejectedValue(new ReferentielPayloadInvalide('Le code « selenium » appartient déjà à une autre entrée'));
    const res = await POST(requete(LOT));
    expect(res.status).toBe(422);
    expect((await res.json()).error).toMatch(/appartient déjà/);
  });

  it('reste en 500 générique sur une panne réelle', async () => {
    const erreur = vi.spyOn(console, 'error').mockImplementation(() => {});
    ingest.mockRejectedValue(new Error('connexion base perdue: user=admin'));
    const res = await POST(requete(LOT));
    expect(res.status).toBe(500);
    erreur.mockRestore();
  });
});
