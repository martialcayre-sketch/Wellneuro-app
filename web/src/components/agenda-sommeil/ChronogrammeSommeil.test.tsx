// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { BarreNuit, ChronogrammeSommeil, portionsBarre } from './ChronogrammeSommeil';
import type { NuitRow } from '@/lib/agenda-sommeil/types';

// Constat B4 de la revue du 2026-07-28 : la barre s'arrêtait au réveil final au
// lieu du lever, et la bande d'éveil du matin — posée en pied de barre —
// tombait donc en plein sommeil. L'infobulle disait le contraire du dessin, et
// le praticien lisait un réveil précoce à 2 h du matin.
//
// recharts ne rend rien sans dimensions en jsdom : on teste `BarreNuit`, la
// forme personnalisée, en l'appelant directement. C'est elle qui porte toute la
// géométrie des portions claires.

const nuit = (over: Partial<NuitRow['reponses']> = {}): NuitRow => ({
  id: 'n1',
  idPatient: 'PAT',
  idAssignation: 'ASS',
  dateNuit: '2026-07-06',
  reponses: {
    heureCoucher: '23:00',
    heureLever: '07:00',
    latence: 'lt15',
    qualite: 4,
    reveils: { dureeTotale: 'aucun' },
    aideSommeil: 'aucune',
    extinctionImmediate: true,
    leverImmediat: true,
    ...over,
  },
  canal: 'portail',
  supersedesNuitId: null,
  soumisLe: '2026-07-06T07:00:00.000Z',
});

// La fenêtre visuelle court de 20 h à 12 h : 23:00 → 3 h, 07:00 → 11 h.
const H = (heures: number) => heures;

afterEach(cleanup);

describe('portions de la barre', () => {
  it('l’éveil du matin occupe la fin de la barre, le sommeil ce qui reste', () => {
    // Fenêtre 23:00 → 07:00 (8 h), 8 min d'endormissement, 2 h 30 d'éveil au
    // lit le matin. La bande d'éveil doit valoir 2,5/8 de la hauteur — et non
    // se poser au milieu du sommeil, comme lorsque la barre s'arrêtait au
    // réveil final au lieu du lever.
    const p = portionsBarre(H(100), 8, 8 / 60, 2.5);
    expect(p.hEveilMatin).toBeCloseTo((2.5 / 8) * 100, 6);
    expect(p.hLatence).toBeCloseTo((8 / 60 / 8) * 100, 6);
    // Les trois portions pavent exactement la barre, sans trou ni recouvrement.
    expect(p.hLatence + p.hSommeil + p.hEveilMatin).toBeCloseTo(100, 6);
  });

  it('sans réveil final, aucune bande d’éveil du matin', () => {
    const p = portionsBarre(H(100), 8, 8 / 60, 0);
    expect(p.hEveilMatin).toBe(0);
    expect(p.hLatence + p.hSommeil).toBeCloseTo(100, 6);
  });

  it('les portions restent disjointes même quand leur somme dépasse la barre', () => {
    // Nuit de 2 h avec 75 min d'endormissement et 60 min d'éveil au matin : le
    // bornage doit rogner plutôt que faire se chevaucher les bandes.
    const p = portionsBarre(H(100), 2, 75 / 60, 1);
    expect(p.hLatence + p.hEveilMatin).toBeLessThanOrEqual(100);
    expect(p.hSommeil).toBeGreaterThanOrEqual(0);
    expect(p.hLatence + p.hSommeil + p.hEveilMatin).toBeCloseTo(100, 6);
  });

  it('une étendue nulle ne produit ni NaN ni portion négative', () => {
    const p = portionsBarre(H(100), 0, 0.5, 0.5);
    expect(Number.isFinite(p.hLatence)).toBe(true);
    expect(p.hSommeil).toBeGreaterThanOrEqual(0);
  });
});

describe('barre d’une nuit', () => {
  // recharts 3 rend une barre d'intervalle sur l'axe inversé avec une hauteur
  // NÉGATIVE et `y` au pied (mesuré dans un vrai navigateur : y 129, hauteur
  // −88 pour 23:00 → 07:00). La forme écartait toute hauteur ≤ 0 : le
  // chronogramme ne dessinait aucune nuit.
  const point = (latence: 'lt15' | 'inconnu') => ({
    label: 'Nuit 1',
    plage: [3, 11] as [number, number],
    latenceH: latence === 'inconnu' ? 0 : 7.5 / 60,
    eveilMatinH: 0,
    semaine: 0,
    weekend: false,
    nuit: nuit({ latence }).reponses,
    essaiDeDormir: true,
    latenceInconnue: latence === 'inconnu',
  });
  const dessiner = (hauteur: number, y: number, latence: 'lt15' | 'inconnu' = 'lt15') =>
    render(
      // Appelée comme recharts l'appelle : une fonction qui reçoit ses props.
      <svg>{BarreNuit({ x: 10, y, width: 20, height: hauteur, payload: point(latence) })}</svg>,
    ).container;

  it('une hauteur négative (axe inversé) dessine la barre, en tête à y + hauteur', () => {
    const rect = dessiner(-88, 129).querySelector('rect');
    expect(rect).not.toBeNull();
    // Le sommeil commence sous la portion d'endormissement, en tête de barre.
    expect(Number(rect!.getAttribute('y'))).toBeGreaterThanOrEqual(41);
    expect(Number(rect!.getAttribute('y'))).toBeLessThan(129);
    expect(Number(rect!.getAttribute('height'))).toBeGreaterThan(0);
  });

  it('une hauteur positive reste dessinée à l’identique', () => {
    const rect = dessiner(88, 41).querySelector('rect');
    expect(Number(rect!.getAttribute('y'))).toBeGreaterThanOrEqual(41);
    expect(Number(rect!.getAttribute('height'))).toBeGreaterThan(0);
  });

  it('« je ne sais pas » : le tiret gris se pose en tête de barre', () => {
    const tiret = dessiner(-88, 129, 'inconnu').querySelector('line[stroke-dasharray="2 2"]');
    expect(tiret).not.toBeNull();
    expect(Number(tiret!.getAttribute('y1'))).toBe(41);
  });

  it('une hauteur nulle ne dessine rien', () => {
    expect(dessiner(0, 129).querySelector('rect')).toBeNull();
  });
});

describe('rendu', () => {
  it('rend un message explicite quand aucune nuit n’est renseignée', () => {
    const { container } = render(<ChronogrammeSommeil nuits={[]} />);
    expect(container.textContent).toContain('Aucune nuit renseignée');
  });

  it('la légende dit pourquoi l’éveil nocturne n’est pas dessiné', () => {
    const { container } = render(<ChronogrammeSommeil nuits={[nuit()]} />);
    expect(container.textContent).toContain('durée cumulée');
  });
});

// Silence le warning de dimension nulle de recharts en jsdom.
vi.spyOn(console, 'warn').mockImplementation(() => {});
