import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, notifierPraticienSignalement, premierSignalementDeLHeure } = vi.hoisted(() => ({
  prisma: {
    patient: { findUnique: vi.fn() },
    trustAdverseEffectReport: { create: vi.fn() },
    trustPrivacyIncident: { create: vi.fn() },
    trustRightsRequest: { create: vi.fn() },
  },
  notifierPraticienSignalement: vi.fn(),
  premierSignalementDeLHeure: vi.fn(async (_idPatient: string) => true),
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/trust/notification', () => ({ notifierPraticienSignalement, premierSignalementDeLHeure }));

import { signPatientSession } from '@/lib/patient-session';
import { POST } from './route';

const patient = {
  idPatient: 'PAT_TEST',
  email: 'michel.dogne@example.test',
  prenom: 'Michel',
  nom: 'Dogné',
  actif: true,
  accessTokenRevoked: false,
  praticienEmail: 'praticien@wellneuro.fr',
};

function request(body: object): Request {
  const cookie = signPatientSession({
    idPatient: patient.idPatient,
    email: patient.email
  });
  return new Request('http://localhost/api/portail/trust/signalement', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: `wn_portail=${encodeURIComponent(cookie)}` },
    body: JSON.stringify({ ...body }),
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
        regleVersion: 'v2',
        severiteDeclaree: 'severe',
      }),
    });
    expect(notifierPraticienSignalement).toHaveBeenCalledWith(expect.objectContaining({ idPatient: 'PAT_TEST', praticienEmail: 'praticien@wellneuro.fr' }));
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

  // D-398 §1 (Q4) : la trace au dossier nomme la sorte et l'identifiant du
  // signalement — la route les passe, la notification les écrit.
  it.each([
    ['effet_indesirable', prisma.trustAdverseEffectReport, { produitLibelle: 'Complément X', symptomes: 'Palpitations', severiteDeclaree: 'severe' }],
    ['incident_confidentialite', prisma.trustPrivacyIncident, { categorieIncident: 'connexion_non_reconnue', description: 'Connexion inconnue.' }],
    ['demande_droit', prisma.trustRightsRequest, { typeDemande: 'rectification' }],
  ])('%s : la notification reçoit le dossier, la sorte et l’identifiant du signalement (D-398)', async (categorie, table, champs) => {
    table.create.mockResolvedValueOnce({ id: 'signalement-1' });
    expect((await POST(request({ categorie, ...champs }))).status).toBe(200);
    expect(notifierPraticienSignalement).toHaveBeenCalledWith({
      idPatient: 'PAT_TEST',
      praticienEmail: 'praticien@wellneuro.fr',
      signalement: { categorie, id: 'signalement-1' },
    });
  });

  // D-328 : un e-mail par heure et par dossier. Le signalement, lui,
  // s'enregistre TOUJOURS — c'est seulement l'e-mail qui se tait.
  it.each(['severe', 'moderee', 'incertaine'])(
    'effet indésirable %s : le praticien est TOUJOURS prévenu, même après un dépôt dans l’heure (D-328 §2)',
    async (severiteDeclaree) => {
      premierSignalementDeLHeure.mockResolvedValue(false);
      const response = await POST(
        request({ categorie: 'effet_indesirable', produitLibelle: 'Complément X', symptomes: 'Palpitations', severiteDeclaree }),
      );
      expect(response.status).toBe(200);
      expect(notifierPraticienSignalement).toHaveBeenCalledWith(expect.objectContaining({ idPatient: 'PAT_TEST', praticienEmail: 'praticien@wellneuro.fr' }));
      premierSignalementDeLHeure.mockResolvedValue(true);
    },
  );

  it.each([
    ['effet_indesirable', { produitLibelle: 'Complément X', symptomes: 'Palpitations', severiteDeclaree: 'legere' }],
    ['incident_confidentialite', { categorieIncident: 'connexion_non_reconnue', description: 'Connexion inconnue.' }],
    ['demande_droit', { typeDemande: 'rectification' }],
  ])('%s déjà précédé d’un signalement dans l’heure : enregistré, sans e-mail (D-328)', async (categorie, champs) => {
    premierSignalementDeLHeure.mockResolvedValueOnce(false);
    const response = await POST(request({ categorie, ...champs }));
    expect(response.status).toBe(200);
    expect(premierSignalementDeLHeure).toHaveBeenCalledWith('PAT_TEST');
    const ecrits = prisma.trustAdverseEffectReport.create.mock.calls.length
      + prisma.trustPrivacyIncident.create.mock.calls.length
      + prisma.trustRightsRequest.create.mock.calls.length;
    expect(ecrits).toBe(1);
    expect(notifierPraticienSignalement).not.toHaveBeenCalled();
  });

  it('la cadence de l’e-mail se lit AVANT l’écriture — compter après ferait taire deux dépôts simultanés', async () => {
    await POST(request({ categorie: 'demande_droit', typeDemande: 'rectification' }));
    expect(premierSignalementDeLHeure.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.trustRightsRequest.create.mock.invocationCallOrder[0],
    );
    expect(notifierPraticienSignalement).toHaveBeenCalledWith(expect.objectContaining({ idPatient: 'PAT_TEST', praticienEmail: 'praticien@wellneuro.fr' }));
  });
});
