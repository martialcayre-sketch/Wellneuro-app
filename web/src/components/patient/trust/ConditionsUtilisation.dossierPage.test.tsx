// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Le segment de la page `/portail/[token]` : lu par `useSegmentPage`.
vi.mock('next/navigation', () => ({ useParams: () => ({ token: 'PAT_SEED_02' }) }));

import { AccuseConditions } from './ConditionsUtilisation';
import { EN_TETE_DOSSIER_PAGE, MESSAGE_AUTRE_DOSSIER } from '@/lib/portail/dossierPage';

// U38 sous la garde du dossier de la page ([[D-481]] DOC-14) : l'accusé porte
// le segment de la page ; refusé en 409, T-51 remplace le texte fixe de
// l'échec ([[D-488]] DOC-14), et rien n'est déclaré accusé.

const reponse = (corps: unknown, status: number) =>
  ({ ok: status < 300, status, json: async () => corps }) as Response;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('AccuseConditions — garde du dossier de la page', () => {
  it('409 : T-51 à la place du texte fixe, segment envoyé, pas d’accusé', async () => {
    const fetchMock = vi.fn(async () => reponse({ ok: false, reason: 'autre_dossier', error: MESSAGE_AUTRE_DOSSIER }, 409));
    vi.stubGlobal('fetch', fetchMock);
    const onAccuse = vi.fn();
    render(<AccuseConditions onAccuse={onAccuse} />);
    fireEvent.click(screen.getByRole('button', { name: 'J’en ai pris connaissance' }));

    expect(await screen.findByText(MESSAGE_AUTRE_DOSSIER)).toBeTruthy();
    expect(screen.queryByText('Votre lecture n’a pas pu être enregistrée. Réessayez.')).toBeNull();
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>)[EN_TETE_DOSSIER_PAGE]).toBe('PAT_SEED_02');
    expect(onAccuse).not.toHaveBeenCalled();
  });

  it('un autre échec garde son texte fixe', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => reponse({ ok: false, reason: 'exception' }, 500)));
    render(<AccuseConditions onAccuse={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'J’en ai pris connaissance' }));
    expect(await screen.findByText('Votre lecture n’a pas pu être enregistrée. Réessayez.')).toBeTruthy();
  });
});
