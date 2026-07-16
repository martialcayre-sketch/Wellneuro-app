import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, notifierPraticienSignalement } = vi.hoisted(() => ({
  prisma: {
    patient: { findUnique: vi.fn() },
    trustAdverseEffectReport: { create: vi.fn() },
    trustPrivacyIncident: { create: vi.fn() },
    trustRightsRequest: { create: vi.fn() },
  },
  notifierPraticienSignalement: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/trust/notification', () => ({ notifierPraticienSignalement }));

import { signPatientSession } from '@/lib/patient-session';
import { POST } from './route';

const patient = {
  idPatient: 'PAT_TEST',
  email: 'michel.dogne@example.test',
  prenom: 'Michel',
  nom: 'Dogné',
  actif: true,
  accessToken: 'TOK_TRUST_TEST',
  accessTokenRevoked: false,
  praticienEmail: 'praticien@wellneuro.fr',
};

function request(body: object): Request {
  const cookie = signPatientSession({
    idPatient: patient.idPatient,
    email: patient.email,
    accessToken: patient.accessToken,
  });
  return new Request('http://localhost/api/portail/trust/signalement', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: `wn_portail=${encodeURIComponent(cookie)}` },
    body: JSON.stringify({ token: patient.accessToken, ...body }),
  });
}

describe('POST /api/portail/trust/signalement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    prisma.patient.findUnique.mockResolvedValue(patient);
    prisma.trustAdverseEffectReport.create.mockResolvedValue({});
    prisma.trustPrivacyIncident.create.mockResolvedValue({});
    prisma.trustRightsRequest.create.mockResolvedValue({});
  });

  it('effet indésirable sévère : orientation urgence tracée avec la règle, message patient renvoyé, praticien notifié', async () => {
    const response = await POST(
      request({
        categorie: 'effet_indesirable',
        produitLibelle: 'Complément X',
        symptomes: 'Palpitations',
        severiteDeclaree: 'severe',
      }),
    );
    expect(response.status).toBe(200);
    const corps = (await response.json()) as { ok: boolean; messagePatient?: string };
    expect(corps.messagePatient).toContain('15');
    expect(prisma.trustAdverseEffectReport.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orientation: 'urgence_conseillee',
        regleId: 'orientation-effet-indesirable',
        regleVersion: 'v1',
        severiteDeclaree: 'severe',
      }),
    });
    expect(notifierPraticienSignalement).toHaveBeenCalledWith('praticien@wellneuro.fr');
  });

  it('effet indésirable sans produit ou sévérité invalide : 400, rien n’est écrit', async () => {
    const response = await POST(
      request({ categorie: 'effet_indesirable', symptomes: 'x', severiteDeclaree: 'grave' }),
    );
    expect(response.status).toBe(400);
    expect(prisma.trustAdverseEffectReport.create).not.toHaveBeenCalled();
  });

  it('incident de confidentialité et demande de droit sont enregistrés', async () => {
    expect(
      (
        await POST(
          request({
            categorie: 'incident_confidentialite',
            categorieIncident: 'connexion_non_reconnue',
            description: 'Connexion inconnue hier soir.',
          }),
        )
      ).status,
    ).toBe(200);
    expect(
      (await POST(request({ categorie: 'demande_droit', typeDemande: 'rectification' }))).status,
    ).toBe(200);
    expect(prisma.trustPrivacyIncident.create).toHaveBeenCalled();
    expect(prisma.trustRightsRequest.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: 'rectification' }),
    });
  });
});
