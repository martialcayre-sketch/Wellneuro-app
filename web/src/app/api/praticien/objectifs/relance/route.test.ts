import { beforeEach, describe, expect, it, vi } from 'vitest';

// Banc minimal de la garde du dossier fermé sur cette route (t11) : clos ou
// désactivé, chacun son refus, et aucun courrier ne part.
const { getServerSession, prisma, verifierAppartenancePatient, sendObjectifProposeEmail, deciderRelance } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    objectifNegocie: { findMany: vi.fn() },
    finObjectif: { findMany: vi.fn() },
    ratificationObjectif: { findMany: vi.fn() },
    amendementObjectif: { findMany: vi.fn() },
    correspondancePatient: { findMany: vi.fn() },
  },
  verifierAppartenancePatient: vi.fn(),
  sendObjectifProposeEmail: vi.fn(),
  deciderRelance: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/praticien/appartenance', () => ({
  emailPraticien: () => 'praticien@wellneuro.fr',
  verifierAppartenancePatient,
}));
vi.mock('@/lib/patient/featureFlag', () => ({ isDossierDeuxVoixEnabled: () => true }));
vi.mock('@/lib/consultation/email', () => ({ sendObjectifProposeEmail }));
// La décision de chaîne a son propre banc (`relanceObjectif.test.ts`) : ici,
// seul compte ce que la route lui donne à lire, et ce qu'elle fait d'un refus
// de garde.
vi.mock('@/lib/praticien/relanceObjectif', async orig => ({
  ...(await orig<typeof import('@/lib/praticien/relanceObjectif')>()),
  deciderRelance,
}));

import { POST } from './route';

function requete(corps: unknown): Request {
  return new Request('http://localhost/api/praticien/objectifs/relance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
  });
}

describe('POST /api/praticien/objectifs/relance — dossier fermé (t11)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    verifierAppartenancePatient.mockResolvedValue('autorise');
  });

  it('un dossier DÉSACTIVÉ reçoit son propre refus, pas « clôturé »', async () => {
    prisma.patient.findUnique.mockResolvedValue({ actif: false, suiviClotureLe: null });
    const res = await POST(requete({ idPatient: 'PAT_TEST' }));
    expect(res.status).toBe(409);
    const payload = await res.json();
    expect(payload.reason).toBe('dossier_desactive');
    expect(payload.error).toMatch(/désactivé/);
    expect(payload.error).not.toMatch(/clôturé/);
    expect(prisma.objectifNegocie.findMany).not.toHaveBeenCalled();
    expect(sendObjectifProposeEmail).not.toHaveBeenCalled();
  });

  it('un dossier CLOS garde le refus « clôturé »', async () => {
    prisma.patient.findUnique.mockResolvedValue({
      actif: false,
      suiviClotureLe: new Date('2026-08-01T09:00:00.000Z'),
    });
    const res = await POST(requete({ idPatient: 'PAT_TEST' }));
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('dossier_cloture');
    expect(sendObjectifProposeEmail).not.toHaveBeenCalled();
  });
});

describe('POST /api/praticien/objectifs/relance — envois comptés et garde ([[D-398]] §3, [[D-399]])', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    verifierAppartenancePatient.mockResolvedValue('autorise');
    prisma.patient.findUnique
      .mockResolvedValueOnce({ actif: true, suiviClotureLe: null })
      .mockResolvedValueOnce({ email: 'patient@example.test', prenom: 'Sophie' });
    for (const table of ['objectifNegocie', 'finObjectif', 'ratificationObjectif', 'amendementObjectif', 'correspondancePatient'] as const) {
      prisma[table].findMany.mockResolvedValue([]);
    }
    deciderRelance.mockReturnValue({ ok: true });
    sendObjectifProposeEmail.mockResolvedValue('Envoye');
  });

  it('la cadence ne lit que les courriers partis ou en partance', async () => {
    await POST(requete({ idPatient: 'PAT_TEST' }));

    expect(prisma.correspondancePatient.findMany.mock.calls[0][0].where).toMatchObject({
      type: 'objectif_propose',
      OR: [{ statut: 'Envoye' }, { statut: 'Non_envoye', erreurCourte: 'réservé : envoi en cours' }],
    });
  });

  it('un refus de garde répond comme la cadence : un courrier vient de partir', async () => {
    sendObjectifProposeEmail.mockResolvedValueOnce('Refuse_garde');
    const res = await POST(requete({ idPatient: 'PAT_TEST' }));

    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ ok: false, reason: 'cadence' });
  });

  it('un envoi accepté répond 200', async () => {
    const res = await POST(requete({ idPatient: 'PAT_TEST' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, statut: 'Envoye' });
  });
});
