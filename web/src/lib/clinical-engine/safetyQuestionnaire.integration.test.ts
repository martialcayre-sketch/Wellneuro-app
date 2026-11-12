import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, corpus } = vi.hoisted(() => ({
  // [[D-495]] §6.4 : un claim retiré, ou le corpus illisible, entre
  // l'affichage et l'enregistrement — défaut : tout est admissible.
  corpus: { retires: new Set<string>(), illisible: false },
  prisma: {
    questionnaireReponse: { findMany: vi.fn() },
    consultation: { findFirst: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('./adressagesSignalAlertePrisma', () => ({ lireCouverturesAdressage: vi.fn(async () => undefined) }));
vi.mock('./selectionPrioritePrisma', async importOriginal => ({
  ...(await importOriginal<typeof import('./selectionPrioritePrisma')>()),
  lireSelectionPriorite: vi.fn(async () => null),
}));

import { PRIORITY_RULES_V1 } from '@/lib/clinical/priorityRulesV1';
import {
  ANAMNESE_C1_FIXTURE,
  CANDIDAT_RANG_1,
  chaineC1DeReference,
  passationsC1Fixture,
  retablirTablePriorites,
  signerTablePriorites,
} from './chaineC1Fixture';
import { adaptRuntimeInputs } from './runtimeFromPrisma';
import { estFindingQuestionnaire } from './safetyFindingSource';
import { refusChaineC1 } from './verifierChaineC1';

// [[D-495]] : l'orientation, la convergence et la chaîne C1 lisent
// l'admissibilité des claims au corpus. Tout couple est admissible ici — les
// cas où un claim tombe, ou où le corpus est illisible, ont leurs bancs aux
// services (`orientationService`, `contradictionsService`, `chaineC1`).
vi.mock('@/lib/clinical/admissibiliteClaims', async (importOriginal) => {
  const reel = await importOriginal<typeof import('@/lib/clinical/admissibiliteClaims')>();
  return {
    ...reel,
    claimsAdmissiblesAuCorpus: async (references: { claimId: string; versionClaim: string }[]) =>
      corpus.illisible
        ? null
        : new Set(references
          .map(reference => `${reference.claimId}::${reference.versionClaim}`)
          .filter(cle => !corpus.retires.has(cle))),
  };
});

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
// Relevées le 2026-10-19 sur `main` c2739354 (voir le cas qui les lit). DEUX
// valeurs : la carte, elle, dépend de la forme de `Q_ALI_01` servie sous
// `WN_ALI_01_SIIN57` (la table d'orientation en a été affranchie, pas la carte).
// Allumer le drapeau en production change donc l'empreinte de chaque carte.
//
// Relevées à nouveau le 2026-11-10 ([[D-474]], application de [[D-438]]) : la
// version du score passe de v14/v15 à v16/v17, et elle entre dans l'empreinte.
// Dérive VOULUE, décidée par D-438 §5 : chaque carte diffusée dérive, et son
// écran protocole s'éteint jusqu'à réapprobation par le praticien.
const EMPREINTE_REFERENCE =
  process.env.WN_ALI_01_SIIN57 === 'true'
    ? 'c5b806ab5b64917ae2eefa109677ce815331725eb8f3f74bdfee7408cd83fab7'
    : 'f2e808ade7a5fa8998fa7edf53d7a727175d94918dcf6deb32065b8c5dc4c6a0';

beforeEach(() => {
  signerTablePriorites();
  prisma.consultation.findFirst.mockResolvedValue({ id: 'CONS_PORTEUSE', ...ANAMNESE_C1_FIXTURE });
});
afterEach(() => {
  corpus.retires.clear();
  corpus.illisible = false;
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

  // EMPREINTE DE RÉFÉRENCE FIGÉE — reste nommé de [[D-275]] (handoff du
  // 2026-10-10, dette t05). La garde « règle jointe sur réponse positive
  // seulement » protège une propriété : un dossier SANS réponse positive garde
  // l'empreinte d'avant le lot, sans quoi le rejeu patient dirait dérivée chaque
  // carte diffusée et éteindrait tous les écrans protocole. La comparaison
  // relative (« non » = sans passation) ne la voit pas si les deux bougent
  // ensemble ; une valeur figée, si. Ce banc rougit pour TOUT changement de ce
  // qui entre dans l'empreinte de la carte de référence : le mettre à jour est
  // une décision consciente — elle dérive les cartes diffusées.
  it('sans réponse positive, l’empreinte de la carte de référence est figée', () => {
    expect(chaineC1DeReference().decisionCard.inputHash).toBe(EMPREINTE_REFERENCE);
    expect(chaineC1DeReference({ passationsSecurite: [NON] }).decisionCard.inputHash).toBe(EMPREINTE_REFERENCE);
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

describe('D-495 §6.4 — le vérificateur relit le corpus au présent', () => {
  const claimDuRang1 = () => {
    const regle = PRIORITY_RULES_V1.find(r => `priority:${r.id}` === CANDIDAT_RANG_1);
    if (!regle) throw new Error('règle du rang 1 introuvable');
    const claim = regle.justificationClaims[0];
    return `${claim.claimId}::${claim.versionClaim}`;
  };

  it('un claim retiré entre l’affichage et l’enregistrement : la carte diverge (409)', async () => {
    const chaine = chaineC1DeReference();
    prisma.questionnaireReponse.findMany.mockResolvedValue(passationsC1Fixture());
    corpus.retires.add(claimDuRang1());
    expect(await refusChaineC1(chaine.episode, chaine.decisionCard)).not.toBeNull();
  });

  it('corpus devenu illisible : la carte diverge aussi (409), jamais acceptée par défaut', async () => {
    const chaine = chaineC1DeReference();
    prisma.questionnaireReponse.findMany.mockResolvedValue(passationsC1Fixture());
    corpus.illisible = true;
    expect(await refusChaineC1(chaine.episode, chaine.decisionCard)).not.toBeNull();
  });
});
