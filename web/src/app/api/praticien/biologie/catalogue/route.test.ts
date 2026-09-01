import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, listerCatalogueBiologie } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  listerCatalogueBiologie: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
// `access.ts` → `appartenance.ts` importe le client Prisma à plat : sans ce
// mock, le simple import de la route exige un DATABASE_URL.
vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/biology-library/catalogue', () => ({ listerCatalogueBiologie }));

import { GET } from './route';

const PRATICIEN = 'praticien@wellneuro.fr';

beforeEach(() => {
  vi.clearAllMocks();
  process.env.WN_CB_ENABLED = 'true';
  getServerSession.mockResolvedValue({ user: { email: PRATICIEN } });
  listerCatalogueBiologie.mockResolvedValue({
    analytes: [],
    panels: [],
    millesimeNabm: null,
  });
});

afterEach(() => {
  delete process.env.WN_CB_ENABLED;
});

describe('gardes d’accès — patron C4, fail-closed', () => {
  it('sans session : 401, le catalogue n’est pas lu', async () => {
    getServerSession.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
    expect(listerCatalogueBiologie).not.toHaveBeenCalled();
  });

  it('session sans e-mail : 401', async () => {
    getServerSession.mockResolvedValue({ user: {} });
    const response = await GET();
    expect(response.status).toBe(401);
    expect(listerCatalogueBiologie).not.toHaveBeenCalled();
  });

  it('WN_CB_ENABLED absent : 404, la surface n’est jamais entrouverte', async () => {
    delete process.env.WN_CB_ENABLED;
    const response = await GET();
    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.ok).toBe(false);
    expect(json.reason).toBe('flag_eteint');
    expect(listerCatalogueBiologie).not.toHaveBeenCalled();
  });

  it('« TRUE » n’est pas « true » : le drapeau reste fermé', async () => {
    process.env.WN_CB_ENABLED = 'TRUE';
    const response = await GET();
    expect(response.status).toBe(404);
  });
});

describe('service du catalogue', () => {
  it('drapeau levé et session praticien : 200, le catalogue est servi tel quel', async () => {
    listerCatalogueBiologie.mockResolvedValue({
      analytes: [{ code: 'BIO_FERRITINE' }],
      panels: [{ code: 'PANEL_FATIGUE_1' }],
      millesimeNabm: { versionSource: 'V105', nombreEntrees: 987, importeLe: '2026-07-26T00:00:00.000Z' },
    });
    const response = await GET();
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.analytes).toEqual([{ code: 'BIO_FERRITINE' }]);
    expect(json.panels).toEqual([{ code: 'PANEL_FATIGUE_1' }]);
    expect(json.millesimeNabm.versionSource).toBe('V105');
  });

  it('lecture en échec : 500 générique, sans détail technique', async () => {
    const silence = vi.spyOn(console, 'error').mockImplementation(() => {});
    listerCatalogueBiologie.mockRejectedValue(new Error('boom prisma'));
    const response = await GET();
    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.reason).toBe('exception');
    expect(json.error).not.toContain('boom');
    silence.mockRestore();
  });
});
