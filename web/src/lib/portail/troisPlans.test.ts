import { afterEach, describe, expect, it } from 'vitest';
import { creeeSousGardeEtendue, MISE_EN_SERVICE_GARDE_ETENDUE, troisPlansOuverts, troisPlansServis } from './troisPlans';

describe('WN_PORTAIL_TROIS_PLANS', () => {
  afterEach(() => {
    delete process.env.WN_PORTAIL_TROIS_PLANS;
  });

  it('absent : fermé', () => {
    expect(troisPlansOuverts()).toBe(false);
  });

  it.each(['1', 'TRUE', 'oui', ' true'])('« %s » : fermé', (valeur) => {
    process.env.WN_PORTAIL_TROIS_PLANS = valeur;
    expect(troisPlansOuverts()).toBe(false);
  });

  it('« true » : ouvert', () => {
    process.env.WN_PORTAIL_TROIS_PLANS = 'true';
    expect(troisPlansOuverts()).toBe(true);
  });
});

// LA MARQUE ([[D-386]] §2-§3) : strictement après l'instant ; le doute refuse.
describe('creeeSousGardeEtendue', () => {
  it('l’instant est celui retenu après la bascule de la garde étendue', () => {
    expect(MISE_EN_SERVICE_GARDE_ETENDUE).toBe('2026-10-27T00:00:00.000Z');
  });

  it.each([
    ['une milliseconde après', new Date('2026-10-27T00:00:00.001Z'), true],
    ['bien après', new Date('2026-11-15T08:00:00.000Z'), true],
    ['à l’instant même', new Date('2026-10-27T00:00:00.000Z'), false],
    ['juste avant', new Date('2026-10-26T23:59:59.999Z'), false],
    ['date illisible', new Date('pas une date'), false],
    ['chaîne ISO', '2026-11-01T00:00:00.000Z', false],
    ['nombre', Date.parse('2026-11-01T00:00:00.000Z'), false],
    ['absente', undefined, false],
    ['nulle', null, false],
  ])('%s : %s', (_cas, valeur, attendu) => {
    expect(creeeSousGardeEtendue(valeur)).toBe(attendu);
  });
});

describe('troisPlansServis', () => {
  const actionsDuProtocole = [
    { actionId: 'a1', idealPlan: 'Idéal 1', rescuePlan: 'Secours 1' },
    { actionId: 'a2', idealPlan: 'Idéal 2', rescuePlan: 'Secours 2' },
    { actionId: 'a3', idealPlan: 'Idéal 3', rescuePlan: 'Secours 3' },
  ];

  it('les actions fermes, dans l’ordre des actions servies', () => {
    expect(troisPlansServis({
      actionsServies: [{ actionId: 'a2' }, { actionId: 'a1' }],
      actionsDuProtocole,
      pauses: [],
    })).toEqual([
      { actionId: 'a2', idealPlan: 'Idéal 2', rescuePlan: 'Secours 2' },
      { actionId: 'a1', idealPlan: 'Idéal 1', rescuePlan: 'Secours 1' },
    ]);
  });

  it('écarte une action en attente de bilan et une action en pause ([[D-384]] §3)', () => {
    expect(troisPlansServis({
      actionsServies: [{ actionId: 'a1', interventionStatus: 'conditionnelle_biologie' }, { actionId: 'a2' }, { actionId: 'a3' }],
      actionsDuProtocole,
      pauses: [{ actionId: 'a3' }],
    })).toEqual([{ actionId: 'a2', idealPlan: 'Idéal 2', rescuePlan: 'Secours 2' }]);
  });

  it.each([
    ['plan idéal vide', { actionId: 'a1', idealPlan: '  ', rescuePlan: 'Secours 1' }],
    ['plan de secours absent', { actionId: 'a1', idealPlan: 'Idéal 1' }],
    ['plan de secours non textuel', { actionId: 'a1', idealPlan: 'Idéal 1', rescuePlan: 3 }],
  ])('%s : l’action garde son plan minimal seul', (_cas, action) => {
    expect(troisPlansServis({ actionsServies: [{ actionId: 'a1' }], actionsDuProtocole: [action], pauses: [] })).toEqual([]);
  });

  it('une action servie absente du protocole relu n’y entre pas', () => {
    expect(troisPlansServis({ actionsServies: [{ actionId: 'a9' }], actionsDuProtocole, pauses: [] })).toEqual([]);
  });
});
