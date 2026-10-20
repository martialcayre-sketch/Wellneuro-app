// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CbFeatureProvider } from '@/components/patient-cockpit/CbFeatureProvider';
import { AVERTISSEMENT_FILET, AVERTISSEMENT_NOTE } from '@/lib/bio-parcours/constats/liste';
import { ConstatsParcoursPanel } from './ConstatsParcoursPanel';

// L'ÉCRAN DES CONSTATS ([[D-331]], BP-11) : muet drapeau éteint ; il dit la
// tête, « à relire » et les pièces sans aucune valeur ; il n'offre une pose
// que sur une structure signée.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const ROUTE = '/api/praticien/biologie/constats';

const PIECE = {
  type: 'resultat',
  id: 'res1',
  analyteCode: 'BIO_TEST',
  analyteLibelle: 'Analyse de test',
  preleveLe: '2026-10-01T08:00:00.000Z',
};

const TETE = {
  id: 'c1',
  ordre: '1',
  acte: 'pose',
  hypotheseCode: 'HYP_TEST_A',
  verdict: 'non_evaluable',
  motif: 'contexte_inconnu',
  note: null,
  aRevoirLe: '2026-11-15',
  idConstatRemplace: null,
  praticienEmail: 'praticien@wellneuro.fr',
  acteLe: '2026-10-10T09:00:00.000Z',
  pieces: [PIECE],
};

const LECTURE = {
  ok: true,
  structureSignee: true,
  offertes: [{ hypotheseCode: 'HYP_TEST_A', libelle: 'Hypothèse de test' }, { hypotheseCode: 'HYP_TEST_B', libelle: null }],
  aujourdhui: '2026-10-20',
  hypotheses: [{ hypotheseCode: 'HYP_TEST_A', tete: TETE, aRelire: ['nouveau_prelevement'], historique: [TETE] }],
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

function rendre(bioConstatEnabled = true) {
  return render(
    <CbFeatureProvider enabled bioConstatEnabled={bioConstatEnabled}>
      <ConstatsParcoursPanel idPatient="PAT_SOPHIE" />
    </CbFeatureProvider>,
  );
}

describe('ConstatsParcoursPanel (D-331)', () => {
  it('drapeau éteint : rien ne s’affiche, rien ne se lit', () => {
    const fetchMock = stubFetch(LECTURE);
    const { container } = rendre(false);
    expect(container.innerHTML).toBe('');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('dit la tête, sa date et sa nature, « à relire » et la pièce sans valeur ; dit que ce n’est pas un filet', async () => {
    stubFetch(LECTURE);
    rendre();
    expect(await screen.findByText('Hypothèse de test')).toBeTruthy();
    expect(screen.getByText(AVERTISSEMENT_FILET)).toBeTruthy();
    expect(screen.getByText('non évaluable')).toBeTruthy();
    expect(screen.getByText(/le contexte du prélèvement est inconnu/)).toBeTruthy();
    expect(screen.getByText('À revoir le 15/11/2026 (fixée par le praticien)')).toBeTruthy();
    expect(screen.getByText('Analyse de test — prélevé le 01/10/2026')).toBeTruthy();
    expect(screen.getByText('À relire')).toBeTruthy();
    expect(screen.getByText('un prélèvement plus récent d’une analyse citée est arrivé')).toBeTruthy();
    // Une hypothèse offerte sans libellé se dit par son code ; sans constat, elle le dit.
    expect(screen.getByText('HYP_TEST_B')).toBeTruthy();
    expect(screen.getByText('Aucun constat posé.')).toBeTruthy();
  });

  it('structure non signée : le dit, n’offre aucune pose, garde le retrait d’une tête', async () => {
    stubFetch({ ...LECTURE, structureSignee: false, offertes: [] });
    rendre();
    expect(await screen.findByText(/n’est pas encore signée : aucun constat ne se pose/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Poser un constat|Remplacer le constat/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Retirer le constat' })).toBeTruthy();
  });

  it('remplace la tête : verdict, pièce, avertissement de la note ; envoie le geste puis relit', async () => {
    const fetchMock = stubFetch(LECTURE);
    rendre();
    fireEvent.click(await screen.findByRole('button', { name: 'Remplacer le constat' }));
    expect(screen.getByText(AVERTISSEMENT_NOTE)).toBeTruthy();
    const poser = screen.getByRole('button', { name: 'Poser ce constat' }) as HTMLButtonElement;
    expect(poser.disabled).toBe(true);
    fireEvent.click(screen.getByLabelText('confirmée'));
    // `confirmee` exige une pièce.
    expect(poser.disabled).toBe(true);
    fireEvent.click(screen.getByLabelText('Analyse de test — prélevé le 01/10/2026'));
    expect(poser.disabled).toBe(false);
    fireEvent.click(poser);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    const [, init] = fetchMock.mock.calls[1];
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({
      idPatient: 'PAT_SOPHIE',
      acte: 'pose',
      hypothese: 'HYP_TEST_A',
      remplace: 'c1',
      verdict: 'confirmee',
      motif: null,
      note: null,
      aRevoirLe: null,
      pieces: [{ type: 'resultat', id: 'res1' }],
    });
  });

  it('le motif `autre` demande une note avant l’envoi', async () => {
    stubFetch(LECTURE);
    rendre();
    const boutons = await screen.findAllByRole('button', { name: 'Poser un constat' });
    fireEvent.click(boutons[0]);
    fireEvent.click(screen.getByLabelText('sans objet'));
    fireEvent.click(screen.getByLabelText('autre motif'));
    const poser = screen.getByRole('button', { name: 'Poser ce constat' }) as HTMLButtonElement;
    expect(poser.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/Note \(obligatoire/), { target: { value: 'une note' } });
    expect(poser.disabled).toBe(false);
  });

  it('un refus de la route se dit tel quel', async () => {
    stubFetch(LECTURE, { status: 409, corps: { ok: false, reason: 'tete_changee', error: 'Le constat en vigueur a changé.' } });
    rendre();
    fireEvent.click(await screen.findByRole('button', { name: 'Retirer le constat' }));
    const confirmer = screen.getAllByRole('button', { name: 'Retirer le constat' }).at(-1)!;
    fireEvent.click(confirmer);
    expect((await screen.findByRole('alert')).textContent).toBe('Le constat en vigueur a changé.');
  });
});
