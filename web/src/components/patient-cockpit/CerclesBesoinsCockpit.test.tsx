// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { CerclesBesoinsCockpit, OPACITE_PLANCHER, opaciteRemplissage, type BesoinCercle } from './CerclesBesoinsCockpit';

// r3_08 (Q2) — les cercles propres au cockpit : libellé Bn par point, anneaux
// nommés, forme propre au non mesuré, ordre fixe, liste en texte.

const STRATE = (id: number) => (id <= 6 ? 'CORPS' : id <= 9 ? 'ANCRAGE' : 'ESPRIT') as BesoinCercle['strate'];

function besoin(id: number, couverture: number | null): BesoinCercle {
  return {
    id,
    libelle: `Besoin ${id}`,
    strate: STRATE(id),
    couverture,
    motifNonMesure:
      couverture === null ? [{ motif: 'aucune_passation', idsQuestionnaire: ['Q_STR_01'], dateDernierePassation: null }] : null,
    provenance:
      couverture === null ? null : { sources: [{ idQuestionnaire: 'Q_STR_01', dateReponse: '2026-10-01T10:00:00.000Z' }], versionCalcul: 'v15' },
    carteLiee: id === 9 ? 'reserveAdaptation' : id === 10 ? 'clarte' : null,
  };
}

// Reçus dans l'ordre « creux d'abord » de la route, comme aujourd'hui.
const RECUS = [besoin(9, 12), besoin(4, 30), besoin(1, 62), besoin(12, 80), besoin(2, null), besoin(6, null)];

describe('CerclesBesoinsCockpit', () => {
  afterEach(() => cleanup());

  it('ordre fixe : B1 à B12, quel que soit l’ordre reçu', () => {
    render(<CerclesBesoinsCockpit besoins={RECUS} />);
    const liste = screen.getByRole('list', { name: 'Les 12 besoins, en texte' });
    // Les lignes de la liste seules — les motifs dépliés sont une liste à eux.
    const lignes = [...liste.children].map(li => li.textContent?.split(' · ')[0]);
    expect(lignes).toEqual(['B1', 'B2', 'B4', 'B6', 'B9', 'B12']);
  });

  it('chaque point porte son libellé Bn, et chaque anneau son nom', () => {
    const { container } = render(<CerclesBesoinsCockpit besoins={RECUS} />);
    const textes = [...container.querySelectorAll('svg text')].map(t => t.textContent);
    expect(textes).toEqual(expect.arrayContaining(['Corps', 'Ancrage', 'Esprit', 'B1', 'B2', 'B4', 'B6', 'B9', 'B12']));
    expect(screen.getByRole('img', { name: /Cercles concentriques des 12 besoins/i })).toBeTruthy();
  });

  it('non mesuré : un anneau creux en pointillé, jamais un point pâle', () => {
    const { container } = render(<CerclesBesoinsCockpit besoins={RECUS} />);
    const point = container.querySelector('[data-besoin="2"] circle') as SVGCircleElement;
    expect(point.closest('g')?.getAttribute('data-mesure')).toBe('non');
    expect(point.getAttribute('stroke-dasharray')).toBe('3 2');
    expect(point.getAttribute('fill')).toBe('var(--surface)');
    expect(point.getAttribute('fill-opacity')).toBeNull();
  });

  it('mesuré : un disque plein, contouré à l’encre de sa strate, l’intensité au-dessus du plancher', () => {
    const { container } = render(<CerclesBesoinsCockpit besoins={RECUS} />);
    const bas = container.querySelector('[data-besoin="9"] circle') as SVGCircleElement;
    expect(bas.getAttribute('stroke-dasharray')).toBeNull();
    expect(bas.getAttribute('fill')).toBe('var(--viz-ancrage)');
    expect(bas.getAttribute('stroke')).toBe('var(--indigo-600)');
    expect(Number(bas.getAttribute('fill-opacity'))).toBeGreaterThanOrEqual(OPACITE_PLANCHER);
    // Esprit : sa teinte seule n'atteint pas 3:1 sur la surface — l'encre sombre si.
    const esprit = container.querySelector('[data-besoin="12"] circle') as SVGCircleElement;
    expect(esprit.getAttribute('stroke')).toBe('var(--solar-ink)');
  });

  it('le plancher d’opacité borne l’intensité, sans changer de teinte', () => {
    expect(opaciteRemplissage(0)).toBe(OPACITE_PLANCHER);
    expect(opaciteRemplissage(100)).toBe(1);
    expect(opaciteRemplissage(-5)).toBe(OPACITE_PLANCHER);
  });

  it('la liste en texte dit la valeur, ou « Non mesuré » avec son motif dépliable', () => {
    render(<CerclesBesoinsCockpit besoins={RECUS} />);
    const liste = screen.getByRole('list', { name: 'Les 12 besoins, en texte' });
    expect(liste.textContent).toContain('B1 · Besoin 1 — 62%');
    expect(liste.textContent).toContain('B2 · Besoin 2 — Non mesuré');
    const [geste] = within(liste).getAllByText('Motif', { selector: 'summary' });
    expect(geste.getAttribute('aria-label')).toBe('Motif — B2 · Besoin 2');
    expect(liste.textContent).toContain('Non mesuré · aucune passation exploitable (Q_STR_01)');
    const [source] = within(liste).getAllByText('Source', { selector: 'summary' });
    expect(source.getAttribute('aria-label')).toBe('Source — B1 · Besoin 1');
    expect(liste.textContent).toContain('Questionnaire : Q_STR_01 (réponse du 01/10/2026)');
  });

  it('figure de compréhension : le motif « aucune passation exploitable » n’y porte aucun geste (D-352 §2)', () => {
    render(<CerclesBesoinsCockpit besoins={RECUS} />);
    expect(screen.queryByText('Compléter la mesure')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Ajouter à la file d’envoi' })).toBeNull();
  });

  it('B9 et B10 disent servir la même valeur que leur carte ; un non mesuré, non', () => {
    render(<CerclesBesoinsCockpit besoins={[besoin(9, 48), besoin(10, null), besoin(1, 62)]} />);
    const liste = screen.getByRole('list', { name: 'Les 12 besoins, en texte' });
    const [b1, b9, b10] = [...liste.children].map(li => li.textContent ?? '');
    expect(b9).toContain('Même valeur que la carte « Réserve d\'adaptation » (repère de suivi)');
    expect(b10).not.toContain('Même valeur');
    expect(b1).not.toContain('Même valeur');
  });

  it('sans provenance établie : ni chiffre dans la liste, ni intensité sur la figure', () => {
    const { container } = render(
      <CerclesBesoinsCockpit besoins={[{ ...besoin(1, 62), provenance: null }, besoin(2, null)]} />,
    );
    const liste = screen.getByRole('list', { name: 'Les 12 besoins, en texte' });
    expect(liste.textContent).toContain('B1 · Besoin 1 — Source non enregistrée');
    expect(liste.textContent).not.toContain('62');
    const point = container.querySelector('[data-besoin="1"] circle') as SVGCircleElement;
    expect(Number(point.getAttribute('fill-opacity'))).toBe(OPACITE_PLANCHER);
    expect(within(liste).queryByText('Source', { selector: 'summary' })).toBeNull();
  });
});
