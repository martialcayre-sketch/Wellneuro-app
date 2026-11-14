// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MesChoix } from './MesChoix';
import { EN_TETE_DOSSIER_PAGE, MESSAGE_AUTRE_DOSSIER } from '@/lib/portail/dossierPage';

// U39 sous la garde du dossier de la page ([[D-481]] DOC-12, Q10 a) : le choix
// porte le segment de la page ; refusé en 409, T-51 paraît dans l'accordéon du
// choix (Q5 a) et la page ne relit rien.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('MesChoix — garde du dossier de la page', () => {
  it('409 : T-51 à l’endroit du geste, segment envoyé, pas de relecture', async () => {
    let init: RequestInit | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, i?: RequestInit) => {
        init = i;
        return { status: 409, json: async () => ({ ok: false, reason: 'autre_dossier', error: MESSAGE_AUTRE_DOSSIER }) } as Response;
      }),
    );
    const onChange = vi.fn();
    render(<MesChoix token="PAT_SEED_01" choixCourants={[]} historiqueChoix={[]} onChange={onChange} />);
    const accordeon = screen.getByText('Partage avec le médecin traitant').closest('details')!;
    accordeon.open = true;
    fireEvent.click(accordeon.querySelector('button')!);

    const refus = await screen.findByText(MESSAGE_AUTRE_DOSSIER);
    expect(accordeon.contains(refus)).toBe(true);
    expect((init!.headers as Record<string, string>)[EN_TETE_DOSSIER_PAGE]).toBe('PAT_SEED_01');
    expect(onChange).not.toHaveBeenCalled();
  });
});
