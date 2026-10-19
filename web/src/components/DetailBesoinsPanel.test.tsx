// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { DetailBesoinsPanel } from './DetailBesoinsPanel';

// Le radar (recharts) n'est pas l'objet de ce banc : seul le tableau voisin
// est jugé.
vi.mock('@/components/ui/ScoreRadar', () => ({ ScoreRadar: () => null }));

const reponse = {
  patient: { idPatient: 'PAT_SEED_01', prenom: 'Sophie', nom: 'Nicola' },
  besoins: [
    { id: 1, libellePraticien: 'Sommeil réparateur', strate: 'CORPS', couverture: 40, niveauPreuve: 'A', sources: [] },
    { id: 2, libellePraticien: 'Ancrage du matin', strate: 'ANCRAGE', couverture: null, niveauPreuve: 'NON_MESURE', sources: [] },
    { id: 3, libellePraticien: 'Énergie stable', strate: 'CORPS', couverture: 70, niveauPreuve: 'D', sources: [] },
  ],
};

describe('DetailBesoinsPanel — niveau de preuve masqué ([[D-331]])', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('affiche la couverture, jamais la lettre A–D ni sa légende, même si la réponse la porte', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => reponse })));
    render(<DetailBesoinsPanel idPatient="PAT_SEED_01" />);

    const tableau = await screen.findByRole('table');
    expect(tableau.textContent).toContain('40%');
    expect(tableau.textContent).toContain('70%');
    expect(screen.getAllByRole('cell', { name: '—' })).toHaveLength(1);
    expect(screen.getAllByRole('columnheader').map(c => c.textContent)).toEqual(['Besoin', 'Couverture']);

    const page = document.body.textContent ?? '';
    expect(page).not.toMatch(/Niveau [ABCD]\b/);
    expect(page).not.toMatch(/questionnaire clinique validé|hypothèse WellNeuro/);
  });
});
