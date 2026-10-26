// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Polygon } from 'recharts';

import {
  LIBELLE_NON_MESURE,
  LIBELLE_SOURCE_NON_ENREGISTREE,
  donneesRadarBesoins,
  estMesure,
  pointsAvecTrous,
} from './scoreRadarPoints';

const SOURCE = { sources: [{ idQuestionnaire: 'Q_TEST', dateReponse: '2026-10-01T10:00:00.000Z' }], versionCalcul: 'v1' };

// [[D-301]] (lettre ac, `DC-24`) : un besoin non mesuré n'est jamais tracé à
// zéro. Le banc tient la règle à ses deux bouts — la donnée garde l'absence,
// et le contour de recharts s'interrompt sur l'axe au lieu de plonger au centre.

describe('les données du radar gardent l’absence', () => {
  it('une couverture absente reste absente — jamais 0', () => {
    expect(donneesRadarBesoins([
      { id: 1, couverture: 62, provenance: SOURCE },
      { id: 2, couverture: null, provenance: null },
      { id: 3, couverture: 0, provenance: SOURCE },
    ])).toEqual([
      { axe: 'B1', value: 62 },
      { axe: 'B2', value: null },
      { axe: 'B3', value: 0 },
    ]);
  });

  // [[D-333]] §2 règle 1 (r3_09) : une valeur sans provenance n'est pas
  // tracée, et son axe ne se dit pas « non mesuré ».
  it('une couverture sans provenance établie n’est pas tracée, et se nomme autrement', () => {
    expect(donneesRadarBesoins([
      { id: 1, couverture: 62, provenance: null },
      { id: 2, couverture: 40, provenance: { ...SOURCE, sources: [{ idQuestionnaire: 'Q_TEST', dateReponse: null }] } },
      { id: 3, couverture: null, provenance: null },
    ])).toEqual([
      { axe: 'B1', value: null, absence: LIBELLE_SOURCE_NON_ENREGISTREE },
      { axe: 'B2', value: null, absence: LIBELLE_SOURCE_NON_ENREGISTREE },
      { axe: 'B3', value: null },
    ]);
    expect(LIBELLE_SOURCE_NON_ENREGISTREE).toBe('source non enregistrée');
  });

  it('un 0 mesuré est une mesure ; ni null ni NaN n’en sont', () => {
    expect(estMesure(0)).toBe(true);
    expect(estMesure(null)).toBe(false);
    expect(estMesure(undefined)).toBe(false);
    expect(estMesure(Number.NaN)).toBe(false);
  });

  it('le libellé de l’axe est celui de D-301', () => {
    expect(LIBELLE_NON_MESURE).toBe('non mesuré');
  });
});

describe('le contour s’interrompt sur un axe non mesuré', () => {
  // Quatre axes en carré autour de (50, 50) ; l'axe 2 n'est pas mesuré.
  const sommets = [
    { x: 50, y: 10, value: 80 },
    { x: 90, y: 50, value: null },
    { x: 50, y: 90, value: 80 },
    { x: 10, y: 50, value: 80 },
  ];

  it('le sommet non mesuré perd ses coordonnées, les autres les gardent', () => {
    const avecTrous = pointsAvecTrous(sommets);
    expect(Number.isNaN(avecTrous[1].x)).toBe(true);
    expect(Number.isNaN(avecTrous[1].y)).toBe(true);
    expect(avecTrous[0]).toBe(sommets[0]);
    expect(avecTrous[3]).toBe(sommets[3]);
  });

  it('le vrai Polygon de recharts trace deux segments, ni fermés ni remplis, et ne passe pas par l’axe vide', () => {
    const { container } = render(
      <svg><Polygon points={pointsAvecTrous(sommets) as { x: number; y: number }[]} fill="red" stroke="blue" /></svg>,
    );
    const d = container.querySelector('path')?.getAttribute('d') ?? '';
    expect(d.match(/M/g)?.length).toBe(2);
    expect(d.endsWith('Z')).toBe(false);
    expect(d).not.toContain('90,50');
    expect(container.querySelector('path')?.getAttribute('fill')).toBe('none');
  });

  // Trou à une extrémité de la liste : en tête, recharts fermait le contour
  // restant par une corde (`Z`) et le remplissait ; en queue, il reste ouvert.
  it.each([
    ['en tête', 0, '50,10'],
    ['en queue', 3, '10,50'],
  ])('trou %s : contour ouvert, non rempli, sans passer par l’axe vide', (_cas, indice, coordonnees) => {
    const avecTrou = sommets.map((s, i) => ({ ...s, value: i === indice ? null : 80 }));
    const { container } = render(
      <svg><Polygon points={pointsAvecTrous(avecTrou) as { x: number; y: number }[]} fill="red" stroke="blue" /></svg>,
    );
    const d = container.querySelector('path')?.getAttribute('d') ?? '';
    expect(d.endsWith('Z')).toBe(false);
    expect(d).not.toContain(coordonnees);
    expect(container.querySelector('path')?.getAttribute('fill')).toBe('none');
  });

  it('trou en tête : la liste tourne, l’ordre circulaire est gardé', () => {
    const avecTrou = sommets.map((s, i) => ({ ...s, value: i === 0 ? null : 80 }));
    const tournes = pointsAvecTrous(avecTrou);
    expect(tournes.map(p => p.x)).toEqual([90, 50, 10, Number.NaN]);
  });

  // CONTRE-ÉPREUVE : sans le trou, recharts fermerait et remplirait le contour.
  it('tout mesuré : le contour reste fermé et rempli, comme avant', () => {
    const mesures = sommets.map(s => ({ ...s, value: 80 }));
    const { container } = render(
      <svg><Polygon points={pointsAvecTrous(mesures)} fill="red" stroke="blue" /></svg>,
    );
    const d = container.querySelector('path')?.getAttribute('d') ?? '';
    expect(d.endsWith('Z')).toBe(true);
    expect(container.querySelector('path')?.getAttribute('fill')).toBe('red');
  });
});
