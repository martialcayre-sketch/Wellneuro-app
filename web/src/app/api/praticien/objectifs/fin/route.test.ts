import { beforeEach, describe, expect, it, vi } from 'vitest';

// Banc minimal de la cadence ([[D-327]]) sur cette route : au plafond, 429 et
// rien n'est écrit. La somme des tables a son banc propre
// (`lib/praticien/cadenceObjectifs.test.ts`).
const { getServerSession, prisma, verifierAppartenancePatient, cadenceObjectifsAtteinte } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    objectifNegocie: { findMany: vi.fn() },
    finObjectif: { findMany: vi.fn(), create: vi.fn() },
  },
  verifierAppartenancePatient: vi.fn(),
  cadenceObjectifsAtteinte: vi.fn(async (_idPatient: string) => false),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/praticien/appartenance', () => ({
  emailPraticien: () => 'praticien@wellneuro.fr',
  verifierAppartenancePatient,
}));
vi.mock('@/lib/patient/featureFlag', () => ({ isDossierDeuxVoixEnabled: () => true }));
vi.mock('@/lib/praticien/cadenceObjectifs', () => ({ cadenceObjectifsAtteinte }));

import { POST } from './route';

function requete(corps: unknown): Request {
  return new Request('http://localhost/api/praticien/objectifs/fin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
  });
}

describe('POST /api/praticien/objectifs/fin — cadence (D-327)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    verifierAppartenancePatient.mockResolvedValue('autorise');
    prisma.patient.findUnique.mockResolvedValue({ actif: true, suiviClotureLe: null });
  });

  it('au plafond horaire du dossier : 429, texte praticien, rien écrit', async () => {
    cadenceObjectifsAtteinte.mockResolvedValueOnce(true);
    const res = await POST(requete({ idPatient: 'PAT_TEST', idObjectif: 'OBJ_1', motif: 'atteint' }));
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({
      ok: false,
      reason: 'cadence',
      error: 'Trop d’enregistrements sur ce dossier en une heure (plafond technique). Réessayez plus tard.',
    });
    expect(cadenceObjectifsAtteinte).toHaveBeenCalledWith('PAT_TEST');
    expect(prisma.finObjectif.create).not.toHaveBeenCalled();
  });

  it('la cadence n’est consultée qu’APRÈS la garde d’appartenance', async () => {
    verifierAppartenancePatient.mockResolvedValue('autre_praticien');
    const res = await POST(requete({ idPatient: 'PAT_TEST', idObjectif: 'OBJ_1', motif: 'atteint' }));
    expect(res.status).toBe(403);
    expect(cadenceObjectifsAtteinte).not.toHaveBeenCalled();
  });
});
