// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { EstimeMesurePanel } from './EstimeMesurePanel';

afterEach(cleanup);

describe('EstimeMesurePanel (A6-R2 — second temps)', () => {
  it('documente l’instrument sans aucune donnée : badge HDS, aucun chiffre d’exemple', () => {
    render(<EstimeMesurePanel />);
    expect(screen.getByRole('region', { name: 'Estimé et mesuré' })).toBeTruthy();
    expect(screen.getByText('Second temps — HDS requis')).toBeTruthy();
    expect(screen.getByText(/jamais fusionnés en un chiffre unique/)).toBeTruthy();
    // Aucune valeur fabriquée : pas de nombre isolé dans le panneau.
    expect(screen.queryByText(/\d+ ?(ng\/mL|:1)/)).toBeNull();
  });
});
