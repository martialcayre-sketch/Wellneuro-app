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
  // PSS-10 complet (items 1-5, total 26/50) : source vivante du besoin 9, donc
  // produit un scoreGlobal non-null. Le Pichot servait ici avant v4 ; il n'est
  // plus source de Mon équilibre et ne produirait plus aucune couverture.
  const RAW_ANSWERS_Q_STR_02 = {
    P1: '2', P2: '2', P3: '3', P4: '3', P5: '3',
    P6: '2', P7: '3', P8: '3', P9: '2', P10: '3',
  };

  it('deux réponses au même questionnaire → seule la plus récente est retenue', () => {
    const dedoublonnees = construireReponsesParQuestionnaire([
      { idQuestionnaire: 'Q_STR_02', dateReponse: dateAncienne, scoresJson: { rawAnswers: { P1: '4' } } },
      { idQuestionnaire: 'Q_STR_02', dateReponse: dateRecente, scoresJson: { rawAnswers: RAW_ANSWERS_Q_STR_02 } },
    ]);
    expect(dedoublonnees.Q_STR_02?.P1).toBe('2');
  });

  it('réponse sans rawAnswers exploitable doit être ignorée', () => {
    const sansRawAnswers = construireReponsesParQuestionnaire([
      { idQuestionnaire: 'Q_STR_01', dateReponse: dateRecente, scoresJson: { A: { total: 16 }, global: 32 } },
    ]);
    expect(sansRawAnswers.Q_STR_01).toBeUndefined();
  });

  it('une réponse postérieure à dateLimite ne doit pas être incluse', () => {
    const avecDateLimite = construireReponsesParQuestionnaire(
      [{ idQuestionnaire: 'Q_STR_02', dateReponse: dateRecente, scoresJson: { rawAnswers: RAW_ANSWERS_Q_STR_02 } }],
      dateAncienne
    );
    expect(avecDateLimite.Q_STR_02).toBeUndefined();
  });

  it('resoudreDateT0 doit être la plus ancienne réponse, pas la plus récente', () => {
    const result = resoudreDateT0([
      { idQuestionnaire: 'Q_STR_02', dateReponse: dateRecente, scoresJson: {} },
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
      { idQuestionnaire: 'Q_STR_02', dateReponse: dateT0Future, scoresJson: { rawAnswers: RAW_ANSWERS_Q_STR_02 } },
    ]);
    expect(historiqueFutur.length).toBeLessThanOrEqual(1);
  });

  it('ancreT0 explicite (LOT-08) ancre les jalons sur cette date, pas sur la 1re réponse', () => {
    const premiereReponse = new Date('2026-01-10T00:00:00.000Z');
    const reponses = [
      { idQuestionnaire: 'Q_STR_02', dateReponse: premiereReponse, scoresJson: { rawAnswers: RAW_ANSWERS_Q_STR_02 } },
    ];

    // T0 global = 2026-01-10 → une lecture T0 datée du 2026-01-10 existe.
    const global = construireHistoriqueEquilibre(reponses);
    expect(global.some((l) => l.date.getTime() === premiereReponse.getTime())).toBe(true);

    // Ancre T0 antérieure = 2026-01-01 → aucune réponse ≤ T0 ni ≤ J21(2026-01-22)?
    // La réponse du 2026-01-10 est connue dès J21 (2026-01-22) → 1re lecture = J21,
    // jamais une lecture au 2026-01-01 (jalon T0 sans couverture, omis).
    const ancre = new Date('2026-01-01T00:00:00.000Z');
    const ancree = construireHistoriqueEquilibre(reponses, ancre);
    expect(ancree.some((l) => l.date.getTime() === ancre.getTime())).toBe(false);
    expect(ancree.length).toBeGreaterThan(0);
    expect(ancree[0].date.getTime()).toBe(new Date('2026-01-22T00:00:00.000Z').getTime());
  });
});
