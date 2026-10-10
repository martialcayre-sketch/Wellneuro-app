import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    questionnaireReponse: { findMany: vi.fn() },
    consultation: { findFirst: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('./effetsIndesirablesPrisma', () => ({ lireEffetsIndesirables: vi.fn(async () => undefined) }));
vi.mock('./adressagesSignalAlertePrisma', () => ({ lireCouverturesAdressage: vi.fn(async () => undefined) }));
vi.mock('./selectionPrioritePrisma', async importOriginal => ({
  ...(await importOriginal<typeof import('./selectionPrioritePrisma')>()),
  lireSelectionPriorite: vi.fn(async () => null),
}));

import {
  ANAMNESE_C1_FIXTURE,
  chaineC1DeReference,
  passationsC1Fixture,
  retablirTablePriorites,
  signerTablePriorites,
} from './chaineC1Fixture';
import { adaptRuntimeInputs } from './runtimeFromPrisma';
import { estFindingQuestionnaire } from './safetyFindingSource';
import { refusChaineC1 } from './verifierChaineC1';

// [[D-275]] §2, LOT-3 — LES RACCORDEMENTS, éprouvés de bout en bout (revue
// Codex de #1375, P1-3). Le banc de garde éprouve le producteur ; celui-ci
// éprouve qu'il est ALIMENTÉ : remplacer les réponses de sécurité par `[]` dans
// l'adaptateur, la chaîne ou le vérificateur doit rougir ici.

const POSITIF_HORS_EPISODE = {
  idReponse: 'REP_BDI_HORS_EPISODE',
  idQuestionnaire: 'Q_NEU_01',
  dateReponse: new Date('2026-02-01T09:00:00.000Z'),
  scoresJson: { rawAnswers: { B7: 2 } },
  statutValidite: 'VALID',
};
const NON = { ...POSITIF_HORS_EPISODE, idReponse: 'REP_BDI_NON', scoresJson: { rawAnswers: { B7: 0 } } };

beforeEach(() => {
  signerTablePriorites();
  prisma.consultation.findFirst.mockResolvedValue({ id: 'CONS_PORTEUSE', ...ANAMNESE_C1_FIXTURE });
});
afterEach(() => {
  retablirTablePriorites();
  vi.clearAllMocks();
});

describe('adaptateur — les réponses de sécurité viennent de TOUTES les passations', () => {
  const patient = { idPatient: 'PAT_1', createdAt: new Date('2026-01-01T00:00:00.000Z') };

  it('lues sur la quatrième entrée, pas sur les passations tronquées', () => {
    expect(adaptRuntimeInputs(patient, [], null, [POSITIF_HORS_EPISODE]).reponsesSecurite).toHaveLength(1);
    // Contre-épreuve : une passation tronquée (lecture datée) n'en retire aucune.
    expect(adaptRuntimeInputs(patient, [POSITIF_HORS_EPISODE], null, []).reponsesSecurite).toEqual([]);
  });

  it('seule l’invalidation retire, drapeau de validité allumé ou non', () => {
    const historique = { ...POSITIF_HORS_EPISODE, statutValidite: 'HISTORICAL_ONLY' };
    const invalide = { ...POSITIF_HORS_EPISODE, statutValidite: 'INVALID' };
    for (const drapeau of ['1', undefined]) {
      if (drapeau) process.env.WN_ENABLE_VALIDITE_PASSATIONS = drapeau;
      else delete process.env.WN_ENABLE_VALIDITE_PASSATIONS;
      expect(adaptRuntimeInputs(patient, [], null, [historique]).reponsesSecurite, `drapeau ${drapeau}`).toHaveLength(1);
      expect(adaptRuntimeInputs(patient, [], null, [invalide]).reponsesSecurite, `drapeau ${drapeau}`).toEqual([]);
    }
    delete process.env.WN_ENABLE_VALIDITE_PASSATIONS;
  });
});

describe('chaîne — un positif hors épisode suspend la décision', () => {
  it('le constat est ouvert, l’abstention requise, et aucune priorité n’est proposée', () => {
    const chaine = chaineC1DeReference({ passationsSecurite: [POSITIF_HORS_EPISODE] });
    expect(chaine.episode.includedResponseIds).not.toContain(POSITIF_HORS_EPISODE.idReponse);
    expect(chaine.review.safetyFindings.filter(f => estFindingQuestionnaire(f.findingId))).toHaveLength(1);
    expect(chaine.review.abstention.status).toBe('required');
    expect(chaine.decisionCard.selectedMainPriority ?? null).toBeNull();
  });

  it('un protocole diffusé s’interrompt : l’empreinte de la carte change', () => {
    const avant = chaineC1DeReference();
    const apres = chaineC1DeReference({ passationsSecurite: [POSITIF_HORS_EPISODE] });
    expect(apres.decisionCard.inputHash).not.toBe(avant.decisionCard.inputHash);
  });

  it('un « non » hors épisode ne change rien à l’empreinte', () => {
    expect(chaineC1DeReference({ passationsSecurite: [NON] }).decisionCard.inputHash)
      .toBe(chaineC1DeReference().decisionCard.inputHash);
  });
});

describe('parité — le vérificateur recalcule la carte du cockpit, positif compris', () => {
  it('témoin : sans passation ajoutée, la carte de référence est acceptée', async () => {
    const chaine = chaineC1DeReference();
    prisma.questionnaireReponse.findMany.mockResolvedValue(passationsC1Fixture());
    expect(await refusChaineC1(chaine.episode, chaine.decisionCard)).toBeNull();
  });

  it('base portant le positif : la carte émise est acceptée (aucun 409)', async () => {
    const chaine = chaineC1DeReference({ passationsSecurite: [POSITIF_HORS_EPISODE] });
    prisma.questionnaireReponse.findMany.mockResolvedValue([...passationsC1Fixture(), POSITIF_HORS_EPISODE]);
    expect(await refusChaineC1(chaine.episode, chaine.decisionCard)).toBeNull();
  });

  it('contre-épreuve : le vérificateur LIT le positif — sans lui, la carte diverge', async () => {
    const chaine = chaineC1DeReference({ passationsSecurite: [POSITIF_HORS_EPISODE] });
    prisma.questionnaireReponse.findMany.mockResolvedValue(passationsC1Fixture());
    expect(await refusChaineC1(chaine.episode, chaine.decisionCard)).not.toBeNull();
  });
});
