import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// La version à imprimer d'UN courrier complément remis ([[D-345]], J3-12h
// lot 4 ; [[D-362]] §2). Signature réelle : seuls Prisma et le service sont
// simulés.

const { prisma, courrierComplementImprimable } = vi.hoisted(() => ({
  prisma: { patient: { findUnique: vi.fn() } },
  courrierComplementImprimable: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/correspondance/courrierComplementServicePatient', () => ({ courrierComplementImprimable }));

import { signPatientSession } from '@/lib/patient-session';
import { GET } from './route';

const PATIENT = { idPatient: 'PAT_TEST', email: 'michel.dogne@example.test' };

function requete(avecCookie = true, requeteTexte = '?remise=ccr_1'): Request {
  const cookie = signPatientSession({ idPatient: PATIENT.idPatient, email: PATIENT.email });
  return new Request(`http://localhost/api/portail/courrier-complement/impression${requeteTexte}`, {
    headers: avecCookie ? { cookie: `wn_portail=${encodeURIComponent(cookie)}` } : {},
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NEXTAUTH_SECRET', 'secret-de-test-non-production');
  vi.stubEnv('WN_COURRIER_COMPLEMENT', 'true');
  prisma.patient.findUnique.mockResolvedValue({
    idPatient: PATIENT.idPatient, actif: true, accessTokenRevoked: false, email: PATIENT.email,
    sessionsInvalidesAvant: null, createdAt: new Date('2026-06-01T08:00:00.000Z'),
  });
  courrierComplementImprimable.mockResolvedValue('<!doctype html><p>Courrier</p>');
});
afterEach(() => vi.unstubAllEnvs());

describe('GET /api/portail/courrier-complement/impression (D-345, J3-12h lot 4)', () => {
  it('drapeau fermé : 503, ni session ni base', async () => {
    vi.stubEnv('WN_COURRIER_COMPLEMENT', '');
    expect((await GET(requete())).status).toBe(503);
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
    expect(courrierComplementImprimable).not.toHaveBeenCalled();
  });

  it('sans session : 401, rien n’est rendu', async () => {
    expect((await GET(requete(false))).status).toBe(401);
    expect(courrierComplementImprimable).not.toHaveBeenCalled();
  });

  it('sert la page HTML de LA remise désignée, dans le dossier de la session, jamais en cache', async () => {
    const res = await GET(requete());
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(await res.text()).toContain('Courrier');
    expect(courrierComplementImprimable).toHaveBeenCalledWith(PATIENT.idPatient, 'ccr_1');
  });

  it.each(['', '?remise=', '?remise=a%2F..%2Fb', `?remise=${'x'.repeat(65)}`])(
    'remise absente ou mal formée (« %s ») : 400, rien n’est rendu',
    async requeteTexte => {
      expect((await GET(requete(true, requeteTexte))).status).toBe(400);
      expect(courrierComplementImprimable).not.toHaveBeenCalled();
    },
  );

  it('rien de servi sous cet identifiant : 404, sans dire pourquoi', async () => {
    courrierComplementImprimable.mockResolvedValue(null);
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
    expect(courrierComplementImprimable).not.toHaveBeenCalled();
  });
});
