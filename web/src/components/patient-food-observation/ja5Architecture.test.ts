import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  FRICTIONS,
  LABELS_ISSUE_TRACE,
  LABEL_PAUSE_PATIENT,
} from '@/lib/food-observation';

const COMPONENT_PATH = resolve(process.cwd(), 'src/components/patient-food-observation/FoodObservationJourney.tsx');
const CARD_PATH = resolve(
  process.cwd(),
  '../docs/claude/campagnes/2026-07-13-journal-alimentaire-21j-v1/supports/carte-a6-essai.html',
);

describe('architecture et parité JA5-02', () => {
  it('garde le parcours sans réseau, stockage navigateur, cookie ni API', () => {
    const source = readFileSync(COMPONENT_PATH, 'utf8');
    for (const forbidden of ['fetch(', 'localStorage', 'sessionStorage', 'document.cookie', '/api/']) {
      expect(source).not.toContain(forbidden);
    }
  });

  it('partage les quatre issues, les frictions et la pause avec la carte A6', () => {
    const card = readFileSync(CARD_PATH, 'utf8');
    for (const label of Object.values(LABELS_ISSUE_TRACE)) expect(card).toContain(label);
    for (const label of Object.values(FRICTIONS)) expect(card).toContain(label);
    expect(card).toContain(LABEL_PAUSE_PATIENT);
  });
});

