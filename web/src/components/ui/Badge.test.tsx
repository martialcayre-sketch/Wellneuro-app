// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Badge, varianteInterpretation } from './Badge';

afterEach(cleanup);

// Ticket #1368 : la bande de gravité la plus haute (`dark`) tombait en
// `neutral`, un gris moins marqué que la bande inférieure (`danger`).
describe('varianteInterpretation', () => {
  it.each([
    ['success', 'success'],
    ['warning', 'warning'],
    ['danger', 'danger'],
    ['dark', 'critical'],
    ['info', 'neutral'],
    [undefined, 'neutral'],
    ['inconnue', 'neutral'],
  ])('%o → %s', (couleur, variante) => {
    expect(varianteInterpretation(couleur)).toBe(variante);
  });

  it('la bande la plus haute se rend en fond plein, plus marquée que `danger`', () => {
    render(<Badge variant={varianteInterpretation('dark')}>Sévère</Badge>);
    const badge = screen.getByText('Sévère');
    expect(badge.getAttribute('data-variant')).toBe('critical');
    expect(badge.className).toContain('bg-status-danger ');
    expect(badge.className).not.toContain('bg-status-danger/10');
  });
});
