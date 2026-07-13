// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TwoLevelReading } from './TwoLevelReading';

describe('TwoLevelReading', () => {
  it('cache le détail par défaut et l\'affiche après un clic sur le contrôle', () => {
    render(
      <TwoLevelReading
        summary="Résumé"
        detail="Détail"
        label="Voir le détail"
      />
    );

    expect(screen.getByText('Résumé')).not.toBeNull();
    expect(screen.queryByText('Détail')).toBeNull();

    const toggle = screen.getByRole('button', { name: 'Voir le détail' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(toggle);

    expect(screen.getByText('Détail')).not.toBeNull();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(toggle);

    expect(screen.queryByText('Détail')).toBeNull();
  });

  it('affiche le détail dès le rendu quand defaultExpanded est vrai', () => {
    render(
      <TwoLevelReading
        summary="Résumé"
        detail="Détail"
        label="Voir le détail"
        defaultExpanded
      />
    );

    expect(screen.getByText('Détail')).not.toBeNull();
  });
});
