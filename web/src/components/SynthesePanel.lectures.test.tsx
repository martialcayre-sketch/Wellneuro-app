// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
import { SynthesePanel } from './SynthesePanel';

// P51 (PRA-5 PR 3 ; [[D-481]] complément DOC-15, Q4 à Q6 ; T-74, T-76, T-17
// de [[D-488]]). Un échec de lecture n'est pas une absence : chaque lecture
// dit son échec, « Réessayer » ne relance qu'elle et le focus revient au
// bouton ; une réponse non `ok` compte comme un échec. Le retour d'une action
// paraît une seule fois. Identités de fixture seulement.

const T74 = 'Les synthèses n’ont pas pu être lues. Ce n’est pas une absence de synthèse.';
const T76 = 'La liste des patients n’a pas pu être lue.';
const VIDE = 'Aucune synthèse pour ce patient.';

const SOPHIE = { idPatient: 'PAT_SEED_01', prenom: 'Sophie', nom: 'Nicola', email: 'sophie.nicola@exemple.test', actif: true };

type Reponse = { ok: boolean; corps: unknown } | 'reseau';

function stub(o: { patients: Reponse[]; syntheses?: Reponse[]; generation?: Reponse }) {
  const appels: string[] = [];
  const suivante = (file: Reponse[]) => (file.length > 1 ? file.shift()! : file[0]);
  vi.stubGlobal(
    'fetch',
    vi.fn(async (entree: unknown, init?: RequestInit) => {
      const url = String(entree);
      appels.push(`${init?.method ?? 'GET'} ${url}`);
      let r: Reponse = { ok: true, corps: {} };
      if (url.includes('/api/praticien/patients-pg')) r = suivante(o.patients);
      else if (url.includes('/api/praticien/synthese') && init?.method === 'POST') r = o.generation ?? r;
      else if (url.includes('/api/praticien/synthese')) r = suivante(o.syntheses ?? [{ ok: true, corps: { syntheses: [] } }]);
      if (r === 'reseau') throw new TypeError('réseau');
      const { ok, corps } = r;
      return { ok, status: ok ? 200 : 500, headers: new Headers(), json: async () => corps } as unknown as Response;
    }),
  );
  return {
    lectures: (motif: string) => appels.filter(a => a.startsWith('GET') && a.includes(motif)).length,
  };
}

const patientsSains: Reponse = { ok: true, corps: { patients: [SOPHIE] } };

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('SynthesePanel — échecs de lecture (Q4, Q5)', () => {
  it('liste des patients en échec : T-76 en alerte, « Réessayer » ne relit qu’elle et rend le focus', async () => {
    const { lectures } = stub({ patients: [{ ok: false, corps: { patients: [], error: 'Erreur technique.' } }] });
    const { container } = render(<SynthesePanel />);
    const ecran = within(container);

    const alerte = await ecran.findByRole('alert');
    expect(alerte.textContent).toContain(T76);
    const bouton = within(alerte).getByRole('button', { name: 'Réessayer' });
    expect(bouton.className).toContain('min-h-11');

    fireEvent.click(bouton);
    await waitFor(() => expect(lectures('/api/praticien/patients-pg')).toBe(2));
    await waitFor(() => expect(document.activeElement?.textContent).toBe('Réessayer'));
    expect(lectures('/api/praticien/synthese')).toBe(0);
  });

  it('une liste de patients relue avec succès retire l’alerte', async () => {
    stub({ patients: ['reseau', patientsSains] });
    const { container } = render(<SynthesePanel />);
    const ecran = within(container);

    fireEvent.click(await ecran.findByRole('button', { name: 'Réessayer' }));
    await waitFor(() => expect(ecran.queryByText(T76)).toBeNull());
    expect(ecran.getByRole('option', { name: /Sophie Nicola/ })).toBeTruthy();
  });

  it('synthèses en échec (réponse non ok) : T-74, jamais « Aucune synthèse pour ce patient. »', async () => {
    stub({ patients: [patientsSains], syntheses: [{ ok: false, corps: { error: 'Non authentifié.' } }] });
    const { container } = render(<SynthesePanel initialPatientId="PAT_SEED_01" />);
    const ecran = within(container);

    const alerte = await ecran.findByRole('alert');
    expect(alerte.textContent).toContain(T74);
    expect(ecran.queryByText(VIDE)).toBeNull();
    expect(ecran.queryByText('(0)')).toBeNull();
  });

  it('« Réessayer » des synthèses ne relit que les synthèses, et le focus revient au bouton', async () => {
    const { lectures } = stub({ patients: [patientsSains], syntheses: ['reseau'] });
    const { container } = render(<SynthesePanel initialPatientId="PAT_SEED_01" />);
    const ecran = within(container);
    const bouton = await ecran.findByRole('button', { name: 'Réessayer' });

    fireEvent.click(bouton);

    await waitFor(() => expect(lectures('/api/praticien/synthese')).toBe(2));
    await waitFor(() => expect(document.activeElement?.textContent).toBe('Réessayer'));
    expect(lectures('/api/praticien/patients-pg')).toBe(1);
  });

  it('une réponse saine et vide garde « Aucune synthèse pour ce patient. », sans alerte', async () => {
    stub({ patients: [patientsSains] });
    const { container } = render(<SynthesePanel initialPatientId="PAT_SEED_01" />);
    const ecran = within(container);

    expect(await ecran.findByText(VIDE)).toBeTruthy();
    expect(ecran.queryByRole('alert')).toBeNull();
  });
});

describe('SynthesePanel — titres et retours (Q1, Q6)', () => {
  it('les zones sont en h2 sous le h1 de la page', async () => {
    stub({ patients: [patientsSains] });
    const { container } = render(<SynthesePanel initialPatientId="PAT_SEED_01" />);
    const ecran = within(container);

    expect(await ecran.findByRole('heading', { level: 2, name: 'Patient' })).toBeTruthy();
    expect(await ecran.findByRole('heading', { level: 2, name: /Synthèses de Sophie Nicola/ })).toBeTruthy();
    expect(ecran.getByRole('combobox', { name: 'Patient' })).toBeTruthy();
  });

  it('le retour d’une action paraît une seule fois, en alerte sur un échec', async () => {
    stub({ patients: [patientsSains], generation: { ok: false, corps: { error: 'Génération refusée.' } } });
    const { container } = render(<SynthesePanel initialPatientId="PAT_SEED_01" />);
    const ecran = within(container);

    fireEvent.click(await ecran.findByRole('button', { name: /Générer une synthèse IA/ }));

    const retours = await ecran.findAllByText('Génération refusée.');
    expect(retours).toHaveLength(1);
    expect(retours[0].getAttribute('role')).toBe('alert');
  });
});

describe('SynthesePanel — le retour d’un envoi ne se perd pas (Q6, revue wn-reviewer)', () => {
  const VALIDEE = {
    idSynthese: 'SYN_VALIDEE',
    idPatient: 'PAT_SEED_01',
    dateGeneration: '2026-09-01T10:00:00.000Z',
    modele: 'claude',
    statut: 'Validee_Praticien',
    dateValidation: '2026-09-02T10:00:00.000Z',
    notesPraticien: null,
    syntheseJson: { resume_praticien: 'Résumé', narratif_patient: 'Narratif', axes_prioritaires: [], limites: '' },
  };

  it('détail fermé pendant l’envoi : « Booklet envoyé à … » paraît une fois, sous le choix du patient', async () => {
    let liberer: () => void = () => {};
    vi.stubGlobal(
      'fetch',
      vi.fn(async (entree: unknown, init?: RequestInit) => {
        const url = String(entree);
        const rep = (corps: unknown) => ({ ok: true, status: 200, headers: new Headers(), json: async () => corps }) as unknown as Response;
        if (url.includes('/api/praticien/patients-pg')) return rep({ patients: [SOPHIE] });
        if (url.includes('/api/praticien/booklet') && init?.method === 'POST') {
          return new Promise<Response>(resoudre => {
            liberer = () => resoudre(rep({ success: true, emailMasque: 's***@exemple.test' }));
          });
        }
        if (url.includes('/api/praticien/booklet')) return rep({ html: '<p>Booklet</p>', dejaEnvoye: false });
        return rep({ syntheses: [VALIDEE] });
      }),
    );
    const { container } = render(<SynthesePanel initialPatientId="PAT_SEED_01" />);
    const ecran = within(container);

    fireEvent.click(await ecran.findByRole('button', { name: 'Voir / gérer' }));
    fireEvent.click(ecran.getByRole('button', { name: 'Prévisualiser le booklet' }));
    fireEvent.click(await ecran.findByRole('checkbox', { name: /J'ai relu et validé le booklet/ }));
    fireEvent.click(ecran.getByRole('button', { name: 'Envoyer au patient' }));
    fireEvent.click(ecran.getByRole('button', { name: 'Fermer' }));
    liberer();

    const retours = await ecran.findAllByText('Booklet envoyé à s***@exemple.test.');
    expect(retours).toHaveLength(1);
    expect(retours[0].getAttribute('role')).toBe('status');
  });
});

