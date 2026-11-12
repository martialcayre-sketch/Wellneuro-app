// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { PatientJourneyProgress, STATE_CLASSES, buildJourneySteps } from './PatientJourneyProgress';

afterEach(cleanup);

describe('PatientJourneyProgress', () => {
  it('la frise qui défile se prend au clavier, avec un nom (WCAG 2.1.1)', () => {
    render(<PatientJourneyProgress steps={buildJourneySteps(2)} />);
    const frise = screen.getByRole('list', { name: 'Étapes de votre parcours' });
    expect(frise.className).toContain('overflow-x-auto');
    expect(frise.getAttribute('tabindex')).toBe('0');
  });

  // Refonte Lien, PAT-3 (prototype validé le 2026-11-11) : l'étape courante en
  // anneau pétrole remplace le halo cuivré codé en dur (renvoi de la revue de
  // COM-0) ; l'étape à venir bordée `control-border`.
  it('étape courante en anneau pétrole, sans couleur codée en dur', () => {
    expect(STATE_CLASSES.current.dot).toMatch(/\bborder-primary\b/);
    expect(STATE_CLASSES.current.dot).not.toMatch(/shadow-\[|rgba\(|bg-accent/);
    expect(STATE_CLASSES.upcoming.dot).toMatch(/\bborder-control-border\b/);
  });
});
