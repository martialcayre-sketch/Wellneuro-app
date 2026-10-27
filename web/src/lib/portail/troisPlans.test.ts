import { afterEach, describe, expect, it } from 'vitest';
import type { ProtocolAction } from '@/lib/clinical-engine/types';
import type { ActionPatient } from '@/lib/protocol/vuePatientSurLeFil';
import { INSTANT_GARDE_ETENDUE, troisPlansOuverts, troisPlansServis, versionSousGardeEtendue } from './troisPlans';

describe('WN_PORTAIL_TROIS_PLANS', () => {
  afterEach(() => {
    delete process.env.WN_PORTAIL_TROIS_PLANS;
  });

  it('absent : fermé', () => {
    expect(troisPlansOuverts()).toBe(false);
  });

  it.each(['1', 'TRUE', 'oui', ' true'])('valeur « %s » : fermé (seule la chaîne exacte « true » ouvre)', (valeur) => {
    process.env.WN_PORTAIL_TROIS_PLANS = valeur;
    expect(troisPlansOuverts()).toBe(false);
  });

  it('« true » : ouvert', () => {
    process.env.WN_PORTAIL_TROIS_PLANS = 'true';
    expect(troisPlansOuverts()).toBe(true);
  });
});

// LA MARQUE DE D-386 §2 : la date de création de la ligne, strictement après
// l'instant constaté. Le doute se lit comme un refus (§3).
describe('versionSousGardeEtendue', () => {
  it('l’instant est celui constaté après le déploiement du lot 1, en UTC', () => {
    expect(INSTANT_GARDE_ETENDUE.toISOString()).toBe('2026-10-27T00:00:00.000Z');
  });

  it.each([
    ['créée après l’instant', new Date('2026-10-27T00:00:00.001Z'), true],
    ['créée à l’instant même', new Date('2026-10-27T00:00:00.000Z'), false],
    ['créée avant l’instant', new Date('2026-10-26T23:59:59.999Z'), false],
    ['date absente', undefined, false],
    ['date nulle', null, false],
    ['chaîne ISO (jamais le createdAt du payload)', '2026-11-01T00:00:00.000Z', false],
    ['date invalide', new Date('nope'), false],
  ])('%s', (_cas, creeeLe, attendu) => {
    expect(versionSousGardeEtendue(creeeLe)).toBe(attendu);
  });
});

describe('troisPlansServis', () => {
  const action = (actionId: string, extra: Partial<ProtocolAction> = {}): ProtocolAction => ({
    actionId, type: 'food', title: `Titre ${actionId}`, idealPlan: `Idéal ${actionId}`,
    minimalPlan: `Minimal ${actionId}`, rescuePlan: `Secours ${actionId}`, limitations: [], ...extra,
  });
  const servie = (actionId: string, extra: Partial<ActionPatient> = {}): ActionPatient => ({
    actionId, type: 'food', title: `Titre ${actionId}`, minimalPlan: `Minimal ${actionId}`, ...extra,
  });

  it('les actions fermes, dans l’ordre servi, avec leurs plans idéal et de secours', () => {
    expect(troisPlansServis({
      actionsServies: [servie('b'), servie('a')],
      actionsDuProtocole: [action('a'), action('b')],
      enPause: new Set(),
    })).toEqual([
      { actionId: 'b', idealPlan: 'Idéal b', rescuePlan: 'Secours b' },
      { actionId: 'a', idealPlan: 'Idéal a', rescuePlan: 'Secours a' },
    ]);
  });

  it('une action en attente ou en pause : ses plans ne quittent pas le serveur', () => {
    const plans = troisPlansServis({
      actionsServies: [
        servie('attente', { interventionStatus: 'conditionnelle_biologie', attente: 'En attente de votre bilan.' }),
        servie('pause'),
        servie('ferme'),
      ],
      actionsDuProtocole: [action('attente'), action('pause'), action('ferme')],
      enPause: new Set(['pause']),
    });
    expect(plans.map((p) => p.actionId)).toEqual(['ferme']);
    expect(JSON.stringify(plans)).not.toMatch(/Secours attente|Secours pause|Idéal attente|Idéal pause/);
  });

  it('une action servie absente du protocole, ou un plan vide : rien pour elle', () => {
    expect(troisPlansServis({
      actionsServies: [servie('orpheline'), servie('vide')],
      actionsDuProtocole: [action('vide', { rescuePlan: '  ' })],
      enPause: new Set(),
    })).toEqual([]);
  });
});
