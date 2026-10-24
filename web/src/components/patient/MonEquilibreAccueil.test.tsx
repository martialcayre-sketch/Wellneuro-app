// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MonEquilibreAccueil } from './MonEquilibreAccueil';
import { MENTION_BESOINS_PARTIELS_PATIENT } from '@/lib/equilibre/natureIndiceGlobal';

// [[D-329]] §3 — le total se calcule sur les seuls besoins mesurés. Le portail
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

// [[D-355]] — « Points à explorer » : exception nommée à la règle du portail,
// bornée. §1 : trois besoins mesurés au plus, les moins couverts d'abord, un
// besoin non mesuré jamais ; §3 : aucun chiffre.
describe('MonEquilibreAccueil — points à explorer (D-355)', () => {
  const TITRE = 'Points à explorer avec votre praticien';

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  function lire() {
    const section = screen.getByText(TITRE).parentElement!;
    const lis = Array.from(section.querySelectorAll('li'));
    return { section, lis, items: lis.map(li => li.textContent) };
  }

  it('trois besoins mesurés au plus, du moins couvert au plus couvert, sans non mesuré ni chiffre', async () => {
    await rendre(reponse([80, null, 20, 50, 40]));
    const { section, lis, items } = lire();
    expect(items).toEqual(['Besoin 3', 'Besoin 5', 'Besoin 4']);
    // Rien d'autre que le titre et les libellés : ni couverture, ni rang.
    expect(section.textContent).toBe(TITRE + items.join(''));
    // Même rendu pour chaque item : aucune classe ni icône qui suive la valeur.
    expect(new Set(lis.map(li => li.outerHTML.replace(/Besoin \d/, ''))).size).toBe(1);
  });

  it('une couverture à zéro est mesurée ; à égalité, l’ordre servi par la route', async () => {
    await rendre(reponse([40, 0, 40, 40]));
    expect(lire().items).toEqual(['Besoin 2', 'Besoin 1', 'Besoin 3']);
  });

  it('aucun besoin mesuré : pas de section', async () => {
    await rendre(reponse([null, null, null], null));
    expect(screen.queryByText(TITRE)).toBeNull();
  });
});
