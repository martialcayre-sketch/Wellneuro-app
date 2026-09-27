// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { LigneRayonFiche } from '@/lib/fiches-assiette/lecture';
import { RayonFichesConseilsPanel } from './RayonFichesConseilsPanel';

const LE = '2026-09-27T10:00:00.000Z';
const SHA = 'a'.repeat(64);
const VALIDEE = { etat: 'validee', ordre: '5', le: LE, validateur: 'x@exemple.fr' } as const;

function ligne(plateCode: string, over: Partial<LigneRayonFiche> = {}): LigneRayonFiche {
  return { plateCode, libelle: `Libellé ${plateCode}`, sourceId: 'WN-SRC-0300', nbVersions: 0, derniere: null, derniereValidee: null, ...over };
}

const LIGNES: LigneRayonFiche[] = [
  ligne('ASSIETTE_ABSENTE'),
  ligne('ASSIETTE_A_VALIDER', {
    nbVersions: 1,
    derniere: { id: 'versionbanc1', numero: 1, creeLe: LE, contenuSha256: SHA, etat: { etat: 'a_valider' } },
  }),
  ligne('ASSIETTE_ILLISIBLE', {
    nbVersions: 1,
    derniere: { id: 'versionbanc2', numero: 1, creeLe: LE, contenuSha256: SHA, etat: { etat: 'illisible', raison: 'retrait_sans_motif' } },
  }),
  ligne('ASSIETTE_SERVIE_ANCIENNE', {
    nbVersions: 2,
    derniere: { id: 'versionbanc4', numero: 2, creeLe: LE, contenuSha256: SHA, etat: { etat: 'a_valider' } },
    derniereValidee: { id: 'versionbanc3', numero: 1, creeLe: LE, contenuSha256: SHA, etat: VALIDEE },
  }),
  ligne('ASSIETTE_SERVIE', {
    nbVersions: 1,
    derniere: { id: 'versionbanc5', numero: 1, creeLe: LE, contenuSha256: SHA, etat: VALIDEE },
  }),
];

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('RayonFichesConseilsPanel — chaque état nommé pour ce qu’il est', () => {
  it('absente, à valider, illisible, servie : jamais confondus (`DC-24`)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true, assiettes: LIGNES }) }));
    render(<RayonFichesConseilsPanel />);
    const ligneDe = async (code: string) => within(await screen.findByTestId(`fiche-assiette-${code}`));

    const absente = await ligneDe('ASSIETTE_ABSENTE');
    expect(absente.getByText('Aucune version')).toBeTruthy();
    expect(absente.queryByText(/À valider/)).toBeNull();
    expect(absente.queryByRole('button')).toBeNull();

    const aValider = await ligneDe('ASSIETTE_A_VALIDER');
    expect(aValider.getByText('v1 · À valider').getAttribute('data-variant')).toBe('info');
    expect(aValider.getByText('Aucune version de référence')).toBeTruthy();

    const illisible = await ligneDe('ASSIETTE_ILLISIBLE');
    expect(illisible.getByText('v1 · Statut illisible').getAttribute('data-variant')).toBe('danger');
    expect(illisible.getByText('le dernier retrait n’a pas de motif')).toBeTruthy();
    expect(illisible.queryByText(/À valider/)).toBeNull();

    const ancienne = await ligneDe('ASSIETTE_SERVIE_ANCIENNE');
    expect(ancienne.getByText('Version de référence : v1')).toBeTruthy();
    expect(ancienne.getByRole('button', { name: 'Relire la v1 (référence)' })).toBeTruthy();
    expect(ancienne.getByRole('button', { name: 'Relire la v2' })).toBeTruthy();

    const servie = await ligneDe('ASSIETTE_SERVIE');
    expect(servie.getByText('Version de référence : v1')).toBeTruthy();
    expect(servie.getByText('v1 · Validée').getAttribute('data-variant')).toBe('success');
  });

  it('au retour d’une relecture, jamais l’ancienne liste pendant qu’on relit', async () => {
    let appelsRayon = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.startsWith('/api/praticien/fiches-assiette/version')) {
          return { ok: false, status: 404, json: async () => ({ ok: false, reason: 'version_introuvable', error: 'Version introuvable.' }) };
        }
        // La seconde lecture du rayon ne revient jamais : l'écran doit rester en chargement.
        if (appelsRayon++ > 0) return new Promise<never>(() => {});
        return { ok: true, status: 200, json: async () => ({ ok: true, assiettes: LIGNES }) };
      }),
    );
    render(<RayonFichesConseilsPanel />);
    const aValider = within(await screen.findByTestId('fiche-assiette-ASSIETTE_A_VALIDER'));
    fireEvent.click(aValider.getByRole('button', { name: 'Relire la v1' }));
    fireEvent.click(await screen.findByRole('button', { name: /Retour aux fiches/ }));

    expect(await screen.findByText('Chargement des fiches…')).toBeTruthy();
    expect(screen.queryByTestId('fiche-assiette-ASSIETTE_A_VALIDER')).toBeNull();
    // Le focus revient au titre du rayon, et il s'y VOIT au clavier (revue #1238).
    const titre = screen.getByRole('heading', { name: 'Fiches conseils' });
    await waitFor(() => expect(document.activeElement).toBe(titre));
    expect(titre.className).toContain('focus-visible:ring-2');
  });

  it('un échec de chargement n’est pas une liste vide', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ ok: false, reason: 'exception', error: 'Erreur technique.' }) }));
    render(<RayonFichesConseilsPanel />);
    expect((await screen.findByRole('alert')).textContent).toContain('Erreur technique.');
    expect(screen.queryByRole('list')).toBeNull();
  });
});
