// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CorrespondancesNabmSection } from './CorrespondancesNabmSection';

const PRATICIEN = 'praticien@wellneuro.fr';

const ACTE = {
  codeActe: '1208',
  libelle: 'Libellé de l’acte 1208',
  coefficientB: 20,
  inactif: false,
  ententePrealable: null,
  acteReserve: null,
  remboursementTotal: null,
};

type Reponse = { status?: number; json: unknown };

/** Fausse API : chaque appel consomme la réponse prévue pour son adresse. */
function mockApi(reponses: { lecture: Reponse[]; acte?: Reponse; decision?: Reponse; recherche?: Reponse }) {
  const lectures = [...reponses.lecture];
  const fetchMock = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
    const r: Reponse =
      init?.method === 'POST'
        ? reponses.decision!
        : String(url).includes('/nabm/acte')
          ? reponses.acte!
          : String(url).includes('/nabm/recherche')
            ? reponses.recherche!
            : (lectures.length > 1 ? lectures.shift()! : lectures[0]);
    const status = r.status ?? 200;
    return { ok: status < 400, status, json: async () => r.json };
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const vide = { json: { ok: true, millesime: 'V105', correspondances: [] } };
const signee = {
  json: {
    ok: true,
    millesime: 'V105',
    correspondances: [
      {
        codeActe: '1208',
        nature: 'isole',
        etat: 'signee',
        verifiePar: PRATICIEN,
        verifieLe: '2026-10-15T10:00:00.000Z',
        acte: ACTE,
      },
    ],
  },
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('CorrespondancesNabmSection — signature M-3', () => {
  it('lit l’acte par son code, puis signe avec la nature choisie — sans signataire ni date dans le corps', async () => {
    const onModifie = vi.fn();
    const fetchMock = mockApi({
      lecture: [vide, signee],
      acte: { json: { ok: true, millesime: 'V105', acte: ACTE } },
      decision: { json: { ok: true, correspondance: { codeActe: '1208', etat: 'signee', verifiePar: PRATICIEN, verifieLe: '2026-10-15T10:00:00.000Z' } } },
    });
    render(<CorrespondancesNabmSection analyteCode="BIO_FERRITINE" onModifie={onModifie} />);

    await waitFor(() => expect(screen.getByText('Aucune correspondance pour cet analyte.')).toBeTruthy());
    fireEvent.change(screen.getByLabelText(/Code de l’acte/), { target: { value: '1208' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lire l’acte' }));
    await waitFor(() => expect(screen.getByText(/Libellé de l’acte 1208/)).toBeTruthy());

    // Sans nature, la signature est impossible.
    const signer = screen.getByRole('button', { name: 'Signer la correspondance' }) as HTMLButtonElement;
    expect(signer.disabled).toBe(true);
    fireEvent.click(screen.getByLabelText(/Groupe imposé/));
    expect(signer.disabled).toBe(false);
    fireEvent.click(signer);

    await waitFor(() => expect(onModifie).toHaveBeenCalledTimes(1));
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')!;
    expect(JSON.parse(post[1].body)).toEqual({
      analyteCode: 'BIO_FERRITINE',
      codeActe: '1208',
      decision: 'signer',
      etatAttendu: 'absente',
      nature: 'groupe_et',
    });
    await waitFor(() => expect(screen.getByText(/signée par praticien@wellneuro\.fr/)).toBeTruthy());
    // Jamais d'euros : seul le coefficient de la lettre-clé est montré.
    expect(document.body.textContent).not.toContain('€');
  });

  it('un code absent du millésime courant se dit, et rien ne se signe', async () => {
    mockApi({ lecture: [vide], acte: { json: { ok: true, millesime: 'V105', acte: null } } });
    render(<CorrespondancesNabmSection analyteCode="BIO_FERRITINE" />);
    await waitFor(() => expect(screen.getByText('Aucune correspondance pour cet analyte.')).toBeTruthy());
    fireEvent.change(screen.getByLabelText(/Code de l’acte/), { target: { value: '9999' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lire l’acte' }));
    await waitFor(() => expect(screen.getByText(/Aucun acte 9999 dans le millésime courant/)).toBeTruthy());
    expect(screen.queryByRole('button', { name: 'Signer la correspondance' })).toBeNull();
  });

  it('un code mal formé est refusé à l’écran, sans appel au serveur', async () => {
    const fetchMock = mockApi({ lecture: [vide] });
    render(<CorrespondancesNabmSection analyteCode="BIO_FERRITINE" />);
    await waitFor(() => expect(screen.getByText('Aucune correspondance pour cet analyte.')).toBeTruthy());
    fireEvent.change(screen.getByLabelText(/Code de l’acte/), { target: { value: '12a' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lire l’acte' }));
    expect(screen.getByRole('alert').textContent).toMatch(/quatre chiffres/);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/nabm/acte'))).toBe(false);
  });

  it('le retrait demande une confirmation, puis envoie l’état vu « signee »', async () => {
    const fetchMock = mockApi({
      lecture: [signee, vide],
      decision: { json: { ok: true, correspondance: { codeActe: '1208', etat: 'proposition', verifiePar: null, verifieLe: null } } },
    });
    render(<CorrespondancesNabmSection analyteCode="BIO_FERRITINE" />);
    await waitFor(() => expect(screen.getByText(/signée par/)).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Retirer la signature' }));
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer le retrait' }));

    await waitFor(() => expect(screen.getByText('Aucune correspondance pour cet analyte.')).toBeTruthy());
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')!;
    expect(JSON.parse(post[1].body)).toMatchObject({
      decision: 'retirer',
      etatAttendu: 'signee',
      verifieLeVu: '2026-10-15T10:00:00.000Z',
    });
  });

  it('état divergent : le message du serveur est rendu et la liste est relue', async () => {
    const onModifie = vi.fn();
    const fetchMock = mockApi({
      lecture: [signee],
      decision: {
        status: 409,
        json: { ok: false, reason: 'etat_divergent', error: 'La correspondance a changé depuis l’affichage — rechargez la fiche.' },
      },
    });
    render(<CorrespondancesNabmSection analyteCode="BIO_FERRITINE" onModifie={onModifie} />);
    await waitFor(() => expect(screen.getByText(/signée par/)).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Retirer la signature' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer le retrait' }));

    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/a changé depuis l’affichage/));
    const lectures = fetchMock.mock.calls.filter(([url, init]) => !init?.method && String(url).includes('/correspondances'));
    expect(lectures.length).toBe(2);
    expect(onModifie).not.toHaveBeenCalled();
  });

  it('un acte lu pour un analyte ne s’affiche pas sur la fiche de l’analyte suivant', async () => {
    let livrerActe: (valeur: unknown) => void = () => {};
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url: string) => {
        if (String(url).includes('/nabm/acte')) {
          return new Promise(resolve => {
            livrerActe = resolve;
          });
        }
        return { ok: true, status: 200, json: async () => vide.json };
      }),
    );
    const { rerender } = render(<CorrespondancesNabmSection analyteCode="BIO_FERRITINE" />);
    await waitFor(() => expect(screen.getByText('Aucune correspondance pour cet analyte.')).toBeTruthy());
    fireEvent.change(screen.getByLabelText(/Code de l’acte/), { target: { value: '1208' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lire l’acte' }));

    rerender(<CorrespondancesNabmSection analyteCode="BIO_ZINC_PLASMATIQUE" />);
    await waitFor(() => expect(screen.getByText('Aucune correspondance pour cet analyte.')).toBeTruthy());
    livrerActe({ ok: true, status: 200, json: async () => ({ ok: true, millesime: 'V105', acte: ACTE }) });
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(screen.queryByText(/Libellé de l’acte 1208/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Signer la correspondance' })).toBeNull();
  });

  it('réponse perdue après une signature : liste ET catalogue relus', async () => {
    const onModifie = vi.fn();
    const fetchMock = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST') throw new TypeError('réseau');
      return { ok: true, status: 200, json: async () => signee.json };
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<CorrespondancesNabmSection analyteCode="BIO_FERRITINE" onModifie={onModifie} />);
    await waitFor(() => expect(screen.getByText(/signée par/)).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Retirer la signature' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer le retrait' }));

    await waitFor(() => expect(onModifie).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('alert').textContent).toMatch(/n’a pas été enregistré/);
    const lectures = fetchMock.mock.calls.filter(([, init]) => !init?.method);
    expect(lectures.length).toBe(2);
  });

  it('le choix de nature d’une proposition ne passe pas d’un analyte à l’autre', async () => {
    const proposition = (nature: string) => ({
      json: {
        ok: true,
        millesime: 'V105',
        correspondances: [
          { codeActe: '1208', nature, etat: 'proposition', verifiePar: null, verifieLe: null, acte: ACTE },
        ],
      },
    });
    let reponse = proposition('isole');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => ({ ok: true, status: 200, json: async () => reponse.json })),
    );
    const { rerender } = render(<CorrespondancesNabmSection analyteCode="BIO_FERRITINE" />);
    await waitFor(() => expect(screen.getByText(/Proposition non signée/)).toBeTruthy());
    fireEvent.click(screen.getByLabelText(/Groupe imposé/));
    expect((screen.getByLabelText(/Groupe imposé/) as HTMLInputElement).checked).toBe(true);

    reponse = proposition('groupe_ou');
    rerender(<CorrespondancesNabmSection analyteCode="BIO_ZINC_PLASMATIQUE" />);
    await waitFor(() => expect(screen.getByText(/Proposition non signée \(Groupe au choix\)/)).toBeTruthy());
    expect((screen.getByLabelText(/Groupe au choix/) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText(/Groupe imposé/) as HTMLInputElement).checked).toBe(false);
  });

  it('une requête de l’analyte précédent encore en vol ne bloque pas les boutons du suivant', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url: string) =>
        String(url).includes('/nabm/acte')
          ? new Promise(() => {})
          : { ok: true, status: 200, json: async () => vide.json },
      ),
    );
    const { rerender } = render(<CorrespondancesNabmSection analyteCode="BIO_FERRITINE" />);
    await waitFor(() => expect(screen.getByText('Aucune correspondance pour cet analyte.')).toBeTruthy());
    fireEvent.change(screen.getByLabelText(/Code de l’acte/), { target: { value: '1208' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lire l’acte' }));
    expect((screen.getByRole('button', { name: 'Lire l’acte' }) as HTMLButtonElement).disabled).toBe(true);

    rerender(<CorrespondancesNabmSection analyteCode="BIO_ZINC_PLASMATIQUE" />);
    await waitFor(() =>
      expect((screen.getByRole('button', { name: 'Lire l’acte' }) as HTMLButtonElement).disabled).toBe(false),
    );
  });
});

describe('CorrespondancesNabmSection — recherche par libellé (D-320 §1)', () => {
  const ACTE_INACTIF = { ...ACTE, codeActe: '1209', libelle: 'Libellé de l’acte 1209', inactif: true };
  const trouves = (actes: unknown[], total = actes.length) => ({
    json: { ok: true, millesime: 'V105', total, actes },
  });

  it('cherche, lit le résultat choisi, puis signe par le même POST — rien n’est choisi à la place du praticien', async () => {
    const fetchMock = mockApi({
      lecture: [vide, signee],
      recherche: trouves([ACTE, ACTE_INACTIF]),
      acte: { json: { ok: true, millesime: 'V105', acte: ACTE } },
      decision: { json: { ok: true, correspondance: { codeActe: '1208', etat: 'signee', verifiePar: PRATICIEN, verifieLe: '2026-10-15T10:00:00.000Z' } } },
    });
    render(<CorrespondancesNabmSection analyteCode="BIO_HOMOCYSTEINE" />);
    await waitFor(() => expect(screen.getByText('Aucune correspondance pour cet analyte.')).toBeTruthy());

    fireEvent.change(screen.getByLabelText(/Rechercher dans la nomenclature/), {
      target: { value: 'homocystéine totale' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Chercher' }));
    await waitFor(() => expect(screen.getByRole('list', { name: 'Actes trouvés' })).toBeTruthy());
    const appel = fetchMock.mock.calls.find(([url]) => String(url).includes('/nabm/recherche'))!;
    expect(String(appel[0])).toBe(
      `/api/praticien/biologie/nabm/recherche?q=${encodeURIComponent('homocystéine totale')}`,
    );
    // La liste nomme la saisie qu'elle sert, même si le champ a bougé depuis.
    expect(screen.getByText(/Actes du millésime V105 pour « homocystéine totale »/)).toBeTruthy();
    // Les résultats se lisent ; aucun acte n'est lu ni signable avant le choix.
    expect(screen.getByText(/Libellé de l’acte 1209/)).toBeTruthy();
    expect(screen.getByText('Inactif')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Signer la correspondance' })).toBeNull();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/nabm/acte'))).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Lire l’acte 1208' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Signer la correspondance' })).toBeTruthy());
    expect(fetchMock.mock.calls.some(([url]) => String(url) === '/api/praticien/biologie/nabm/acte?code=1208')).toBe(true);
    expect((screen.getByLabelText(/Code de l’acte/) as HTMLInputElement).value).toBe('1208');

    fireEvent.click(screen.getByLabelText(/Acte isolé/));
    fireEvent.click(screen.getByRole('button', { name: 'Signer la correspondance' }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(true));
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')!;
    expect(JSON.parse(post[1].body)).toEqual({
      analyteCode: 'BIO_HOMOCYSTEINE',
      codeActe: '1208',
      decision: 'signer',
      etatAttendu: 'absente',
      nature: 'isole',
    });
    // Signé : la recherche se vide, aucun second acte ne reste à portée de clic.
    await waitFor(() => expect(screen.queryByRole('list', { name: 'Actes trouvés' })).toBeNull());
    expect((screen.getByLabelText(/Rechercher dans la nomenclature/) as HTMLInputElement).value).toBe('');
  });

  it('la nature choisie pour un acte ne passe pas à l’acte lu ensuite', async () => {
    mockApi({
      lecture: [vide],
      recherche: trouves([ACTE, { ...ACTE, codeActe: '1210', libelle: 'Libellé de l’acte 1210' }]),
      acte: { json: { ok: true, millesime: 'V105', acte: ACTE } },
    });
    render(<CorrespondancesNabmSection analyteCode="BIO_HOMOCYSTEINE" />);
    await waitFor(() => expect(screen.getByText('Aucune correspondance pour cet analyte.')).toBeTruthy());
    fireEvent.change(screen.getByLabelText(/Rechercher dans la nomenclature/), { target: { value: 'homocysteine' } });
    fireEvent.click(screen.getByRole('button', { name: 'Chercher' }));
    await waitFor(() => expect(screen.getByRole('list', { name: 'Actes trouvés' })).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Lire l’acte 1208' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Signer la correspondance' })).toBeTruthy());
    fireEvent.click(screen.getByLabelText(/Groupe imposé/));
    expect((screen.getByRole('button', { name: 'Signer la correspondance' }) as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Lire l’acte 1210' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Signer la correspondance' })).toBeTruthy());
    expect((screen.getByRole('button', { name: 'Signer la correspondance' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText(/Groupe imposé/) as HTMLInputElement).checked).toBe(false);
  });

  it('aucun résultat se dit avec la saisie et le millésime', async () => {
    mockApi({ lecture: [vide], recherche: trouves([]) });
    render(<CorrespondancesNabmSection analyteCode="BIO_FERRITINE" />);
    await waitFor(() => expect(screen.getByText('Aucune correspondance pour cet analyte.')).toBeTruthy());
    fireEvent.change(screen.getByLabelText(/Rechercher dans la nomenclature/), { target: { value: 'zzzz' } });
    fireEvent.click(screen.getByRole('button', { name: 'Chercher' }));
    await waitFor(() => expect(screen.getByText(/Aucun acte du millésime V105 ne contient « zzzz »/)).toBeTruthy());
  });

  it('résultats tronqués : le nombre servi et le total sont dits', async () => {
    mockApi({ lecture: [vide], recherche: trouves([ACTE], 40) });
    render(<CorrespondancesNabmSection analyteCode="BIO_FERRITINE" />);
    await waitFor(() => expect(screen.getByText('Aucune correspondance pour cet analyte.')).toBeTruthy());
    fireEvent.change(screen.getByLabelText(/Rechercher dans la nomenclature/), { target: { value: 'dosage' } });
    fireEvent.click(screen.getByRole('button', { name: 'Chercher' }));
    await waitFor(() => expect(screen.getByText(/1 premiers sur 40 — précisez la recherche/)).toBeTruthy());
  });

  it('une saisie de moins de trois caractères est refusée à l’écran, sans appel', async () => {
    const fetchMock = mockApi({ lecture: [vide] });
    render(<CorrespondancesNabmSection analyteCode="BIO_FERRITINE" />);
    await waitFor(() => expect(screen.getByText('Aucune correspondance pour cet analyte.')).toBeTruthy());
    fireEvent.change(screen.getByLabelText(/Rechercher dans la nomenclature/), { target: { value: 'fe' } });
    fireEvent.click(screen.getByRole('button', { name: 'Chercher' }));
    expect(screen.getByRole('alert').textContent).toMatch(/au moins trois caractères/);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/nabm/recherche'))).toBe(false);
  });

  it('les résultats d’un analyte ne restent pas sur la fiche du suivant', async () => {
    mockApi({ lecture: [vide], recherche: trouves([ACTE]) });
    const { rerender } = render(<CorrespondancesNabmSection analyteCode="BIO_FERRITINE" />);
    await waitFor(() => expect(screen.getByText('Aucune correspondance pour cet analyte.')).toBeTruthy());
    fireEvent.change(screen.getByLabelText(/Rechercher dans la nomenclature/), { target: { value: 'ferritine' } });
    fireEvent.click(screen.getByRole('button', { name: 'Chercher' }));
    await waitFor(() => expect(screen.getByRole('list', { name: 'Actes trouvés' })).toBeTruthy());

    rerender(<CorrespondancesNabmSection analyteCode="BIO_ZINC_PLASMATIQUE" />);
    await waitFor(() => expect(screen.getByText('Aucune correspondance pour cet analyte.')).toBeTruthy());
    expect(screen.queryByRole('list', { name: 'Actes trouvés' })).toBeNull();
    expect((screen.getByLabelText(/Rechercher dans la nomenclature/) as HTMLInputElement).value).toBe('');
  });
});

describe('CorrespondancesNabmSection — propositions préparées (M-3b)', () => {
  const ACTE_1211 = { ...ACTE, codeActe: '1211', libelle: 'Libellé de l’acte 1211', coefficientB: 35 };
  const avecCandidats = (candidats: unknown) => ({
    json: { ok: true, millesime: 'V105', correspondances: [], candidats },
  });
  const deuxPropositions = avecCandidats({
    millesimeListe: 'V105',
    situation: 'libelle_explicite',
    motif: null,
    propositions: [
      { codeActe: '1208', nature: 'isole', motif: 'T.S.H. seule.', acte: ACTE },
      { codeActe: '1211', nature: 'groupe_et', motif: 'T.S.H. + T4 libre.', acte: ACTE_1211 },
    ],
  });
  const signeeOk = {
    json: { ok: true, correspondance: { codeActe: '1208', etat: 'signee', verifiePar: PRATICIEN, verifieLe: '2026-10-15T10:00:00.000Z' } },
  };

  it('affiche l’acte proposé, nature présélectionnée, et signe en un clic par le POST existant', async () => {
    const onModifie = vi.fn();
    const fetchMock = mockApi({ lecture: [deuxPropositions, signee], decision: signeeOk });
    render(<CorrespondancesNabmSection analyteCode="BIO_TSH_US" onModifie={onModifie} />);

    await waitFor(() => expect(screen.getByText('Propositions à signer')).toBeTruthy());
    expect(screen.getByText(/Libellé de l’acte 1208/)).toBeTruthy();
    expect(screen.getByText('T.S.H. seule.')).toBeTruthy();
    const radios = screen.getAllByRole('radio') as HTMLInputElement[];
    expect(radios.filter(r => r.name === 'nature-candidat-1208' && r.checked).map(r => r.value)).toEqual(['isole']);
    expect(radios.filter(r => r.name === 'nature-candidat-1211' && r.checked).map(r => r.value)).toEqual(['groupe_et']);

    fireEvent.click(screen.getAllByRole('button', { name: 'Signer cette proposition' })[0]);
    await waitFor(() => expect(onModifie).toHaveBeenCalledTimes(1));
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')!;
    // Ni signataire ni date dans le corps : le serveur les pose.
    expect(JSON.parse(post[1].body)).toEqual({
      analyteCode: 'BIO_TSH_US',
      codeActe: '1208',
      decision: 'signer',
      etatAttendu: 'absente',
      nature: 'isole',
    });
  });

  it('la nature changée avant la signature est celle qui part', async () => {
    const fetchMock = mockApi({ lecture: [deuxPropositions, signee], decision: signeeOk });
    render(<CorrespondancesNabmSection analyteCode="BIO_TSH_US" />);
    await waitFor(() => expect(screen.getByText('Propositions à signer')).toBeTruthy());
    const groupeAuChoix = (screen.getAllByRole('radio') as HTMLInputElement[]).find(
      r => r.name === 'nature-candidat-1211' && r.value === 'groupe_ou',
    )!;
    fireEvent.click(groupeAuChoix);
    fireEvent.click(screen.getAllByRole('button', { name: 'Signer cette proposition' })[1]);
    await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(true));
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')!;
    expect(JSON.parse(post[1].body)).toMatchObject({ codeActe: '1211', nature: 'groupe_ou', etatAttendu: 'absente' });
  });

  it('un candidat « à juger » le dit, avec son motif', async () => {
    mockApi({
      lecture: [
        avecCandidats({
          millesimeListe: 'V105',
          situation: 'a_juger',
          motif: null,
          propositions: [{ codeActe: '1208', nature: 'groupe_et', motif: 'Le libellé ne tranche pas.', acte: ACTE }],
        }),
      ],
    });
    render(<CorrespondancesNabmSection analyteCode="BIO_FER_SERIQUE" />);
    await waitFor(() => expect(screen.getByText('À juger')).toBeTruthy());
    expect(screen.getByText('Le libellé ne tranche pas.')).toBeTruthy();
  });

  it('analyte sans acte ou calculé : une mention d’information, aucune signature', async () => {
    for (const [situation, attendu] of [
      ['aucun_acte', /aucun acte de la nomenclature ne nomme cet analyte/],
      ['valeur_calculee', /valeur calculée/],
      ['regroupement', /analyte de regroupement/],
    ] as const) {
      mockApi({
        lecture: [avecCandidats({ millesimeListe: 'V105', situation, motif: 'Motif de la liste.', propositions: [] })],
      });
      render(<CorrespondancesNabmSection analyteCode="BIO_HOMOCYSTEINE" />);
      await waitFor(() => expect(screen.getByText(attendu)).toBeTruthy());
      expect(screen.getByText('Motif de la liste.')).toBeTruthy();
      expect(screen.queryByText('Propositions à signer')).toBeNull();
      expect(screen.queryByRole('button', { name: 'Signer cette proposition' })).toBeNull();
      cleanup();
    }
  });

  // CONTRE-ÉPREUVE : ce que le serveur ne rend pas, l'écran ne l'invente pas —
  // ni candidat résolu (absent, inactif, déjà en base), ni liste.
  it('sans proposition rendue par le serveur, aucun bouton de signature en un clic', async () => {
    for (const candidats of [
      null,
      undefined,
      { millesimeListe: 'V105', situation: 'libelle_explicite', motif: null, propositions: [] },
    ]) {
      mockApi({ lecture: [avecCandidats(candidats)] });
      render(<CorrespondancesNabmSection analyteCode="BIO_FERRITINE" />);
      await waitFor(() => expect(screen.getByText('Aucune correspondance pour cet analyte.')).toBeTruthy());
      expect(screen.queryByText('Propositions à signer')).toBeNull();
      expect(screen.queryByRole('button', { name: 'Signer cette proposition' })).toBeNull();
      expect(screen.queryByText(/Rien à signer/)).toBeNull();
      cleanup();
    }
  });

  it('une correspondance signée et un candidat encore à signer se côtoient', async () => {
    mockApi({
      lecture: [
        {
          json: {
            ...signee.json,
            candidats: {
              millesimeListe: 'V105',
              situation: 'libelle_explicite',
              motif: null,
              propositions: [{ codeActe: '1211', nature: 'groupe_et', motif: 'T.S.H. + T4 libre.', acte: ACTE_1211 }],
            },
          },
        },
      ],
    });
    render(<CorrespondancesNabmSection analyteCode="BIO_TSH_US" />);
    await waitFor(() => expect(screen.getByText(/signée par praticien@wellneuro\.fr/)).toBeTruthy());
    expect(screen.getByText(/Libellé de l’acte 1211/)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Signer cette proposition' })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Retirer la signature' })).toBeTruthy();
  });

  it('une correspondance posée à la main fait taire la mention « rien à signer »', async () => {
    mockApi({
      lecture: [
        {
          json: {
            ...signee.json,
            candidats: { millesimeListe: 'V105', situation: 'aucun_acte', motif: 'Motif de la liste.', propositions: [] },
          },
        },
      ],
    });
    render(<CorrespondancesNabmSection analyteCode="BIO_HOMOCYSTEINE" />);
    await waitFor(() => expect(screen.getByText(/signée par/)).toBeTruthy());
    expect(screen.queryByText(/Rien à signer/)).toBeNull();
  });

  it('signature d’un candidat refusée : le message du serveur, puis la liste relue', async () => {
    const onModifie = vi.fn();
    const fetchMock = mockApi({
      lecture: [deuxPropositions, signee],
      decision: {
        status: 409,
        json: { ok: false, reason: 'etat_divergent', error: 'La correspondance a changé depuis l’affichage — rechargez la fiche.' },
      },
    });
    render(<CorrespondancesNabmSection analyteCode="BIO_TSH_US" onModifie={onModifie} />);
    await waitFor(() => expect(screen.getByText('Propositions à signer')).toBeTruthy());
    fireEvent.click(screen.getAllByRole('button', { name: 'Signer cette proposition' })[0]);

    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/a changé depuis l’affichage/));
    // La relecture rend l'état de la base : le candidat a disparu, la ligne signée paraît.
    await waitFor(() => expect(screen.queryByText('Propositions à signer')).toBeNull());
    expect(screen.getByText(/signée par/)).toBeTruthy();
    const lectures = fetchMock.mock.calls.filter(([url, init]) => !init?.method && String(url).includes('/correspondances'));
    expect(lectures.length).toBe(2);
    expect(onModifie).not.toHaveBeenCalled();
  });

  it('les propositions d’un analyte ne restent pas sur la fiche du suivant', async () => {
    let reponse: { json: unknown } = deuxPropositions;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => ({ ok: true, status: 200, json: async () => reponse.json })),
    );
    const { rerender } = render(<CorrespondancesNabmSection analyteCode="BIO_TSH_US" />);
    await waitFor(() => expect(screen.getByText('Propositions à signer')).toBeTruthy());
    reponse = vide;
    rerender(<CorrespondancesNabmSection analyteCode="BIO_HOMOCYSTEINE" />);
    await waitFor(() => expect(screen.queryByText('Propositions à signer')).toBeNull());
    expect(screen.getByText('Aucune correspondance pour cet analyte.')).toBeTruthy();
  });
});

describe('CorrespondancesNabmSection — constat « aucun acte » (M-3c)', () => {
  const CONSTAT = { millesime: 'V105', verifiePar: PRATICIEN, verifieLe: '2026-10-16T09:00:00.000Z', perime: false };
  const lecture = (
    situation: string,
    {
      constat = null,
      millesime = 'V105',
      correspondances = [],
    }: { constat?: unknown; millesime?: string | null; correspondances?: unknown[] } = {},
  ) => ({
    json: {
      ok: true,
      millesime,
      correspondances,
      candidats: { millesimeListe: 'V105', situation, motif: 'Motif de la liste.', propositions: [] },
      constat,
    },
  });
  const BOUTON = 'Constater : aucun acte dans la nomenclature (V105)';

  it('analyte « aucun acte » : constate sur le millésime affiché, sans signataire dans le corps, puis relit', async () => {
    const onModifie = vi.fn();
    const fetchMock = mockApi({
      lecture: [lecture('aucun_acte'), lecture('aucun_acte', { constat: CONSTAT })],
      decision: { json: { ok: true, constat: CONSTAT } },
    });
    render(<CorrespondancesNabmSection analyteCode="BIO_HOMOCYSTEINE" onModifie={onModifie} />);
    fireEvent.click(await screen.findByRole('button', { name: BOUTON }));

    await waitFor(() =>
      expect(screen.getByText(/Constat signé : aucun acte dans la nomenclature \(V105\)/)).toBeTruthy(),
    );
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')!;
    expect(post[0]).toBe('/api/praticien/biologie/nabm/constats');
    expect(JSON.parse(String(post[1]?.body))).toEqual({
      analyteCode: 'BIO_HOMOCYSTEINE',
      decision: 'constater',
      millesimeVu: 'V105',
    });
    expect(onModifie).toHaveBeenCalledTimes(1);
    // Constat posé : plus de bouton pour en poser un second.
    expect(screen.queryByRole('button', { name: BOUTON })).toBeNull();
  });

  // CONTRE-ÉPREUVE : le bouton ne s'offre que là où la liste n'a trouvé aucun acte.
  it.each(['valeur_calculee', 'regroupement', 'libelle_explicite', 'a_juger'])(
    'situation « %s » : aucun bouton de constat',
    async situation => {
      mockApi({ lecture: [lecture(situation)] });
      render(<CorrespondancesNabmSection analyteCode="BIO_X" />);
      await waitFor(() => expect(screen.getByText('Aucune correspondance pour cet analyte.')).toBeTruthy());
      expect(screen.queryByRole('button', { name: /Constater/ })).toBeNull();
    },
  );

  it('analyte « aucun acte » qui porte une signature : aucun bouton (retrait d’abord)', async () => {
    mockApi({ lecture: [lecture('aucun_acte', { correspondances: signee.json.correspondances })] });
    render(<CorrespondancesNabmSection analyteCode="BIO_HOMOCYSTEINE" />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Retirer la signature' })).toBeTruthy());
    expect(screen.queryByRole('button', { name: /Constater/ })).toBeNull();
  });

  it('nomenclature non importée : aucun bouton de constat', async () => {
    mockApi({ lecture: [lecture('aucun_acte', { millesime: null })] });
    render(<CorrespondancesNabmSection analyteCode="BIO_HOMOCYSTEINE" />);
    await waitFor(() => expect(screen.getByText(/Rien à signer/)).toBeTruthy());
    expect(screen.queryByRole('button', { name: /Constater/ })).toBeNull();
  });

  it('nomenclature passée à un autre millésime que la liste : pas de bouton, la raison est dite', async () => {
    mockApi({ lecture: [lecture('aucun_acte', { millesime: 'V106' })] });
    render(<CorrespondancesNabmSection analyteCode="BIO_HOMOCYSTEINE" />);
    await waitFor(() => expect(screen.getByText(/Constat indisponible/)).toBeTruthy());
    expect(screen.getByText(/préparée sur le millésime V105, la nomenclature courante est le millésime V106/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Constater/ })).toBeNull();
  });

  it('le retrait du constat demande une confirmation, puis envoie la date vue', async () => {
    const fetchMock = mockApi({
      lecture: [lecture('aucun_acte', { constat: CONSTAT }), lecture('aucun_acte')],
      decision: { json: { ok: true, constat: null } },
    });
    render(<CorrespondancesNabmSection analyteCode="BIO_HOMOCYSTEINE" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Retirer le constat' }));
    expect(screen.getByText('L’analyte repassera « non évalué ».')).toBeTruthy();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer le retrait' }));

    await waitFor(() => expect(screen.getByRole('button', { name: BOUTON })).toBeTruthy());
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')!;
    expect(post[0]).toBe('/api/praticien/biologie/nabm/constats');
    expect(JSON.parse(String(post[1]?.body))).toEqual({
      analyteCode: 'BIO_HOMOCYSTEINE',
      decision: 'retirer',
      verifieLeVu: '2026-10-16T09:00:00.000Z',
    });
  });

  it('constat périmé : dit qu’il est à renouveler au millésime courant, et se retire', async () => {
    mockApi({
      lecture: [lecture('aucun_acte', { millesime: 'V106', constat: { ...CONSTAT, perime: true } })],
    });
    render(<CorrespondancesNabmSection analyteCode="BIO_HOMOCYSTEINE" />);
    await waitFor(() =>
      expect(screen.getByText('Constat périmé (V105) — à renouveler au millésime V106')).toBeTruthy(),
    );
    expect(screen.queryByText(/Constat signé/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Retirer le constat' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Constater/ })).toBeNull();
  });

  it('constat refusé : le message du serveur, puis la fiche relue', async () => {
    const fetchMock = mockApi({
      lecture: [lecture('aucun_acte')],
      decision: {
        status: 409,
        json: {
          ok: false,
          reason: 'signature_presente',
          error: 'Cet analyte porte une correspondance signée : retirez-la d’abord.',
        },
      },
    });
    render(<CorrespondancesNabmSection analyteCode="BIO_HOMOCYSTEINE" />);
    fireEvent.click(await screen.findByRole('button', { name: BOUTON }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/retirez-la d’abord/));
    const lectures = fetchMock.mock.calls.filter(([, init]) => init?.method !== 'POST');
    expect(lectures.length).toBe(2);
  });
});
