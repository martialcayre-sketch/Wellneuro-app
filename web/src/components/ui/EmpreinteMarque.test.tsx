// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { EmpreinteMarque } from './EmpreinteMarque';

afterEach(cleanup);

describe('EmpreinteMarque', () => {
  it('nomme la marque « Wellneuro » et cache le symbole aux lecteurs d’écran', () => {
    const { container } = render(<EmpreinteMarque />);
    expect(screen.getByText('Wellneuro').className).not.toContain('sr-only');
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('en compact, garde le nom comme texte masqué', () => {
    render(<EmpreinteMarque compact />);
    expect(screen.getByText('Wellneuro').className).toBe('sr-only');
  });

  it('colore le symbole par les jetons : primaire sur clair, encre du rail sur nuit', () => {
    const { container, rerender } = render(<EmpreinteMarque />);
    expect(container.querySelector('path[fill-rule="evenodd"]')?.getAttribute('class')).toBe('fill-primary');
    rerender(<EmpreinteMarque tone="night" />);
    expect(container.querySelector('path[fill-rule="evenodd"]')?.getAttribute('class')).toBe('fill-rail-foreground');
  });

  it('sous 32 px, passe au petit format : ni arc ni graine', () => {
    const { container, rerender } = render(<EmpreinteMarque size={44} />);
    expect(container.querySelectorAll('svg > path')).toHaveLength(2);
    const complet = container.querySelector('path[fill-rule="evenodd"]')?.getAttribute('d') ?? '';
    rerender(<EmpreinteMarque size={24} />);
    expect(container.querySelectorAll('svg > path')).toHaveLength(1);
    const petit = container.querySelector('path[fill-rule="evenodd"]')?.getAttribute('d') ?? '';
    expect(petit.length).toBeLessThan(complet.length);
  });

  it('donne à chaque instance son propre clipPath', () => {
    const { container } = render(
      <>
        <EmpreinteMarque />
        <EmpreinteMarque />
      </>,
    );
    const ids = Array.from(container.querySelectorAll('clipPath')).map((c) => c.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    for (const id of ids) expect(id).toMatch(/^empreinte-clip-[a-zA-Z0-9]+$/);
  });
});
