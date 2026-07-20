import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma, sendPortailLinkEmail } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn(), update: vi.fn() },
    consultation: { findMany: vi.fn(), create: vi.fn() },
  },
  sendPortailLinkEmail: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/consultation/email', () => ({ sendPortailLinkEmail }));
vi.mock('@/lib/ids', () => ({ createPublicId: (prefix: string) => `${prefix}_TEST_12345678` }));

import { GET, POST } from './route';

const patient = {
  idPatient: 'PAT_1',
  praticienEmail: 'p@wellneuro.fr',
  email: 'sophie.nicola@example.test',
  prenom: 'Sophie',
  actif: true,
  accessToken: 'TOK_EXISTANT',
  accessTokenRevoked: true,
  accessTokenCreatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

function getRequest(query = 'idPatient=PAT_1'): Request {
  return new Request(`http://localhost/api/praticien/consultations?${query}`);
}

function postRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/praticien/consultations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/praticien/consultations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.consultation.findMany.mockResolvedValue([]);
  });

  it('refuse sans session (401)', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET(getRequest());
    expect(res.status).toBe(401);
    expect(prisma.consultation.findMany).not.toHaveBeenCalled();
  });

  it('scope la recherche des consultations au praticien en session', async () => {
    await GET(getRequest());
    expect(prisma.consultation.findMany).toHaveBeenCalledWith({
      where: { idPatient: 'PAT_1', praticienEmail: 'p@wellneuro.fr' },
      orderBy: { createdAt: 'desc' },
    });
  });
});

// Régression E8 — la plus grave des trois : sans garde, cette route levait la
// révocation d'accès d'un patient et envoyait le lien du portail, pour
// n'importe quel idPatient fourni. Garde d'appartenance ajoutée le 2026-07-21.
describe('POST /api/praticien/consultations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue(patient);
    prisma.consultation.create.mockResolvedValue({});
    sendPortailLinkEmail.mockResolvedValue(undefined);
  });

  it('refuse sans session (401)', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await POST(postRequest({ idPatient: 'PAT_1' }));
    expect(res.status).toBe(401);
  });

  it('patient d’un autre praticien : 403, aucune écriture, aucun e-mail envoyé', async () => {
    prisma.patient.findUnique.mockResolvedValue({ ...patient, praticienEmail: 'autre@wellneuro.fr' });
    const res = await POST(postRequest({ idPatient: 'PAT_1' }));
    expect(res.status).toBe(403);
    const json = (await res.json()) as { reason: string };
    expect(json.reason).toBe('forbidden');
    expect(prisma.patient.update).not.toHaveBeenCalled();
    expect(prisma.consultation.create).not.toHaveBeenCalled();
    expect(sendPortailLinkEmail).not.toHaveBeenCalled();
  });

  it('idPatient introuvable : 404, distinct du 403', async () => {
    prisma.patient.findUnique.mockResolvedValue(null);
    const res = await POST(postRequest({ idPatient: 'PAT_INCONNU' }));
    expect(res.status).toBe(404);
    const json = (await res.json()) as { reason: string };
    expect(json.reason).toBe('patient_not_found');
  });

  it('patient accessible : lève la révocation et envoie le lien (comportement inchangé pour le bon praticien)', async () => {
    const res = await POST(postRequest({ idPatient: 'PAT_1' }));
    expect(res.status).toBe(200);
    expect(prisma.patient.update).toHaveBeenCalledWith({
      where: { idPatient: 'PAT_1' },
      data: expect.objectContaining({ accessTokenRevoked: false }),
    });
    expect(sendPortailLinkEmail).toHaveBeenCalledOnce();
  });
});
