// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Le segment de la page `/portail/[token]` : lu par `useParams`.
vi.mock('next/navigation', () => ({ useParams: () => ({ token: 'PAT_SEED_03' }) }));

import { DeclarationsPatient } from './DeclarationsPatient';
import { EN_TETE_DOSSIER_PAGE, MESSAGE_AUTRE_DOSSIER } from '@/lib/portail/dossierPage';

// U35 et U07 sous la garde du dossier de la page ([[D-481]] DOC-12, Q10 a) :
// l'enregistrement porte le segment de la page ; refusé en 409, T-51 paraît à
// l'endroit du geste (Q5 a), la saisie reste et la page ne relit pas les lignes
// (elles seraient celles de l'autre compte).

const lues = () => ({
  ok: true,
  ouvert: true,
  saisieOuverte: true,
  donnees: { criteres: [], traitements: [] },
  aujourdhui: '2026-11-14',
});
const reponse = (corps: unknown, status = 200) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => corps }) as Response;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('DeclarationsPatient — garde du dossier de la page', () => {
  it('409 : T-51 dans le formulaire du geste, segment envoyé, saisie gardée, aucune relecture', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(reponse(lues()))
      .mockResolvedValueOnce(reponse({ ok: false, reason: 'autre_dossier', error: MESSAGE_AUTRE_DOSSIER }, 409));
    vi.stubGlobal('fetch', fetchMock);
    render(<DeclarationsPatient parties="tout" />);
    fireEvent.click(await screen.findByRole('button', { name: '+ Ajouter un complément' }));
    fireEvent.change(screen.getAllByLabelText('Nom').at(-1)!, { target: { value: 'Magnésium' } });
    const formulaire = () => screen.getAllByRole('group').find(g => within(g).queryByLabelText('Nom'))!;
    fireEvent.click(within(formulaire()).getByRole('button', { name: 'Enregistrer' }));

    const alerte = await within(formulaire()).findByRole('alert');
    expect(alerte.textContent).toBe(MESSAGE_AUTRE_DOSSIER);
    expect((within(formulaire()).getByLabelText('Nom') as HTMLInputElement).value).toBe('Magnésium');
    const [, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect((init.headers as Record<string, string>)[EN_TETE_DOSSIER_PAGE]).toBe('PAT_SEED_03');
    // Une lecture au montage, l'envoi refusé, rien d'autre.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
