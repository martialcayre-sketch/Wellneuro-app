import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    patient: { findUnique: vi.fn() },
    assignation: { findMany: vi.fn() },
    questionnaireReponse: { aggregate: vi.fn() },
    // Signaux du parcours synchronisé (SP-CONV LOT-04) : consultation courante
    // + booklet envoyé. Par défaut : aucun des deux — l'état le plus prudent.
    consultation: { findFirst: vi.fn() },
    bookletEnvoi: { findFirst: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/observability/logger', () => ({
  logger: { security: vi.fn(), error: vi.fn() },
}));

import { signPatientSession } from '@/lib/patient-session';
import { GET } from './route';

const patient = {
  idPatient: 'PAT_TEST',
  prenom: 'Sophie',
  nom: 'Nicola',
  email: 'sophie.nicola@example.test',
  actif: true,
  accessToken: 'TOK_NOUVEAU',
  accessTokenRevoked: false,
};

function request(cookie: string): Request {
  return new Request('http://localhost/api/portail/assignations', {
    headers: { cookie: `wn_portail=${encodeURIComponent(cookie)}` },
  });
}

describe('GET /api/portail/assignations — liaison session au compte', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    prisma.patient.findUnique.mockResolvedValue(patient);
    prisma.assignation.findMany.mockResolvedValue([]);
    prisma.questionnaireReponse.aggregate.mockResolvedValue({ _max: { dateReponse: null } });
    prisma.consultation.findFirst.mockResolvedValue(null);
    prisma.bookletEnvoi.findFirst.mockResolvedValue(null);
  });

  it('expose les signaux du parcours (SP-CONV LOT-04) — statuts seuls, jamais de contenu', async () => {
    prisma.consultation.findFirst.mockResolvedValue({ idConsultation: 'C1', statut: 'en_cours' });
    prisma.bookletEnvoi.findFirst.mockResolvedValue({ id: 'B1' });
    const cookie = signPatientSession({ idPatient: patient.idPatient, email: patient.email });

    const corps = await (await GET(request(cookie))).json();
    expect(corps.parcours).toEqual({ consultationStatut: 'en_cours', bookletEnvoye: true });
  });

  // IDP2 LOT-02 : la révocation, et non plus la rotation du jeton, est ce qui
  // coupe une session ouverte.
  it('refuse un cookie émis avant une révocation', async () => {
    prisma.patient.findUnique.mockResolvedValue({
      ...patient,
      sessionsInvalidesAvant: new Date(Date.now() + 60_000),
    });
    const cookie = signPatientSession({
      idPatient: patient.idPatient,
      email: patient.email,
    });

    expect((await GET(request(cookie))).status).toBe(401);
    expect(prisma.assignation.findMany).not.toHaveBeenCalled();
  });

  it('survit à une réémission du jeton permanent', async () => {
    prisma.patient.findUnique.mockResolvedValue({ ...patient, accessToken: 'TOK_REEMIS' });
    const currentCookie = signPatientSession({
      idPatient: patient.idPatient,
      email: patient.email,
    });

    const response = await GET(request(currentCookie));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      patient: { idPatient: patient.idPatient, prenom: patient.prenom, nom: patient.nom },
      assignations: [],
      derniereReponseLe: null,
    });
  });

  it('expose la date de dernière réponse, sans aucune donnée de score', async () => {
    // Horloge de la reprise (SP-SPI / LOT-01) : seule la position dans le
    // temps est racontée au patient — jamais le score de cette réponse.
    prisma.questionnaireReponse.aggregate.mockResolvedValue({
      _max: { dateReponse: new Date('2025-07-21T12:00:00.000Z') },
    });
    const cookie = signPatientSession({
      idPatient: patient.idPatient,
      email: patient.email
    });

    const corps = await (await GET(request(cookie))).json();
    expect(corps.derniereReponseLe).toBe('2025-07-21T12:00:00.000Z');
    expect(JSON.stringify(corps)).not.toMatch(/score|interpretation/i);
  });
});
