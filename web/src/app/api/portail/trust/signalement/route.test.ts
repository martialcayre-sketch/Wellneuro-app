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
import { EN_TETE_DOSSIER_PAGE, MESSAGE_AUTRE_DOSSIER } from '@/lib/portail/dossierPage';

const patient = {
  idPatient: 'PAT_TEST',
  email: 'michel.dogne@example.test',
  prenom: 'Michel',
  nom: 'Dogné',
  actif: true,
  accessTokenRevoked: false,
  praticienEmail: 'praticien@wellneuro.fr',
};

/**
 * `segment` : celui de la page qui envoie ; `null` : en-tête absent. Défaut : le
 * dossier de la session. `session: false` : sans cookie.
 */
function request(body: object, opts: { segment?: string | null; session?: boolean } = {}): Request {
  const cookie = signPatientSession({
    idPatient: patient.idPatient,
    email: patient.email
  });
  const segment = opts.segment === undefined ? patient.idPatient : opts.segment;
  return new Request('http://localhost/api/portail/trust/signalement', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.session === false ? {} : { cookie: `wn_portail=${encodeURIComponent(cookie)}` }),
      ...(segment === null ? {} : { [EN_TETE_DOSSIER_PAGE]: segment }),
    },
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

  describe('garde du dossier de la page (D-481, DOC-12)', () => {
    const SEVERE = {
      categorie: 'effet_indesirable',
      produitLibelle: 'Complément X',
      symptomes: 'Palpitations',
      severiteDeclaree: 'severe',
    };
    const rienEcritNiNotifie = () => {
      expect(prisma.trustAdverseEffectReport.create).not.toHaveBeenCalled();
      expect(prisma.trustPrivacyIncident.create).not.toHaveBeenCalled();
      expect(prisma.trustRightsRequest.create).not.toHaveBeenCalled();
      expect(notifierPraticienSignalement).not.toHaveBeenCalled();
      expect(premierSignalementDeLHeure).not.toHaveBeenCalled();
    };

    it('page ouverte sous un autre dossier : 409 (T-51), ni orienté, ni écrit, ni notifié', async () => {
      const response = await POST(request(SEVERE, { segment: 'PAT_AUTRE' }));
      expect(response.status).toBe(409);
      const corps = (await response.json()) as Record<string, unknown>;
      expect(corps).toEqual({ ok: false, reason: 'autre_dossier', error: MESSAGE_AUTRE_DOSSIER });
      rienEcritNiNotifie();
    });

    it('segment absent : 409, rien d’écrit ni notifié, pour chaque catégorie', async () => {
      for (const corps of [
        SEVERE,
        { categorie: 'incident_confidentialite', categorieIncident: 'autre', description: 'x' },
        { categorie: 'droit', typeDroit: 'acces', description: 'x' },
      ]) {
        expect((await POST(request(corps, { segment: null }))).status).toBe(409);
      }
      rienEcritNiNotifie();
    });

    it('401 et 403 passent avant la garde', async () => {
      expect((await POST(request(SEVERE, { session: false, segment: 'PAT_AUTRE' }))).status).toBe(401);
      prisma.patient.findUnique.mockResolvedValueOnce({ ...patient, accessTokenRevoked: true });
      expect((await POST(request(SEVERE, { segment: 'PAT_AUTRE' }))).status).toBe(403);
      rienEcritNiNotifie();
    });

    it('segment égal au dossier de la session, même encodé : accepté', async () => {
      expect((await POST(request(SEVERE, { segment: encodeURIComponent(patient.idPatient) }))).status).toBe(200);
      expect(prisma.trustAdverseEffectReport.create).toHaveBeenCalledTimes(1);
    });
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
