// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PacksPanel } from './PacksPanel';

// Ce banc n'épingle qu'une chose : les deux portes posées sur la ligne du pack
// de base (LOT-03).
//
// Le pack `parDefaut` est assigné à chaque nouveau patient. Le démarquer ou
// l'éteindre casse l'accueil de TOUS les patients. La barrière vraie est côté
// route (409) ; l'UI la double en retirant « Retirer par défaut » et en grisant
// « Désactiver ». Rien d'autre ne rougirait si ces deux gestes se défaisaient :
// les E2E ne couvrent pas ce panneau.
//
// Hors périmètre volontaire : création, édition, assignation, compte des
// questionnaires. Un banc qui teste tout le panneau ne dirait plus ce qu'il
// protège.

type PackFixture = {
  idPack: string;
  nom: string;
  thematique: string | null;
  description: string | null;
  qids: string[];
  actif: boolean;
  parDefaut: boolean;
};

const PACK_BASE: PackFixture = {
  idPack: 'PACK_TEST_BASE',
  nom: 'Base de consultation (test)',
  thematique: null,
  description: null,
  qids: ['Q_TEST_01'],
  actif: true,
  parDefaut: true,
};

const PACK_ORDINAIRE: PackFixture = {
  idPack: 'PACK_TEST_SOMMEIL',
  nom: 'Sommeil (test)',
  thematique: null,
  description: null,
  qids: ['Q_TEST_01'],
  actif: true,
  parDefaut: false,
};

const PACK_INACTIF: PackFixture = {
  idPack: 'PACK_TEST_ARCHIVE',
  nom: 'Archivé (test)',
  thematique: null,
  description: null,
  qids: ['Q_TEST_01'],
  actif: false,
  parDefaut: false,
};

const QUESTIONNAIRE = {
  id: 'Q_TEST_01',
  titre: 'Questionnaire de test',
  categorie: 'Test',
  duree: '5 min',
  categorieFonctionnellePrincipale: 'test',
  categoriesFonctionnellesSecondaires: [] as string[],
  packsRecommandes: [] as string[],
  phase: 'mvp' as const,
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/**
 * Le panneau ne charge qu'une chose au montage : `GET /api/praticien/packs`.
 * Questionnaires, registre et patients arrivent par les props — les stubber
 * ferait croire à une couverture qui n'existe pas.
 *
 * Le tableau rendu recense TOUS les appels, méthode comprise : c'est lui qui
 * permet de distinguer « le bouton est grisé » de « le réseau n'a pas bougé ».
 */
function stubFetch(packs: PackFixture[]) {
  const appels: { url: string; method?: string }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: { method?: string }) => {
      appels.push({ url: String(url), method: init?.method });
      if (init?.method === 'DELETE' || init?.method === 'PATCH') {
        return { ok: true, json: async () => ({ success: true }) } as unknown as Response;
      }
      return { ok: true, json: async () => ({ packs }) } as unknown as Response;
    }),
  );
  return appels;
}

function monter(packs: PackFixture[]) {
  const appels = stubFetch(packs);
  render(
    <PacksPanel
      questionnaires={[QUESTIONNAIRE]}
      registry={null}
      suggestedPackSelection={null}
      patients={[]}
    />,
  );
  return appels;
}

/** La ligne d'un pack, désignée par son nom : les assertions portent sur elle. */
async function ligne(nom: string): Promise<HTMLElement> {
  const libelle = await screen.findByText(nom);
  const li = libelle.closest('li');
  if (!li) throw new Error(`Ligne introuvable pour le pack « ${nom} »`);
  return li as HTMLElement;
}

const bouton = (li: HTMLElement, motif: RegExp) => within(li).getByRole('button', { name: motif });
const boutonAbsent = (li: HTMLElement, motif: RegExp) =>
  within(li).queryByRole('button', { name: motif });

describe('PacksPanel — les deux portes du pack de base (LOT-03)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('pack de base : aucun « Retirer par défaut », « Désactiver » grisé, badge conservé', async () => {
    monter([PACK_BASE, PACK_ORDINAIRE]);
    const li = await ligne(PACK_BASE.nom);

    // Le démarquage n'est pas grisé : il n'est pas rendu. Le transfert vers un
    // autre pack actif devient l'unique chemin.
    expect(boutonAbsent(li, /retirer par défaut/i)).toBeNull();
    // Ni ailleurs dans le panneau.
    expect(screen.queryByRole('button', { name: /retirer par défaut/i })).toBeNull();

    // « Désactiver » reste RENDU — un bouton grisé enseigne la règle.
    const desactiver = bouton(li, /désactiver/i);
    expect((desactiver as HTMLButtonElement).disabled).toBe(true);
    expect(desactiver.getAttribute('title')).toMatch(/pack de base/i);

    expect(within(li).getByText('Pack de base')).toBeTruthy();
  });

  it('pack actif ordinaire : les deux actions sont offertes et actives', async () => {
    monter([PACK_BASE, PACK_ORDINAIRE]);
    const li = await ligne(PACK_ORDINAIRE.nom);

    const definir = bouton(li, /définir par défaut/i);
    expect((definir as HTMLButtonElement).disabled).toBe(false);

    const desactiver = bouton(li, /désactiver/i);
    expect((desactiver as HTMLButtonElement).disabled).toBe(false);
    expect(desactiver.getAttribute('title')).toBeNull();
  });

  it('cliquer « Désactiver » sur le pack de base n’émet aucun DELETE', async () => {
    const appels = monter([PACK_BASE, PACK_ORDINAIRE]);
    const li = await ligne(PACK_BASE.nom);

    fireEvent.click(bouton(li, /désactiver/i));

    // Laisser une chance à un appel de partir avant de conclure à son absence.
    await waitFor(() => expect(appels.length).toBeGreaterThan(0));
    expect(appels.filter(a => a.method === 'DELETE')).toEqual([]);
  });

  // Contre-épreuve indispensable : sans elle, l'assertion précédente serait
  // verte même si plus aucun bouton n'émettait jamais de DELETE.
  it('cliquer « Désactiver » sur un pack ordinaire émet bien le DELETE', async () => {
    const appels = monter([PACK_BASE, PACK_ORDINAIRE]);
    const li = await ligne(PACK_ORDINAIRE.nom);

    fireEvent.click(bouton(li, /désactiver/i));

    await waitFor(() => {
      expect(appels.filter(a => a.method === 'DELETE')).toHaveLength(1);
    });
    expect(appels.find(a => a.method === 'DELETE')?.url).toContain(PACK_ORDINAIRE.idPack);
  });

  // Hors périmètre du lot, mais mieux vaut le voir épinglé que le découvrir :
  // l'UI n'offre aucune réactivation. Un pack éteint n'a plus qu'« Modifier ».
  it('pack inactif : aucune barre d’actions, seul « Modifier » subsiste', async () => {
    monter([PACK_BASE, PACK_INACTIF]);
    const li = await ligne(PACK_INACTIF.nom);

    expect(bouton(li, /modifier/i)).toBeTruthy();
    expect(boutonAbsent(li, /désactiver/i)).toBeNull();
    expect(boutonAbsent(li, /par défaut/i)).toBeNull();
    expect(boutonAbsent(li, /réactiver|activer/i)).toBeNull();
  });
});
