import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EN_TETE_DOSSIER_PAGE, MESSAGE_AUTRE_DOSSIER } from '@/lib/portail/dossierPage';

// Banc en style « signature réelle » (patron de `fiche/route.test.ts`) : seul
// Prisma est simulé, le cookie est signé pour de vrai.
const { prisma } = vi.hoisted(() => ({
  prisma: {
    patient: { findUnique: vi.fn() },
    consultation: { findFirst: vi.fn(), update: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { signPatientSession } from '@/lib/patient-session';
import { POST } from './route';

const PATIENT = { idPatient: 'PAT_SEED_02', email: 'jennifer.martin@fictif.wellneuro.fr' };

const compte = {
  idPatient: PATIENT.idPatient,
  actif: true,
  email: PATIENT.email,
  accessTokenRevoked: false,
  sessionsInvalidesAvant: null,
};

/** `segment` : celui de la page qui envoie ; `null` : en-tête absent. */
function post(segment: string | null = PATIENT.idPatient, { avecCookie = true } = {}): Request {
  return new Request('http://localhost/api/portail/consentement', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(avecCookie ? { cookie: `wn_portail=${encodeURIComponent(signPatientSession(PATIENT))}` } : {}),
      ...(segment === null ? {} : { [EN_TETE_DOSSIER_PAGE]: segment }),
    },
    body: JSON.stringify({}),
  });
}

describe('POST /api/portail/consentement — garde du dossier de la page ([[D-481]], DOC-14)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    prisma.patient.findUnique.mockResolvedValue(compte);
    prisma.consultation.findFirst.mockResolvedValue({
      idConsultation: 'CONS_TEST',
      idPatient: PATIENT.idPatient,
      statut: 'brouillon',
      consentement: null,
    });
    prisma.consultation.update.mockResolvedValue({});
  });

  it('segment de la page égal au dossier de la session : le consentement est recueilli', async () => {
    const res = await POST(post());
    expect(res.status).toBe(200);
    expect(prisma.consultation.update).toHaveBeenCalledTimes(1);
  });

  it('page ouverte sous un autre dossier, ou sans segment : 409 (T-51), rien d’écrit', async () => {
    for (const segment of ['PAT_AUTRE', null]) {
      const res = await POST(post(segment));
      expect(res.status).toBe(409);
      expect(await res.json()).toEqual({ ok: false, reason: 'autre_dossier', error: MESSAGE_AUTRE_DOSSIER });
    }
    expect(prisma.consultation.findFirst).not.toHaveBeenCalled();
    expect(prisma.consultation.update).not.toHaveBeenCalled();
  });

  it('401 (sans session) et 403 (compte refusé) passent avant la garde', async () => {
    expect((await POST(post('PAT_AUTRE', { avecCookie: false }))).status).toBe(401);
    prisma.patient.findUnique.mockResolvedValueOnce({ ...compte, actif: false });
    expect((await POST(post('PAT_AUTRE'))).status).toBe(403);
  });
});
