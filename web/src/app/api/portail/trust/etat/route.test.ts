import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// LA DÉSIGNATION SERVIE AU FORMULAIRE ([[D-281]] §2, étape 3) : la liste et sa
// version, ou `null` — jamais l'espace TRUST fermé sur une lecture en échec.

const { prisma, designationPour } = vi.hoisted(() => ({
  prisma: {
    patient: { findUnique: vi.fn() },
    trustAcknowledgement: { findMany: vi.fn() },
    trustChoiceEvent: { findMany: vi.fn() },
    trustAdverseEffectReport: { findMany: vi.fn() },
    trustPrivacyIncident: { findMany: vi.fn() },
    trustRightsRequest: { findMany: vi.fn() },
  },
  designationPour: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/trust/pauseEffetIndesirableServeur', () => ({ designationPour }));

import { signPatientSession } from '@/lib/patient-session';
import { GET } from './route';

const patient = {
  idPatient: 'PAT_TEST',
  email: 'jennifer.martin@example.test',
  prenom: 'Jennifer',
  nom: 'Martin',
  actif: true,
  accessTokenRevoked: false,
  praticienEmail: 'praticien@wellneuro.fr',
  dateNaissance: '1979-07-28' as string | null,
};

function request(query = ''): Request {
  const cookie = signPatientSession({ idPatient: patient.idPatient, email: patient.email });
  return new Request(`http://localhost/api/portail/trust/etat${query}`, {
    headers: { cookie: `wn_portail=${encodeURIComponent(cookie)}` },
  });
}

describe('GET /api/portail/trust/etat — désignation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    prisma.patient.findUnique.mockResolvedValue(patient);
    for (const table of ['trustAcknowledgement', 'trustChoiceEvent', 'trustAdverseEffectReport', 'trustPrivacyIncident', 'trustRightsRequest'] as const) {
      prisma[table].findMany.mockResolvedValue([]);
    }
  });

  it('sert les éléments désignables et la version du programme', async () => {
    designationPour.mockResolvedValue({ version: 'v-courante', elements: [{ actionId: 'a-magnesium', title: 'Magnésium le soir' }] });
    const json = await (await GET(request('?designation=1'))).json();
    expect(json).toMatchObject({
      ok: true,
      elementsProgramme: [{ actionId: 'a-magnesium', title: 'Magnésium le soir' }],
      versionProgramme: 'v-courante',
    });
  });

  it('désignation fermée : null, le formulaire d’avant', async () => {
    designationPour.mockResolvedValue(null);
    const json = await (await GET(request('?designation=1'))).json();
    expect(json).toMatchObject({ ok: true, elementsProgramme: null, versionProgramme: null });
  });

  it('une lecture en échec rend null, et l’espace TRUST reste servi', async () => {
    designationPour.mockRejectedValue(new Error('base indisponible'));
    const res = await GET(request('?designation=1'));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, elementsProgramme: null, versionProgramme: null });
  });

  it('une liste vide (programme non servi, aucune intervention ferme) reste une liste vide : la désignation sans liste', async () => {
    designationPour.mockResolvedValue({ version: 'v-courante', elements: [] });
    const json = await (await GET(request('?designation=1'))).json();
    expect(json).toMatchObject({ ok: true, elementsProgramme: [], versionProgramme: 'v-courante' });
  });

  it('sans `designation=1` (accueil, questionnaires) : aucune désignation calculée, aucun rejeu', async () => {
    const json = await (await GET(request())).json();
    expect(designationPour).not.toHaveBeenCalled();
    expect(json).toMatchObject({ ok: true, elementsProgramme: null, versionProgramme: null });
  });
});

describe('GET /api/portail/trust/etat — l’accueil sous les conditions d’utilisation (D-292 §3)', () => {
  const accuse = (documentKey: string, documentVersion = 'v1') => ({
    documentKey,
    documentVersion,
    type: 'pris_connaissance',
    createdAt: new Date('2026-10-01T08:00:00Z'),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    prisma.patient.findUnique.mockResolvedValue(patient);
    for (const table of ['trustAcknowledgement', 'trustChoiceEvent', 'trustAdverseEffectReport', 'trustPrivacyIncident', 'trustRightsRequest'] as const) {
      prisma[table].findMany.mockResolvedValue([]);
    }
    designationPour.mockResolvedValue(null);
  });

  afterEach(() => {
    delete process.env.WN_PORTAIL_CONDITIONS;
  });

  it('drapeau fermé : la porte d’avant, conditions ni servies ni présentées', async () => {
    expect(await (await GET(request())).json()).toMatchObject({
      avantDeCommencerRequis: true,
      accueilConditions: false,
      conditionsOuvertes: false,
    });
  });

  it('drapeau ouvert, nouveau patient majeur : les conditions seules', async () => {
    process.env.WN_PORTAIL_CONDITIONS = 'true';
    expect(await (await GET(request())).json()).toMatchObject({
      avantDeCommencerRequis: true,
      accueilConditions: true,
      conditionsOuvertes: true,
    });
  });

  it('drapeau ouvert, patient suivi sur une version ancienne : aucun accueil', async () => {
    process.env.WN_PORTAIL_CONDITIONS = 'true';
    prisma.trustAcknowledgement.findMany.mockResolvedValue([accuse('donnees_confidentialite', 'v9')]);
    expect(await (await GET(request())).json()).toMatchObject({
      avantDeCommencerRequis: false,
      accueilConditions: false,
    });
  });

  it('drapeau ouvert, dossier mineur ou sans date de naissance : l’accueil en trois textes', async () => {
    process.env.WN_PORTAIL_CONDITIONS = 'true';
    for (const dateNaissance of [null, '2012-03-04']) {
      prisma.patient.findUnique.mockResolvedValue({ ...patient, dateNaissance });
      expect(await (await GET(request())).json(), String(dateNaissance)).toMatchObject({
        avantDeCommencerRequis: true,
        accueilConditions: false,
        conditionsOuvertes: false,
      });
    }
  });
});
