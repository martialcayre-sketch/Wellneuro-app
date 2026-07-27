import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    patient: { findUnique: vi.fn() },
    consultation: { findFirst: vi.fn() },
    assignation: { findFirst: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/observability/logger', () => ({
  logger: { warn: vi.fn(), security: vi.fn(), error: vi.fn() },
}));

import { signPatientSession } from '@/lib/patient-session';
import { POST } from './route';

const patient = {
  idPatient: 'PAT_TEST',
  email: 'sophie.nicola@example.test',
  prenom: 'Sophie',
  nom: 'Nicola',
  actif: true,
  accessTokenRevoked: false,
  sessionsInvalidesAvant: null,
};

function request(cookie?: string): Request {
  return new Request('http://localhost/api/portail/session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { cookie: `wn_portail=${encodeURIComponent(cookie)}` } : {}),
    },
    body: '{}',
  });
}

const cookieValide = () => signPatientSession({ idPatient: patient.idPatient, email: patient.email });

// LOT-04 : le cookie de session signé est l'UNIQUE credential du portail. Plus
// de login token+email — la session est posée à l'atterrissage magic-link/Google,
// cette route la relit et la rafraîchit. Le coupe-circuit `bascule des liens
// permanents` (410) a disparu avec le chemin par jeton qu'il gardait.
describe('POST /api/portail/session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    prisma.patient.findUnique.mockResolvedValue(patient);
    prisma.consultation.findFirst.mockResolvedValue(null);
    prisma.assignation.findFirst.mockResolvedValue(null);
  });

  it('avec un cookie valide, renvoie l’identité et rafraîchit le cookie', async () => {
    const response = await POST(request(cookieValide()));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      patient: { idPatient: patient.idPatient, email: patient.email },
    });
    expect(response.headers.get('set-cookie')).toContain('wn_portail=');
  });

  // Préalable G4 : cette identité nomme les brouillons du navigateur, à la place
  // du jeton d'URL. Elle vient du cookie, jamais d'un jeton présenté.
  it('résout le patient par l’idPatient du cookie, jamais par un jeton d’URL', async () => {
    await POST(request(cookieValide()));
    expect(prisma.patient.findUnique).toHaveBeenCalledWith({ where: { idPatient: patient.idPatient } });
  });

  it('sans cookie : 401, aucune lecture en base', async () => {
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
  });

  it('cookie falsifié : 401', async () => {
    expect((await POST(request('valeur.falsifiee'))).status).toBe(401);
  });

  it('refuse un cookie appartenant à un autre patient', async () => {
    const cookie = signPatientSession({ idPatient: 'PAT_AUTRE', email: patient.email });
    expect((await POST(request(cookie))).status).toBe(403);
  });

  it('refuse un portail révoqué (invariant révocation)', async () => {
    prisma.patient.findUnique.mockResolvedValue({ ...patient, accessTokenRevoked: true });
    expect((await POST(request(cookieValide()))).status).toBe(403);
  });

  it('refuse un cookie émis avant une révocation', async () => {
    prisma.patient.findUnique.mockResolvedValue({
      ...patient,
      sessionsInvalidesAvant: new Date(Date.now() + 60_000),
    });
    expect((await POST(request(cookieValide()))).status).toBe(403);
  });
});
