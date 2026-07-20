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
  accessToken: 'TOK_SESSION_TEST',
  accessTokenRevoked: false,
};

function request(body: object, cookie?: string): Request {
  return new Request('http://localhost/api/portail/session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { cookie: `wn_portail=${encodeURIComponent(cookie)}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/portail/session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    prisma.patient.findUnique.mockResolvedValue(patient);
    prisma.consultation.findFirst.mockResolvedValue(null);
    prisma.assignation.findFirst.mockResolvedValue(null);
  });

  it('conserve le login initial token + email', async () => {
    const response = await POST(request({ token: patient.accessToken, email: patient.email }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, patient: { email: patient.email } });
    expect(response.headers.get('set-cookie')).toContain('wn_portail=');
  });

  // Préalable G4 : c'est cette identité qui nomme les brouillons du navigateur,
  // à la place du jeton d'URL. Sans elle, la reclé n'a pas de source.
  it('renvoie l’identité de session, pour que le navigateur cesse de nommer ses brouillons d’après le jeton', async () => {
    const response = await POST(request({ token: patient.accessToken, email: patient.email }));
    const payload = await response.json();
    expect(payload.patient.idPatient).toBe(patient.idPatient);
  });

  it('restaure la session avec le token et le cookie, sans email', async () => {
    const cookie = signPatientSession({ idPatient: patient.idPatient, email: patient.email, accessToken: patient.accessToken });
    const response = await POST(request({ token: patient.accessToken }, cookie));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true });
  });

  it('refuse une restauration sans cookie ou avec un cookie falsifié', async () => {
    expect((await POST(request({ token: patient.accessToken }))).status).toBe(403);
    expect((await POST(request({ token: patient.accessToken }, 'valeur.falsifiee'))).status).toBe(403);
  });

  it('refuse un cookie appartenant à un autre patient, même avec le même email', async () => {
    const cookie = signPatientSession({ idPatient: 'PAT_AUTRE', email: patient.email, accessToken: patient.accessToken });
    const response = await POST(request({ token: patient.accessToken }, cookie));
    expect(response.status).toBe(403);
  });

  it('refuse un portail révoqué', async () => {
    prisma.patient.findUnique.mockResolvedValue({ ...patient, accessTokenRevoked: true });
    const cookie = signPatientSession({ idPatient: patient.idPatient, email: patient.email, accessToken: patient.accessToken });
    expect((await POST(request({ token: patient.accessToken }, cookie))).status).toBe(403);
  });

  it('refuse un ancien cookie après réémission du token et accepte le nouveau', async () => {
    const oldCookie = signPatientSession({
      idPatient: patient.idPatient, email: patient.email, accessToken: 'TOK_ANCIEN',
    });
    expect((await POST(request({ token: patient.accessToken }, oldCookie))).status).toBe(403);

    const newCookie = signPatientSession({
      idPatient: patient.idPatient, email: patient.email, accessToken: patient.accessToken,
    });
    expect((await POST(request({ token: patient.accessToken }, newCookie))).status).toBe(200);
  });
});
