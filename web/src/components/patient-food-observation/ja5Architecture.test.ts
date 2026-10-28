import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  FRICTIONS,
  LABELS_ISSUE_TRACE,
  LABEL_PAUSE_PATIENT,
} from '@/lib/food-observation';

// D-JA-01 : le parcours, le harnais qui le monte et sa fixture.
const LOCAL_PATHS = ['FoodObservationJourney.tsx', 'ValidationJaHarness.tsx', 'ja5ValidationFixture.ts'].map(file =>
  resolve(process.cwd(), 'src/components/patient-food-observation', file),
);
const FORBIDDEN = [
  'fetch(',
  'XMLHttpRequest',
  'sendBeacon',
  'WebSocket',
  'EventSource',
  'import(',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'document.cookie',
  '/api/',
];
const CARD_PATH = resolve(
  process.cwd(),
  '../docs/claude/campagnes/2026-07-13-journal-alimentaire-21j-v1/supports/carte-a6-essai.html',
);

describe('architecture et parité JA5-02', () => {
  it.each(LOCAL_PATHS)('garde %s sans réseau, stockage navigateur, cookie ni API', path => {
    const source = readFileSync(path, 'utf8');
    for (const forbidden of FORBIDDEN) {
      expect(source, forbidden).not.toContain(forbidden);
    }
  });

  it('partage les quatre issues, les frictions et la pause avec la carte A6', () => {
    const card = readFileSync(CARD_PATH, 'utf8');
    for (const label of Object.values(LABELS_ISSUE_TRACE)) expect(card).toContain(label);
    for (const label of Object.values(FRICTIONS)) expect(card).toContain(label);
    expect(card).toContain(LABEL_PAUSE_PATIENT);
  });
});

