import { existsSync } from 'node:fs';
import { join, posix } from 'node:path';
import { describe, expect, it } from 'vitest';
import { confirmAssessmentEpisode, proposeAssessmentEpisode } from '@/lib/clinical-engine/assessmentEpisode';
import { buildClinicalSnapshot } from '@/lib/clinical-engine/clinicalSnapshot';
import { buildDecisionCard } from '@/lib/clinical-engine/decisionCard';
import { buildProtocolDraft } from '@/lib/clinical-engine/protocolDraft';
import type {
  ClinicalReview,
  DecisionCard,
  PatientContext,
  QuestionnaireResponseInput,
} from '@/lib/clinical-engine/types';
import { RACINE, lire, retirerLignesDeCommentaire, specificateursImportes } from './balayageSources';

// BP-01 ([[D-266]]) — un résultat biologique ne modifie pas en silence le
// chemin documentaire : épisode (`includedResponseIds`), snapshot, carte de
// décision, brouillon de protocole et ses versions gardent la MÊME empreinte
// avec et sans résultats biologiques.
//
// DEUX PREUVES, parce qu'aucune ne suffit seule :
//   (a) STRUCTURE — depuis les constructeurs d'empreintes, aucun module
//       atteint par import (transitivement) ne lit `biology-library` ni les
//       résultats biologiques. Un résultat n'a donc AUCUN chemin de code vers
//       ces empreintes.
//   (b) EXÉCUTION — des résultats biologiques glissés en champ surnuméraire
//       dans chaque entrée (cast) ne bougent pas l'empreinte : un constructeur
//       qui se mettrait à recopier son entrée (`...input`) rougirait.
//
// Les « entrées décisionnelles du nouveau module tracées » (fiches d'usage)
// ne se gardent pas ici : le module n'existe pas, il naît en BP-12a avec sa
// trace — consigné au lot, pas simulé par un banc vide.
const RACINES_DOCUMENTAIRES = [
  'web/src/lib/clinical-engine/assessmentEpisode.ts',
  'web/src/lib/clinical-engine/clinicalSnapshot.ts',
  'web/src/lib/clinical-engine/decisionCard.ts',
  'web/src/lib/clinical-engine/protocolDraft.ts',
  'web/src/lib/protocol/versioning.ts',
  'web/src/lib/protocol/fromPrisma.ts',
  'web/src/lib/documents/depuisSynthese.ts',
];

const LECTURE_BIOLOGIE = /\.resultatBiologique\b|\bresultatsBiologiques\b|\bresultats_biologiques\b/;

/** Résout un spécificateur local vers un fichier du dépôt, ou `null` (paquet). */
function resoudre(depuis: string, specificateur: string): string | null {
  let base: string;
  if (specificateur.startsWith('@/')) base = posix.join('web/src', specificateur.slice(2));
  else if (specificateur.startsWith('.')) base = posix.join(posix.dirname(depuis), specificateur);
  else return null;
  for (const candidat of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`]) {
    if (/\.tsx?$/.test(candidat) && existsSync(join(RACINE, candidat))) return candidat;
  }
  return null;
}

/** Fermeture transitive des imports locaux, et les spécificateurs rencontrés. */
export function fermeture(racines: readonly string[], lireSource: (chemin: string) => string) {
  const vus = new Set<string>();
  const fautifs: string[] = [];
  const pile = [...racines];
  while (pile.length > 0) {
    const chemin = pile.pop()!;
    if (vus.has(chemin)) continue;
    vus.add(chemin);
    const source = lireSource(chemin);
    for (const spec of specificateursImportes(source)) {
      if (/(^|\/)biology-library(\/|$)/.test(spec)) fautifs.push(`${chemin} importe ${spec}`);
      const cible = resoudre(chemin, spec);
      if (cible) pile.push(cible);
    }
    if (LECTURE_BIOLOGIE.test(retirerLignesDeCommentaire(source))) fautifs.push(`${chemin} lit les résultats biologiques`);
  }
  return { vus: [...vus].sort(), fautifs: fautifs.sort() };
}

describe('chemin documentaire — aucune entrée biologique (BP-01, structure)', () => {
  it('aucun module atteint depuis les empreintes ne lit la biologie', () => {
    const { vus, fautifs } = fermeture(RACINES_DOCUMENTAIRES, lire);
    // Le balayage a réellement descendu : sans cette borne, une résolution
    // cassée rendrait une fermeture vide — et un banc vert pour rien.
    expect(vus.length).toBeGreaterThan(RACINES_DOCUMENTAIRES.length);
    expect(fautifs, 'une lecture biologique atteint une empreinte du chemin documentaire').toEqual([]);
  });

  // CONTRE-ÉPREUVE : la mutation attendue — un module du chemin qui importe la
  // bibliothèque, directement ou par un intermédiaire — rougit.
  it('le balayage voit un import biologique transitif', () => {
    const sources: Record<string, string> = {
      'web/src/lib/clinical-engine/clinicalSnapshot.ts': "import { x } from './canonical';",
      'web/src/lib/clinical-engine/canonical.ts': "import { y } from '@/lib/biology-library/resultats';",
    };
    const { fautifs } = fermeture(['web/src/lib/clinical-engine/clinicalSnapshot.ts'], c => sources[c] ?? '');
    expect(fautifs).toEqual(['web/src/lib/clinical-engine/canonical.ts importe @/lib/biology-library/resultats']);
  });
});

// ── (b) Exécution : mêmes empreintes avec et sans résultats ─────────────────
// Fixtures neutres, reprises des bancs du moteur ; aucune valeur clinique.
const RESULTATS = [{ analyteCode: 'FIXTURE_A', valeur: 1, preleveLe: '2026-01-01' }];
const avecBiologie = <T extends object>(objet: T): T => ({ ...objet, resultatsBiologiques: RESULTATS }) as T;

const contexte: PatientContext = { mainReason: null, priorityGoal: null, expectations: [], constraints: [] };
const reponse: QuestionnaireResponseInput = {
  responseId: 'response-1',
  questionnaireId: 'Q_STR_02',
  observedAt: '2026-01-01T00:00:00.000Z',
  scoresJson: { rawAnswers: { P1: '2', P2: '2', P3: '3', P4: '3', P5: '3', P6: '2', P7: '3', P8: '3', P9: '2', P10: '3' } },
  scoreVersion: 'questionnaire-fixture-v1',
};
const entreeEpisode = {
  assessmentEpisodeId: 'episode-1', patientId: 'patient-test', milestone: 'T0' as const,
  targetAt: '2026-01-01T00:00:00.000Z', responses: [reponse],
};

function episode(entree: typeof entreeEpisode) {
  const proposition = proposeAssessmentEpisode(entree);
  return confirmAssessmentEpisode(proposition, proposition.includedResponseIds, '2026-01-02T00:00:00.000Z');
}

function snapshot(biologie: boolean) {
  const entree = {
    snapshotId: 'snapshot-1', patientId: 'patient-test', asOf: '2026-01-02T00:00:00.000Z',
    assessmentEpisode: episode(biologie ? avecBiologie(entreeEpisode) : entreeEpisode),
    patientContext: biologie ? avecBiologie(contexte) : contexte,
    responses: [biologie ? avecBiologie(reponse) : reponse],
  };
  return buildClinicalSnapshot(biologie ? avecBiologie(entree) : entree);
}

const revue: ClinicalReview = {
  reviewId: 'review-test', snapshotId: 'snapshot-1', snapshotInputHash: 'snapshot-hash',
  createdAt: '2026-01-03T00:00:00.000Z', version: 'c1-clinical-review-v1', rules: [],
  missingData: [], discordances: [], safetyFindings: [],
  abstention: { status: 'not_evaluated', ruleIds: [], limitations: [] }, limitations: [], inputHash: 'review-hash',
};

describe('chemin documentaire — empreintes égales avec et sans résultats (BP-01, exécution)', () => {
  it('épisode : `includedResponseIds` inchangés', () => {
    expect(episode(avecBiologie(entreeEpisode)).includedResponseIds).toEqual(episode(entreeEpisode).includedResponseIds);
  });

  it('snapshot : `inputHash` inchangé', () => {
    expect(snapshot(true).inputHash).toBe(snapshot(false).inputHash);
  });

  it('carte de décision : `inputHash` inchangé', () => {
    const base = snapshot(false);
    const review = { ...revue, snapshotId: base.snapshotId, snapshotInputHash: base.inputHash };
    const entree = { decisionCardId: 'card-1', createdAt: '2026-01-04T00:00:00.000Z', snapshot: base, review };
    expect(buildDecisionCard(avecBiologie(entree)).inputHash).toBe(buildDecisionCard(entree).inputHash);
  });

  it('brouillon de protocole : `inputHash` inchangé (donc l\'identifiant de version aussi)', () => {
    const entree = {
      protocolDraftId: 'proto_DEC_1',
      decisionCard: {
        decisionCardId: 'DEC_1', inputHash: 'HASH_DEC', snapshotInputHash: 'HASH_SNAP', reviewInputHash: 'HASH_REV',
        priorityCandidates: [{ candidateId: 'PRIO_1' }], selectedMainPriority: { candidateId: 'PRIO_1' },
        safetyFindingIds: [], abstention: { status: 'not_required' },
      } as unknown as DecisionCard,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      purpose: 'Fixture',
      followUpCriterion: 'Fixture',
      therapeuticLoad: { level: 'light' as const, source: 'practitioner' as const, justification: null },
      actions: [{
        actionId: 'A1', type: 'food' as const, title: 'Fixture', idealPlan: 'Fixture',
        minimalPlan: 'Fixture', rescuePlan: 'Fixture', limitations: [],
      }],
      review: { reviewedAt: '2026-01-02T00:00:00.000Z', reviewerRole: 'practitioner' as const, confirmation: 'content_reviewed' as const },
    };
    expect(buildProtocolDraft(avecBiologie(entree)).inputHash).toBe(buildProtocolDraft(entree).inputHash);
  });
});
