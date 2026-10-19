import { afterEach, describe, expect, it, vi } from 'vitest';

// « DEPUIS » DE LA CARTE DE SÉCURITÉ — reste de [[D-275]] (P2-4, dette t05).
// La date est celle du plus ancien constat OUVERT : la passation pour une
// réponse aux questions sur le suicide, la validation de la porteuse pour un
// signal d'anamnèse — jamais la porteuse pour une réponse seule.

const { prisma } = vi.hoisted(() => ({
  prisma: {
    consultation: { findMany: vi.fn() },
    questionnaireReponse: { findMany: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/praticien/appartenance', () => ({ filtrePatientsDuPraticien: () => ({}) }));
vi.mock('@/lib/clinical-engine/adressagesSignalAlertePrisma', () => ({
  lireCouverturesAdressageGroupees: vi.fn(async () => undefined),
}));

import { ANAMNESE_C1_FIXTURE, ANAMNESE_C1_FIXTURE_AVEC_SIGNAL } from '@/lib/clinical-engine/chaineC1Fixture';
import { lireSignauxSecuriteOuverts } from './signauxSecurite';

const VALIDATION_PORTEUSE = new Date('2026-01-15T09:00:00.000Z');
const PASSATION = new Date('2026-02-01T09:00:00.000Z');

const POSITIF = {
  idPatient: 'PAT_1',
  idReponse: 'REP_BDI_POSITIF',
  idQuestionnaire: 'Q_NEU_01',
  dateReponse: PASSATION,
  scoresJson: { rawAnswers: { B7: 2 } },
  statutValidite: 'VALID',
};

function poserPorteuse(anamnese: typeof ANAMNESE_C1_FIXTURE) {
  prisma.consultation.findMany.mockResolvedValue([
    { id: 'CONS_PORTEUSE', idPatient: 'PAT_1', dateValidation: VALIDATION_PORTEUSE, ...anamnese },
  ]);
}

afterEach(() => vi.clearAllMocks());

describe('signaux de sécurité — « depuis » = le plus ancien constat ouvert', () => {
  it('réponse positive seule : la date de la passation, pas celle de la porteuse', async () => {
    poserPorteuse(ANAMNESE_C1_FIXTURE);
    prisma.questionnaireReponse.findMany.mockResolvedValue([POSITIF]);

    const [ligne] = await lireSignauxSecuriteOuverts('praticien@wellneuro.fr');
    expect(ligne.depuis).toEqual(PASSATION);
  });

  it('signal d’anamnèse ET réponse positive : la plus ancienne des deux', async () => {
    poserPorteuse(ANAMNESE_C1_FIXTURE_AVEC_SIGNAL);
    prisma.questionnaireReponse.findMany.mockResolvedValue([POSITIF]);

    const [ligne] = await lireSignauxSecuriteOuverts('praticien@wellneuro.fr');
    expect(ligne.findingIds.length).toBeGreaterThan(1);
    expect(ligne.depuis).toEqual(VALIDATION_PORTEUSE);
  });

  it('sans porteuse : la réponse positive reste datée', async () => {
    prisma.consultation.findMany.mockResolvedValue([]);
    prisma.questionnaireReponse.findMany.mockResolvedValue([POSITIF]);

    const [ligne] = await lireSignauxSecuriteOuverts('praticien@wellneuro.fr');
    expect(ligne.depuis).toEqual(PASSATION);
  });

  it('deux réponses positives : la plus ancienne', async () => {
    poserPorteuse(ANAMNESE_C1_FIXTURE);
    const ancienne = new Date('2026-01-20T09:00:00.000Z');
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      POSITIF,
      { ...POSITIF, idReponse: 'REP_BDI_ANCIENNE', dateReponse: ancienne },
    ]);

    const [ligne] = await lireSignauxSecuriteOuverts('praticien@wellneuro.fr');
    expect(ligne.depuis).toEqual(ancienne);
  });
});
