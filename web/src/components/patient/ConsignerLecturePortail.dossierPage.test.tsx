// @vitest-environment jsdom
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Le segment de la page `/portail/[token]` : lu par `useSegmentPage`.
vi.mock('next/navigation', () => ({ useParams: () => ({ token: 'PAT_SEED_03' }) }));

import { ConsignerLecturePortail } from './ConsignerLecturePortail';
import { EN_TETE_DOSSIER_PAGE } from '@/lib/portail/dossierPage';

// La lecture datée sous la garde du dossier de la page ([[D-481]] DOC-14) :
// l'écriture porte le segment de la page ; son refus (409) reste muet, comme
// tout échec de cette écriture sans geste ([[D-297]] §4, [[D-488]] DOC-14).

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ConsignerLecturePortail — garde du dossier de la page', () => {
  it('la consignation porte le segment ; le 409 ne rend rien', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) =>
      init?.method === 'POST'
        ? ({ ok: false, status: 409, json: async () => ({ ok: false, reason: 'autre_dossier' }) } as Response)
        : ({
            ok: true,
            status: 200,
            json: async () => ({ ok: true, lectures: [{ espece: 'bilan', idObjet: 'env_1' }] }),
          } as Response),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { container } = render(<ConsignerLecturePortail espece="bilan" />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)[EN_TETE_DOSSIER_PAGE]).toBe('PAT_SEED_03');
    expect(container.innerHTML).toBe('');
  });
});
