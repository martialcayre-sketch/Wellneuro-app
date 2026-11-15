// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useParams: () => ({ token: 'PAT_SEED_01' }) }));

import { DeclarationsPatient } from './DeclarationsPatient';

// U35, Q3 a du prototype PAT-6 ([[D-481]] complément DOC-11 ; [[D-488]]
// amendement DOC-11) : sur la page de la fiche seule (`onSessionExpiree`
// passé par `DeclarationsDeLaFiche`), un enregistrement refusé en 401 montre, à
// l'endroit du geste (Q5 a), « Session expirée. Reconnectez-vous. » puis T-36
// dans un nouvel onglet ; la saisie reste, rien n'est relu ni renvoyé seul. La
// fiche de l'entrée (U07, sans `onSessionExpiree`) ne change pas : pas de T-36.
// U35 n'est pas jouable en E2E (drapeau `WN_PHYSIO_TRAITEMENTS` absent de
// l'environnement E2E) : ce banc en tient lieu.

const SESSION_EXPIREE = 'Session expirée. Reconnectez-vous.';
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

function ajouterUnComplement() {
  return screen.findByRole('button', { name: '+ Ajouter un complément' }).then(b => {
    fireEvent.click(b);
    fireEvent.change(screen.getAllByLabelText('Nom').at(-1)!, { target: { value: 'Magnésium' } });
    const formulaire = () => screen.getAllByRole('group').find(g => within(g).queryByLabelText('Nom'))!;
    fireEvent.click(within(formulaire()).getByRole('button', { name: 'Enregistrer' }));
    return formulaire;
  });
}

describe('DeclarationsPatient — enregistrement refusé en 401 (Q3 a)', () => {
  it('U35 : message puis T-36 dans le formulaire du geste, nouvel onglet ; saisie gardée, ni relecture ni renvoi', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(reponse(lues()))
      .mockResolvedValueOnce(reponse({ ok: false, reason: 'unauthenticated', error: SESSION_EXPIREE }, 401));
    vi.stubGlobal('fetch', fetchMock);
    const onSessionExpiree = vi.fn();
    render(<DeclarationsPatient parties="tout" onSessionExpiree={onSessionExpiree} />);
    const formulaire = await ajouterUnComplement();

    const alerte = await within(formulaire()).findByRole('alert');
    expect(alerte.textContent).toBe(SESSION_EXPIREE);
    const lien = within(formulaire()).getByRole('link', { name: 'Me reconnecter' });
    expect(alerte.compareDocumentPosition(lien) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(lien.getAttribute('href')).toBe('/portail/connexion');
    expect(lien.getAttribute('target')).toBe('_blank');
    expect(screen.getAllByRole('link', { name: 'Me reconnecter' })).toHaveLength(1);
    expect((within(formulaire()).getByLabelText('Nom') as HTMLInputElement).value).toBe('Magnésium');
    // L'enregistrement ne renvoie pas à l'entrée : seule une LECTURE le fait (Q4 a).
    expect(onSessionExpiree).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('U35 : le renvoi manuel après reconnexion part, réussit et retire T-36', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(reponse(lues()))
      .mockResolvedValueOnce(reponse({ ok: false, reason: 'unauthenticated', error: SESSION_EXPIREE }, 401))
      .mockResolvedValueOnce(reponse({ ok: true }))
      .mockResolvedValueOnce(reponse(lues()));
    vi.stubGlobal('fetch', fetchMock);
    render(<DeclarationsPatient parties="tout" onSessionExpiree={vi.fn()} />);
    const formulaire = await ajouterUnComplement();
    await within(formulaire()).findByRole('link', { name: 'Me reconnecter' });
    fireEvent.click(within(formulaire()).getByRole('button', { name: 'Enregistrer' }));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    expect(screen.queryByRole('link', { name: 'Me reconnecter' })).toBeNull();
    expect(screen.queryByText(SESSION_EXPIREE)).toBeNull();
  });

  it('U07 (sans `onSessionExpiree`) : le message seul, sans T-36', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(reponse(lues()))
      .mockResolvedValueOnce(reponse({ ok: false, reason: 'unauthenticated', error: SESSION_EXPIREE }, 401))
      .mockResolvedValue(reponse({ ok: false, reason: 'unauthenticated', error: SESSION_EXPIREE }, 401));
    vi.stubGlobal('fetch', fetchMock);
    render(<DeclarationsPatient parties="tout" />);
    await ajouterUnComplement();
    expect(await screen.findAllByText(SESSION_EXPIREE)).not.toHaveLength(0);
    expect(screen.queryByRole('link', { name: 'Me reconnecter' })).toBeNull();
  });

  it('U35 : un autre refus ne propose pas T-36', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(reponse(lues()))
      .mockResolvedValueOnce(reponse({ ok: false, error: 'Votre demande n’a pas pu être enregistrée.' }, 503))
      .mockResolvedValue(reponse(lues()));
    vi.stubGlobal('fetch', fetchMock);
    render(<DeclarationsPatient parties="tout" onSessionExpiree={vi.fn()} />);
    await ajouterUnComplement();
    await screen.findByText('Votre demande n’a pas pu être enregistrée.');
    expect(screen.queryByRole('link', { name: 'Me reconnecter' })).toBeNull();
  });
});
