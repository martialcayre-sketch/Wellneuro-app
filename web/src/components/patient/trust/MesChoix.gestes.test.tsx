// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FINALITES, MesChoix } from './MesChoix';
import type { ChoixEtat } from '@/app/api/portail/trust/etat/route';

// Prototype PAT-6, [[D-481]] complément DOC-11 : Q5 a (l'erreur dans
// l'accordéon du choix concerné, pas sous la liste) et Q6 a (le statut
// affiché, annoncé seulement après l'accord du serveur ET la relecture).
// La formulation des finalités est verrouillée par `MesChoix.test.tsx`.

const PREMIERE = FINALITES[0];
const SECONDE = FINALITES[1];

const reponse = (corps: unknown, status = 200) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => corps }) as Response;

const accordeon = (libelle: string) => screen.getByText(libelle).closest('details')!;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('MesChoix — Q5 a, l’erreur au geste', () => {
  it('paraît dans l’accordéon du choix qui a échoué, une seule fois', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reponse({ ok: false, error: 'Erreur. Réessayez.' }, 400)));
    render(<MesChoix token="t" choixCourants={[]} historiqueChoix={[]} onChange={vi.fn()} />);
    fireEvent.click(within(accordeon(PREMIERE.libelle)).getByRole('button', { name: 'J’autorise' }));

    const alerte = await within(accordeon(PREMIERE.libelle)).findByRole('alert');
    expect(alerte.textContent).toBe('Erreur. Réessayez.');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    if (SECONDE) expect(within(accordeon(SECONDE.libelle)).queryByRole('alert')).toBeNull();
  });
});

describe('MesChoix — Q6 a, l’état confirmé et relu', () => {
  it('n’annonce rien sur la seule réponse de l’écriture, puis le statut affiché après la relecture', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reponse({ ok: true })));
    const onChange = vi.fn();
    const { rerender } = render(
      <MesChoix token="t" choixCourants={[]} historiqueChoix={[]} onChange={onChange} />,
    );
    fireEvent.click(within(accordeon(PREMIERE.libelle)).getByRole('button', { name: 'J’autorise' }));
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('status').textContent).toBe('');

    const relu = [
      { finalite: PREMIERE.finalite, statut: 'accorde', enregistreLe: '2026-11-14T10:00:00Z', documentVersion: 'v1' },
    ] as unknown as ChoixEtat[];
    rerender(<MesChoix token="t" choixCourants={relu} historiqueChoix={relu} onChange={onChange} />);

    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(`${PREMIERE.libelle} — Autorisé`));
    // Le même état, à l'œil : le statut du résumé de l'accordéon.
    expect(within(accordeon(PREMIERE.libelle)).getByText('Autorisé')).toBeTruthy();
  });

  it('n’annonce rien quand l’écriture échoue', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('réseau')));
    const onChange = vi.fn();
    render(<MesChoix token="t" choixCourants={[]} historiqueChoix={[]} onChange={onChange} />);
    fireEvent.click(within(accordeon(PREMIERE.libelle)).getByRole('button', { name: 'J’autorise' }));

    expect((await screen.findByRole('alert')).textContent).toBe('Erreur réseau. Réessayez.');
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toBe('');
  });
});
