import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { termeAnxiogene } from '@/lib/documents/vocabulaire';
import {
  ACTION_ID_ORIENTATION,
  TEXTE_ORIENTATION,
  actionOrientation,
  estActionOrientation,
  orientationRequise,
} from './orientationAdressage';

// L'ACTION D'ORIENTATION ([[D-257]] §8-9, LOT-05).

describe('texte signé de l’orientation', () => {
  // RECOPIE AU CARACTÈRE PRÈS : le banc relit la décision signée. Un mot changé
  // ici sans décision, ou dans la décision sans ce module, fait rougir.
  it('est celui de D-257 §9, mot pour mot', () => {
    const decisions = readFileSync(path.join(process.cwd(), '..', 'docs', 'DECISIONS.md'), 'utf8');
    const section = decisions.slice(decisions.indexOf('### D-257'), decisions.indexOf('### D-256'));
    const aplati = section.replace(/\s+/g, ' ');
    expect(aplati).toContain(`Titre : « ${TEXTE_ORIENTATION.title} »`);
    expect(aplati).toContain(`Plan idéal : « ${TEXTE_ORIENTATION.idealPlan} »`);
    expect(aplati).toContain(`Plan minimal : « ${TEXTE_ORIENTATION.minimalPlan} »`);
    expect(aplati).toContain(`Plan de secours : « ${TEXTE_ORIENTATION.rescuePlan} »`);
  });

  it('passe la garde de registre anxiogène (D-189 §4), sans nommer d’alerte ni de délai chiffré', () => {
    for (const texte of Object.values(TEXTE_ORIENTATION)) {
      expect(termeAnxiogene(texte)).toBeNull();
      expect(texte.toLowerCase()).not.toContain('alerte');
      expect(texte).not.toMatch(/\d/);
    }
  });
});

describe('actionOrientation', () => {
  it('porte l’identifiant réservé, le type existant et le texte signé', () => {
    const action = actionOrientation(false);
    expect(action).toEqual({ actionId: ACTION_ID_ORIENTATION, type: 'medical_referral', ...TEXTE_ORIENTATION, limitations: [] });
    expect(estActionOrientation(action)).toBe(true);
  });

  it('en contrat V4, porte le statut `active` que V4 exige sur chaque action', () => {
    expect(actionOrientation(true).interventionStatus).toBe('active');
  });

  it('une orientation praticien ordinaire (autre identifiant) n’est pas l’orientation réservée', () => {
    expect(estActionOrientation({ actionId: 'action-1', type: 'medical_referral' })).toBe(false);
    expect(estActionOrientation({ actionId: ACTION_ID_ORIENTATION, type: 'food' })).toBe(false);
  });

  it('n’est due que si la carte porte un constat adressé', () => {
    expect(orientationRequise(null)).toBe(false);
    expect(orientationRequise({})).toBe(false);
    expect(orientationRequise({ safetyFindingAdresseIds: [] })).toBe(false);
    expect(orientationRequise({ safetyFindingAdresseIds: ['safety:anamnese:aaaaaaaaaaaaaaaa'] })).toBe(true);
  });
});
