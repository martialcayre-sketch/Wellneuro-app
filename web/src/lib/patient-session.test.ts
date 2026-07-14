import { beforeEach, describe, expect, it, vi } from 'vitest';

const { patient } = vi.hoisted(() => ({ patient: { findUnique: vi.fn() } }));
vi.mock('@/lib/prisma', () => ({ prisma: { patient } }));

import {
  isSessionAuthorizedForAssignment,
  signPatientSession,
  verifyPatientSession,
} from './patient-session';

describe('session patient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
  });

  it('signe et vérifie une session, mais refuse une valeur falsifiée', () => {
    const signed = signPatientSession({ idPatient: 'PAT_1', email: 'Patient@Example.test' });
    expect(verifyPatientSession(signed)).toEqual({ idPatient: 'PAT_1', email: 'patient@example.test' });
    expect(verifyPatientSession(`${signed}x`)).toBeNull();
  });

  it('autorise uniquement le patient actif propriétaire de l’assignation', async () => {
    patient.findUnique.mockResolvedValue({ actif: true, accessToken: 'TOK_TEST', accessTokenRevoked: false, email: 'patient@example.test' });
    const assignment = { idPatient: 'PAT_1', emailPatient: 'patient@example.test' };
    await expect(isSessionAuthorizedForAssignment(
      { idPatient: 'PAT_1', email: 'patient@example.test' },
      assignment,
    )).resolves.toBe(true);
    await expect(isSessionAuthorizedForAssignment(
      { idPatient: 'PAT_2', email: 'patient@example.test' },
      assignment,
    )).resolves.toBe(false);
  });

  it('refuse un portail révoqué ou un patient inactif', async () => {
    const session = { idPatient: 'PAT_1', email: 'patient@example.test' };
    const assignment = { idPatient: 'PAT_1', emailPatient: 'patient@example.test' };
    patient.findUnique.mockResolvedValueOnce({ actif: true, accessToken: 'TOK_TEST', accessTokenRevoked: true, email: session.email });
    await expect(isSessionAuthorizedForAssignment(session, assignment)).resolves.toBe(false);
    patient.findUnique.mockResolvedValueOnce({ actif: false, accessToken: 'TOK_TEST', accessTokenRevoked: false, email: session.email });
    await expect(isSessionAuthorizedForAssignment(session, assignment)).resolves.toBe(false);
  });

  it('autorise une assignation historique après correction de l’email patient', async () => {
    const session = { idPatient: 'PAT_1', email: 'nouveau@example.test' };
    patient.findUnique.mockResolvedValue({
      actif: true,
      accessToken: 'TOK_TEST',
      accessTokenRevoked: false,
      email: session.email,
    });
    await expect(isSessionAuthorizedForAssignment(session, {
      idPatient: 'PAT_1',
      emailPatient: 'ancien@example.test',
    })).resolves.toBe(true);
  });
});
