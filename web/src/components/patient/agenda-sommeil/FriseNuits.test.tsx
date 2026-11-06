// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { FriseNuits } from './FriseNuits';

afterEach(cleanup);

describe('FriseNuits', () => {
  it('la région qui défile se prend au clavier, avec un nom (WCAG 2.1.1)', () => {
    render(<FriseNuits emplacements={[]} nuitsParDate={new Map()} />);
    const region = screen.getByRole('group', { name: /frise de vos nuits/i });
    expect(region.className).toContain('overflow-x-auto');
    expect(region.getAttribute('tabindex')).toBe('0');
  });
});
