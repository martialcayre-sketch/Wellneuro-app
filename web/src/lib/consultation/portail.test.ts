import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({ prisma: { patient: { findUnique: vi.fn() } } }));

vi.mock('@/lib/prisma', () => ({ prisma }));

import { resolvePortailPatientFromSession } from './portail';
import type { PatientSession } from '@/lib/patient-session';

// LOT-04 : le portail se résout par le cookie de session (session.idPatient),
// jamais par un jeton d'URL. `resolvePortailPatientFromSession` délègue la
// validité (appartenance, actif, révocation, sessionsInvalidesAvant) à
// `isSessionValideForPatient` (importé réel, non mocké).
const IAT = Math.floor(new Date('2026-07-21T12:00:00.000Z').getTime() / 1000);

function session(surcharges: Partial<PatientSession> = {}): PatientSession {
  return { idPatient: 'PAT_TEST', email: 'michel.dogne@fictif.wellneuro.fr', iat: IAT, ...surcharges };
}

function patientFictif(surcharges: Record<string, unknown> = {}) {
  return {
    idPatient: 'PAT_TEST',
    email: 'michel.dogne@fictif.wellneuro.fr',
    actif: true,
    accessTokenRevoked: false,
    sessionsInvalidesAvant: null,
    ...surcharges,
  };
}

describe('resolvePortailPatientFromSession', () => {
  beforeEach(() => vi.clearAllMocks());

  it('résout le patient par idPatient de la session (jamais par un jeton d’URL)', async () => {
    prisma.patient.findUnique.mockResolvedValue(patientFictif());
    await expect(resolvePortailPatientFromSession(session())).resolves.not.toBeNull();
    expect(prisma.patient.findUnique).toHaveBeenCalledWith({ where: { idPatient: 'PAT_TEST' } });
  });

  it('renvoie null si le patient est introuvable', async () => {
    prisma.patient.findUnique.mockResolvedValue(null);
    await expect(resolvePortailPatientFromSession(session())).resolves.toBeNull();
  });

  it('refuse un accès portail révoqué (invariant révocation)', async () => {
    prisma.patient.findUnique.mockResolvedValue(patientFictif({ accessTokenRevoked: true }));
    await expect(resolvePortailPatientFromSession(session())).resolves.toBeNull();
  });

  it('refuse un compte inactif', async () => {
    prisma.patient.findUnique.mockResolvedValue(patientFictif({ actif: false }));
    await expect(resolvePortailPatientFromSession(session())).resolves.toBeNull();
  });

  it('refuse si l’email de la session ne correspond pas au compte', async () => {
    prisma.patient.findUnique.mockResolvedValue(patientFictif({ email: 'autre@fictif.wellneuro.fr' }));
    await expect(resolvePortailPatientFromSession(session())).resolves.toBeNull();
  });

  it('refuse une session émise avant une invalidation (révocation en vol)', async () => {
    prisma.patient.findUnique.mockResolvedValue(
      patientFictif({ sessionsInvalidesAvant: new Date((IAT + 60) * 1000) }),
    );
    await expect(resolvePortailPatientFromSession(session())).resolves.toBeNull();
  });
});
