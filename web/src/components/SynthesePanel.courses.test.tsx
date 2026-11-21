// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
import { SynthesePanel } from './SynthesePanel';

// P51, lot PRA-6c de la refonte Lien. Deux courses démontrées dans le code,
// sans occurrence observée (rapport PRA-6 §3.3) : une réponse qui ne
// correspond plus à ce qui est affiché ne s'affiche pas.
//   1. L'aperçu du booklet appartient à la synthèse demandée — sinon on relit
//      A, on coche « J'ai relu… » et l'on envoie B.
//   2. La relecture qui suit une action vise le patient courant — sinon la
//      liste de l'ancien patient paraît sous le titre du nouveau.
// Identités de fixture seulement.

const SOPHIE = { idPatient: 'PAT_SEED_01', prenom: 'Sophie', nom: 'Nicola', email: 'sophie.nicola@exemple.test', actif: true };
const JENNIFER = { idPatient: 'PAT_SEED_02', prenom: 'Jennifer', nom: 'Martin', email: 'jennifer.martin@exemple.test', actif: true };

const VIDE = 'Aucune synthèse pour ce patient.';
const RELU = /J'ai relu et validé le booklet/;

const validee = (idSynthese: string, idPatient = SOPHIE.idPatient) => ({
  idSynthese,
  idPatient,
  dateGeneration: '2026-09-01T10:00:00.000Z',
  modele: 'claude',
  statut: 'Validee_Praticien',
  dateValidation: '2026-09-02T10:00:00.000Z',
  notesPraticien: null,
  syntheseJson: { resume_praticien: 'Résumé', narratif_patient: 'Narratif', axes_prioritaires: [], limites: '' },
});

const rep = (corps: unknown, ok = true) =>
  ({ ok, status: ok ? 200 : 500, headers: new Headers(), json: async () => corps }) as unknown as Response;

/** Une réponse que le test libère quand il veut. */
function enAttente() {
  let liberer: (r: Response) => void = () => {};
  const promesse = new Promise<Response>(resoudre => { liberer = resoudre; });
  return { promesse, liberer: (r: Response) => liberer(r) };
}

/** Laisse se dérouler les réponses déjà libérées et leurs suites. */
const laisserFiler = () => act(async () => { await new Promise(r => setTimeout(r, 20)); });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('SynthesePanel — l’aperçu du booklet appartient à la synthèse demandée (PRA-6c, course 1)', () => {
  function stubBooklet() {
    const attentes = new Map<string, ReturnType<typeof enAttente>[]>();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (entree: unknown) => {
        const url = String(entree);
        if (url.includes('/api/praticien/patients-pg')) return rep({ patients: [SOPHIE] });
        if (url.includes('/api/praticien/booklet')) {
          const id = new URL(url, 'http://localhost').searchParams.get('idSynthese') ?? '';
          const attente = enAttente();
          attentes.set(id, [...(attentes.get(id) ?? []), attente]);
          return attente.promesse;
        }
        return rep({ syntheses: [validee('SYN_A'), validee('SYN_B')] });
      }),
    );
    return (id: string, r: Response) => attentes.get(id)![0].liberer(r);
  }

  const ouvrir = async (ecran: ReturnType<typeof within>, rang: number) => {
    const boutons = await ecran.findAllByRole('button', { name: 'Voir / gérer' });
    fireEvent.click(boutons[rang]);
  };

  it('réponse tardive de A après l’ouverture de B : rien de A ne s’affiche, ni case de relecture', async () => {
    const liberer = stubBooklet();
    const { container } = render(<SynthesePanel initialPatientId="PAT_SEED_01" />);
    const ecran = within(container);

    await ouvrir(ecran, 0);
    fireEvent.click(ecran.getByRole('button', { name: 'Prévisualiser le booklet' }));
    await ouvrir(ecran, 1);
    liberer('SYN_A', rep({ html: '<p>Booklet de A</p>', dejaEnvoye: true, dernierEnvoiEmailMasque: 's***@exemple.test' }));
    await laisserFiler();

    expect(container.querySelector('iframe')).toBeNull();
    expect(ecran.queryByRole('checkbox', { name: RELU })).toBeNull();
    expect(ecran.queryByText(/Booklet déjà envoyé/)).toBeNull();

    // B se prévisualise ensuite normalement : c'est son HTML qui paraît.
    fireEvent.click(ecran.getByRole('button', { name: 'Prévisualiser le booklet' }));
    liberer('SYN_B', rep({ html: '<p>Booklet de B</p>', dejaEnvoye: false }));
    expect(await ecran.findByRole('checkbox', { name: RELU })).toBeTruthy();
    expect(container.querySelector('iframe')?.getAttribute('srcdoc')).toBe('<p>Booklet de B</p>');
  });

  it('détail fermé avant la réponse : ni aperçu ni retour d’erreur de A', async () => {
    const liberer = stubBooklet();
    const { container } = render(<SynthesePanel initialPatientId="PAT_SEED_01" />);
    const ecran = within(container);

    await ouvrir(ecran, 0);
    fireEvent.click(ecran.getByRole('button', { name: 'Prévisualiser le booklet' }));
    fireEvent.click(ecran.getByRole('button', { name: 'Fermer' }));
    liberer('SYN_A', rep({ error: 'Booklet indisponible.' }, false));
    await laisserFiler();

    expect(ecran.queryByText('Booklet indisponible.')).toBeNull();
    expect(container.querySelector('iframe')).toBeNull();
  });

  it('A rouverte avant sa réponse : l’aperçu de A paraît dans A, la garde ne bloque pas au-delà', async () => {
    const liberer = stubBooklet();
    const { container } = render(<SynthesePanel initialPatientId="PAT_SEED_01" />);
    const ecran = within(container);

    await ouvrir(ecran, 0);
    fireEvent.click(ecran.getByRole('button', { name: 'Prévisualiser le booklet' }));
    await ouvrir(ecran, 1);
    await ouvrir(ecran, 0);
    liberer('SYN_A', rep({ html: '<p>Booklet de A</p>', dejaEnvoye: false }));

    expect(await ecran.findByRole('checkbox', { name: RELU })).toBeTruthy();
    expect(container.querySelector('iframe')?.getAttribute('srcdoc')).toBe('<p>Booklet de A</p>');
  });
});

describe('SynthesePanel — la relecture après une action vise le patient courant (PRA-6c, course 2)', () => {
  function stubGeneration() {
    const lectures: string[] = [];
    const generation = enAttente();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (entree: unknown, init?: RequestInit) => {
        const url = String(entree);
        if (url.includes('/api/praticien/patients-pg')) return rep({ patients: [SOPHIE, JENNIFER] });
        if (url.includes('/api/praticien/synthese') && init?.method === 'POST') return generation.promesse;
        const id = new URL(url, 'http://localhost').searchParams.get('idPatient') ?? '';
        lectures.push(id);
        return rep({ syntheses: id === SOPHIE.idPatient ? [validee('SYN_A'), validee('SYN_B')] : [] });
      }),
    );
    return { lectures, liberer: () => generation.liberer(rep({ success: true })) };
  }

  it('patient changé pendant la génération : la liste de l’ancien ne paraît pas sous le nouveau', async () => {
    const { lectures, liberer } = stubGeneration();
    const { container } = render(<SynthesePanel initialPatientId="PAT_SEED_01" />);
    const ecran = within(container);

    fireEvent.click(await ecran.findByRole('button', { name: /Générer une synthèse IA/ }));
    fireEvent.change(ecran.getByRole('combobox', { name: 'Patient' }), { target: { value: JENNIFER.idPatient } });
    expect(await ecran.findByText(VIDE)).toBeTruthy();

    liberer();
    await laisserFiler();

    expect(ecran.getByRole('heading', { level: 2, name: /Synthèses de Jennifer Martin/ })).toBeTruthy();
    expect(ecran.getByText(VIDE)).toBeTruthy();
    expect(ecran.queryAllByRole('button', { name: 'Voir / gérer' })).toHaveLength(0);
    expect(lectures.filter(id => id === SOPHIE.idPatient)).toHaveLength(1);
  });

  it('patient inchangé : la génération relit bien la liste du patient', async () => {
    const { lectures, liberer } = stubGeneration();
    const { container } = render(<SynthesePanel initialPatientId="PAT_SEED_01" />);
    const ecran = within(container);

    fireEvent.click(await ecran.findByRole('button', { name: /Générer une synthèse IA/ }));
    liberer();

    await waitFor(() => expect(lectures.filter(id => id === SOPHIE.idPatient)).toHaveLength(2));
  });
});

describe('SynthesePanel — la réponse d’un envoi ne touche que les cases de sa synthèse (PRA-6c, revue wn-reviewer C1)', () => {
  function stubEnvoi() {
    const lectures: string[] = [];
    const envoi = enAttente();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (entree: unknown, init?: RequestInit) => {
        const url = String(entree);
        if (url.includes('/api/praticien/patients-pg')) return rep({ patients: [SOPHIE, JENNIFER] });
        if (url.includes('/api/praticien/booklet') && init?.method === 'POST') return envoi.promesse;
        if (url.includes('/api/praticien/booklet')) {
          const id = new URL(url, 'http://localhost').searchParams.get('idSynthese') ?? '';
          return rep({ html: `<p>Booklet de ${id}</p>`, dejaEnvoye: false });
        }
        const id = new URL(url, 'http://localhost').searchParams.get('idPatient') ?? '';
        lectures.push(id);
        return rep({ syntheses: id === SOPHIE.idPatient ? [validee('SYN_A'), validee('SYN_B')] : [] });
      }),
    );
    return { lectures, liberer: (r: Response) => envoi.liberer(r) };
  }

  const envoyerA = async (ecran: ReturnType<typeof within>) => {
    fireEvent.click((await ecran.findAllByRole('button', { name: 'Voir / gérer' }))[0]);
    fireEvent.click(ecran.getByRole('button', { name: 'Prévisualiser le booklet' }));
    fireEvent.click(await ecran.findByRole('checkbox', { name: RELU }));
    fireEvent.click(ecran.getByRole('button', { name: 'Envoyer au patient' }));
  };

  it('mot signalé dans A, réponse arrivée sous l’aperçu de B : aucune case « registre » sous B', async () => {
    const { liberer } = stubEnvoi();
    const { container } = render(<SynthesePanel initialPatientId="PAT_SEED_01" />);
    const ecran = within(container);

    await envoyerA(ecran);
    fireEvent.click(ecran.getAllByRole('button', { name: 'Voir / gérer' })[1]);
    fireEvent.click(ecran.getByRole('button', { name: 'Prévisualiser le booklet' }));
    fireEvent.click(await ecran.findByRole('checkbox', { name: RELU }));
    liberer(rep({ needsConfirmation: true, reason: 'REGISTRE_ANXIOGENE', terme: 'grave', warning: 'Mot signalé.' }, false));
    await laisserFiler();

    expect(container.querySelector('iframe')?.getAttribute('srcdoc')).toBe('<p>Booklet de SYN_B</p>');
    expect(ecran.queryByRole('checkbox', { name: /Envoyer tel quel malgré le mot/ })).toBeNull();
    // La relecture cochée pour B reste celle de B.
    expect((ecran.getByRole('checkbox', { name: RELU }) as HTMLInputElement).checked).toBe(true);
  });

  it('mot signalé dans A, A toujours ouverte : la case « registre » paraît, comme avant', async () => {
    const { liberer } = stubEnvoi();
    const { container } = render(<SynthesePanel initialPatientId="PAT_SEED_01" />);
    const ecran = within(container);

    await envoyerA(ecran);
    liberer(rep({ needsConfirmation: true, reason: 'REGISTRE_ANXIOGENE', terme: 'grave', warning: 'Mot signalé.' }, false));

    expect(await ecran.findByRole('checkbox', { name: /Envoyer tel quel malgré le mot/ })).toBeTruthy();
  });

  it('patient changé pendant l’envoi : la liste de l’ancien ne paraît pas sous le nouveau', async () => {
    const { lectures, liberer } = stubEnvoi();
    const { container } = render(<SynthesePanel initialPatientId="PAT_SEED_01" />);
    const ecran = within(container);

    await envoyerA(ecran);
    fireEvent.change(ecran.getByRole('combobox', { name: 'Patient' }), { target: { value: JENNIFER.idPatient } });
    expect(await ecran.findByText(VIDE)).toBeTruthy();
    liberer(rep({ success: true, emailMasque: 's***@exemple.test' }));
    await laisserFiler();

    expect(ecran.getByText(VIDE)).toBeTruthy();
    expect(ecran.queryAllByRole('button', { name: 'Voir / gérer' })).toHaveLength(0);
    expect(lectures.filter(id => id === SOPHIE.idPatient)).toHaveLength(1);
  });

  it('patient changé pendant l’envoi : « Booklet envoyé à… » ne paraît pas sous le nouveau (PRA-6k)', async () => {
    const { liberer } = stubEnvoi();
    const { container } = render(<SynthesePanel initialPatientId="PAT_SEED_01" />);
    const ecran = within(container);

    await envoyerA(ecran);
    fireEvent.change(ecran.getByRole('combobox', { name: 'Patient' }), { target: { value: JENNIFER.idPatient } });
    expect(await ecran.findByText(VIDE)).toBeTruthy();
    liberer(rep({ success: true, emailMasque: 's***@exemple.test' }));
    await laisserFiler();

    expect(ecran.queryByText(/Booklet envoyé à/)).toBeNull();
  });
});

// PRA-6k, lot de la refonte Lien. Deux courses de la même famille, démontrées
// dans le code, sans occurrence observée (handoff PRA-6c, § 6) :
//   3. C2 de wn-reviewer : « Créer le brouillon » ouvrait la synthèse créée
//      après sa réponse, quoi qu'il soit arrivé pendant la requête.
//   4. Le retour d'un geste arrivé après un changement de patient paraissait
//      sous le choix du nouveau.

const MSG_CREE = 'Brouillon praticien enregistré. Validez-le avant de préparer le booklet.';

const brouillonDe = (idSynthese: string, narratif: string, idPatient = SOPHIE.idPatient) => ({
  idSynthese,
  idPatient,
  dateGeneration: '2026-09-01T10:00:00.000Z',
  modele: 'claude',
  statut: 'Brouillon_IA',
  dateValidation: null,
  notesPraticien: null,
  syntheseJson: {
    resume_praticien: 'Résumé interne.',
    axes_prioritaires: [],
    points_de_vigilance: [],
    questions_entretien: [],
    narratif_patient: narratif,
    limites: 'À valider.',
  },
  updatedAt: '2026-09-01T10:05:00.000Z',
});

/** Les gestes (POST, PUT, PATCH de la synthèse) restent en vol jusqu'à `liberer`. */
function stubGestes(listes: Record<string, unknown[]>) {
  const enVol: ReturnType<typeof enAttente>[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (entree: unknown, init?: RequestInit) => {
      const url = String(entree);
      if (url.includes('/api/praticien/patients-pg')) return rep({ patients: [SOPHIE, JENNIFER] });
      if (url.includes('/api/praticien/synthese') && init?.method && init.method !== 'GET') {
        const attente = enAttente();
        enVol.push(attente);
        return attente.promesse;
      }
      const id = new URL(url, 'http://localhost').searchParams.get('idPatient') ?? '';
      return rep({ syntheses: listes[id] ?? [] });
    }),
  );
  return {
    liberer: async (r: Response) => {
      await waitFor(() => expect(enVol.length).toBeGreaterThan(0));
      enVol.shift()!.liberer(r);
      await laisserFiler();
    },
  };
}

const vers = (ecran: ReturnType<typeof within>, idPatient: string) =>
  fireEvent.change(ecran.getByRole('combobox', { name: 'Patient' }), { target: { value: idPatient } });

async function rediger(ecran: ReturnType<typeof within>) {
  fireEvent.click(await ecran.findByRole('button', { name: 'Rédiger une synthèse' }));
  fireEvent.change(ecran.getByLabelText('Résumé interne praticien'), { target: { value: 'Mon résumé.' } });
  fireEvent.change(ecran.getByLabelText('Texte destiné au patient'), { target: { value: 'Mon texte.' } });
  fireEvent.click(ecran.getByRole('button', { name: 'Créer le brouillon' }));
}

describe('SynthesePanel — le brouillon créé ne s’ouvre que si son éditeur l’est encore (PRA-6k, C2 de wn-reviewer)', () => {
  it('patient changé pendant la création : le brouillon de l’ancien ne s’ouvre pas sous le nouveau', async () => {
    const { liberer } = stubGestes({ [SOPHIE.idPatient]: [] });
    const { container } = render(<SynthesePanel initialPatientId={SOPHIE.idPatient} />);
    const ecran = within(container);

    await rediger(ecran);
    vers(ecran, JENNIFER.idPatient);
    expect(await ecran.findByText(VIDE)).toBeTruthy();
    await liberer(rep({ success: true, synthese: brouillonDe('SYN_CREE', 'Mon texte.') }));

    expect(ecran.getByRole('heading', { level: 2, name: /Synthèses de Jennifer Martin/ })).toBeTruthy();
    expect(ecran.queryByRole('heading', { name: /SYN_CREE/ })).toBeNull();
    expect(ecran.queryByRole('button', { name: 'Fermer' })).toBeNull();
    expect(ecran.queryByText(MSG_CREE)).toBeNull();
  });

  it('synthèse B ouverte pendant la création : B reste ouverte, son édition non enregistrée intacte', async () => {
    const { liberer } = stubGestes({ [SOPHIE.idPatient]: [brouillonDe('SYN_B', 'Texte de B.')] });
    const { container } = render(<SynthesePanel initialPatientId={SOPHIE.idPatient} />);
    const ecran = within(container);

    await rediger(ecran);
    fireEvent.click(ecran.getByRole('button', { name: 'Voir / gérer' }));
    fireEvent.change(ecran.getByLabelText('Texte destiné au patient'), { target: { value: 'Édition de B non enregistrée.' } });
    await liberer(rep({ success: true, synthese: brouillonDe('SYN_CREE', 'Mon texte.') }));

    expect(ecran.getByRole('heading', { name: /SYN_B/ })).toBeTruthy();
    expect(ecran.queryByRole('heading', { name: /SYN_CREE/ })).toBeNull();
    expect((ecran.getByLabelText('Texte destiné au patient') as HTMLTextAreaElement).value).toBe('Édition de B non enregistrée.');
    // Le retour paraît sous le choix du patient, pas dans l'éditeur de B.
    expect(within(ecran.getByRole('heading', { name: 'Patient' }).parentElement!).getByText(MSG_CREE)).toBeTruthy();
  });

  it('création refusée après l’ouverture de B : l’échec paraît sous le choix du patient, pas dans un éditeur refermé', async () => {
    const { liberer } = stubGestes({ [SOPHIE.idPatient]: [brouillonDe('SYN_B', 'Texte de B.')] });
    const { container } = render(<SynthesePanel initialPatientId={SOPHIE.idPatient} />);
    const ecran = within(container);

    await rediger(ecran);
    fireEvent.click(ecran.getByRole('button', { name: 'Voir / gérer' }));
    await liberer(rep({ error: 'Création refusée pour ce dossier.' }, false));

    expect(within(ecran.getByRole('heading', { name: 'Patient' }).parentElement!).getByText('Création refusée pour ce dossier.')).toBeTruthy();
    expect(ecran.getByRole('heading', { name: /SYN_B/ })).toBeTruthy();
  });
});

describe('SynthesePanel — le retour d’un geste ne paraît pas sous un autre patient (PRA-6k)', () => {
  it('génération réussie après le choix d’un autre patient : « Synthèse générée… » ne paraît pas', async () => {
    const { liberer } = stubGestes({ [SOPHIE.idPatient]: [] });
    const { container } = render(<SynthesePanel initialPatientId={SOPHIE.idPatient} />);
    const ecran = within(container);

    fireEvent.click(await ecran.findByRole('button', { name: /Générer une synthèse IA/ }));
    vers(ecran, JENNIFER.idPatient);
    expect(await ecran.findByText(VIDE)).toBeTruthy();
    await liberer(rep({ success: true }));

    expect(ecran.getByRole('heading', { level: 2, name: /Synthèses de Jennifer Martin/ })).toBeTruthy();
    expect(ecran.queryByText(/Synthèse générée/)).toBeNull();
  });

  it('génération refusée après le choix d’un autre patient : l’échec ne paraît pas sous le nouveau', async () => {
    const { liberer } = stubGestes({ [SOPHIE.idPatient]: [] });
    const { container } = render(<SynthesePanel initialPatientId={SOPHIE.idPatient} />);
    const ecran = within(container);

    fireEvent.click(await ecran.findByRole('button', { name: /Générer une synthèse IA/ }));
    vers(ecran, JENNIFER.idPatient);
    expect(await ecran.findByText(VIDE)).toBeTruthy();
    await liberer(rep({ error: 'Génération refusée pour ce dossier.' }, false));

    expect(ecran.queryByText('Génération refusée pour ce dossier.')).toBeNull();
    expect(ecran.queryByRole('alert')).toBeNull();
  });

  it('validation réussie après le choix d’un autre patient : « Synthèse validée. » ne paraît pas', async () => {
    const { liberer } = stubGestes({ [SOPHIE.idPatient]: [brouillonDe('SYN_A', 'Texte de A.')] });
    const { container } = render(<SynthesePanel initialPatientId={SOPHIE.idPatient} />);
    const ecran = within(container);

    fireEvent.click(await ecran.findByRole('button', { name: 'Voir / gérer' }));
    fireEvent.click(ecran.getByRole('button', { name: 'Valider la synthèse' }));
    vers(ecran, JENNIFER.idPatient);
    expect(await ecran.findByText(VIDE)).toBeTruthy();
    await liberer(rep({ success: true, statut: 'Validee_Praticien' }));

    expect(ecran.queryByText('Synthèse validée.')).toBeNull();
  });

  it('création réussie après le choix d’un autre patient, puis retour au premier : rien ne se rouvre', async () => {
    const { liberer } = stubGestes({ [SOPHIE.idPatient]: [] });
    const { container } = render(<SynthesePanel initialPatientId={SOPHIE.idPatient} />);
    const ecran = within(container);

    await rediger(ecran);
    vers(ecran, JENNIFER.idPatient);
    expect(await ecran.findByText(VIDE)).toBeTruthy();
    vers(ecran, SOPHIE.idPatient);
    await liberer(rep({ success: true, synthese: brouillonDe('SYN_CREE', 'Mon texte.') }));

    // Le retour, sous le patient du geste, dit le fait ; le détail ne s'ouvre
    // pas : l'éditeur du brouillon a été fermé par le changement de patient.
    expect(ecran.getByText(MSG_CREE)).toBeTruthy();
    expect(ecran.queryByRole('heading', { name: /SYN_CREE/ })).toBeNull();
  });
});
