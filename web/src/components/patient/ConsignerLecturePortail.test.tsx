// @vitest-environment jsdom
import { StrictMode } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConsignerLecturePortail } from './ConsignerLecturePortail';

/*
 * Ce que ces bancs protègent : un envoi par ouverture, l'identifiant qui vient
 * du SERVEUR et jamais de l'écran, et le silence complet — ni interface, ni
 * message, même en panne.
 */

const LECTURES = [
  { espece: 'bilan', idObjet: 'env_1', remiseLe: '2026-09-01T10:00:00.000Z' },
  { espece: 'synthese', idObjet: 'syn_1', remiseLe: '2026-09-02T10:00:00.000Z' },
];

let fetchMock: ReturnType<typeof vi.fn>;

/** Laisse les deux `await` de l'effet se résoudre avant d'observer. */
async function laisserPartir() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

function reponse(corps: unknown, ok = true) {
  return { ok, json: async () => corps };
}

beforeEach(() => {
  fetchMock = vi.fn(async (_url: string, init?: RequestInit) =>
    init?.method === 'POST' ? reponse({ ok: true, consignee: true }) : reponse({ ok: true, lectures: LECTURES }),
  );
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const postsFaits = () =>
  fetchMock.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === 'POST');

describe('ConsignerLecturePortail', () => {
  it('ne rend rien', async () => {
    const { container } = render(<ConsignerLecturePortail espece="bilan" />);
    await laisserPartir();
    expect(container.innerHTML).toBe('');
  });

  it.each([
    ['bilan', 'env_1'],
    ['synthese', 'syn_1'],
  ] as const)('consigne la lecture de SON espèce — %s → %s', async (espece, idObjet) => {
    render(<ConsignerLecturePortail espece={espece} />);
    await laisserPartir();
    const posts = postsFaits();
    expect(posts).toHaveLength(1);
    expect(JSON.parse(posts[0][1].body as string)).toEqual({ espece, idObjet });
  });

  it('UN SEUL envoi par ouverture, même sous StrictMode', async () => {
    // React monte deux fois en développement. Sans le garde-fou, l'écriture
    // partirait en double — inoffensive, mais inutile sur une surface patient.
    // Un banc qui re-rendrait avec les mêmes props ne prouverait rien : un
    // effet ne se rejoue pas sur un rendu identique.
    render(
      <StrictMode>
        <ConsignerLecturePortail espece="bilan" />
      </StrictMode>,
    );
    await laisserPartir();
    expect(postsFaits()).toHaveLength(1);
  });

  it('rien d’attendu pour son espèce : AUCUN envoi', async () => {
    // Déjà lu, ou rien de remis. Dans les deux cas il n'y a pas de geste à
    // consigner, et on n'en invente pas un.
    fetchMock.mockImplementation(async () => reponse({ ok: true, lectures: [LECTURES[1]] }));
    render(<ConsignerLecturePortail espece="bilan" />);
    await laisserPartir();
    expect(postsFaits()).toHaveLength(0);
  });

  it('liste vide : aucun envoi', async () => {
    fetchMock.mockImplementation(async () => reponse({ ok: true, lectures: [] }));
    render(<ConsignerLecturePortail espece="bilan" />);
    await laisserPartir();
    expect(postsFaits()).toHaveLength(0);
  });

  it.each([
    ['réponse non-ok', () => reponse({ ok: true, lectures: LECTURES }, false)],
    ['corps en échec', () => reponse({ ok: false, reason: 'forbidden', error: 'non' })],
    ['charge illisible', () => reponse({ ok: true, lectures: 'pas un tableau' })],
  ])('%s : aucun envoi, et la tâche reste au fil', async (_cas, faire) => {
    fetchMock.mockImplementation(async () => faire());
    render(<ConsignerLecturePortail espece="bilan" />);
    await laisserPartir();
    expect(postsFaits()).toHaveLength(0);
  });

  it('réseau coupé : rien n’est affiché au patient', async () => {
    // Lui annoncer un échec l'inquiéterait sur un geste dont il ignore
    // l'existence. Un échec laisse la tâche au fil, ce qui est exactement ce
    // qu'un échec doit produire.
    fetchMock.mockImplementation(async () => {
      throw new Error('réseau');
    });
    const { container } = render(<ConsignerLecturePortail espece="bilan" />);
    await laisserPartir();
    expect(container.innerHTML).toBe('');
    expect(postsFaits()).toHaveLength(0);
  });

  it('l’identifiant vient du SERVEUR, jamais d’une valeur portée par l’écran', async () => {
    // Si le serveur change d'avis, c'est son identifiant qui part — le
    // composant n'en mémorise aucun.
    fetchMock.mockImplementation(async (_url: string, init?: RequestInit) =>
      init?.method === 'POST'
        ? reponse({ ok: true, consignee: true })
        : reponse({ ok: true, lectures: [{ espece: 'bilan', idObjet: 'env_autre', remiseLe: 'x' }] }),
    );
    render(<ConsignerLecturePortail espece="bilan" />);
    await laisserPartir();
    expect(JSON.parse(postsFaits()[0][1].body as string).idObjet).toBe('env_autre');
  });
});
