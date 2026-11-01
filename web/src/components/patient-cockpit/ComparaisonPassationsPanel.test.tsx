// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ComparaisonPassationsPanel } from './ComparaisonPassationsPanel';
import { ChiffresMasquesProvider } from './ChiffresMasques';
import type { ComparaisonsPassations } from '@/lib/scoring/comparaisonPassations';

// D-406 : textes validés mot pour mot par le responsable le 2026-11-01.

afterEach(cleanup);

const comparaisons: ComparaisonsPassations = {
  paires: [
    {
      idQuestionnaire: 'Q_MOD_03',
      titre: 'Mes plaintes actuelles et troubles ressentis',
      a: { date: '2026-09-20T08:00:00.000Z', score: 34 },
      b: { date: '2026-10-20T08:00:00.000Z', score: 30 },
      maximum: 70,
      ecart: -4,
    },
    {
      idQuestionnaire: 'Q_INF_03',
      titre: 'DNST SIIN',
      a: { date: '2026-09-20T08:00:00.000Z', score: 51.5 },
      b: { date: '2026-10-20T08:00:00.000Z', score: 51.5 },
      maximum: null,
      ecart: 0,
    },
  ],
  nonComparees: [{ idQuestionnaire: 'Q_NEU_11', titre: 'HADS', motif: 'version_non_etablie' }],
};

describe('ComparaisonPassationsPanel', () => {
  it('titre, chapeau et lignes, mot pour mot', () => {
    const { container } = render(<ComparaisonPassationsPanel comparaisons={comparaisons} />);
    expect(screen.getByRole('heading', { name: 'Deux passations comparées' })).toBeTruthy();
    expect(container.textContent).toContain(
      'Même instrument, même version, deux passations complètes du cycle en cours. L\'écart est donné en points du score : il ne dit pas si le changement est cliniquement réel.',
    );
    const lignes = [...container.querySelectorAll('[data-comparaison-paire]')].map((li) => li.textContent);
    expect(lignes).toEqual([
      'Mes plaintes actuelles et troubles ressentis : 34 / 70 le 20/09/2026 → 30 / 70 le 20/10/2026 — en baisse de 4 points',
      'DNST SIIN : 51,5 le 20/09/2026 → 51,5 le 20/10/2026 — même score',
    ]);
    expect(container.querySelector('[data-comparaison-non-comparee]')?.textContent).toBe(
      'HADS : deux passations, non comparées — version non établie',
    );
  });

  it('mode consultation : aucune valeur, la mention à la place', () => {
    const { container } = render(
      <ChiffresMasquesProvider masques>
        <ComparaisonPassationsPanel comparaisons={comparaisons} />
      </ChiffresMasquesProvider>,
    );
    const lignes = [...container.querySelectorAll('[data-comparaison-paire]')];
    expect(lignes).toHaveLength(2);
    for (const li of lignes) {
      expect(li.querySelector('[data-chiffre-masque]')).toBeTruthy();
      expect(li.textContent).not.toMatch(/\d/);
    }
  });

  it('aucune paire : l’état vide, les motifs restent', () => {
    const { container } = render(
      <ComparaisonPassationsPanel comparaisons={{ paires: [], nonComparees: comparaisons.nonComparees }} />,
    );
    expect(screen.getByText('Aucune paire comparable sur ce cycle.')).toBeTruthy();
    expect(container.querySelectorAll('[data-comparaison-non-comparee]')).toHaveLength(1);
  });
});
