import { describe, expect, it } from 'vitest';
import * as labels from './labels';
import { MARQUEURS_VEDETTES } from './markerRegistry';

function allLabelStrings(): string[] {
  const values: string[] = [];
  for (const exported of Object.values(labels)) {
    if (typeof exported === 'string') values.push(exported);
    else if (exported && typeof exported === 'object') {
      values.push(...Object.values(exported).filter((v): v is string => typeof v === 'string'));
    }
  }
  return values;
}

describe('vocabulaire UI (R4, D11)', () => {
  it('dit « recommandation », jamais « prescription »', () => {
    expect(labels.LABEL_RECOMMANDATION).toBe('recommandation');
    for (const texte of allLabelStrings()) {
      expect(texte.toLowerCase()).not.toContain('prescription');
      expect(texte.toLowerCase()).not.toContain('prescrit');
    }
  });

  it('« jumeau » est interdit dans l’UI (D11)', () => {
    for (const texte of allLabelStrings()) {
      expect(texte.toLowerCase()).not.toContain('jumeau');
    }
  });

  it('porte les noms actés de l’instrument (D1)', () => {
    expect(labels.LABEL_INSTRUMENT_PATIENT).toBe('Mon carnet alimentaire');
    expect(labels.LABEL_INSTRUMENT_PRATICIEN).toBe('Trajectoire alimentaire');
  });

  it('libelle les quatre issues de trace sans vocabulaire d’échec', () => {
    expect(Object.keys(labels.LABELS_ISSUE_TRACE)).toEqual([
      'fait',
      'adapte',
      'partiel_empeche',
      'oublie_non_note',
    ]);
    for (const texte of Object.values(labels.LABELS_ISSUE_TRACE)) {
      expect(texte.toLowerCase()).not.toMatch(/échec|raté|manqué/);
    }
  });
});

describe('registre de marqueurs pilotes (JA-00 A1)', () => {
  it('contient exactement les 12 vedettes C5A, sans code ni valeur nutritionnelle', () => {
    expect(MARQUEURS_VEDETTES).toHaveLength(12);
    expect(MARQUEURS_VEDETTES).toContain('sardine (conserve)');
    expect(MARQUEURS_VEDETTES).toContain('myrtille');
  });
});
