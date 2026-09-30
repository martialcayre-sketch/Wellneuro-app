import { describe, expect, it } from 'vitest';
import { DIFFUSION_CONFIRMATION } from './diffusion';
import {
  calendrierDuCycle,
  calendriersParCycle,
  cycleDeLaDiffusion,
  estDiffusionRecevable,
  type AncreDeRattachement,
  type DiffusionHistorique,
  type EpisodeDeRattachement,
} from './calendrierSuivi';

// Ce que ce banc défend ([[D-255]]) : un seul jour 0 par cycle, la PREMIÈRE
// diffusion ; seul un pivot (priorité changée) le relance ; l'historique entier
// est lu, pas la tête de chaîne.

const jour = (n: number) => new Date(Date.UTC(2026, 8, 1 + n, 10, 0, 0));

const T0: EpisodeDeRattachement = { id: 'ep-T0', milestone: 'T0', cycleId: 'ep-T0' };
const J21: EpisodeDeRattachement = { id: 'ep-J21', milestone: 'J21', cycleId: 'ep-T0' };
const T1: EpisodeDeRattachement = { id: 'ep-T1', milestone: 'T1', cycleId: 'ep-T1' };

const ANCRES: AncreDeRattachement[] = [
  { id: 'ep-T0', cycleId: 'ep-T0', milestone: 'T0', confirmedAt: jour(0) },
  { id: 'ep-T1', cycleId: 'ep-T1', milestone: 'T1', confirmedAt: jour(60) },
];

function diffusion(
  id: string,
  approuveLeJour: number,
  priorite: string,
  episode: EpisodeDeRattachement | null = T0,
  surcharge: Partial<DiffusionHistorique> & { version?: Partial<DiffusionHistorique['version']> } = {},
): DiffusionHistorique {
  const { version, ...reste } = surcharge;
  return {
    approbationId: id,
    approuveLe: jour(approuveLeJour),
    creeLe: jour(approuveLeJour),
    approuvePar: 'practitioner',
    confirmation: DIFFUSION_CONFIRMATION,
    decisionCardInputHash: `carte-${id}`,
    protocolDraftInputHash: `version-${id}`,
    ...reste,
    version: {
      inputHash: `version-${id}`,
      decisionCardInputHash: `carte-${id}`,
      status: 'practitioner_reviewed',
      reviewedAt: new Date(jour(approuveLeJour).getTime() - 60_000),
      selectedPriorityId: priorite,
      episode,
      ...version,
    },
  };
}

describe('calendrierDuCycle', () => {
  it('sans diffusion, aucun calendrier : aucun jalon ne court', () => {
    expect(calendrierDuCycle('ep-T0', [])).toBeNull();
  });

  it('la première diffusion est le jour 0', () => {
    expect(calendrierDuCycle('ep-T0', [diffusion('a', 10, 'PRIO-A')])).toEqual({
      cycleId: 'ep-T0',
      jourZero: jour(10),
      prioriteId: 'PRIO-A',
      approbationId: 'a',
      relance: false,
    });
  });

  it('une rediffusion sur la même priorité (alléger, densifier) ne relance rien', () => {
    const calendrier = calendrierDuCycle('ep-T0', [diffusion('a', 10, 'PRIO-A'), diffusion('b', 20, 'PRIO-A')]);
    expect(calendrier?.jourZero).toEqual(jour(10));
    expect(calendrier?.approbationId).toBe('a');
    expect(calendrier?.relance).toBe(false);
  });

  it('un pivot, une diffusion dont la priorité change, relance le calendrier', () => {
    const calendrier = calendrierDuCycle('ep-T0', [diffusion('a', 10, 'PRIO-A'), diffusion('b', 30, 'PRIO-B')]);
    expect(calendrier).toMatchObject({ jourZero: jour(30), prioriteId: 'PRIO-B', approbationId: 'b', relance: true });
  });

  it('après un pivot, une rediffusion sur la nouvelle priorité garde le jour 0 du pivot', () => {
    const calendrier = calendrierDuCycle('ep-T0', [
      diffusion('a', 10, 'PRIO-A'),
      diffusion('b', 30, 'PRIO-B'),
      diffusion('c', 35, 'PRIO-B'),
    ]);
    expect(calendrier).toMatchObject({ jourZero: jour(30), approbationId: 'b', relance: true });
  });

  it('un retour à la priorité d’origine après un pivot est lui-même un pivot', () => {
    const calendrier = calendrierDuCycle('ep-T0', [
      diffusion('a', 10, 'PRIO-A'),
      diffusion('b', 30, 'PRIO-B'),
      diffusion('c', 40, 'PRIO-A'),
    ]);
    expect(calendrier).toMatchObject({ jourZero: jour(40), prioriteId: 'PRIO-A', approbationId: 'c', relance: true });
  });

  it('lit l’historique dans l’ordre des dates, quel que soit l’ordre reçu', () => {
    const calendrier = calendrierDuCycle('ep-T0', [
      diffusion('c', 35, 'PRIO-B'),
      diffusion('a', 10, 'PRIO-A'),
      diffusion('b', 30, 'PRIO-B'),
    ]);
    expect(calendrier?.approbationId).toBe('b');
  });

  it('départage deux approbations de même date par l’écriture, puis par l’identifiant', () => {
    const memeInstant = [
      diffusion('z', 10, 'PRIO-A', T0, { creeLe: jour(9) }),
      diffusion('y', 10, 'PRIO-A', T0, { creeLe: jour(9) }),
      diffusion('x', 10, 'PRIO-B', T0, { creeLe: jour(11) }),
    ];
    const calendrier = calendrierDuCycle('ep-T0', memeInstant);
    // `y` puis `z` (même écriture, départagés par l'identifiant), puis `x`, pivot.
    expect(calendrier).toMatchObject({ approbationId: 'x', relance: true });
    expect(calendrierDuCycle('ep-T0', memeInstant.slice(0, 2))?.approbationId).toBe('y');
  });
});

describe('estDiffusionRecevable', () => {
  it('reçoit une approbation qui recoupe sa version relue', () => {
    expect(estDiffusionRecevable(diffusion('a', 10, 'PRIO-A'))).toBe(true);
  });

  it.each([
    ['une version non relue', { version: { status: 'draft' } }],
    ['une version sans date de relecture', { version: { reviewedAt: null } }],
    ['une empreinte de version qui ne recoupe pas', { protocolDraftInputHash: 'autre' }],
    ['une empreinte de carte qui ne recoupe pas', { decisionCardInputHash: 'autre' }],
    ['une confirmation inconnue', { confirmation: 'autre' }],
    ['un auteur qui n’est pas le praticien', { approuvePar: 'systeme' }],
    ['une approbation antérieure à la relecture', { version: { reviewedAt: jour(11) } }],
  ] as const)('refuse %s', (_cas, surcharge) => {
    expect(estDiffusionRecevable(diffusion('a', 10, 'PRIO-A', T0, surcharge as never))).toBe(false);
  });
});

describe('cycleDeLaDiffusion', () => {
  it('une version construite sur une ancre appartient au cycle de cette ancre', () => {
    expect(cycleDeLaDiffusion(diffusion('a', 70, 'PRIO-A', T0), ANCRES)).toBe('ep-T0');
  });

  it('une ancre sans cycle stocké porte son propre identifiant', () => {
    expect(cycleDeLaDiffusion(diffusion('a', 10, 'PRIO-A', { id: 'ep-T0', milestone: 'T0', cycleId: null }), ANCRES)).toBe('ep-T0');
  });

  it('une version construite sur un jalon de mesure rejoint le cycle stocké de ce jalon', () => {
    expect(cycleDeLaDiffusion(diffusion('a', 70, 'PRIO-A', J21), ANCRES)).toBe('ep-T0');
  });

  it('sans épisode, la date rattache au cycle ouvert à la diffusion', () => {
    expect(cycleDeLaDiffusion(diffusion('a', 10, 'PRIO-A', null), ANCRES)).toBe('ep-T0');
    expect(cycleDeLaDiffusion(diffusion('b', 70, 'PRIO-A', null), ANCRES)).toBe('ep-T1');
  });

  it('un jalon de mesure sans cycle stocké retombe sur la date', () => {
    const herite = { id: 'ep-J21-herite', milestone: 'J21', cycleId: null };
    expect(cycleDeLaDiffusion(diffusion('a', 70, 'PRIO-A', herite), ANCRES)).toBe('ep-T1');
  });

  it('le repli par date départage par le rang, pas par la date', () => {
    // Discordance (`DC-30`) : un `T1` confirmé AVANT le `T0`.
    const discordantes: AncreDeRattachement[] = [
      { id: 'ep-T1', cycleId: 'ep-T1', milestone: 'T1', confirmedAt: jour(0) },
      { id: 'ep-T0', cycleId: 'ep-T0', milestone: 'T0', confirmedAt: jour(5) },
    ];
    expect(cycleDeLaDiffusion(diffusion('a', 10, 'PRIO-A', null), discordantes)).toBe('ep-T1');
  });

  it('sans ancre antérieure, la diffusion n’est rattachée à aucun cycle', () => {
    expect(cycleDeLaDiffusion({ approuveLe: new Date(Date.UTC(2026, 7, 1)), version: { episode: null } }, ANCRES)).toBeNull();
  });
});

describe('calendriersParCycle', () => {
  it('chaque cycle a son calendrier, et la première diffusion d’un cycle n’est pas un pivot du précédent', () => {
    const { parCycle, nonRattachees } = calendriersParCycle(
      [diffusion('a', 10, 'PRIO-A', T0), diffusion('b', 30, 'PRIO-A', J21), diffusion('c', 65, 'PRIO-B', T1)],
      ANCRES,
    );
    expect(parCycle.get('ep-T0')).toMatchObject({ jourZero: jour(10), approbationId: 'a', relance: false });
    expect(parCycle.get('ep-T1')).toMatchObject({ jourZero: jour(65), approbationId: 'c', relance: false });
    expect(nonRattachees).toEqual([]);
  });

  it('un pivot rendu à J21 relance le calendrier de son cycle', () => {
    const { parCycle } = calendriersParCycle(
      [diffusion('a', 10, 'PRIO-A', T0), diffusion('b', 33, 'PRIO-B', J21)],
      ANCRES,
    );
    expect(parCycle.get('ep-T0')).toMatchObject({ jourZero: jour(33), relance: true });
  });

  it('une approbation irrecevable ne date rien, même la première', () => {
    const { parCycle } = calendriersParCycle(
      [diffusion('a', 10, 'PRIO-A', T0, { confirmation: 'autre' }), diffusion('b', 20, 'PRIO-A', T0)],
      ANCRES,
    );
    expect(parCycle.get('ep-T0')).toMatchObject({ jourZero: jour(20), approbationId: 'b' });
  });

  it('un cycle sans diffusion n’a pas de calendrier', () => {
    const { parCycle } = calendriersParCycle([diffusion('a', 10, 'PRIO-A', T0)], ANCRES);
    expect(parCycle.has('ep-T1')).toBe(false);
  });

  it('nomme la diffusion qu’aucun cycle ne reçoit, au lieu de la perdre', () => {
    const orpheline = diffusion('a', 10, 'PRIO-A', null, { approuveLe: new Date(Date.UTC(2026, 7, 1)) });
    orpheline.version.reviewedAt = new Date(Date.UTC(2026, 6, 31));
    const { parCycle, nonRattachees } = calendriersParCycle([orpheline], ANCRES);
    expect(parCycle.size).toBe(0);
    expect(nonRattachees).toEqual(['a']);
  });
});
