import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// La version à imprimer du courrier remis ([[D-262]], LOT-03b). Signature
// réelle : seuls Prisma et le service sont simulés.

const { prisma, lettreImprimable } = vi.hoisted(() => ({
  prisma: { patient: { findUnique: vi.fn() } },
  lettreImprimable: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/correspondance/lettreServicePatient', () => ({ lettreImprimable }));

import { signPatientSession } from '@/lib/patient-session';
import { GET } from './route';

const PATIENT = { idPatient: 'PAT_TEST', email: 'michel.dogne@example.test' };

function requete(avecCookie = true): Request {
  const cookie = signPatientSession({ idPatient: PATIENT.idPatient, email: PATIENT.email });
  return new Request('http://localhost/api/portail/lettre-adressage/impression', {
    headers: avecCookie ? { cookie: `wn_portail=${encodeURIComponent(cookie)}` } : {},
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NEXTAUTH_SECRET', 'secret-de-test-non-production');
  vi.stubEnv('WN_LETTRE_ADRESSAGE_PATIENT', 'true');
  prisma.patient.findUnique.mockResolvedValue({
    idPatient: PATIENT.idPatient, actif: true, accessTokenRevoked: false, email: PATIENT.email,
    sessionsInvalidesAvant: null, createdAt: new Date('2026-06-01T08:00:00.000Z'),
  });
  lettreImprimable.mockResolvedValue('<!doctype html><p>Courrier</p>');
});
afterEach(() => vi.unstubAllEnvs());

describe('GET /api/portail/lettre-adressage/impression (D-262, LOT-03b)', () => {
  it('drapeau fermé : 503, ni session ni base', async () => {
    vi.stubEnv('WN_LETTRE_ADRESSAGE_PATIENT', '');
    expect((await GET(requete())).status).toBe(503);
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
    expect(lettreImprimable).not.toHaveBeenCalled();
  });

  it('sans session : 401, rien n’est rendu', async () => {
    expect((await GET(requete(false))).status).toBe(401);
    expect(lettreImprimable).not.toHaveBeenCalled();
  });

  it('sert la page HTML du courrier de CE patient, jamais en cache', async () => {
    const res = await GET(requete());
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(await res.text()).toContain('Courrier');
    expect(lettreImprimable).toHaveBeenCalledWith(PATIENT.idPatient);
  });

  it('rien de servi : 404, sans dire pourquoi', async () => {
    lettreImprimable.mockResolvedValue(null);
    const res = await GET(requete());
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ ok: false, reason: 'introuvable', error: 'Aucun courrier à imprimer.' });
  });

  it('compte révoqué : 403, rien n’est rendu', async () => {
    prisma.patient.findUnique.mockResolvedValue({
      idPatient: PATIENT.idPatient, actif: true, accessTokenRevoked: true, email: PATIENT.email,
      sessionsInvalidesAvant: null, createdAt: new Date('2026-06-01T08:00:00.000Z'),
    });
    expect((await GET(requete())).status).toBe(403);
    expect(lettreImprimable).not.toHaveBeenCalled();
  });
});
