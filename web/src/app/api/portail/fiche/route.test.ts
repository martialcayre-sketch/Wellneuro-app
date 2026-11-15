import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EN_TETE_DOSSIER_PAGE, MESSAGE_AUTRE_DOSSIER } from '@/lib/portail/dossierPage';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    patient: { findUnique: vi.fn() },
    consultation: { findFirst: vi.fn(), update: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { signPatientSession } from '@/lib/patient-session';
import { POST } from './route';

/**
 * La même requête sous le segment donné (`null` : en-tête absent), et sans
 * cookie au besoin : la garde du dossier de la page ([[D-481]], DOC-14).
 */
function sousSegment(req: Request, segment: string | null, { sansCookie = false } = {}): Request {
  const entetes = new Headers(req.headers);
  if (segment === null) entetes.delete(EN_TETE_DOSSIER_PAGE);
  else entetes.set(EN_TETE_DOSSIER_PAGE, segment);
  if (sansCookie) entetes.delete('cookie');
  return new Request(req, { headers: entetes });
}

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
      [EN_TETE_DOSSIER_PAGE]: PATIENT.idPatient,
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

  // La garde du dossier de la page ([[D-481]], DOC-14).
  it('page ouverte sous un autre dossier, ou sans segment : 409 (T-51), rien d’écrit', async () => {
    for (const segment of ['PAT_AUTRE', null]) {
      const res = await POST(sousSegment(post(), segment));
      expect(res.status).toBe(409);
      expect(await res.json()).toEqual({ ok: false, reason: 'autre_dossier', error: MESSAGE_AUTRE_DOSSIER });
    }
    expect(prisma.consultation.update).not.toHaveBeenCalled();
  });

  it('sans session, le 401 passe avant la garde du dossier de la page', async () => {
    const res = await POST(sousSegment(post(), 'PAT_AUTRE', { sansCookie: true }));
    expect(res.status).toBe(401);
  });

  it('compte refusé (introuvable ou révoqué) : le 403 passe avant la garde du dossier de la page', async () => {
    prisma.patient.findUnique.mockReset();
    prisma.patient.findUnique.mockResolvedValue(null);
    const res = await POST(sousSegment(post(), 'PAT_AUTRE'));
    expect(res.status).toBe(403);
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
