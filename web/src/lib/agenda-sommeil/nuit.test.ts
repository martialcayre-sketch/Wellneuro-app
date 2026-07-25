import { describe, expect, it } from 'vitest';
import {
  decalerDate,
  ensureNuitReponses,
  estDateSaisissable,
  estDateValide,
  resolveNuitsActives,
} from './nuit';
import type { NuitRow } from './types';

const express = { heureCoucher: '23:00', heureLever: '07:00', latence: 'lt15', qualite: 4 };

describe('ensureNuitReponses', () => {
  it('accepte une nuit express valide', () => {
    const r = ensureNuitReponses(express);
    expect(r.heureCoucher).toBe('23:00');
    expect(r.qualite).toBe(4);
  });

  it('ignore les clés supplémentaires (contractVersion)', () => {
    const r = ensureNuitReponses({ ...express, contractVersion: 'agenda-sommeil-v1' });
    expect(r).not.toHaveProperty('contractVersion');
  });

  it('rejette une heure hors pas de 15 min', () => {
    expect(() => ensureNuitReponses({ ...express, heureCoucher: '23:07' })).toThrow(TypeError);
  });

  it('rejette une latence hors classe', () => {
    expect(() => ensureNuitReponses({ ...express, latence: '12min' })).toThrow(TypeError);
  });

  it('rejette une qualité hors 1..5', () => {
    expect(() => ensureNuitReponses({ ...express, qualite: 6 })).toThrow(TypeError);
    expect(() => ensureNuitReponses({ ...express, qualite: 3.5 })).toThrow(TypeError);
  });

  it('accepte les champs facultatifs valides', () => {
    const r = ensureNuitReponses({
      ...express,
      reveils: { nombre: 2, dureeTotale: 'e15_45' },
      forme: 3,
      siesteVeille: 'lt20',
      facteurs: { cafeApres14h: true, alcool: false },
      commentaire: 'nuit agitée',
    });
    expect(r.reveils).toEqual({ nombre: 2, dureeTotale: 'e15_45' });
    expect(r.facteurs).toEqual({ cafeApres14h: true, alcool: false });
    expect(r.commentaire).toBe('nuit agitée');
  });

  it('rejette un commentaire de plus de 200 caractères', () => {
    expect(() => ensureNuitReponses({ ...express, commentaire: 'x'.repeat(201) })).toThrow(
      TypeError,
    );
  });

  it('rejette un facteur non booléen', () => {
    expect(() => ensureNuitReponses({ ...express, facteurs: { alcool: 'oui' } })).toThrow(TypeError);
  });
});

describe('estDateValide', () => {
  it('accepte une date réelle', () => {
    expect(estDateValide('2026-07-25')).toBe(true);
  });
  it('rejette une date impossible', () => {
    expect(estDateValide('2026-13-40')).toBe(false);
    expect(estDateValide('25-07-2026')).toBe(false);
  });
});

describe('decalerDate', () => {
  it('décale d’un jour en avant et en arrière', () => {
    expect(decalerDate('2026-07-25', 1)).toBe('2026-07-26');
    expect(decalerDate('2026-07-25', -1)).toBe('2026-07-24');
  });
  it('franchit une frontière de mois', () => {
    expect(decalerDate('2026-07-31', 1)).toBe('2026-08-01');
    expect(decalerDate('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('estDateSaisissable', () => {
  const today = '2026-07-25';
  it('accepte aujourd’hui et la veille', () => {
    expect(estDateSaisissable('2026-07-25', today)).toBe(true);
    expect(estDateSaisissable('2026-07-24', today)).toBe(true);
  });
  it('refuse l’avant-veille et le futur', () => {
    expect(estDateSaisissable('2026-07-23', today)).toBe(false);
    expect(estDateSaisissable('2026-07-26', today)).toBe(false);
  });
});

describe('resolveNuitsActives — chaînage append-only', () => {
  const base = (over: Partial<NuitRow>): NuitRow => ({
    id: 'n1',
    idPatient: 'PAT',
    idAssignation: 'ASS',
    dateNuit: '2026-07-24',
    reponses: ensureNuitReponses(express),
    canal: 'portail',
    supersedesNuitId: null,
    soumisLe: '2026-07-24T07:00:00.000Z',
    ...over,
  });

  it('une seule nuit par date : garde la tête de chaîne (correction)', () => {
    const rows: NuitRow[] = [
      base({ id: 'n1', dateNuit: '2026-07-24', soumisLe: '2026-07-24T07:00:00.000Z' }),
      base({
        id: 'n2',
        dateNuit: '2026-07-24',
        supersedesNuitId: 'n1',
        soumisLe: '2026-07-25T08:00:00.000Z',
      }),
    ];
    const actives = resolveNuitsActives(rows);
    expect(actives).toHaveLength(1);
    expect(actives[0].id).toBe('n2');
  });

  it('conserve une nuit par date distincte, triées chronologiquement', () => {
    const rows: NuitRow[] = [
      base({ id: 'b', dateNuit: '2026-07-25' }),
      base({ id: 'a', dateNuit: '2026-07-24' }),
    ];
    const actives = resolveNuitsActives(rows);
    expect(actives.map((n) => n.dateNuit)).toEqual(['2026-07-24', '2026-07-25']);
  });
});
