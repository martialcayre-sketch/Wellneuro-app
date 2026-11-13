// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { AtelierOptions, RubriqueAffichee } from '@/lib/atelier-bibliotheque-options/lecture';
import { AtelierOptionsPanel } from './AtelierOptionsPanel';

// Identifiants et textes synthétiques : aucune option ni aucun texte réel au
// dépôt (D-480 §3, D-251 §4).

const LE = '2026-11-13T10:00:00.000Z';
const SHA = 'c'.repeat(64);
const RUBRIQUES = ['produit_statut_reglementaire', 'dose', 'duree', 'precautions', 'contre_indications', 'interactions', 'surveillance', 'critere_arret', 'role_praticien'];

const vide = (rubrique: string): RubriqueAffichee => ({ rubrique, renvois: [], version: null, etat: { etat: 'vide' }, etatActes: null });

function atelier(etatStructure: AtelierOptions['structure']['etat'], dose: Partial<RubriqueAffichee> = {}): AtelierOptions {
  return {
    structure: { etat: etatStructure, empreinte: 'd'.repeat(64), nombreOptions: 1 },
    rubriques: RUBRIQUES,
    options: [
      {
        id: 'OPT_BANC_A',
        hypothese: 'HYP_BANC',
        populations: ['POP_BANC'],
        rubriques: RUBRIQUES.map(r => (r === 'dose' ? { ...vide(r), renvois: ['information_manquante'], ...dose } : vide(r))),
      },
    ],
    horsStructure: [],
  };
}

const VERSION = {
  id: 'texte0000001',
  numero: 1,
  texte: 'Texte synthétique de banc.',
  texteSha256: SHA,
  auteur: 'responsable@exemple.fr',
  creeLe: LE,
  dernierActe: null,
  jeton: null,
  nombreVersions: 1,
};

function servir(a: AtelierOptions, peutDecider: boolean) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === 'POST') return new Response(JSON.stringify({ ok: true }));
    return new Response(JSON.stringify({ ok: true, atelier: a, peutDecider }));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('atelier de la bibliothèque des options (D-480 §3)', () => {
  it('structure vide : le dit, sans option ni geste', async () => {
    servir({ ...atelier('non_signee'), options: [], structure: { etat: 'non_signee', empreinte: 'd'.repeat(64), nombreOptions: 0 } }, true);
    render(<AtelierOptionsPanel />);
    expect(await screen.findByText('La structure ne déclare encore aucune option.')).toBeTruthy();
    expect(screen.getByText('Structure non signée')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Saisir/ })).toBeNull();
  });

  it('un praticien lit les neuf rubriques et leurs renvois, sans geste', async () => {
    servir(atelier('non_signee'), false);
    render(<AtelierOptionsPanel />);
    const section = await screen.findByRole('region', { name: 'OPT_BANC_A' });
    expect(within(section).getAllByRole('listitem')).toHaveLength(9);
    expect(within(section).getByText(/Information manquante \(déclarée\)/)).toBeTruthy();
    expect(screen.getByText(/Lecture seule/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Saisir/ })).toBeNull();
  });

  it('le responsable saisit un texte : champ vide au départ, corps à plat avec la dernière version vue', async () => {
    const fetchMock = servir(atelier('non_signee'), true);
    render(<AtelierOptionsPanel />);
    await screen.findByRole('region', { name: 'OPT_BANC_A' });
    const item = screen.getByText('Dose').closest('li') as HTMLElement;
    fireEvent.click(within(item).getByRole('button', { name: 'Saisir le texte' }));
    const champ = within(item).getByLabelText(/Texte de la rubrique « Dose »/) as HTMLTextAreaElement;
    expect(champ.value).toBe('');
    fireEvent.change(champ, { target: { value: 'Texte synthétique.' } });
    fireEvent.click(within(item).getByRole('button', { name: 'Enregistrer la version' }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([, i]) => i?.method === 'POST')).toBe(true));
    const [url, init] = fetchMock.mock.calls.find(([, i]) => i?.method === 'POST') as [string, RequestInit];
    expect(url).toBe('/api/praticien/atelier-options/versions');
    expect(JSON.parse(init.body as string)).toEqual({ optionId: 'OPT_BANC_A', rubrique: 'dose', texte: 'Texte synthétique.', derniereVersionVue: null });
  });

  it('structure non signée : la validation est fermée, le retrait reste offert', async () => {
    servir(atelier('non_signee', { version: VERSION, etat: { etat: 'a_valider' }, etatActes: { etat: 'a_valider' } }), true);
    render(<AtelierOptionsPanel />);
    await screen.findByText('Texte synthétique de banc.');
    expect(screen.getByText(/la validation s’ouvrira après sa signature/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Valider' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Retirer' })).toBeTruthy();
  });

  it('structure signée : valider exige la case cochée et envoie la déclaration du geste', async () => {
    const fetchMock = servir(atelier('signee', { version: VERSION, etat: { etat: 'a_valider' }, etatActes: { etat: 'a_valider' } }), true);
    render(<AtelierOptionsPanel />);
    await screen.findByText('Texte synthétique de banc.');
    const valider = screen.getByRole('button', { name: 'Valider' }) as HTMLButtonElement;
    expect(valider.disabled).toBe(true);
    fireEvent.click(screen.getByLabelText(/Je déclare avoir relu ce texte en entier/));
    fireEvent.click(valider);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer la validation' }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([, i]) => i?.method === 'POST')).toBe(true));
    const [url, init] = fetchMock.mock.calls.find(([, i]) => i?.method === 'POST') as [string, RequestInit];
    expect(url).toBe('/api/praticien/atelier-options/actes');
    expect(JSON.parse(init.body as string)).toMatchObject({
      idTexte: 'texte0000001',
      acte: 'validee',
      empreinteVue: SHA,
      dernierActeVu: null,
      relectureIntegrale: true,
    });
  });

  it('un texte « à relire » ne s’affiche jamais comme validé', async () => {
    const dernierActe = { ordre: '2', acte: 'validee', validateur: 'r', relectureIntegrale: true, motif: null, le: LE };
    servir(
      atelier('signee', {
        version: { ...VERSION, dernierActe, jeton: '2' },
        etat: { etat: 'a_relire' },
        etatActes: { etat: 'validee', ordre: '2', le: LE, validateur: 'r' },
      }),
      true,
    );
    render(<AtelierOptionsPanel />);
    const item = (await screen.findByText('Texte synthétique de banc.')).closest('li') as HTMLElement;
    expect(within(item).getByText('À relire')).toBeTruthy();
    expect(within(item).queryByText('Validé')).toBeNull();
    expect(within(item).getByRole('button', { name: 'Retirer' })).toBeTruthy();
    expect(within(item).getByRole('button', { name: 'Saisir une version neuve' })).toBeTruthy();
  });
});
