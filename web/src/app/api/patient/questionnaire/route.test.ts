import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    assignation: { findUnique: vi.fn() },
    patient: { findUnique: vi.fn() },
    // NF-7 : la définition d'un instrument du cabinet se lit en base.
    cabinetInstrument: { findUnique: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { signPatientSession } from '@/lib/patient-session';
import {
  SAFETY_QUESTIONNAIRE_CABINET_METADATA,
  SAFETY_QUESTIONNAIRE_CABINET_SHA256,
} from '@/lib/clinical/safetyQuestionnaireCabinetV1';
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

/**
 * Requête du PROPRIÉTAIRE, cookie de session portail en main. Depuis le LOT-04
 * c'est le seul chemin d'entrée : le repli email est retiré des six routes
 * `api/patient/*`, et tous les cas ci-dessous qui passaient auparavant
 * `&email=…` sans cookie recevraient désormais 401.
 */
function requeteProprietaire(): Request {
  return request(
    '',
    signPatientSession({ idPatient: assignation.idPatient, email: assignation.emailPatient }),
  );
}

describe('GET /api/patient/questionnaire — propriété session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    prisma.assignation.findUnique.mockResolvedValue(assignation);
    prisma.patient.findUnique.mockResolvedValue({
      idPatient: assignation.idPatient,
      actif: true,
      accessTokenRevoked: false,
      email: assignation.emailPatient,
      // Majeur : la pause d'âge (D-284 §3) ne s'applique pas aux cas ci-dessous.
      dateNaissance: '1985-03-14',
    });
  });

  it('autorise le propriétaire via cookie sans email dans l’URL', async () => {
    const cookie = signPatientSession({ idPatient: assignation.idPatient, email: assignation.emailPatient });
    const response = await GET(request('', cookie));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, assignation: { idPatient: assignation.idPatient } });
  });

  // D/52 : les anciens libellés par défaut ne s'affichent plus comme une note
  // du praticien ; une vraie note passe.
  it.each([
    ['Pack Pack de base', null],
    ['Envoi groupé — bibliothèque', null],
    ['À remplir à jeun, avant la consultation.', 'À remplir à jeun, avant la consultation.'],
  ])('note %s → %s', async (notes, attendu) => {
    prisma.assignation.findUnique.mockResolvedValue({ ...assignation, notes });
    const response = await GET(requeteProprietaire());
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.assignation.notes).toBe(attendu);
  });

  it('refuse un autre patient même lorsque son email est identique', async () => {
    const cookie = signPatientSession({ idPatient: 'PAT_2', email: assignation.emailPatient });
    expect((await GET(request('', cookie))).status).toBe(404);
  });

  it('refuse l’adresse exacte SANS cookie : le repli email est retiré (401)', async () => {
    // Ce test remplace « conserve le fallback legacy avec email correct », qui
    // vérifiait le contraire — et dont l'assertion `patient.findUnique` JAMAIS
    // APPELÉ était précisément le défaut : comparer une adresse ne dit rien de
    // `actif` ni de `accessTokenRevoked`. Le repli n'a pas été rapiécé, il a été
    // supprimé : plus aucun appelant légitime ne l'atteignait depuis que
    // `/patient/[idAssignation]` redirige vers `/portail/connexion`.
    //
    // 401, pas 404 : le client (`portail/[token]/questionnaires/[idAssignation]`)
    // ne redirige vers le gate que sur 400/401 — une session absente doit
    // rester récupérable, pas se présenter comme un lien mort.
    const response = await GET(request(`&email=${encodeURIComponent(assignation.emailPatient)}`));
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ ok: false, reason: 'unauthorized' });
    expect(prisma.assignation.findUnique).not.toHaveBeenCalled();
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
    const response = await GET(requeteProprietaire());
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
    const response = await GET(requeteProprietaire());
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
      const response = await GET(requeteProprietaire());
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
      const response = await GET(requeteProprietaire());
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
    // légitime (session portail) ne peut pas ouvrir la saisie d'une annulée.
    prisma.assignation.findUnique.mockResolvedValue({ ...assignation, statut: 'Annulée' });
    const response = await GET(requeteProprietaire());
    expect(response.status).toBe(410);
    expect(await response.json()).toMatchObject({ ok: false, reason: 'annulee' });
  });

  describe('pause d’âge dès l’ouverture (D-284 §3, t02)', () => {
    const quinzeAns = () => new Date(Date.now() - 15 * 366 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const patient = (dateNaissance: string | null) => ({
      idPatient: assignation.idPatient,
      actif: true,
      accessTokenRevoked: false,
      email: assignation.emailPatient,
      dateNaissance,
    });

    it('★ date de naissance manquante : 409 avant tout formulaire, même refus que la soumission', async () => {
      prisma.patient.findUnique.mockResolvedValue(patient(null));
      const response = await GET(requeteProprietaire());
      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({ ok: false, reason: 'date_naissance_requise' });
    });

    it('★ patient mineur : 409, pause maintenue jusqu’au circuit des mineurs', async () => {
      prisma.patient.findUnique.mockResolvedValue(patient(quinzeAns()));
      const response = await GET(requeteProprietaire());
      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({ ok: false, reason: 'circuit_mineur_requis' });
    });

    it.each(['verrouille', 'modification_demandee'])(
      'des réponses en lecture seule (%s) restent consultables : la pause porte sur la saisie',
      async (statutReponses) => {
        prisma.patient.findUnique.mockResolvedValue(patient(quinzeAns()));
        prisma.assignation.findUnique.mockResolvedValue({ ...assignation, statutReponses });
        const response = await GET(requeteProprietaire());
        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({ ok: true });
      },
    );
  });

  describe('dossier clos (arbitrage du 2026-11-04, option A)', () => {
    const quinzeAns = () => new Date(Date.now() - 15 * 366 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const clos = (dateNaissance: string) => ({
      idPatient: assignation.idPatient,
      actif: true,
      accessTokenRevoked: false,
      email: assignation.emailPatient,
      dateNaissance,
      suiviClotureLe: new Date('2026-11-01T09:00:00Z'),
    });

    it('★ clos majeur : 409 dossier_cloture, avec le message patient', async () => {
      prisma.patient.findUnique.mockResolvedValue(clos('1985-03-14'));
      const response = await GET(requeteProprietaire());
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({
        ok: false,
        reason: 'dossier_cloture',
        error: 'Votre suivi est clôturé : vous ne pouvez plus répondre à ce questionnaire.',
      });
    });

    it('★ clos mineur : la clôture passe avant la garde d’âge', async () => {
      prisma.patient.findUnique.mockResolvedValue(clos(quinzeAns()));
      const response = await GET(requeteProprietaire());
      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({ ok: false, reason: 'dossier_cloture' });
    });

    it.each(['verrouille', 'modification_demandee'])(
      'des réponses en lecture seule (%s) restent consultables sur un dossier clos',
      async (statutReponses) => {
        prisma.patient.findUnique.mockResolvedValue(clos('1985-03-14'));
        prisma.assignation.findUnique.mockResolvedValue({ ...assignation, statutReponses });
        const response = await GET(requeteProprietaire());
        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({ ok: true });
      },
    );

    it('reprise du suivi : l’affectation redevient remplissable', async () => {
      prisma.patient.findUnique.mockResolvedValue({ ...clos('1985-03-14'), suiviClotureLe: null });
      const response = await GET(requeteProprietaire());
      expect(response.status).toBe(200);
    });
  });
});

// NF-7 ([[D-303]] §3, réponses 20261111-0027-a et 0028-a) : le verdict
// `encartUrgenceCabinet` se lit sur la COPIE de la déclaration prise à l'envoi,
// sans repli sur l'instrument. Présent seulement drapeau allumé, sur un `CAB_`
// dont la copie vaut `true`. Drapeau éteint : la réponse d'avant NF-7.
describe('GET /api/patient/questionnaire — encart d’un instrument du cabinet (NF-7)', () => {
  const CAB = { ...assignation, idQuestionnaire: 'CAB_1', poseQuestionSuicide: true };

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.WN_ENABLE_DECLARATION_SUICIDE_CAB;
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    prisma.assignation.findUnique.mockResolvedValue(CAB);
    prisma.patient.findUnique.mockResolvedValue({
      idPatient: assignation.idPatient,
      actif: true,
      accessTokenRevoked: false,
      email: assignation.emailPatient,
      dateNaissance: '1985-03-14',
    });
    // L'instrument dit « non » aujourd'hui : la copie « oui » doit l'emporter.
    prisma.cabinetInstrument.findUnique.mockResolvedValue({
      idInstrument: 'CAB_1',
      titre: 'Humeur cabinet',
      definitionJson: { sections: [] },
      scoringJson: null,
      statutRelecture: 'valide',
      actif: true,
      poseQuestionSuicide: false,
    });
  });

  afterEach(() => {
    delete process.env.WN_ENABLE_DECLARATION_SUICIDE_CAB;
  });

  async function lire() {
    const response = await GET(requeteProprietaire());
    expect(response.status).toBe(200);
    return response.json();
  }

  it('drapeau éteint : aucun verdict, même sur une copie à vrai', async () => {
    expect('encartUrgenceCabinet' in (await lire())).toBe(false);
  });

  it('drapeau allumé, copie à vrai : l’encart est dû, quelle que soit la déclaration courante de l’instrument', async () => {
    process.env.WN_ENABLE_DECLARATION_SUICIDE_CAB = 'true';
    expect((await lire()).encartUrgenceCabinet).toBe(true);
  });

  it('drapeau allumé, copie à « non » ou non déclarée : aucun verdict, sans repli sur l’instrument', async () => {
    process.env.WN_ENABLE_DECLARATION_SUICIDE_CAB = 'true';
    prisma.cabinetInstrument.findUnique.mockResolvedValue({
      idInstrument: 'CAB_1', titre: 'x', definitionJson: { sections: [] }, scoringJson: null,
      statutRelecture: 'valide', actif: true, poseQuestionSuicide: true,
    });
    for (const copie of [false, null]) {
      prisma.assignation.findUnique.mockResolvedValue({ ...CAB, poseQuestionSuicide: copie });
      expect('encartUrgenceCabinet' in (await lire()), String(copie)).toBe(false);
    }
  });

  it('drapeau allumé : un questionnaire du catalogue ne reçoit jamais ce verdict', async () => {
    process.env.WN_ENABLE_DECLARATION_SUICIDE_CAB = 'true';
    prisma.assignation.findUnique.mockResolvedValue({ ...assignation, poseQuestionSuicide: true });
    expect('encartUrgenceCabinet' in (await lire())).toBe(false);
  });
});

// [[D-515]] (PR 3 du lot de code) : la désignation COPIÉE, servie pour le
// message de [[D-277]] §1, aux seules conditions du courriel au praticien —
// drapeau allumé, copie « oui » lisible, `SAF-QUEST-02` signée. La règle
// elle-même est confrontée au courriel dans `reponseSuicide.guard.test.ts` ;
// ce banc tient que la route la sert, et rien d'autre.
describe('GET /api/patient/questionnaire — désignation servie d’un instrument du cabinet (D-515)', () => {
  const COPIE = { instrument: 'Humeur cabinet', enonce: 'Idées noires', options: [{ v: 0, l: 'Jamais' }, { v: 2, l: 'Souvent' }] };
  const CAB = {
    ...assignation,
    idQuestionnaire: 'CAB_1',
    poseQuestionSuicide: true,
    questionSuicideId: 'Q2',
    questionSuicideOptionNon: 0,
    questionSuicideCopie: COPIE,
  };
  const ETAT_LIVRE = { ...SAFETY_QUESTIONNAIRE_CABINET_METADATA };

  function signer(): void {
    SAFETY_QUESTIONNAIRE_CABINET_METADATA.validationExterne = true;
    SAFETY_QUESTIONNAIRE_CABINET_METADATA.dateValidation = '2026-11-14T00:00:00.000Z';
    SAFETY_QUESTIONNAIRE_CABINET_METADATA.sourceReference = 'Signature simulée par le banc — jamais servie en production.';
    SAFETY_QUESTIONNAIRE_CABINET_METADATA.shaPerimetre = SAFETY_QUESTIONNAIRE_CABINET_SHA256;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WN_ENABLE_DECLARATION_SUICIDE_CAB = 'true';
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    prisma.assignation.findUnique.mockResolvedValue(CAB);
    prisma.patient.findUnique.mockResolvedValue({
      idPatient: assignation.idPatient,
      actif: true,
      accessTokenRevoked: false,
      email: assignation.emailPatient,
      dateNaissance: '1985-03-14',
    });
    prisma.cabinetInstrument.findUnique.mockResolvedValue({
      idInstrument: 'CAB_1', titre: 'Humeur cabinet', definitionJson: { sections: [] }, scoringJson: null,
      statutRelecture: 'valide', actif: true, poseQuestionSuicide: true,
    });
  });

  afterEach(() => {
    Object.assign(SAFETY_QUESTIONNAIRE_CABINET_METADATA, ETAT_LIVRE);
    delete process.env.WN_ENABLE_DECLARATION_SUICIDE_CAB;
  });

  async function lire() {
    const response = await GET(requeteProprietaire());
    expect(response.status).toBe(200);
    return response.json();
  }

  it('table signée, copie « oui » lisible : la question et la valeur « non » copiées, rien d’autre', async () => {
    signer();
    const corps = await lire();
    expect(corps.encartUrgenceCabinet).toBe(true);
    expect(corps.designationSuicideCabinet).toEqual({ idQuestion: 'Q2', valeurNon: 0 });
  });

  it('table NON signée (état livré) : l’encart, pas la désignation', async () => {
    const corps = await lire();
    expect(corps.encartUrgenceCabinet).toBe(true);
    expect('designationSuicideCabinet' in corps).toBe(false);
  });

  it('table signée, drapeau éteint : ni encart ni désignation', async () => {
    signer();
    delete process.env.WN_ENABLE_DECLARATION_SUICIDE_CAB;
    const corps = await lire();
    expect('encartUrgenceCabinet' in corps).toBe(false);
    expect('designationSuicideCabinet' in corps).toBe(false);
  });

  it('table signée, désignation inconnue (§7) ou copie « non » : pas de désignation servie', async () => {
    signer();
    for (const assignationLue of [
      { ...CAB, questionSuicideId: null, questionSuicideOptionNon: null, questionSuicideCopie: null },
      { ...CAB, questionSuicideOptionNon: 1 },
      { ...CAB, poseQuestionSuicide: false },
    ]) {
      prisma.assignation.findUnique.mockResolvedValue(assignationLue);
      expect('designationSuicideCabinet' in (await lire())).toBe(false);
    }
  });
});
