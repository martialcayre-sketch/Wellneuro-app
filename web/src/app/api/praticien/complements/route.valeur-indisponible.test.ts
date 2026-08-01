// Le mécanisme « UNE valeur d'une facette PAR AILLEURS servie est refusée »
// est en sommeil : `VALEURS_FACETTE_INDISPONIBLES` vaut `{}` depuis que
// `interactions` a basculé chez les facettes indisponibles en entier.
//
// Un mécanisme endormi qu'aucun test n'exerce sera ROUVERT NON TESTÉ — et il
// sera rouvert : c'est le seul moyen de refuser une valeur sans condamner sa
// facette, et la preuve de complétude (`composition_source_lignes`) le
// rappellera. Les prédicats d'interactions, mis en sommeil dans le même lot,
// sont figés par un test de forme ; celui-ci n'avait rien.
//
// On l'exerce donc sur une TABLE FACTICE, injectée par le mock du module :
// c'est le comportement de la route qui est éprouvé, jamais le contenu réel de
// la table — lequel doit rester vide, et un autre test l'affirme.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, listerCatalogue } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  listerCatalogue: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/supplement-library/catalogue', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/supplement-library/catalogue')>();
  return {
    ...actual,
    listerCatalogue,
    // `statut` est une facette SERVIE, et « verifiee » l'une de ses valeurs :
    // le cas exact que le mécanisme doit couvrir — la facette reste ouverte,
    // une seule de ses valeurs est refusée.
    VALEURS_FACETTE_INDISPONIBLES: { statut: ['verifiee'] },
  };
});

import { GET } from './route';

const URL_BASE = 'http://localhost/api/praticien/complements';

const CATALOGUE = {
  contractVersion: 'c4-catalogue-v4',
  aucunScoreGlobal: true,
  intentionFiltre: null,
  codesInconnus: [],
  tri: 'neutre',
  recherche: '',
  page: 1,
  parPage: 25,
  total: 0,
  fiches: [],
  facettes: {},
  facettesServies: [],
  facettesIndisponibles: [],
};

describe('refus d’UNE valeur d’une facette par ailleurs servie', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WN_C4_ENABLED = 'true';
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    listerCatalogue.mockResolvedValue(CATALOGUE);
  });

  it('refuse en 400, avec un motif DISTINCT de celui d’une facette indisponible', async () => {
    const res = await GET(new Request(`${URL_BASE}?statut=verifiee`));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.reason).toBe('valeur_facette_indisponible');
    expect(json.reason).not.toBe('facette_indisponible');
    // Refusé AVANT toute requête : un critère silencieusement écarté rendrait
    // des fiches hors critère en laissant croire que le filtre s'est appliqué.
    expect(listerCatalogue).not.toHaveBeenCalled();
  });

  it('refuse même mêlée à une valeur saine — jamais de filtrage partiel', async () => {
    const res = await GET(new Request(`${URL_BASE}?statut=importee,verifiee`));
    expect(res.status).toBe(400);
    expect((await res.json()).reason).toBe('valeur_facette_indisponible');
    expect(listerCatalogue).not.toHaveBeenCalled();
  });

  it('laisse passer les AUTRES valeurs de la même facette', async () => {
    const res = await GET(new Request(`${URL_BASE}?statut=importee`));
    expect(res.status).toBe(200);
    expect(listerCatalogue).toHaveBeenCalled();
  });
});
