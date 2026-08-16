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

// Pack portant un instrument SUSPENDU hérité (le cas réel du pack de base et
// de `Q_ALI_09`). C'est le seul pack depuis lequel la modale doit offrir un
// retrait.
const PACK_AVEC_SUSPENDU: PackFixture = {
  idPack: 'PACK_TEST_HERITE',
  nom: 'Hérité (test)',
  thematique: null,
  description: null,
  qids: ['Q_TEST_01', 'Q_TEST_SUSPENDU'],
  actif: true,
  parDefaut: false,
};

// Deux suspendus servis par l'API : l'un présent dans le pack, l'autre non.
// Sans le second, le cas (c) ne pourrait pas distinguer « filtré sur
// l'instantané » de « la liste des suspendus est vide ».
const SUSPENDU_PRESENT = { id: 'Q_TEST_SUSPENDU', titre: 'Instrument suspendu de test' };
const SUSPENDU_ABSENT = { id: 'Q_TEST_SUSPENDU_AUTRE', titre: 'Autre instrument suspendu' };

const QUESTIONNAIRE = {
  id: 'Q_TEST_01',
  titre: 'Questionnaire de test',
  categorie: 'Test',
  duree: '5 min',
  categorieFonctionnellePrincipale: 'test',
  categoriesFonctionnellesSecondaires: [] as string[],
  packsRecommandes: [] as string[],
  phase: 'mvp' as const,
  passationPraticien: false,
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
function stubFetch(packs: PackFixture[], suspendus: { id: string; titre: string }[] = []) {
  const appels: { url: string; method?: string; body?: string }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: { method?: string; body?: string }) => {
      appels.push({ url: String(url), method: init?.method, body: init?.body });
      if (init?.method === 'DELETE' || init?.method === 'PATCH') {
        return { ok: true, json: async () => ({ success: true }) } as unknown as Response;
      }
      // Le panneau charge lui-même les instruments suspendus : ils ne peuvent
      // pas arriver par la prop `questionnaires`, qui ne porte que les actifs.
      if (String(url).includes('/api/praticien/questionnaires')) {
        return { ok: true, json: async () => ({ questionnaires: [], suspendus }) } as unknown as Response;
      }
      return { ok: true, json: async () => ({ packs }) } as unknown as Response;
    }),
  );
  return appels;
}

function monter(packs: PackFixture[], suspendus: { id: string; titre: string }[] = []) {
  const appels = stubFetch(packs, suspendus);
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

// ── Retrait d'un instrument suspendu depuis la modale d'édition ──────────────
//
// Avant ce lot, un qid suspendu présent dans un pack était INAMOVIBLE : la
// route `/api/praticien/questionnaires` filtre `actif`, donc aucune case à
// cocher ne le représentait, et la soumission renvoyait `pack.qids` en entier —
// le suspendu repartait à chaque enregistrement.
//
// L'asymétrie « retirable mais pas ajoutable » ne vient d'aucune garde : le
// bloc est bâti sur l'INSTANTANÉ des qids pris à l'ouverture de la modale, donc
// un suspendu absent du pack n'y figure jamais. C'est le cas (c) qui l'épingle.

/** Ouvre la modale d'édition sur le pack nommé et rend son conteneur. */
async function ouvrirModale(nom: string): Promise<HTMLElement> {
  const li = await ligne(nom);
  fireEvent.click(bouton(li, /modifier/i));
  const titre = await screen.findByText(/modifier un pack de questionnaires/i);
  const modale = titre.closest('div')?.parentElement;
  if (!modale) throw new Error('Modale d’édition introuvable');
  return modale as HTMLElement;
}

/** La case à cocher portée par le label qui contient ce texte. */
function caseDuLabel(racine: HTMLElement, texte: RegExp): HTMLInputElement | null {
  const libelle = within(racine).queryByText(texte);
  const label = libelle?.closest('label');
  return (label?.querySelector('input[type="checkbox"]') as HTMLInputElement) ?? null;
}

describe('PacksPanel — retirer un instrument suspendu d’un pack', () => {
  beforeEach(() => vi.clearAllMocks());

  it('(a) un suspendu PRÉSENT dans le pack est rendu dans la modale, avec une case à cocher', async () => {
    monter([PACK_AVEC_SUSPENDU], [SUSPENDU_PRESENT, SUSPENDU_ABSENT]);
    const modale = await ouvrirModale(PACK_AVEC_SUSPENDU.nom);

    await waitFor(() => {
      expect(within(modale).queryByText(SUSPENDU_PRESENT.titre)).not.toBeNull();
    });

    const coche = caseDuLabel(modale, new RegExp(SUSPENDU_PRESENT.titre));
    expect(coche).not.toBeNull();
    // Coché : il est dans le pack. C'est le décochage qui vaut retrait.
    expect(coche!.checked).toBe(true);
  });

  it('(b) le décocher puis enregistrer émet un PATCH dont `qids` ne le contient plus', async () => {
    const appels = monter([PACK_AVEC_SUSPENDU], [SUSPENDU_PRESENT, SUSPENDU_ABSENT]);
    const modale = await ouvrirModale(PACK_AVEC_SUSPENDU.nom);

    await waitFor(() => {
      expect(within(modale).queryByText(SUSPENDU_PRESENT.titre)).not.toBeNull();
    });

    const coche = caseDuLabel(modale, new RegExp(SUSPENDU_PRESENT.titre))!;
    fireEvent.click(coche);

    // La ligne SURVIT au décochage : le bloc est bâti sur l'instantané, pas sur
    // la sélection courante. Sans cela le geste serait irréversible dans la
    // modale — on ne pourrait plus recocher ce qu'on vient de décocher.
    expect(within(modale).queryByText(SUSPENDU_PRESENT.titre)).not.toBeNull();
    expect(caseDuLabel(modale, new RegExp(SUSPENDU_PRESENT.titre))!.checked).toBe(false);

    fireEvent.click(within(modale).getByRole('button', { name: /enregistrer les modifications/i }));

    await waitFor(() => {
      expect(appels.filter(a => a.method === 'PATCH')).toHaveLength(1);
    });
    const corps = JSON.parse(appels.find(a => a.method === 'PATCH')!.body as string);
    expect(corps.idPack).toBe(PACK_AVEC_SUSPENDU.idPack);
    // Les deux assertions : le suspendu est parti, et le reste du pack a suivi.
    expect(corps.qids).not.toContain(SUSPENDU_PRESENT.id);
    expect(corps.qids).toContain('Q_TEST_01');
  });

  it('(c) un suspendu ABSENT du pack n’est jamais rendu dans la modale', async () => {
    monter([PACK_AVEC_SUSPENDU], [SUSPENDU_PRESENT, SUSPENDU_ABSENT]);
    const modale = await ouvrirModale(PACK_AVEC_SUSPENDU.nom);

    // Attendre que le bloc soit peuplé, sinon l'absence serait celle du
    // chargement et non celle du filtre.
    await waitFor(() => {
      expect(within(modale).queryByText(SUSPENDU_PRESENT.titre)).not.toBeNull();
    });

    expect(within(modale).queryByText(SUSPENDU_ABSENT.titre)).toBeNull();
    expect(screen.queryByText(SUSPENDU_ABSENT.titre)).toBeNull();
  });

  // (d) L'INSTANTANÉ est réécrit à chaque ouverture, jamais accumulé. Les cas
  // (a) à (c) n'ouvrent la modale qu'UNE fois : une mutation qui remplacerait
  // `setEditQidsInitiaux(new Set(pack.qids))` par
  // `setEditQidsInitiaux(prev => new Set([...prev, ...pack.qids]))` les
  // laisserait tous verts, tout en faisant fuiter le suspendu d'un pack dans la
  // modale du pack suivant — c'est-à-dire en le rendant AJOUTABLE là où il
  // n'était pas.
  it('(d) rouvrir la modale sur un AUTRE pack après un enregistrement ne conserve pas le suspendu du précédent', async () => {
    const appels = monter([PACK_AVEC_SUSPENDU, PACK_ORDINAIRE], [SUSPENDU_PRESENT, SUSPENDU_ABSENT]);

    const premiere = await ouvrirModale(PACK_AVEC_SUSPENDU.nom);
    await waitFor(() => {
      expect(within(premiere).queryByText(SUSPENDU_PRESENT.titre)).not.toBeNull();
    });

    // Fermer par ENREGISTREMENT, pas par « Fermer » ni « Annuler » : ces deux-là
    // repassent par `onCancelEditPack`, qui remet l'instantané à vide et
    // masquerait donc une accumulation. Le chemin nominal — je modifie un pack,
    // je sauve, j'en ouvre un autre — ne le remet pas.
    fireEvent.click(within(premiere).getByRole('button', { name: /enregistrer les modifications/i }));
    await waitFor(() => {
      expect(appels.filter(a => a.method === 'PATCH')).toHaveLength(1);
    });
    await waitFor(() => {
      expect(screen.queryByText(/modifier un pack de questionnaires/i)).toBeNull();
    });

    const seconde = await ouvrirModale(PACK_ORDINAIRE.nom);
    // Le pack ordinaire ne porte aucun suspendu : ni la ligne, ni le bloc qui
    // la porte ne doivent exister.
    expect(within(seconde).queryByText(SUSPENDU_PRESENT.titre)).toBeNull();
    expect(screen.queryByText(SUSPENDU_PRESENT.titre)).toBeNull();
    expect(screen.queryByText(/ces instruments sont/i)).toBeNull();
  });
});

// ── Non-contamination du compte annoncé ─────────────────────────────────────
//
// `titreParId` est bâti sur la prop `questionnaires` SEULE (les actifs). C'est
// lui qui décide du compteur de la ligne de pack, du badge « Non envoyé » et du
// libellé du `<select>` d'assignation. Le fondre avec `suspendus` — « pour
// afficher un titre au lieu d'un qid nu » — rétablirait le contresens
// « 6 annoncés / 5 envoyés » que ces trois affichages existent pour empêcher.
// Aucun autre banc ne rougirait.
describe('PacksPanel — un suspendu ne compte pas comme un questionnaire envoyé', () => {
  beforeEach(() => vi.clearAllMocks());

  it('le pack portant un suspendu annonce 1 questionnaire, un badge « Non envoyé », et « (1) » à l’assignation', async () => {
    monter([PACK_AVEC_SUSPENDU], [SUSPENDU_PRESENT, SUSPENDU_ABSENT]);

    // La liste des suspendus doit être CHARGÉE avant d'asserter — sinon le
    // compte juste serait celui d'un `suspendus` encore vide, et la mutation
    // passerait au vert. Ouvrir puis refermer la modale le prouve : le titre du
    // suspendu n'y apparaît qu'une fois la réponse arrivée.
    const modale = await ouvrirModale(PACK_AVEC_SUSPENDU.nom);
    await waitFor(() => {
      expect(within(modale).queryByText(SUSPENDU_PRESENT.titre)).not.toBeNull();
    });
    fireEvent.click(within(modale).getByRole('button', { name: /^fermer$/i }));
    await waitFor(() => {
      expect(screen.queryByText(/modifier un pack de questionnaires/i)).toBeNull();
    });

    const li = await ligne(PACK_AVEC_SUSPENDU.nom);

    // Le pack stocke 2 qids ; un seul est envoyable.
    expect(li.textContent).toContain('1 questionnaire(s)');
    expect(li.textContent).not.toContain('2 questionnaire(s)');
    expect(within(li).getByText('Non envoyé')).toBeTruthy();
    // Le qid suspendu est nommé tel quel, sans titre : il n'est pas dans
    // `titreParId`.
    expect(li.textContent).toContain(SUSPENDU_PRESENT.id);
    expect(li.textContent).not.toContain(SUSPENDU_PRESENT.titre);

    // Le compte annoncé au moment de choisir est celui qui partira.
    const options = Array.from(document.querySelectorAll('option')).map(o => o.textContent);
    expect(options).toContain(`${PACK_AVEC_SUSPENDU.nom} (1)`);
    expect(options).not.toContain(`${PACK_AVEC_SUSPENDU.nom} (2)`);
  });
});
