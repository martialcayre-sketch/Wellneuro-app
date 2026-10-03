import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: { adressageSignalAlerte: { findMany: vi.fn() } },
}));
vi.mock('../prisma', () => ({ prisma }));

import { lireCouverturesAdressage } from './adressagesSignalAlertePrisma';

// LE LECTEUR DES COUVERTURES ([[D-257]], LOT-04 ; cadrage §7). Tout écart
// écarte la couverture : le constat reste ouvert, il ne se lève jamais par défaut.

const ID_A = 'safety:anamnese:aaaaaaaaaaaaaaaa';
const ID_B = 'safety:anamnese:bbbbbbbbbbbbbbbb';

function ligne(surcharge: Record<string, unknown> = {}) {
  return {
    id: 'adr_1',
    idCorrespondance: 'lettre_1',
    findingIds: [ID_B, ID_A],
    acteLe: new Date('2026-10-03T08:00:00.000Z'),
    correspondance: { idPatient: 'PAT1', sens: 'sortant', ancrageVersion: 'safety-signals-v1' },
    ...surcharge,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.WN_LEVEE_ADRESSAGE = 'true';
  prisma.adressageSignalAlerte.findMany.mockResolvedValue([ligne()]);
});
afterEach(() => {
  delete process.env.WN_LEVEE_ADRESSAGE;
});

describe('lireCouverturesAdressage — D-257, LOT-04', () => {
  it('drapeau éteint : `undefined`, et AUCUNE requête', async () => {
    for (const valeur of [undefined, '', '1', 'TRUE']) {
      if (valeur === undefined) delete process.env.WN_LEVEE_ADRESSAGE;
      else process.env.WN_LEVEE_ADRESSAGE = valeur;
      expect(await lireCouverturesAdressage('PAT1', 'cons_1')).toBeUndefined();
    }
    expect(prisma.adressageSignalAlerte.findMany).not.toHaveBeenCalled();
  });

  it('sans porteuse : aucune couverture, sans requête', async () => {
    expect(await lireCouverturesAdressage('PAT1', null)).toEqual([]);
    expect(prisma.adressageSignalAlerte.findMany).not.toHaveBeenCalled();
  });

  it('ne lit que les adressages NON révoqués de CE dossier, sur la porteuse COURANTE', async () => {
    await lireCouverturesAdressage('PAT1', 'cons_1');
    const appel = prisma.adressageSignalAlerte.findMany.mock.calls[0][0];
    expect(appel.where).toEqual({
      idPatient: 'PAT1',
      acte: 'adressage',
      idConsultation: 'cons_1',
      revocations: { none: {} },
    });
    expect(appel.orderBy).toEqual([{ acteLe: 'asc' }, { id: 'asc' }]);
  });

  it('rend la couverture, constats triés et datée en ISO', async () => {
    expect(await lireCouverturesAdressage('PAT1', 'cons_1')).toEqual([{
      idAdressage: 'adr_1',
      idCorrespondance: 'lettre_1',
      findingIds: [ID_A, ID_B],
      acteLe: '2026-10-03T08:00:00.000Z',
    }]);
  });

  it.each([
    ['lettre d’un autre dossier', { correspondance: { idPatient: 'PAT2', sens: 'sortant', ancrageVersion: 'safety-signals-v1' } }],
    ['lettre entrante', { correspondance: { idPatient: 'PAT1', sens: 'entrant', ancrageVersion: 'safety-signals-v1' } }],
    ['lettre non ancrée sur les signaux', { correspondance: { idPatient: 'PAT1', sens: 'sortant', ancrageVersion: 'biologie-v1' } }],
    ['ancrage absent', { correspondance: { idPatient: 'PAT1', sens: 'sortant', ancrageVersion: null } }],
    ['lettre introuvable', { correspondance: null }],
    ['aucune lettre liée', { idCorrespondance: null }],
    ['aucun constat', { findingIds: [] }],
    ['constat malformé', { findingIds: [ID_A, 'safety:anamnese:XYZ'] }],
    ['constat d’effet indésirable', { findingIds: ['safety:effet-indesirable:ei_1'] }],
  ])('%s : couverture écartée (fail-closed)', async (_cas, surcharge) => {
    prisma.adressageSignalAlerte.findMany.mockResolvedValue([ligne(surcharge)]);
    expect(await lireCouverturesAdressage('PAT1', 'cons_1')).toEqual([]);
  });
});
