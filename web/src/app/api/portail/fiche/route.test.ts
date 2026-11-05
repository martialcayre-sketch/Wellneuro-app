import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    patient: { findUnique: vi.fn() },
    consultation: { findFirst: vi.fn(), update: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { signPatientSession } from '@/lib/patient-session';
import { POST } from './route';

const PATIENT = { idPatient: 'PAT_SEED_01', email: 'sophie.nicola@fictif.wellneuro.fr' };

const compte = {
  idPatient: PATIENT.idPatient,
  actif: true,
  email: PATIENT.email,
  accessTokenRevoked: false,
  sessionsInvalidesAvant: null,
  suiviClotureLe: null,
};

const consultation = {
  idConsultation: 'CONS_TEST',
  idPatient: PATIENT.idPatient,
  statut: 'brouillon',
  consentement: 'donne',
  motif: null,
};

function post(): Request {
  return new Request('http://localhost/api/portail/fiche', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: `wn_portail=${encodeURIComponent(signPatientSession(PATIENT))}`,
    },
    body: JSON.stringify({ fiche: { situation_familiale: 'Mariée', profession: 'Enseignante' } }),
  });
}

describe('POST /api/portail/fiche — dossier clos (arbitrage du 2026-11-05)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    prisma.patient.findUnique.mockResolvedValue(compte);
    prisma.consultation.findFirst.mockResolvedValue(consultation);
    prisma.consultation.update.mockResolvedValue({});
  });

  it('★ dossier clos : 409 dossier_cloture, la fiche n’est pas écrite', async () => {
    prisma.patient.findUnique.mockResolvedValue({ ...compte, suiviClotureLe: new Date('2026-11-01T09:00:00Z') });
    const response = await POST(post());
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      ok: false,
      reason: 'dossier_cloture',
      error: 'Votre suivi est clôturé : vous ne pouvez plus modifier votre fiche.',
    });
    expect(prisma.consultation.update).not.toHaveBeenCalled();
  });

  it('reprise du suivi : la fiche s’enregistre de nouveau', async () => {
    const response = await POST(post());
    expect(response.status).toBe(200);
    expect(prisma.consultation.update).toHaveBeenCalledTimes(1);
  });
});
