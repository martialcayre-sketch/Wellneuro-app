import { afterEach, describe, expect, it, vi } from 'vitest';

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

// NF-7, P2-1 (arbitrage du 2026-11-12) : drapeau allumé, un instrument du
// cabinet publié non déclaré reste listé mais n'est plus assignable, et porte
// `declarationRequise`. Drapeau éteint : l'entrée d'avant ce lot.
describe('GET /api/praticien/bibliotheque — instrument du cabinet non déclaré (NF-7)', () => {
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
    poseQuestionSuicide: null,
  };

  afterEach(() => {
    delete process.env.WN_ENABLE_DECLARATION_SUICIDE_CAB;
  });

  async function entreeCabinet(poseQuestionSuicide: boolean | null) {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.cabinetInstrument.findMany.mockResolvedValue([{ ...PUBLIE, poseQuestionSuicide }]);
    const json = await (await GET()).json();
    return json.entrees.find((e: { id: string }) => e.id === 'CAB_1');
  }

  it('drapeau éteint : assignable, sans `declarationRequise`, comme avant', async () => {
    const entree = await entreeCabinet(null);
    expect(entree.assignable).toBe(true);
    expect(entree.cabinet).toEqual({ statutRelecture: 'valide' });
  });

  it('drapeau allumé : non déclaré = listé, non assignable, `declarationRequise`', async () => {
    process.env.WN_ENABLE_DECLARATION_SUICIDE_CAB = 'true';
    const entree = await entreeCabinet(null);
    expect(entree.assignable).toBe(false);
    expect(entree.cabinet).toEqual({ statutRelecture: 'valide', declarationRequise: true });
  });

  it('drapeau allumé : déclaré « non » = assignable', async () => {
    process.env.WN_ENABLE_DECLARATION_SUICIDE_CAB = 'true';
    const entree = await entreeCabinet(false);
    expect(entree.assignable).toBe(true);
    expect(entree.cabinet).toEqual({ statutRelecture: 'valide' });
  });
});
