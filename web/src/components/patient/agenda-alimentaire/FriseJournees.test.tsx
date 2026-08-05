// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { FriseJournees, etatEmplacement } from './FriseJournees';
import type { EmplacementFenetreAli } from '@/lib/agenda-alimentaire/fenetre';

// Ce que ces tests protègent : la frise distingue TROIS rendus, et le quatrième
// cas — `renseignee` ET `illisible` sur la même date — reste un état à part, pas
// une priorité arbitraire entre deux drapeaux qui ne sont PAS exclusifs (modèle
// append-only). Et aucun chiffre, aucune alarme n'entre dans la frise.

function emp(partiel: Partial<EmplacementFenetreAli> & { index: number }): EmplacementFenetreAli {
  return {
    dateJour: `2026-08-${String(partiel.index).padStart(2, '0')}`,
    renseignee: false,
    illisible: false,
    estAujourdHui: false,
    ...partiel,
  };
}

afterEach(cleanup);

describe('tri-état de la frise', () => {
  it.each([
    [false, false, 'vide'],
    [true, false, 'notee'],
    [false, true, 'illisible'],
    [true, true, 'notee-illisible'],
  ])('renseignee=%s illisible=%s → %s', (renseignee, illisible, attendu) => {
    expect(etatEmplacement({ renseignee, illisible })).toBe(attendu);
  });
});

describe('rendu', () => {
  it('rend trois états distincts, plus le cas où les deux drapeaux valent vrai', () => {
    const { container } = render(
      <FriseJournees
        emplacements={[
          emp({ index: 1 }),
          emp({ index: 2, renseignee: true }),
          emp({ index: 3, illisible: true }),
          emp({ index: 4, renseignee: true, illisible: true }),
        ]}
      />,
    );
    const etats = [...container.querySelectorAll('g[data-etat]')].map((g) =>
      g.getAttribute('data-etat'),
    );
    expect(etats).toEqual(['vide', 'notee', 'illisible', 'notee-illisible']);
    expect(new Set(etats).size).toBe(4);
  });

  it('les états se distinguent par la FORME, pas seulement par la couleur', () => {
    const { container } = render(
      <FriseJournees
        emplacements={[
          emp({ index: 1 }),
          emp({ index: 2, renseignee: true }),
          emp({ index: 3, illisible: true }),
        ]}
      />,
    );
    const groupe = (etat: string) => container.querySelector(`g[data-etat="${etat}"]`)!;
    // Vide : un pointillé, et rien d'autre.
    expect(groupe('vide').querySelector('line[stroke-dasharray]')).not.toBeNull();
    expect(groupe('vide').querySelector('rect')).toBeNull();
    // Notée : une capsule pleine.
    expect(groupe('notee').querySelector('rect')).not.toBeNull();
    // Illisible : une croix — une forme, pas une teinte.
    expect(groupe('illisible').querySelector('path')).not.toBeNull();
  });

  it('la journée notée ET illisible porte les DEUX marques, sans en choisir une', () => {
    const { container } = render(
      <FriseJournees emplacements={[emp({ index: 1, renseignee: true, illisible: true })]} />,
    );
    const groupe = container.querySelector('g[data-etat="notee-illisible"]')!;
    expect(groupe.querySelector('rect')).not.toBeNull();
    expect(groupe.querySelector('path')).not.toBeNull();
  });

  it('aucun chiffre n’est écrit dans la frise', () => {
    const { container } = render(
      <FriseJournees
        emplacements={[emp({ index: 1, renseignee: true }), emp({ index: 2, illisible: true })]}
      />,
    );
    // Les `<title>` sont l'alternative accessible, pas un texte rendu à l'écran.
    const textes = [...container.querySelectorAll('text')].map((t) => t.textContent ?? '');
    expect(textes.join(' ')).not.toMatch(/\d/);
  });

  it('porte un nom accessible et une alternative par emplacement', () => {
    const { container } = render(
      <FriseJournees emplacements={[emp({ index: 1, illisible: true })]} />,
    );
    expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(/journées notées/i);
    // `<title>` porté par le groupe : l'alternative textuelle de CHAQUE
    // emplacement, et le seul endroit où l'état est dit en toutes lettres.
    const titres = [...container.querySelectorAll('g[data-etat] > title')].map(
      (t) => t.textContent ?? '',
    );
    expect(titres).toHaveLength(1);
    expect(titres[0]).toMatch(/pas pu relire/i);
  });

  it('une frise vide de tout emplacement ne casse pas (fenêtre non ouverte)', () => {
    const { container } = render(<FriseJournees emplacements={[]} />);
    expect(container.querySelectorAll('g[data-etat]')).toHaveLength(0);
  });
});
