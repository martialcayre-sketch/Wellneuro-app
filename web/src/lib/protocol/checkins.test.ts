import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    protocolCheckin: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma }));

import {
  CHECKIN_QUESTIONS,
  ensurePointEtape,
  ensureReponses,
  listCheckins,
  optionLibelle,
  pointEtapeCourant,
  resolveActiveCheckin,
  saveCheckin,
  type CheckinReponses,
  type CheckinRow,
} from './checkins';

const reponsesValides: CheckinReponses = {
  adhesion: 'plupart_des_jours',
  tolerance: 'bien',
  energie: 'stable',
  sommeil: 'mieux',
};

const anchor = new Date('2026-01-01T00:00:00.000Z');
const jour = (n: number) => new Date(anchor.getTime() + n * 24 * 60 * 60 * 1000);

describe('pointEtapeCourant', () => {
  it('ouvre J7 au centre de sa fenêtre (jour 7)', () => {
    expect(pointEtapeCourant(anchor, jour(7))).toBe('J7');
  });

  it('ouvre J14 / J21 à leurs centres', () => {
    expect(pointEtapeCourant(anchor, jour(14))).toBe('J14');
    expect(pointEtapeCourant(anchor, jour(21))).toBe('J21');
  });

  it('respecte la tolérance ±3 jours', () => {
    expect(pointEtapeCourant(anchor, jour(4))).toBe('J7');
    expect(pointEtapeCourant(anchor, jour(10))).toBe('J7');
    expect(pointEtapeCourant(anchor, jour(17))).toBe('J14');
  });

  it('ferme entre deux fenêtres et hors plage', () => {
    expect(pointEtapeCourant(anchor, jour(2))).toBeNull(); // avant J7
    expect(pointEtapeCourant(anchor, jour(30))).toBeNull(); // après J21
  });
});

describe('ensureReponses / ensurePointEtape', () => {
  it('accepte 4 réponses valides et ignore les clés en trop', () => {
    const parsed = ensureReponses({ ...reponsesValides, contractVersion: 'c2a-checkin-v1' });
    expect(parsed).toEqual(reponsesValides);
  });

  it('rejette une valeur hors options', () => {
    expect(() => ensureReponses({ ...reponsesValides, tolerance: 'parfait' })).toThrow(TypeError);
  });

  it('rejette une réponse manquante', () => {
    const { sommeil: _omitted, ...partiel } = reponsesValides;
    expect(() => ensureReponses(partiel)).toThrow(TypeError);
  });

  it('rejette un point d’étape inconnu', () => {
    expect(() => ensurePointEtape('J30')).toThrow(TypeError);
    expect(ensurePointEtape('J14')).toBe('J14');
  });
});

describe('optionLibelle', () => {
  it('mappe une valeur vers son libellé français', () => {
    expect(optionLibelle('adhesion', 'plupart_des_jours')).toBe('La plupart des jours');
    expect(optionLibelle('tolerance', 'inconnu')).toBeNull();
  });

  it('n’a que 4 questions au catalogue', () => {
    expect(CHECKIN_QUESTIONS).toHaveLength(4);
  });
});

describe('resolveActiveCheckin', () => {
  const row = (
    id: string,
    supersedes: string | null,
    iso: string,
    pointEtape: CheckinRow['pointEtape'] = 'J7',
  ): CheckinRow => ({
    id,
    idPatient: 'PAT_1',
    idAssignation: 'ASS_1',
    protocolDraftId: 'proto_DEC_1#h',
    pointEtape,
    reponses: reponsesValides,
    canal: 'portail',
    supersedesCheckinId: supersedes,
    soumisLe: iso,
  });

  it('retourne null quand aucun check-in pour le point d’étape', () => {
    expect(resolveActiveCheckin([row('c1', null, '2026-01-08T00:00:00.000Z', 'J14')], 'J7')).toBeNull();
  });

  it('retourne la tête de chaîne (correction la plus récente)', () => {
    const rows = [
      row('c1', null, '2026-01-08T00:00:00.000Z'),
      row('c2', 'c1', '2026-01-09T00:00:00.000Z'),
    ];
    expect(resolveActiveCheckin(rows, 'J7')?.id).toBe('c2');
  });

  it('isole les points d’étape entre eux', () => {
    const rows = [
      row('c1', null, '2026-01-08T00:00:00.000Z', 'J7'),
      row('c2', null, '2026-01-15T00:00:00.000Z', 'J14'),
    ];
    expect(resolveActiveCheckin(rows, 'J14')?.id).toBe('c2');
  });
});

describe('saveCheckin', () => {
  beforeEach(() => vi.clearAllMocks());

  const created = {
    id: 'ck_1',
    idPatient: 'PAT_1',
    idAssignation: 'ASS_1',
    protocolDraftId: 'proto_DEC_1#h',
    pointEtape: 'J7',
    reponses: { contractVersion: 'c2a-checkin-v1', ...reponsesValides },
    canal: 'portail',
    supersedesCheckinId: null,
    soumisLe: new Date('2026-01-08T00:00:00.000Z'),
  };

  it('crée une ligne append-only et range le contractVersion', async () => {
    prisma.protocolCheckin.create.mockResolvedValue(created);

    const row = await saveCheckin({
      idPatient: 'PAT_1',
      idAssignation: 'ASS_1',
      protocolDraftId: 'proto_DEC_1#h',
      pointEtape: 'J7',
      reponses: reponsesValides,
    });

    expect(row.id).toBe('ck_1');
    expect(row.reponses).toEqual(reponsesValides);
    const arg = prisma.protocolCheckin.create.mock.calls[0][0];
    expect(arg.data.canal).toBe('portail');
    expect(arg.data.reponses).toMatchObject({ contractVersion: 'c2a-checkin-v1' });
  });

  it('refuse une correction visant un check-in d’un autre patient', async () => {
    prisma.protocolCheckin.findUnique.mockResolvedValue({
      idPatient: 'PAT_AUTRE',
      protocolDraftId: 'proto_DEC_1#h',
      pointEtape: 'J7',
    });

    await expect(
      saveCheckin({
        idPatient: 'PAT_1',
        idAssignation: 'ASS_1',
        protocolDraftId: 'proto_DEC_1#h',
        pointEtape: 'J7',
        reponses: reponsesValides,
        supersedesCheckinId: 'ck_autre',
      }),
    ).rejects.toThrow('Check-in à corriger introuvable');
    expect(prisma.protocolCheckin.create).not.toHaveBeenCalled();
  });
});

describe('listCheckins', () => {
  beforeEach(() => vi.clearAllMocks());

  it('borne au patient et trie par soumisLe desc', async () => {
    prisma.protocolCheckin.findMany.mockResolvedValue([]);
    await listCheckins('PAT_1', 'proto_DEC_1#h');
    expect(prisma.protocolCheckin.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { idPatient: 'PAT_1', protocolDraftId: 'proto_DEC_1#h' },
        orderBy: { soumisLe: 'desc' },
      }),
    );
  });

  it('rejette un identifiant patient invalide', async () => {
    await expect(listCheckins('pas valide !')).rejects.toThrow(TypeError);
  });
});
