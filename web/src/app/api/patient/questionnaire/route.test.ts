import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    assignation: { findUnique: vi.fn() },
    patient: { findUnique: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { signPatientSession } from '@/lib/patient-session';
import { GET } from './route';

const assignation = {
  idAssignation: 'ASS_SESSION_TEST',
  idPatient: 'PAT_1',
  emailPatient: 'sophie.nicola@example.test',
  idQuestionnaire: 'Q_NEU_03',
  titre: 'Questionnaire test',
  dateLimite: null,
  notes: null,
  statut: 'En attente',
  consentement: 'donne',
  statutReponses: 'en_cours',
};

function request(query = '', cookie?: string): Request {
  return new Request(`http://localhost/api/patient/questionnaire?id=${assignation.idAssignation}${query}`, {
    headers: cookie ? { cookie: `wn_portail=${encodeURIComponent(cookie)}` } : {},
  });
}

describe('GET /api/patient/questionnaire — propriété session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    prisma.assignation.findUnique.mockResolvedValue(assignation);
    prisma.patient.findUnique.mockResolvedValue({
      idPatient: assignation.idPatient,
      actif: true,
      accessToken: 'TOK_TEST',
      accessTokenRevoked: false,
      email: assignation.emailPatient,
    });
  });

  it('autorise le propriétaire via cookie sans email dans l’URL', async () => {
    const cookie = signPatientSession({ idPatient: assignation.idPatient, email: assignation.emailPatient });
    const response = await GET(request('', cookie));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, assignation: { idPatient: assignation.idPatient } });
  });

  it('refuse un autre patient même lorsque son email est identique', async () => {
    const cookie = signPatientSession({ idPatient: 'PAT_2', email: assignation.emailPatient });
    expect((await GET(request('', cookie))).status).toBe(404);
  });

  it('conserve le fallback legacy avec email correct', async () => {
    const response = await GET(request(`&email=${encodeURIComponent(assignation.emailPatient)}`));
    expect(response.status).toBe(200);
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
  });

  it('une assignation DÉVERROUILLÉE et périmée reste ouverte : 200, jamais 410', async () => {
    // LE DÉFAUT CORRIGÉ. Cette route est la PREMIÈRE porte : l'écran l'appelle
    // avant `consentement` et avant `submit`. Tant qu'elle ne connaissait pas
    // l'exemption `deverrouille`, l'exemption des trois autres portes était
    // inatteignable depuis l'UI — le hub affichait « Corriger », le clic rendait
    // 410, et le praticien avait déverrouillé pour rien.
    prisma.assignation.findUnique.mockResolvedValue({
      ...assignation,
      statutReponses: 'deverrouille',
      dateLimite: '2020-01-01',
    });
    const response = await GET(request(`&email=${encodeURIComponent(assignation.emailPatient)}`));
    expect(response.status).toBe(200);
  });

  it('non_rempli et périmé reste refusé : 410 reason expired (non-régression)', async () => {
    // L'exemption ne vaut QUE pour `deverrouille`. Sans cette borne, elle
    // rouvrirait toutes les assignations périmées du portail.
    prisma.assignation.findUnique.mockResolvedValue({
      ...assignation,
      statutReponses: 'non_rempli',
      dateLimite: '2020-01-01',
    });
    const response = await GET(request(`&email=${encodeURIComponent(assignation.emailPatient)}`));
    expect(response.status).toBe(410);
    expect(await response.json()).toMatchObject({ ok: false, reason: 'expired' });
  });

  it.each(['verrouille', 'modification_demandee'])(
    '%s et périmé : 200, droit de consultation permanent inchangé',
    async statutReponses => {
      prisma.assignation.findUnique.mockResolvedValue({
        ...assignation,
        statutReponses,
        dateLimite: '2020-01-01',
      });
      const response = await GET(request(`&email=${encodeURIComponent(assignation.emailPatient)}`));
      expect(response.status).toBe(200);
    },
  );

  // ── `consentementPossible` : le VERDICT vient du serveur ───────────────────
  // `isDeadlineExpired` parse `AAAA-MM-JJT23:59:59.999` SANS fuseau : évaluée
  // par un composant `'use client'`, elle se lisait dans le fuseau du navigateur
  // et non dans celui du serveur. Le champ existe pour que l'écran n'ait plus à
  // recomposer la règle.
  describe('consentementPossible', () => {
    async function verdict(over: Record<string, unknown>): Promise<boolean> {
      prisma.assignation.findUnique.mockResolvedValue({ ...assignation, ...over });
      const response = await GET(request(`&email=${encodeURIComponent(assignation.emailPatient)}`));
      return ((await response.json()) as { consentementPossible: boolean }).consentementPossible;
    }

    it('vrai sans date limite', async () => {
      expect(await verdict({ dateLimite: null })).toBe(true);
    });

    it('vrai sur une date limite à venir', async () => {
      expect(await verdict({ dateLimite: '2999-12-31' })).toBe(true);
    });

    it('FAUX sur une date limite dépassée', async () => {
      // C'est ce cas-là qui pilote le garde des deux écrans.
      expect(await verdict({ statutReponses: 'verrouille', dateLimite: '2020-01-01' })).toBe(false);
    });

    it('vrai sur une assignation DÉVERROUILLÉE, date limite dépassée comprise', async () => {
      // Miroir exact du refus 410 de `api/patient/consentement` : le
      // déverrouillage rouvre le consentement.
      expect(await verdict({ statutReponses: 'deverrouille', dateLimite: '2020-01-01' })).toBe(true);
    });
  });

  it('une assignation annulée est indisponible : 410 reason annulee', async () => {
    // Fil A : refus dans la route, pas seulement dans l'écran. Le propriétaire
    // légitime (email correct) ne peut pas ouvrir la saisie d'une annulée.
    prisma.assignation.findUnique.mockResolvedValue({ ...assignation, statut: 'Annulée' });
    const response = await GET(request(`&email=${encodeURIComponent(assignation.emailPatient)}`));
    expect(response.status).toBe(410);
    expect(await response.json()).toMatchObject({ ok: false, reason: 'annulee' });
  });
});
