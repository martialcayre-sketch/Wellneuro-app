// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { GesteConfirme } from './GesteConfirme';

// Confirmation en ligne (PRA-4, Q3 et Q4 de D-481) : le focus va à la
// question à l'ouverture, et seulement à l'ouverture (second constat
// PR-Agent sur #2139) ; il revient au déclencheur à la fermeture.

afterEach(cleanup);

function rendu(desactive: boolean, onConfirmer = vi.fn()) {
  return (
    <GesteConfirme
      libelle="Geste"
      question="Question de banc ?"
      libelleConfirmer="Confirmer le geste"
      desactive={desactive}
      onConfirmer={onConfirmer}
    />
  );
}

describe('GesteConfirme', () => {
  it('une bascule de `desactive` pendant la confirmation ne reprend pas le focus au bloc', () => {
    const { rerender } = render(rendu(false));

    fireEvent.click(screen.getByRole('button', { name: 'Geste' }));
    expect(document.activeElement).toBe(screen.getByRole('alertdialog', { name: 'Question de banc ?' }));

    const annuler = screen.getByRole('button', { name: 'Annuler' });
    annuler.focus();
    // Un autre geste part ailleurs, puis se termine.
    rerender(rendu(true));
    rerender(rendu(false));

    expect(document.activeElement).toBe(annuler);
  });

  it('après « Annuler » sur un déclencheur inactif, le focus n’est pas repris à un champ où le clavier est allé', () => {
    const { rerender } = render(
      <>
        {rendu(false)}
        <input aria-label="Champ voisin" />
      </>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Geste' }));
    // Le déclencheur devient inactif pendant la confirmation, puis on annule.
    rerender(
      <>
        {rendu(true)}
        <input aria-label="Champ voisin" />
      </>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    const champ = screen.getByLabelText('Champ voisin');
    champ.focus();
    // La saisie dans le champ réactive le déclencheur : le focus reste au champ.
    rerender(
      <>
        {rendu(false)}
        <input aria-label="Champ voisin" />
      </>,
    );
    expect(document.activeElement).toBe(champ);
  });

  it('Échap referme sans rien faire et rend le focus au déclencheur', () => {
    const onConfirmer = vi.fn();
    render(rendu(false, onConfirmer));

    fireEvent.click(screen.getByRole('button', { name: 'Geste' }));
    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });

    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(onConfirmer).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Geste' }));
  });

  it('la confirmation appelle le geste une fois et rend le focus au déclencheur redevenu actif', () => {
    const onConfirmer = vi.fn();
    const { rerender } = render(rendu(false, onConfirmer));

    fireEvent.click(screen.getByRole('button', { name: 'Geste' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer le geste' }));
    expect(onConfirmer).toHaveBeenCalledTimes(1);

    // Pendant l'action, l'appelant désactive le déclencheur ; à la fin, il
    // le rend actif et le focus lui revient.
    rerender(rendu(true, onConfirmer));
    rerender(rendu(false, onConfirmer));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Geste' }));
  });
});
