// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildValidationErgoC1Fixture } from '@/lib/clinical-engine/validationErgoFixture';
import { DecisionSummaryCard } from './DecisionSummaryCard';

// LA MESURE DE « Voir les sources et limites » — bancs de COMPORTEMENT.
//
// POURQUOI UN FICHIER À PART. `DecisionSummaryCard.test.tsx` monte la carte
// sans `fetch` : lui greffer un espion global ferait porter à ses onze cas une
// dépendance qui n'est pas la leur. Ici, `fetch` EST le sujet.
//
// CE QUI EST VÉRIFIÉ N'EST PAS « la fonction est appelée » MAIS CE QUI PART SUR
// LE RÉSEAU — corps compris. Un composant qui appellerait bien `envoyerMesure`
// en lui passant la mauvaise espèce inverserait numérateur et dénominateur, et
// un espion posé sur le module ne le verrait pas.

afterEach(cleanup);

const ROUTE = '/api/praticien/mesure/ouverture-sources';

let envois: string[];

beforeEach(() => {
  envois = [];
  vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
    if (String(url) === ROUTE) envois.push(String(init?.body ?? ''));
    return Promise.resolve(new Response(null, { status: 201 }));
  }));
});

afterEach(() => { vi.unstubAllGlobals(); });

const especes = () => envois.map(corps => JSON.parse(corps).espece as string);

function carte() {
  const { decisionCard } = buildValidationErgoC1Fixture();
  return decisionCard;
}

describe('le compteur d’ouverture de « Voir les sources et limites »', () => {
  it('LE DÉNOMINATEUR PART AU MONTAGE, une seule fois', () => {
    render(<DecisionSummaryCard decisionCard={carte()} mesurable />);
    expect(especes()).toEqual(['affichage']);
  });

  it('UN RE-RENDU NE RECOMPTE PAS — sinon le taux s’écrase vers zéro', () => {
    // Un parent qui se met à jour, une sélection praticien qui change : sans le
    // garde de `ref`, chaque rendu gonflerait le dénominateur.
    const { rerender } = render(<DecisionSummaryCard decisionCard={carte()} mesurable />);
    rerender(<DecisionSummaryCard decisionCard={carte()} mesurable titre="Rappel" />);
    rerender(<DecisionSummaryCard decisionCard={carte()} mesurable titre="Rappel bis" />);
    expect(especes()).toEqual(['affichage']);
  });

  it('LE NUMÉRATEUR PART AU DÉPLIEMENT, et le corps nomme la bonne espèce', () => {
    render(<DecisionSummaryCard decisionCard={carte()} mesurable />);
    fireEvent.click(screen.getByText(/Voir les sources et limites/i));
    expect(especes()).toEqual(['affichage', 'ouverture']);
  });

  it('LE REPLI NE COMPTE PAS — on ne referme pas ce qu’on n’a pas ouvert', () => {
    // Compter les deux sens ferait un nombre qui ne se rapporte à rien : le
    // quotient dépasserait 1 dès le premier aller-retour.
    render(<DecisionSummaryCard decisionCard={carte()} mesurable />);
    const bouton = screen.getByText(/Voir les sources et limites/i);
    fireEvent.click(bouton);
    fireEvent.click(bouton);
    expect(especes()).toEqual(['affichage', 'ouverture']);
    fireEvent.click(bouton);
    expect(especes()).toEqual(['affichage', 'ouverture', 'ouverture']);
  });

  it('UNE CARTE QUI S’ABSTIENT NE COMPTE AUCUN AFFICHAGE', () => {
    // Le dénominateur inclurait des rendus dont le numérateur est
    // STRUCTURELLEMENT impossible : il n'y a pas de panneau à déplier, et le
    // taux baisserait à mesure que des dossiers non préparés s'ouvrent.
    render(<DecisionSummaryCard decisionCard={null} mesurable />);
    expect(screen.getByText(/Décision clinique non préparée/)).toBeTruthy();
    expect(envois).toEqual([]);
  });

  it('LA MESURE EST FERMÉE PAR DÉFAUT — un montage non déclaré ne compte pas', () => {
    // LA CARTE SE MONTE DEUX FOIS SUR UNE MÊME PAGE (rubrique de phase, puis
    // rappel à côté du constructeur de protocole) et un troisième site viendra.
    // Ouvert par défaut, chaque nouveau montage gonflerait le dénominateur en
    // silence et ferait baisser un taux déjà publié, sans décision de personne.
    render(<DecisionSummaryCard decisionCard={carte()} />);
    fireEvent.click(screen.getByText(/Voir les sources et limites/i));
    expect(envois).toEqual([]);
    // Et le panneau se déplie quand même : la mesure n'est pas une condition
    // d'affichage.
    expect(screen.getByText(/Priorité fictive préparée/)).toBeTruthy();
  });

  it('LA MESURE N’ENVOIE NI DOSSIER NI PRATICIEN', () => {
    render(<DecisionSummaryCard decisionCard={carte()} mesurable />);
    fireEvent.click(screen.getByText(/Voir les sources et limites/i));
    for (const corps of envois) {
      expect(Object.keys(JSON.parse(corps))).toEqual(['espece']);
    }
  });

  it('FAIL-OPEN : un réseau qui REJETTE ne casse ni le rendu ni le dépliement', () => {
    // `fetch` rend une promesse REJETÉE sur panne réseau, pas un `ok: false` —
    // c'est le cas qu'un `.then(r => r.ok)` manque. Une mesure qui empêcherait
    // de lire les sources et limites d'une décision clinique renverserait
    // complètement l'ordre des choses ([[D-146]]).
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('réseau coupé'))));
    render(<DecisionSummaryCard decisionCard={carte()} mesurable />);
    fireEvent.click(screen.getByText(/Voir les sources et limites/i));
    // Le détail est déplié malgré la panne : le contenu du panneau est là.
    expect(screen.getByText(/Priorité fictive préparée/)).toBeTruthy();
  });

  it('AUCUN REJET NON TRAITÉ NE S’ÉCHAPPE — le `.catch` est porteur', async () => {
    // MUTATION QUI A SURVÉCU À LA PREMIÈRE RÉDACTION. Retirer le `.catch(() =>
    // {})` d'`envoyerMesure` laissait les huit cas verts : le panneau s'ouvre
    // quand même, donc « fail-open » restait vrai à l'écran. Ce qui casse est
    // AILLEURS — un `unhandledRejection` par coupure réseau remonte au
    // rapporteur d'erreurs et y ouvre un incident pour une mesure qui n'a aucune
    // importance. Un compteur ne doit pas pouvoir déclencher d'alerte.
    //
    // Le cas écoute donc le signal RÉEL plutôt que ses conséquences visibles.
    const rejets: unknown[] = [];
    const capter = (raison: unknown) => { rejets.push(raison); };
    process.on('unhandledRejection', capter);
    try {
      // FONCTION NUE, PAS `vi.fn` — ET C'EST LA CLÉ DE CE CAS. `vi.fn` attache
      // ses propres `then`/`catch` au promise rendu pour alimenter
      // `mock.results` : le rejet devient TRAITÉ par le mock lui-même, et ce cas
      // reste vert même sans le `.catch` d'`envoyerMesure`. La mutation a
      // survécu une fois ainsi. L'outil de mesure ne doit pas réparer ce qu'il
      // mesure.
      vi.stubGlobal('fetch', () => Promise.reject(new Error('réseau coupé')));
      render(<DecisionSummaryCard decisionCard={carte()} mesurable />);
      fireEvent.click(screen.getByText(/Voir les sources et limites/i));
      // Node ne signale un rejet non traité qu'après la file de microtâches :
      // un `await` unique le manquerait.
      await new Promise(resolve => setTimeout(resolve, 0));
      await new Promise(resolve => setTimeout(resolve, 0));
    } finally {
      process.off('unhandledRejection', capter);
    }
    expect(rejets).toEqual([]);
  });

  it('FAIL-OPEN : `fetch` absent ne casse rien non plus', () => {
    vi.stubGlobal('fetch', undefined);
    expect(() => render(<DecisionSummaryCard decisionCard={carte()} mesurable />)).not.toThrow();
    expect(() => fireEvent.click(screen.getByText(/Voir les sources et limites/i))).not.toThrow();
  });
});
