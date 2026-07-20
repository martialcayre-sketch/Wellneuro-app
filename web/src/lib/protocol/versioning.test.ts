import { describe, expect, it } from 'vitest';
import { buildProtocolDraft } from '@/lib/clinical-engine/protocolDraft';
import type { DecisionCard, ProtocolAction, ProtocolReview } from '@/lib/clinical-engine/types';
import {
  clinicalContentHash,
  deriveProtocolDraftId,
  deriveVersionId,
  isClinicalChange,
  resolveActiveVersion,
  resolveCycleId,
  toDraftCreateInput,
  toEpisodeCreateInput,
  type PersistedVersionRow,
  type T0Candidate,
} from './versioning';

// DecisionCard minimale valide pour buildProtocolDraft (seuls quelques champs
// sont lus : abstention, safetyFindingIds, selectedMainPriority, priorityCandidates,
// decisionCardId, inputHash).
const decisionCard = {
  decisionCardId: 'DEC_1',
  inputHash: 'HASH_DEC',
  snapshotInputHash: 'HASH_SNAP',
  reviewInputHash: 'HASH_REV',
  priorityCandidates: [{ candidateId: 'PRIO_1' }],
  selectedMainPriority: { candidateId: 'PRIO_1' },
  safetyFindingIds: [],
  abstention: { status: 'not_required' },
} as unknown as DecisionCard;

const action: ProtocolAction = {
  actionId: 'A1',
  type: 'food',
  title: 'Petit-déjeuner protéiné',
  idealPlan: 'Chaque matin',
  minimalPlan: 'Trois matins',
  rescuePlan: 'Un fruit',
  limitations: [],
};

function draftAt(updatedAt: string, purpose = 'Stabiliser le matin'): ReturnType<typeof buildProtocolDraft> {
  const review: ProtocolReview = {
    reviewedAt: updatedAt,
    reviewerRole: 'practitioner',
    confirmation: 'content_reviewed',
  };
  return buildProtocolDraft({
    protocolDraftId: deriveProtocolDraftId('DEC_1'),
    decisionCard,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt,
    purpose,
    followUpCriterion: 'Réveils nocturnes < 2 par nuit à J21',
    therapeuticLoad: { level: 'light', source: 'practitioner', justification: null },
    actions: [action],
    review,
  });
}

describe('deriveVersionId / deriveProtocolDraftId', () => {
  it('encode le protocolDraftId en préfixe recouvrable', () => {
    expect(deriveProtocolDraftId('DEC_1')).toBe('proto_DEC_1');
    expect(deriveVersionId('proto_DEC_1', 'HASH')).toBe('proto_DEC_1#HASH');
  });
});

describe('resolveActiveVersion', () => {
  const row = (id: string, supersedes: string | null, iso: string): PersistedVersionRow => ({
    id,
    inputHash: `h_${id}`,
    supersedesDraftId: supersedes,
    createdAt: new Date(iso),
  });

  it('retourne null sur un fil vide', () => {
    expect(resolveActiveVersion([])).toBeNull();
  });

  it('retourne l’unique version d’un fil à un élément', () => {
    const only = row('v1', null, '2026-01-01T00:00:00.000Z');
    expect(resolveActiveVersion([only])?.id).toBe('v1');
  });

  it('retourne la tête de chaîne (non supplantée) d’une chaîne', () => {
    const rows = [
      row('v1', null, '2026-01-01T00:00:00.000Z'),
      row('v2', 'v1', '2026-01-02T00:00:00.000Z'),
      row('v3', 'v2', '2026-01-03T00:00:00.000Z'),
    ];
    expect(resolveActiveVersion(rows)?.id).toBe('v3');
  });
});

describe('isClinicalChange / clinicalContentHash', () => {
  it('ignore les horodatages : même contenu clinique → pas de changement', () => {
    const a = draftAt('2026-01-02T00:00:00.000Z');
    const b = draftAt('2026-01-05T00:00:00.000Z'); // updatedAt/reviewedAt différents
    expect(a.inputHash).not.toBe(b.inputHash); // le hash contrat diffère (timestamps)
    expect(clinicalContentHash(a)).toBe(clinicalContentHash(b));
    expect(isClinicalChange(a, b)).toBe(false);
  });

  it('détecte un changement de contenu clinique', () => {
    const a = draftAt('2026-01-02T00:00:00.000Z', 'Stabiliser le matin');
    const b = draftAt('2026-01-02T00:00:00.000Z', 'Objectif révisé');
    expect(isClinicalChange(a, b)).toBe(true);
  });

  it('considère toujours une première version comme un changement', () => {
    const a = draftAt('2026-01-02T00:00:00.000Z');
    expect(isClinicalChange(null, a)).toBe(true);
  });

  it('persiste la date réelle de revue, distincte de la dernière modification', () => {
    const draft = buildProtocolDraft({
      protocolDraftId: deriveProtocolDraftId('DEC_1'), decisionCard,
      createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z',
      purpose: 'Stabiliser le matin', followUpCriterion: 'Critère observable.',
      therapeuticLoad: { level: 'light', source: 'practitioner', justification: null },
      actions: [action],
      review: {
        reviewedAt: '2026-01-03T00:00:00.000Z',
        reviewerRole: 'practitioner', confirmation: 'content_reviewed',
      },
    });
    const input = toDraftCreateInput({
      id: 'version-1', draft, decisionCard,
      episode: { patientId: 'patient-fixture', assessmentEpisodeId: 'episode-fixture' } as never,
      supersedesDraftId: null,
    });
    expect(input.reviewedAt?.toISOString()).toBe('2026-01-03T00:00:00.000Z');
  });
});

// Identité de cycle (gate G2) — la résolution est PURE : la route lit les T0 du
// patient, cette fonction désigne le cycle. Aucune ligne n'est rattachée de force.
describe('resolveCycleId (gate G2)', () => {
  const episode = (milestone: string, confirmedAt: string, id = 'EPI_N') =>
    ({ assessmentEpisodeId: id, patientId: 'PAT_1', milestone, confirmedAt }) as never;

  const t0 = (id: string, confirmedAt: string, cycleId: string | null = id): T0Candidate => ({
    id,
    cycleId,
    confirmedAt: new Date(confirmedAt),
  });

  it('un T0 ouvre son propre cycle', () => {
    expect(
      resolveCycleId({
        episode: episode('T0', '2026-01-01T00:00:00.000Z', 'EPI_T0'),
        t0Candidates: [t0('EPI_AUTRE', '2025-01-01T00:00:00.000Z')],
      }),
    ).toBe('EPI_T0');
  });

  it('un jalon postérieur rejoint le dernier T0 antérieur ou égal', () => {
    expect(
      resolveCycleId({
        episode: episode('J21', '2026-02-01T00:00:00.000Z'),
        t0Candidates: [
          t0('EPI_A', '2025-11-01T00:00:00.000Z'),
          t0('EPI_B', '2026-01-01T00:00:00.000Z'),
          t0('EPI_C', '2026-06-01T00:00:00.000Z'),
        ],
      }),
    ).toBe('EPI_B');
  });

  it('ne rattache jamais un jalon à un T0 postérieur', () => {
    expect(
      resolveCycleId({
        episode: episode('J42', '2026-02-01T00:00:00.000Z'),
        t0Candidates: [t0('EPI_C', '2026-06-01T00:00:00.000Z')],
      }),
    ).toBeNull();
  });

  it('aucun T0 connu → cycle null, jamais deviné', () => {
    expect(
      resolveCycleId({ episode: episode('J90', '2026-02-01T00:00:00.000Z'), t0Candidates: [] }),
    ).toBeNull();
  });

  it('T0 hérité sans cycleId backfillé → repli sur son propre id', () => {
    expect(
      resolveCycleId({
        episode: episode('J21', '2026-02-01T00:00:00.000Z'),
        t0Candidates: [t0('EPI_LEGACY', '2026-01-01T00:00:00.000Z', null)],
      }),
    ).toBe('EPI_LEGACY');
  });

  it('date de confirmation illisible → cycle null', () => {
    expect(
      resolveCycleId({
        episode: episode('J21', 'pas-une-date'),
        t0Candidates: [t0('EPI_B', '2026-01-01T00:00:00.000Z')],
      }),
    ).toBeNull();
  });
});

describe('toEpisodeCreateInput (gate G2)', () => {
  it('fige la version de score à la confirmation et porte le cycle résolu', () => {
    const input = toEpisodeCreateInput(
      {
        assessmentEpisodeId: 'EPI_1',
        patientId: 'PAT_1',
        milestone: 'T0',
        targetAt: '2026-01-01T00:00:00.000Z',
        confirmedAt: '2026-01-02T00:00:00.000Z',
      } as never,
      { cycleId: 'EPI_1' },
    );
    expect(input.cycleId).toBe('EPI_1');
    expect(input.versionScore).toBe('v1');
  });
});
