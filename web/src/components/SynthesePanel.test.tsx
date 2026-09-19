// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
import { SynthesePanel } from './SynthesePanel';

// LE VERROU DU SÉLECTEUR DE PATIENT — premier banc de ce composant.
//
// POURQUOI CE FICHIER EXISTE. `SynthesePanel` porte l'envoi forcé, la
// confirmation au registre et six actions cliniques, et n'avait aucun test. Le
// verrou corrigé ici en est la démonstration : `selectedPatient` était à la fois
// dans la garde et dans les dépendances de l'effet qui applique `?idPatient=`,
// si bien que choisir un AUTRE dossier relançait l'effet, dont la garde ne
// renvoyait plus tôt — et la sélection revenait de force à celle de l'URL.
//
// CE N'EST PAS UN DÉFAUT D'AFFICHAGE. `onSelectPatient` appelle
// `loadSyntheses(id)` : le verrou faisait donc RELIRE le dossier de l'URL
// par-dessus celui qu'on venait de choisir. D'où deux assertions distinctes —
// la valeur du sélecteur, et le dossier porté par la DERNIÈRE lecture. Un banc
// qui ne tiendrait que la première laisserait passer une correction qui répare
// l'affichage sans réparer la requête.
//
// Le nœud est interrogé par `within(container)` et jamais par un sélecteur
// global : sans cela, un rendu précédent non nettoyé répondrait à la place.

const PATIENTS = [
  { idPatient: 'PAT_URL', prenom: 'Alix', nom: 'Martin', email: 'alix@exemple.test', actif: true },
  { idPatient: 'PAT_AUTRE', prenom: 'Camille', nom: 'Durand', email: 'camille@exemple.test', actif: true },
];

function stubFetch(): string[] {
  const appels: string[] = [];
  const reponse = (corps: unknown) => ({ json: async () => corps }) as unknown as Response;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (entree: unknown) => {
      const url = String(entree);
      appels.push(url);
      if (url.includes('/api/praticien/patients-pg')) return reponse({ patients: PATIENTS });
      if (url.includes('/api/praticien/synthese')) return reponse({ syntheses: [] });
      return reponse({});
    }),
  );
  return appels;
}

/** Les dossiers demandés à la route des synthèses, dans l'ordre d'appel. */
const dossiersLus = (appels: string[]): (string | null)[] =>
  appels
    .filter(u => u.includes('/api/praticien/synthese'))
    .map(u => new URL(u, 'http://test.local').searchParams.get('idPatient'));

async function monterAvecDossierUrl(idUrl: string) {
  const appels = stubFetch();
  const { container } = render(<SynthesePanel initialPatientId={idUrl} />);
  const selecteur = within(container).getByRole('combobox') as HTMLSelectElement;
  await waitFor(() => expect(selecteur.value).toBe(idUrl));
  return { appels, selecteur };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('SynthesePanel — le dossier de l’URL n’enferme pas le sélecteur', () => {
  it('applique le dossier de l’URL à l’arrivée', async () => {
    const { selecteur, appels } = await monterAvecDossierUrl('PAT_URL');
    expect(selecteur.value).toBe('PAT_URL');
    expect(dossiersLus(appels)).toContain('PAT_URL');
  });

  it('laisse choisir un AUTRE patient sans revenir à celui de l’URL', async () => {
    const { selecteur, appels } = await monterAvecDossierUrl('PAT_URL');

    fireEvent.change(selecteur, { target: { value: 'PAT_AUTRE' } });
    await waitFor(() => expect(dossiersLus(appels).length).toBeGreaterThanOrEqual(2));

    expect(selecteur.value).toBe('PAT_AUTRE');
  });

  it('fait porter la DERNIÈRE lecture de synthèses sur le dossier choisi', async () => {
    const { selecteur, appels } = await monterAvecDossierUrl('PAT_URL');

    fireEvent.change(selecteur, { target: { value: 'PAT_AUTRE' } });
    await waitFor(() => expect(dossiersLus(appels).length).toBeGreaterThanOrEqual(2));

    const lus = dossiersLus(appels);
    expect(lus[lus.length - 1]).toBe('PAT_AUTRE');
  });
});
