// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { PatientJourneyProgress, buildJourneySteps } from './PatientJourneyProgress';

afterEach(cleanup);

describe('PatientJourneyProgress', () => {
  it('la frise qui défile se prend au clavier, avec un nom (WCAG 2.1.1)', () => {
    render(<PatientJourneyProgress steps={buildJourneySteps(2)} />);
    const frise = screen.getByRole('list', { name: 'Étapes de votre parcours' });
    expect(frise.className).toContain('overflow-x-auto');
    expect(frise.getAttribute('tabindex')).toBe('0');
  });
});
