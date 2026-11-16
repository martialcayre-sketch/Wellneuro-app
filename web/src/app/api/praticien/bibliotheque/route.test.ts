import { describe, expect, it, vi } from 'vitest';

// Test d'autorisation (exig. 7 G-TRUST-04, lot A5) — PRATICIEN SEUL.
const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: { cabinetInstrument: { findMany: vi.fn() } },
}));
vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { GET } from './route';

describe('GET /api/praticien/bibliotheque — autorisation', () => {
  it('sans session : 401', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });
});

// NF-7 : un instrument du cabinet publié est assignable — publié veut dire
// déclaré, le CHECK `cabinet_instruments_valide_declare` le tient en base. Le
// marqueur `declarationRequise` est retiré avec le geste « Déclarer »
// (réponse 20261116-0826-a, [[D-528]]).
describe('GET /api/praticien/bibliotheque — instrument du cabinet publié (NF-7)', () => {
  const PUBLIE = {
    idInstrument: 'CAB_1',
    praticienEmail: 'praticien@wellneuro.fr',
    titre: 'Humeur cabinet',
    categorie: 'Cabinet',
    description: null,
    definitionJson: { sections: [] },
    scoringJson: { type: 'sum', maxTotal: 4 },
    statutRelecture: 'valide',
    actif: true,
    poseQuestionSuicide: false,
  };

  async function entreeCabinet(surcharge: Record<string, unknown> = {}) {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.cabinetInstrument.findMany.mockResolvedValue([{ ...PUBLIE, ...surcharge }]);
    const json = await (await GET()).json();
    return json.entrees.find((e: { id: string }) => e.id === 'CAB_1');
  }

  it('publié : assignable, sans `declarationRequise`', async () => {
    const entree = await entreeCabinet();
    expect(entree.assignable).toBe(true);
    expect(entree.cabinet).toEqual({ statutRelecture: 'valide' });
  });

  it('à relire : listé, non assignable', async () => {
    const entree = await entreeCabinet({ statutRelecture: 'grille_a_relire', poseQuestionSuicide: null });
    expect(entree.assignable).toBe(false);
    expect(entree.cabinet).toEqual({ statutRelecture: 'grille_a_relire' });
  });
});
