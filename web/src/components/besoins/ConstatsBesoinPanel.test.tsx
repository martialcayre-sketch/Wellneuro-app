// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AVERTISSEMENT_MESURE, AVERTISSEMENT_NOTE } from '@/lib/constats-besoin/liste';
import { ConstatsBesoinPanel } from './ConstatsBesoinPanel';

// L'ÉCRAN DU CONSTAT SUR UN BESOIN SANS SCORE ([[D-347]], t40) : il dit la
// tête, « à relire » et les pièces sans aucune valeur ; il n'offre une pose
// que sur un besoin sans source de score ; il dit qu'un constat n'est pas une
// mesure. Le drapeau se lit au serveur : éteint, la fiche ne le monte pas
// (`FichePatientPanel`).

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const ROUTE = '/api/praticien/besoins/constats';

const PIECE = { type: 'reponse', id: 'rep1', titre: 'Questionnaire de test', dateReponse: '2026-10-01T08:00:00.000Z' };

const TETE = {
  id: 'c1',
  ordre: '1',
  acte: 'pose',
  besoin: 6,
  verdict: 'non_evaluable',
  motif: 'non_aborde',
  note: null,
  aRevoirLe: '2026-11-15',
  idConstatRemplace: null,
  praticienEmail: 'praticien@wellneuro.fr',
  acteLe: '2026-10-10T09:00:00.000Z',
  pieces: [PIECE],
};

const OFFERTS = [
  { besoin: 2, libelle: 'Besoin deux', avecScore: false },
  { besoin: 6, libelle: 'Besoin six', avecScore: false },
  { besoin: 7, libelle: 'Besoin sept', avecScore: false },
  { besoin: 11, libelle: 'Besoin onze', avecScore: false },
];

const LECTURE = {
  ok: true,
  offerts: OFFERTS,
  aujourdhui: '2026-10-23',
  besoins: [{ besoin: 6, tete: TETE, aRelire: ['passation_plus_recente'], historique: [TETE] }],
  citables: [PIECE],
};

function stubFetch(lecture: unknown, ecriture: { status: number; corps: unknown } = { status: 201, corps: { ok: true, id: 'c2' } }) {
  const fetchMock = vi.fn(async (entree: RequestInfo | URL, init?: RequestInit) => {
    const methode = init?.method ?? 'GET';
    if (String(entree).split('?')[0] !== ROUTE) throw new Error(`route non simulée : ${String(entree)}`);
    return methode === 'GET'
      ? new Response(JSON.stringify(lecture), { status: 200 })
      : new Response(JSON.stringify(ecriture.corps), { status: ecriture.status });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const rendre = () => render(<ConstatsBesoinPanel idPatient="PAT_SOPHIE" />);

describe('ConstatsBesoinPanel (D-347)', () => {
  it('dit la tête, sa date et sa nature, « à relire » et la pièce sans valeur ; dit que ce n’est pas une mesure', async () => {
    stubFetch(LECTURE);
    rendre();
    expect(await screen.findByText('B6 · Besoin six')).toBeTruthy();
    expect(screen.getByText(AVERTISSEMENT_MESURE)).toBeTruthy();
    expect(screen.getByText('non évaluable')).toBeTruthy();
    expect(screen.getByText(/ce besoin n’a pas encore été abordé/)).toBeTruthy();
    expect(screen.getByText('À revoir le 15/11/2026 (fixée par le praticien)')).toBeTruthy();
    expect(screen.getByText('Questionnaire de test — passé le 01/10/2026')).toBeTruthy();
    expect(screen.getByText('un questionnaire cité a été repassé')).toBeTruthy();
    // Les trois autres besoins, sans constat, le disent.
    expect(screen.getAllByText('Aucun constat posé.')).toHaveLength(3);
    // Chaque geste nomme son besoin pour un lecteur d'écran.
    const retirer = screen.getByRole('button', { name: 'Retirer le constat' });
    expect(retirer.getAttribute('aria-describedby')).toBe('constat-besoin-6');
  });

  it('un besoin qui porte une source de score : aucune pose offerte, le retrait reste', async () => {
    stubFetch({ ...LECTURE, offerts: OFFERTS.map(o => (o.besoin === 6 ? { ...o, avecScore: true } : o)) });
    rendre();
    expect(await screen.findByText('B6 · Besoin six')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Remplacer le constat' })).toBeNull();
    expect(screen.getAllByRole('button', { name: 'Poser un constat' })).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Retirer le constat' })).toBeTruthy();
  });

  it('« à soutenir » sans pièce : envoie le geste, puis relit ; la date « à revoir le » commence au lendemain', async () => {
    const fetchMock = stubFetch(LECTURE);
    rendre();
    fireEvent.click((await screen.findAllByRole('button', { name: 'Poser un constat' }))[0]);
    expect(screen.getByText(AVERTISSEMENT_NOTE)).toBeTruthy();
    expect((screen.getByLabelText(/À revoir le/) as HTMLInputElement).min).toBe('2026-10-24');
    const poser = screen.getByRole('button', { name: 'Poser ce constat' }) as HTMLButtonElement;
    expect(poser.disabled).toBe(true);
    fireEvent.click(screen.getByLabelText('à soutenir'));
    expect(poser.disabled).toBe(false);
    fireEvent.click(poser);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    const [, init] = fetchMock.mock.calls[1];
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({
      idPatient: 'PAT_SOPHIE',
      acte: 'pose',
      besoin: 2,
      remplace: null,
      verdict: 'a_soutenir',
      motif: null,
      note: null,
      aRevoirLe: null,
      pieces: [],
    });
  });

  it('un motif est exigé hors « à soutenir », et `autre` demande une note', async () => {
    stubFetch(LECTURE);
    rendre();
    fireEvent.click(await screen.findByRole('button', { name: 'Remplacer le constat' }));
    fireEvent.click(screen.getByLabelText('sans objet'));
    const poser = screen.getByRole('button', { name: 'Poser ce constat' }) as HTMLButtonElement;
    expect(poser.disabled).toBe(true);
    fireEvent.click(screen.getByLabelText('autre motif'));
    expect(poser.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/Note \(obligatoire/), { target: { value: 'une note' } });
    expect(poser.disabled).toBe(false);
  });

  it.each(['tete_changee', 'besoin_avec_score', 'passation_exclue', 'refus_base'])(
    'refus %s, né d’une lecture périmée : le refus se dit, le formulaire se ferme, la liste se relit',
    async raison => {
      const fetchMock = stubFetch(LECTURE, { status: 409, corps: { ok: false, reason: raison, error: 'Refus.' } });
      rendre();
      fireEvent.click(await screen.findByRole('button', { name: 'Retirer le constat' }));
      fireEvent.click(screen.getAllByRole('button', { name: 'Retirer le constat' }).at(-1)!);
      expect((await screen.findByRole('alert')).textContent).toBe('Refus. Les constats ont été relus.');
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
      expect(screen.getAllByRole('button', { name: 'Retirer le constat' })).toHaveLength(1);
    },
  );

  it('un autre refus se dit dans le formulaire, sans relecture', async () => {
    const fetchMock = stubFetch(LECTURE, { status: 400, corps: { ok: false, reason: 'note_trop_longue', error: 'La note dépasse 2000 caractères.' } });
    rendre();
    fireEvent.click(await screen.findByRole('button', { name: 'Retirer le constat' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Retirer le constat' }).at(-1)!);
    expect((await screen.findByRole('alert')).textContent).toBe('La note dépasse 2000 caractères.');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('lecture en échec : le dit, sans repli sur « aucun constat »', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: false, error: 'Les constats sur les besoins ne sont pas ouverts.' }), { status: 503 })));
    rendre();
    expect((await screen.findByRole('alert')).textContent).toBe('Les constats sur les besoins ne sont pas ouverts.');
    expect(screen.queryByText('Aucun constat posé.')).toBeNull();
  });
});
