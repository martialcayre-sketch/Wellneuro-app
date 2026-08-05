// Banc de la route d'ingestion des compositions — même patron que
// `../ingest/route.test.ts`. Ce qu'il verrouille : l'ORDRE fail-closed
// (configuration, puis authentification, puis validation, puis écriture), et
// qu'une panne d'écriture ne fasse fuir ni le contenu de la requête ni le
// détail de la connexion.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getConfig, isAuthorized, ingest } = vi.hoisted(() => ({
  getConfig: vi.fn(),
  isAuthorized: vi.fn(),
  ingest: vi.fn(),
}));

// `compositions.ts` importe le client Prisma au chargement du module, et ce
// client exige `DATABASE_URL`. Ce banc ne touche à aucune base : le client est
// neutralisé, ce qui rend aussi impossible une écriture accidentelle depuis
// ici.
vi.mock('@/lib/prisma', () => ({ prisma: {} }));

vi.mock('@/lib/supplement-library/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/supplement-library/config')>();
  return { ...actual, getSupplementLibraryConfig: getConfig };
});
vi.mock('@/lib/supplement-library/auth', () => ({ isAuthorizedSupplementsRequest: isAuthorized }));
vi.mock('@/lib/supplement-library/compositions', async (importOriginal) => {
  // La VALIDATION reste la vraie — c'est elle qui décide du 422, et la mocker
  // ferait tester un parseur qui n'existe pas. Seule l'écriture est simulée.
  const actual = await importOriginal<typeof import('@/lib/supplement-library/compositions')>();
  return { ...actual, ingestCompositions: ingest };
});

import { POST } from './route';

const produitValide = {
  sourceIdentifiant: '12345',
  sourceLignes: 1,
  lignes: [
    {
      ingredientSourceIdentifiant: 'substance:348',
      formeSourceIdentifiant: null,
      doseParDjr: 500,
      unite: 'mg',
      position: 0,
    },
  ],
};

function requete(body: unknown, opts: { json?: boolean; bearer?: boolean } = {}) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (opts.bearer !== false) headers.authorization = 'Bearer secret-de-test';
  return new Request('http://localhost/api/internal/supplements/compositions', {
    method: 'POST',
    headers,
    body: opts.json === false ? '{ pas du json' : JSON.stringify(body),
  });
}

const corpsValide = { provenance: 'complalim', produits: [produitValide] };

describe('POST /api/internal/supplements/compositions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getConfig.mockReturnValue({ enabled: true, internalSecret: 'x'.repeat(32) });
    isAuthorized.mockReturnValue(true);
    ingest.mockResolvedValue({
      ok: true,
      produitsEcrits: 1,
      produitsInchanges: 0,
      produitsDenominateurCorrige: 0,
      lignesCreees: 1,
      produitsDivergents: [],
      produitsIncomplets: [],
    });
  });

  it('répond 503 si la voie n’est pas configurée — AVANT toute authentification', async () => {
    getConfig.mockImplementation(() => {
      throw new Error('SUPPLEMENTS_INTERNAL_SECRET est absent ou trop court (minimum 32 caractères).');
    });
    const res = await POST(requete(corpsValide));
    expect(res.status).toBe(503);
    // Fail-closed : la cause exacte reste au journal serveur.
    expect(JSON.stringify(await res.json())).not.toMatch(/SUPPLEMENTS_INTERNAL_SECRET/);
    expect(isAuthorized).not.toHaveBeenCalled();
    expect(ingest).not.toHaveBeenCalled();
  });

  it('s’ARRÊTE en 401 dès que la garde d’authentification refuse, sans rien écrire', async () => {
    // CE QUE CE TEST NE DIT PAS : que le Bearer absent produise un refus.
    // `isAuthorizedSupplementsRequest` est mocké — c'est LUI qui décide, et il a
    // son propre banc (`auth.test.ts`). Ce qui se vérifie ici est le seul fait
    // que cette route décide : quand la garde dit non, la route s'arrête en 401
    // AVANT toute écriture, et n'appelle pas `ingestCompositions`. Le titre le
    // dit désormais, plutôt que de laisser croire à une preuve d'authentification.
    isAuthorized.mockReturnValue(false);
    const res = await POST(requete(corpsValide, { bearer: false }));
    expect(res.status).toBe(401);
    expect(ingest).not.toHaveBeenCalled();
  });

  it('répond 400 sur JSON invalide', async () => {
    const res = await POST(requete({}, { json: false }));
    expect(res.status).toBe(400);
    expect(ingest).not.toHaveBeenCalled();
  });

  it('répond 422 sur provenance hors vocabulaire, en la nommant — et sans `resume`', async () => {
    const res = await POST(requete({ ...corpsValide, provenance: 'wikipedia' }));
    expect(res.status).toBe(422);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.error).toMatch(/wikipedia/);
    // Pas de champ `resume` : un refus de payload survient AVANT toute
    // écriture, il n'a donc aucun inventaire à rendre. En annoncer un vide
    // ferait croire à un inventaire.
    expect(Object.keys(json)).toEqual(['error']);
    expect(ingest).not.toHaveBeenCalled();
  });

  it('répond 422 sur un produit dont le dénominateur est plus petit que le numérateur', async () => {
    const res = await POST(requete({ ...corpsValide, produits: [{ ...produitValide, sourceLignes: 0 }] }));
    expect(res.status).toBe(422);
    expect(ingest).not.toHaveBeenCalled();
  });

  it('répond 200 et rend le bilan sur payload valide', async () => {
    const res = await POST(requete(corpsValide));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; statut: string; resume: { lignesCreees: number } };
    expect(json.ok).toBe(true);
    expect(json.statut).toBe('COMPOSITIONS_INGEREES');
    expect(json.resume.lignesCreees).toBe(1);
    expect(ingest).toHaveBeenCalledTimes(1);
  });

  it('répond 500 GÉNÉRIQUE sur une panne d’écriture — aucune fuite', async () => {
    // Une panne d'écriture porte volontiers la chaîne de connexion, et la
    // requête en cours peut contenir n'importe quoi. Ni l'une ni l'autre ne
    // doit ressortir au client : le détail part au journal serveur.
    const journal = vi.spyOn(console, 'error').mockImplementation(() => {});
    ingest.mockRejectedValue(
      new Error(
        'connect ECONNREFUSED db.exemple.supabase.co:5432 — user=postgres password=motdepasse ; dossier de Sophie Nicola',
      ),
    );

    const res = await POST(requete(corpsValide));
    expect(res.status).toBe(500);

    const brut = JSON.stringify(await res.json());
    expect(brut).toBe(JSON.stringify({ error: "Échec d'ingestion des compositions." }));
    for (const fuite of ['supabase.co', 'password', 'motdepasse', 'Sophie Nicola', '5432']) {
      expect(brut).not.toContain(fuite);
    }
    journal.mockRestore();
  });
});
