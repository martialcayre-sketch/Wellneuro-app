import { describe, expect, it } from 'vitest';
import { createAttentionBudget } from './episode';
import {
  buildFourReadings,
  describeCoverage,
  describePatientPause,
  listDirectFindings,
  TERMES_INTERDITS_SILENCE,
} from './restitution';

function assertNeutralite(text: string) {
  for (const terme of TERMES_INTERDITS_SILENCE) {
    expect(text.toLowerCase()).not.toContain(terme);
  }
}

describe('couverture factuelle (JA-00 A3)', () => {
  it('décrit « X traces sur un budget de Y cette semaine », sans pourcentage ni qualificatif', () => {
    const texte = describeCoverage(2, createAttentionBudget(5));
    expect(texte).toBe('2 traces sur un budget de 5 cette semaine');
    expect(texte).not.toMatch(/%|seuil|bon|mauvais|faible|insuffisant/i);
  });

  it('reste neutre même à zéro trace — l’absence est un état neutre', () => {
    const texte = describeCoverage(0, createAttentionBudget(3));
    expect(texte).toBe('0 trace sur un budget de 3 cette semaine');
    assertNeutralite(texte);
  });

  it('refuse un compte de traces invalide', () => {
    expect(() => describeCoverage(-1, createAttentionBudget(3))).toThrow(/entier/);
  });
});

describe('constats directs (D8) — neutralité du silence (amendement terrain n° 2)', () => {
  it('restitue l’absence de trace comme un fait daté, jamais comme un signal négatif', () => {
    const findings = listDirectFindings({ joursSansTrace: 5 });
    expect(findings).toEqual([
      { code: 'absence_de_trace', description: 'Aucune trace sur la période (5 jours)' },
    ]);
    for (const finding of findings) assertNeutralite(finding.description);
  });

  it('aucune restitution ne contient de vocabulaire négatif dérivé du silence', () => {
    const findings = listDirectFindings({
      joursSansTrace: 3,
      occasionAbsente: true,
      planMinimalActif: true,
      actionDeclareeImpossible: true,
    });
    expect(findings.map(finding => finding.code)).toEqual([
      'absence_de_trace',
      'absence_d_occasion',
      'plan_minimal_actif',
      'action_declaree_impossible',
    ]);
    for (const finding of findings) assertNeutralite(finding.description);
  });

  it('sans observable, aucun constat — le silence peut ne rien produire du tout', () => {
    expect(listDirectFindings({})).toEqual([]);
    expect(listDirectFindings({ joursSansTrace: 0 })).toEqual([]);
  });

  it('la pause déclarée restitue la parole du patient sans interprétation', () => {
    const texte = describePatientPause();
    expect(texte).toContain('Je n’ai pas pu cette semaine');
    assertNeutralite(texte);
  });
});

describe('quatre lectures séparées (A7-11)', () => {
  it('déclaré / observé / vécu / interprété restent des champs distincts', () => {
    const readings = buildFourReadings({
      declare: ['Petit-déjeuner « équilibré » au questionnaire'],
      observe: ['Flocons d’avoine présents 3 matins sur 5'],
      vecu: ['Plus simple les jours de télétravail'],
    });
    expect(readings.declare).toHaveLength(1);
    expect(readings.observe).toHaveLength(1);
    expect(readings.vecu).toHaveLength(1);
    expect(readings.interprete).toEqual([]);
  });

  it('les tableaux sont copiés — pas de fusion ni d’aliasing', () => {
    const observe = ['Une observation'];
    const readings = buildFourReadings({ observe });
    observe.push('mutation externe');
    expect(readings.observe).toEqual(['Une observation']);
  });
});
