// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MonEquilibreAccueil } from './MonEquilibreAccueil';
import { MENTION_BESOINS_PARTIELS_PATIENT } from '@/lib/equilibre/natureIndiceGlobal';

// [[D-328]] §3 — le total se calcule sur les seuls besoins mesurés. Le portail
// le dit en une phrase, sans chiffre, et seulement quand il manque un besoin.
function reponse(couvertures: (number | null)[], indiceGlobal: number | null = 60) {
  return {
    indiceGlobal,
    momentum: null,
    trajectoire: [],
    besoins: couvertures.map((couverture, i) => ({
      id: i + 1,
      libellePatient: `Besoin ${i + 1}`,
      strate: 'CORPS',
      couverture,
    })),
  };
}

async function rendre(donnees: unknown) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: () => Promise.resolve(donnees) }));
  render(<MonEquilibreAccueil idAssignation="ASS_1" onVoirDetail={() => {}} onRetour={() => {}} />);
  await waitFor(() => expect(screen.getByText('Voir le détail de mes 12 besoins')).not.toBeNull());
}

describe('MonEquilibreAccueil — base de l’indice', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('un besoin non mesuré : la phrase est servie, sans aucun chiffre', async () => {
    await rendre(reponse([80, null, 50]));
    const phrase = screen.getByText(MENTION_BESOINS_PARTIELS_PATIENT);
    expect(phrase).not.toBeNull();
    expect(/\d/.test(phrase.textContent ?? '')).toBe(false);
  });

  it('tous les besoins mesurés : aucune phrase', async () => {
    await rendre(reponse([80, 40, 50]));
    expect(screen.queryByText(MENTION_BESOINS_PARTIELS_PATIENT)).toBeNull();
  });

  it('aucun indice : la phrase ne double pas le message d’attente', async () => {
    await rendre(reponse([null, null, null], null));
    expect(screen.queryByText(MENTION_BESOINS_PARTIELS_PATIENT)).toBeNull();
  });
});
