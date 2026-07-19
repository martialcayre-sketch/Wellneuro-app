import { describe, expect, it } from 'vitest';
import { construirePreVol, type EntreesPreVol } from './prevol';

const vide: EntreesPreVol = {
  derniereConsultationValidee: null,
  reponses: [],
  pointsEtape: [],
  episodes: [],
  protocolesRelus: [],
  diffusionsApprouvees: [],
  demandesCorrection: [],
  signalements: [],
};

const entrees = (partiel: Partial<EntreesPreVol>): EntreesPreVol => ({ ...vide, ...partiel });

describe('construirePreVol (SP-COP LOT-01)', () => {
  it('sans consultation validée, l’ancre le dit et tout l’historique est retenu', () => {
    const prevol = construirePreVol(
      entrees({
        reponses: [{ idQuestionnaire: 'Q_SOM_06', dateReponse: new Date('2026-01-01T10:00:00.000Z') }],
      }),
    );
    expect(prevol.ancre).toEqual({ type: 'aucune', date: null });
    expect(prevol.faits).toHaveLength(1);
  });

  it('ne retient que les faits POSTÉRIEURS à la dernière consultation validée', () => {
    const prevol = construirePreVol(
      entrees({
        derniereConsultationValidee: new Date('2026-02-01T00:00:00.000Z'),
        reponses: [
          { idQuestionnaire: 'AVANT', dateReponse: new Date('2026-01-15T10:00:00.000Z') },
          { idQuestionnaire: 'APRES', dateReponse: new Date('2026-02-15T10:00:00.000Z') },
        ],
      }),
    );
    expect(prevol.faits.map((f) => f.instrument)).toEqual(['APRES']);
    expect(prevol.ancre.type).toBe('consultation');
  });

  it('un fait exactement à la date de l’ancre n’est pas retenu (déjà vu en consultation)', () => {
    const prevol = construirePreVol(
      entrees({
        derniereConsultationValidee: new Date('2026-02-01T00:00:00.000Z'),
        reponses: [{ idQuestionnaire: 'PILE', dateReponse: new Date('2026-02-01T00:00:00.000Z') }],
      }),
    );
    expect(prevol.faits).toHaveLength(0);
  });

  it('ordonne les faits du plus récent au plus ancien', () => {
    const prevol = construirePreVol(
      entrees({
        reponses: [{ idQuestionnaire: 'Q1', dateReponse: new Date('2026-01-01T00:00:00.000Z') }],
        episodes: [{ milestone: 'T0', confirmedAt: new Date('2026-03-01T00:00:00.000Z') }],
        pointsEtape: [
          { pointEtape: 'J7', soumisLe: new Date('2026-02-01T00:00:00.000Z'), tolerance: 'bien', adhesion: 'tous_les_jours' },
        ],
      }),
    );
    expect(prevol.faits.map((f) => f.source)).toEqual([
      'episode_confirme',
      'point_etape',
      'reponse_questionnaire',
    ]);
  });

  it('chaque fait est daté et rattaché à sa source', () => {
    const prevol = construirePreVol(
      entrees({ signalements: [{ soumisLe: new Date('2026-03-02T09:00:00.000Z') }] }),
    );
    expect(prevol.faits[0]).toMatchObject({
      source: 'signalement',
      date: '2026-03-02T09:00:00.000Z',
    });
  });

  it('une date illisible est écartée plutôt que rangée en tête', () => {
    const prevol = construirePreVol(
      entrees({ reponses: [{ idQuestionnaire: 'Q_KO', dateReponse: new Date('pas-une-date') }] }),
    );
    expect(prevol.faits).toHaveLength(0);
  });

  it('aucun changement → aucun fait, aucune question inventée', () => {
    const prevol = construirePreVol(entrees({ derniereConsultationValidee: new Date('2026-03-01T00:00:00.000Z') }));
    expect(prevol.faits).toEqual([]);
    expect(prevol.questionsSuggerees).toEqual([]);
  });
});

describe('questions suggérées — jamais sans le fait qui les fonde', () => {
  it('une tolérance « Difficilement » ouvre une question, en citant son point d’étape', () => {
    const prevol = construirePreVol(
      entrees({
        pointsEtape: [
          { pointEtape: 'J14', soumisLe: new Date('2026-02-15T00:00:00.000Z'), tolerance: 'difficilement', adhesion: 'plupart_des_jours' },
        ],
      }),
    );
    expect(prevol.questionsSuggerees).toContain(
      'Revenir sur la tolérance rapportée « Difficilement » au point d’étape J14.',
    );
  });

  it('une adhésion « Pas encore » ouvre une question non culpabilisante', () => {
    const prevol = construirePreVol(
      entrees({
        pointsEtape: [
          { pointEtape: 'J7', soumisLe: new Date('2026-02-08T00:00:00.000Z'), tolerance: 'bien', adhesion: 'pas_encore' },
        ],
      }),
    );
    expect(prevol.questionsSuggerees.some((q) => q.includes('rendu l’action difficile'))).toBe(true);
  });

  it('une tolérance « Bien » n’ouvre aucune question', () => {
    const prevol = construirePreVol(
      entrees({
        pointsEtape: [
          { pointEtape: 'J7', soumisLe: new Date('2026-02-08T00:00:00.000Z'), tolerance: 'bien', adhesion: 'tous_les_jours' },
        ],
      }),
    );
    expect(prevol.questionsSuggerees).toEqual([]);
  });

  it('un fait antérieur à l’ancre n’ouvre aucune question', () => {
    const prevol = construirePreVol(
      entrees({
        derniereConsultationValidee: new Date('2026-03-01T00:00:00.000Z'),
        pointsEtape: [
          { pointEtape: 'J14', soumisLe: new Date('2026-02-15T00:00:00.000Z'), tolerance: 'difficilement', adhesion: 'pas_encore' },
        ],
        demandesCorrection: [{ demandeeLe: new Date('2026-02-20T00:00:00.000Z') }],
      }),
    );
    expect(prevol.questionsSuggerees).toEqual([]);
  });

  it('demande de correction et signalement ouvrent chacun leur question', () => {
    const prevol = construirePreVol(
      entrees({
        demandesCorrection: [{ demandeeLe: new Date('2026-03-02T00:00:00.000Z') }],
        signalements: [{ soumisLe: new Date('2026-03-03T00:00:00.000Z') }],
      }),
    );
    expect(prevol.questionsSuggerees).toHaveLength(2);
  });
});
