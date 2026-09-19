// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
import { SynthesePanel } from './SynthesePanel';

// LE VERROU DU SÉLECTEUR DE PATIENT, ET LA COURSE QU'IL MASQUAIT — premier banc
// de ce composant.
//
// POURQUOI CE FICHIER EXISTE. `SynthesePanel` porte l'envoi forcé, la
// confirmation au registre et six actions cliniques, et n'avait aucun test sur
// 786 lignes. Le verrou corrigé ici en est la démonstration : `selectedPatient`
// était à la fois dans la garde et dans les dépendances de l'effet qui applique
// `?idPatient=`, si bien que choisir un AUTRE dossier relançait l'effet, dont la
// garde ne renvoyait plus tôt — et la sélection revenait de force à l'URL.
//
// CE N'ÉTAIT PAS UN DÉFAUT D'AFFICHAGE. `onSelectPatient` appelle
// `loadSyntheses(id)` : le verrou faisait RELIRE le dossier de l'URL par-dessus
// celui qu'on venait de choisir. D'où deux assertions distinctes — la valeur du
// sélecteur, et le dossier porté par la DERNIÈRE requête. Un banc qui ne
// tiendrait que la première laisserait passer une correction qui répare
// l'affichage sans réparer la requête.
//
// DEUX CAS VIENNENT DE LA REVUE, ET AUCUN N'ÉTAIT COUVERT PAR LES TROIS PREMIERS.
// Le changement de `initialPatientId` SANS DÉMONTAGE — d'une carte du Fil à une
// autre — est ce qui justifie de retenir l'identifiant appliqué plutôt qu'un
// booléen : sans ce cas, une régression vers un booléen passait toute la suite.
// Et deux lectures peuvent se croiser : si celle du dossier quitté se résout
// après celle du dossier choisi, la liste montre les synthèses d'un autre
// dossier que celui du sélecteur.
//
// Le nœud est interrogé par `within(container)` et jamais par un sélecteur
// global : sans cela, un rendu précédent non nettoyé répondrait à la place.
//
// Identités fictives limitées à celles qu'autorise `AGENTS.md` § 2.

const SOPHIE = { idPatient: 'PAT_URL', prenom: 'Sophie', nom: 'Nicola', email: 'sophie.nicola@exemple.test', actif: true };
const JENNIFER = { idPatient: 'PAT_AUTRE', prenom: 'Jennifer', nom: 'Martin', email: 'jennifer.martin@exemple.test', actif: true };
const PATIENTS = [SOPHIE, JENNIFER];

const MODELE_PERIME = 'MODELE-DU-DOSSIER-QUITTE';

const syntheseDe = (modele: string) => ({
  idSynthese: `SYN_${modele}`,
  idPatient: SOPHIE.idPatient,
  dateGeneration: '2026-09-01T10:00:00.000Z',
  modele,
  statut: 'Brouillon_IA',
  dateValidation: null,
  notesPraticien: null,
  syntheseJson: { resume_praticien: '', narratif_patient: '' },
});

type Options = {
  /** Synthèses rendues par dossier. Par défaut : aucune. */
  synthesesPar?: Record<string, unknown[]>;
  /** Dossier dont la réponse est RETENUE jusqu'à l'appel de `liberer`. */
  differer?: string;
};

function stubFetch(o: Options = {}) {
  const appels: string[] = [];
  const retenues: Array<() => void> = [];
  const reponse = (corps: unknown) => ({ json: async () => corps }) as unknown as Response;

  vi.stubGlobal(
    'fetch',
    vi.fn(async (entree: unknown) => {
      const url = String(entree);
      appels.push(url);
      if (url.includes('/api/praticien/patients-pg')) return reponse({ patients: PATIENTS });
      if (url.includes('/api/praticien/synthese')) {
        const id = new URL(url, 'http://test.local').searchParams.get('idPatient');
        const corps = { syntheses: o.synthesesPar?.[id ?? ''] ?? [] };
        if (o.differer && id === o.differer) {
          return new Promise<Response>(resoudre => {
            retenues.push(() => resoudre(reponse(corps)));
          });
        }
        return reponse(corps);
      }
      return reponse({});
    }),
  );

  return { appels, liberer: () => retenues.forEach(r => r()) };
}

/** Les dossiers demandés à la route des synthèses, dans l'ordre d'appel. */
const dossiersLus = (appels: string[]): (string | null)[] =>
  appels
    .filter(u => u.includes('/api/praticien/synthese'))
    .map(u => new URL(u, 'http://test.local').searchParams.get('idPatient'));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('SynthesePanel — le dossier de l’URL n’enferme pas le sélecteur', () => {
  it('applique le dossier de l’URL à l’arrivée', async () => {
    const { appels } = stubFetch();
    const { container } = render(<SynthesePanel initialPatientId="PAT_URL" />);
    const selecteur = within(container).getByRole('combobox') as HTMLSelectElement;

    await waitFor(() => expect(selecteur.value).toBe('PAT_URL'));
    expect(dossiersLus(appels)).toContain('PAT_URL');
  });

  it('laisse choisir un AUTRE patient sans revenir à celui de l’URL', async () => {
    const { appels } = stubFetch();
    const { container } = render(<SynthesePanel initialPatientId="PAT_URL" />);
    const selecteur = within(container).getByRole('combobox') as HTMLSelectElement;
    await waitFor(() => expect(selecteur.value).toBe('PAT_URL'));

    fireEvent.change(selecteur, { target: { value: 'PAT_AUTRE' } });
    await waitFor(() => expect(dossiersLus(appels).length).toBeGreaterThanOrEqual(2));

    expect(selecteur.value).toBe('PAT_AUTRE');
  });

  it('fait porter la DERNIÈRE lecture de synthèses sur le dossier choisi', async () => {
    const { appels } = stubFetch();
    const { container } = render(<SynthesePanel initialPatientId="PAT_URL" />);
    const selecteur = within(container).getByRole('combobox') as HTMLSelectElement;
    await waitFor(() => expect(selecteur.value).toBe('PAT_URL'));

    fireEvent.change(selecteur, { target: { value: 'PAT_AUTRE' } });
    await waitFor(() => expect(dossiersLus(appels).length).toBeGreaterThanOrEqual(2));

    const lus = dossiersLus(appels);
    expect(lus[lus.length - 1]).toBe('PAT_AUTRE');
  });

  it('applique un NOUVEAU dossier d’URL sans démontage — d’une carte du Fil à l’autre', async () => {
    const { appels } = stubFetch();
    const { container, rerender } = render(<SynthesePanel initialPatientId="PAT_URL" />);
    const selecteur = within(container).getByRole('combobox') as HTMLSelectElement;
    await waitFor(() => expect(selecteur.value).toBe('PAT_URL'));

    rerender(<SynthesePanel initialPatientId="PAT_AUTRE" />);

    await waitFor(() => expect(selecteur.value).toBe('PAT_AUTRE'));
    const lus = dossiersLus(appels);
    expect(lus[lus.length - 1]).toBe('PAT_AUTRE');
  });

  it('ignore la réponse du dossier quitté quand elle arrive en retard', async () => {
    const { appels, liberer } = stubFetch({
      differer: 'PAT_URL',
      synthesesPar: { PAT_URL: [syntheseDe(MODELE_PERIME)], PAT_AUTRE: [] },
    });
    const { container } = render(<SynthesePanel initialPatientId="PAT_URL" />);
    const selecteur = within(container).getByRole('combobox') as HTMLSelectElement;
    await waitFor(() => expect(selecteur.value).toBe('PAT_URL'));

    fireEvent.change(selecteur, { target: { value: 'PAT_AUTRE' } });
    await waitFor(() => expect(dossiersLus(appels).length).toBeGreaterThanOrEqual(2));

    // La lecture du dossier QUITTÉ se résout maintenant, donc APRÈS celle du
    // dossier choisi. Sans numéro de génération, elle écrase la liste.
    liberer();
    await waitFor(() =>
      expect(within(container).queryByText(/Aucune synthèse pour ce patient/)).not.toBeNull(),
    );

    expect(container.textContent).not.toContain(MODELE_PERIME);
    expect(selecteur.value).toBe('PAT_AUTRE');
  });
});
