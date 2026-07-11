import { describe, it, expect } from 'vitest';
import {
  construireHistoriqueEquilibre,
  construireReponsesParQuestionnaire,
  resoudreDateT0,
} from './depuisPrisma';
import type { ReponseBrute } from './depuisPrisma';

describe('depuisPrisma — adaptateur Prisma → moteur équilibre', () => {
  const dateAncienne = new Date('2026-01-01T00:00:00.000Z');
  const dateRecente = new Date('2026-01-15T00:00:00.000Z');
  const RAW_ANSWERS_Q_SOM_06 = { P1: '2', P2: '2', P3: '1', P4: '1', P5: '1', P6: '1', P7: '1', P8: '1' };

  it('deux réponses au même questionnaire → seule la plus récente est retenue', () => {
    const dedoublonnees = construireReponsesParQuestionnaire([
      { idQuestionnaire: 'Q_SOM_06', dateReponse: dateAncienne, scoresJson: { rawAnswers: { P1: '4' } } },
      { idQuestionnaire: 'Q_SOM_06', dateReponse: dateRecente, scoresJson: { rawAnswers: RAW_ANSWERS_Q_SOM_06 } },
    ]);
    expect(dedoublonnees.Q_SOM_06?.P1).toBe('2');
  });

  it('réponse sans rawAnswers exploitable doit être ignorée', () => {
    const sansRawAnswers = construireReponsesParQuestionnaire([
      { idQuestionnaire: 'Q_STR_01', dateReponse: dateRecente, scoresJson: { A: { total: 16 }, global: 32 } },
    ]);
    expect(sansRawAnswers.Q_STR_01).toBeUndefined();
  });

  it('une réponse postérieure à dateLimite ne doit pas être incluse', () => {
    const avecDateLimite = construireReponsesParQuestionnaire(
      [{ idQuestionnaire: 'Q_SOM_06', dateReponse: dateRecente, scoresJson: { rawAnswers: RAW_ANSWERS_Q_SOM_06 } }],
      dateAncienne
    );
    expect(avecDateLimite.Q_SOM_06).toBeUndefined();
  });

  it('resoudreDateT0 doit être la plus ancienne réponse, pas la plus récente', () => {
    const result = resoudreDateT0([
      { idQuestionnaire: 'Q_SOM_06', dateReponse: dateRecente, scoresJson: {} },
      { idQuestionnaire: 'Q_STR_01', dateReponse: dateAncienne, scoresJson: {} },
    ]);
    expect(result?.getTime()).toBe(dateAncienne.getTime());
  });

  it('resoudreDateT0 doit être null sans aucune réponse', () => {
    expect(resoudreDateT0([])).toBeNull();
  });

  it('construireHistoriqueEquilibre doit ommettre les jalons futurs', () => {
    const dateT0Future = new Date();
    const historiqueFutur = construireHistoriqueEquilibre([
      { idQuestionnaire: 'Q_SOM_06', dateReponse: dateT0Future, scoresJson: { rawAnswers: RAW_ANSWERS_Q_SOM_06 } },
    ]);
    expect(historiqueFutur.length).toBeLessThanOrEqual(1);
  });
});
