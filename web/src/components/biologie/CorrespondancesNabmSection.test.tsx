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
function mockApi(reponses: { lecture: Reponse[]; acte?: Reponse; decision?: Reponse }) {
  const lectures = [...reponses.lecture];
  const fetchMock = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
    const r: Reponse =
      init?.method === 'POST'
        ? reponses.decision!
        : String(url).includes('/nabm/acte')
          ? reponses.acte!
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
