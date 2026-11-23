// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { PatientErrorState } from './PatientErrorState';

// PAT-7j (F3 a, liste commune 20261121-1633-d) : plus de forme simple, sans
// cadre. Sans `forme` explicite, la présence de « Réessayer » décide du cadre.
afterEach(cleanup);

const cadre = (message: string) => screen.getByText(message).parentElement as HTMLElement;

describe('PatientErrorState — encadré partout', () => {
  it('un échec qui propose « Réessayer » est une erreur : filet danger de 2 px', () => {
    render(<PatientErrorState message="Lecture impossible." onReessayer={() => undefined} />);
    expect(cadre('Lecture impossible.').className).toContain('border-2 border-status-danger');
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeTruthy();
  });

  it('un refus définitif, sans « Réessayer », est un constat : filet neutre', () => {
    render(<PatientErrorState message="Lien expiré." />);
    const el = cadre('Lien expiré.');
    expect(el.className).toContain('border-border');
    expect(el.className).not.toContain('border-status-danger');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('une forme explicite prime sur la règle', () => {
    render(<PatientErrorState forme="erreur" message="Agenda indisponible." />);
    expect(cadre('Agenda indisponible.').className).toContain('border-status-danger');
  });
});
