import { beforeEach, describe, expect, it } from 'vitest';
import { vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    assignation: { findUnique: vi.fn(), update: vi.fn() },
    patient: { findUnique: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { signPatientSession } from '@/lib/patient-session';
import { POST } from './route';

const assignation = {
  idAssignation: 'ASS_CONSENTEMENT_TEST',
  idPatient: 'PAT_SEED_03',
  emailPatient: 'sophie.nicola@example.test',
  idQuestionnaire: 'Q_NEU_03',
  titre: 'Questionnaire test',
  dateLimite: null as string | null,
  statut: 'En attente',
  statutReponses: 'non_rempli',
  consentement: 'non_donne',
};

function requete(body: Record<string, unknown>): Request {
  const cookie = signPatientSession({ idPatient: assignation.idPatient, email: assignation.emailPatient });
  return new Request('http://localhost/api/patient/consentement', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: `wn_portail=${encodeURIComponent(cookie)}`,
    },
    body: JSON.stringify({ idAssignation: assignation.idAssignation, ...body }),
  });
}

describe('POST /api/patient/consentement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    prisma.assignation.findUnique.mockResolvedValue(assignation);
    prisma.patient.findUnique.mockResolvedValue({
      idPatient: assignation.idPatient,
      actif: true,
      email: assignation.emailPatient,
      accessToken: 'TOKEN_TEST',
      accessTokenRevoked: false,
      sessionsInvalidesAvant: null,
    });
    prisma.assignation.update.mockResolvedValue(assignation);
  });

  it('donne le consentement sur une assignation ouverte', async () => {
    const res = await POST(requete({ action: 'donner' }));
    expect(res.status).toBe(200);
    expect(prisma.assignation.update).toHaveBeenCalledTimes(1);
  });

  // Fil A, résiduel documenté au merge de #438 : ni consentement ni demande de
  // modification n'ont de sens sur une assignation annulée. Refus dans la
  // route, pas seulement dans l'écran — même discipline que les deux autres
  // chemins patient déjà gardés.
  it('refuse de donner le consentement sur une assignation annulée : 410, sans écriture', async () => {
    prisma.assignation.findUnique.mockResolvedValue({ ...assignation, statut: 'Annulée' });
    const res = await POST(requete({ action: 'donner' }));
    expect(res.status).toBe(410);
    expect(await res.json()).toMatchObject({ ok: false, reason: 'annulee' });
    expect(prisma.assignation.update).not.toHaveBeenCalled();
  });

  it('refuse une demande de modification sur une assignation annulée : 410, sans écriture', async () => {
    // `statutReponses: 'verrouille'` forcé ici n'est PAS un état atteignable en
    // production — #438 borne l'annulation aux assignations `non_rempli`, donc
    // une réelle `statut='Annulée'` a toujours `statutReponses='non_rempli'`.
    // Le forçage prouve que le garde d'annulation précède le contrôle d'état
    // (ligne 85 de la route) et mord indépendamment de lui — défense en
    // profondeur si cet invariant se relâchait un jour.
    prisma.assignation.findUnique.mockResolvedValue({
      ...assignation,
      statut: 'Annulée',
      statutReponses: 'verrouille',
    });
    const res = await POST(requete({ action: 'demander_modification', commentaire: 'test' }));
    expect(res.status).toBe(410);
    expect(await res.json()).toMatchObject({ ok: false, reason: 'annulee' });
    expect(prisma.assignation.update).not.toHaveBeenCalled();
  });
});
