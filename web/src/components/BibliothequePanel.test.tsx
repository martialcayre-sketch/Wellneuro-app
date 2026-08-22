// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { BibliothequePanel } from './BibliothequePanel';
import {
  LIBELLE_INSTRUMENT_CABINET,
  TEXTE_INSTRUMENTS_CABINET,
} from '@/lib/certification-libelles';
import type { BibliothequeEntree } from '@/lib/bibliotheque';

// Rendu des libellés de vérification de scoring — D-036 (LOT-02).
//
// POURQUOI CE FICHIER EXISTE. Le renommage de « Certifié » en « Scoring
// vérifié » était gardé par `lib/certificationLibelles.guard.test.ts` (les
// valeurs rendues par le module) et par un banc de rendu sur la fiche patient.
// La revue adversariale a montré que **la surface principale n'avait aucun rendu
// asséré** : `app/dashboard/bibliotheque/page.test.tsx` MOCKE ce composant, et
// l'E2E ne touche que le badge cabinet. Un composant qui calculerait le libellé
// par le module puis en afficherait un autre passait donc tout le CI, sur
// l'écran qui porte les 64 instruments du catalogue.
//
// Le contrôle de source du garde ne peut pas fermer ce trou : il refuse les
// ANCIENS libellés, à la casse près, donc `'Instrument certifié'` en minuscule
// lui échappe. Seul le rendu le ferme.
//
// LE LIBELLÉ N'EST QUE LA MOITIÉ DU BADGE — la seconde est sa COULEUR, et une
// première rédaction de ce fichier ne l'assérait pas. `<Badge variant="success">`
// codé en dur rendait alors « Scoring non vérifié », « Scoring ambigu » et
// « Statut inconnu » **en vert**, sans qu'aucun des 4 200 tests ne rougisse — or
// D-036 nomme les badges verts comme « ceux qui rassurent à tort ». D'où
// l'assertion sur `data-variant`, posé par `components/ui/Badge.tsx` pour cela.
//
// DEUX ATTENDUS VIENNENT DU MODULE (`LIBELLE_INSTRUMENT_CABINET`,
// `TEXTE_INSTRUMENTS_CABINET`) : ils prouvent l'ACHEMINEMENT, pas le sens. Le
// sens est épinglé au mot près par `ATTENDUS_CONSTANTES` dans
// `lib/certificationLibelles.guard.test.ts`. La preuve tient donc à DEUX
// fichiers : supprimer là-bas le test de sens rendrait ceux d'ici
// auto-réalisateurs.

const ENTREE_BASE: BibliothequeEntree = {
  id: 'Q_TEST_01',
  titre: 'Instrument de banc — scoring vérifié',
  categorie: 'Sommeil',
  duree: '5 min',
  description: null,
  nbQuestions: 10,
  scoreMax: 30,
  certifie: true,
  statutCertification: 'certifie',
  assignable: true,
  aliasVers: null,
  passationPraticien: false,
};

function entree(surcharges: Partial<BibliothequeEntree>): BibliothequeEntree {
  return { ...ENTREE_BASE, ...surcharges };
}

// LES SIX ÉTATS, dans l'ordre de `StatutCertificationRuntime`, avec leur libellé
// ET leur couleur. Attendus **écrits à la main** : les dériver du module rendrait
// ce banc vrai par construction, et il ne dirait plus rien de l'affichage.
//
// Une première rédaction n'en couvrait que quatre et annonçait « les quatre
// états servis par la liste » — doublement faux, et la mesure du lot le dit :
// sur les 65 clés du catalogue, aucune ne produit `a_verifier`, `non_score` ni
// `non_certifie` (celui-là n'existe que pour les entrées cabinet, fabriquées par
// `api/praticien/bibliotheque/route.ts`), et **21 produisent `inconnu`** — l'état
// justement absent du banc, celui du PSQI. Masquer le badge pour `inconnu` faisait
// alors perdre son badge à un tiers du catalogue, tests verts, en contredisant le
// commentaire du composant (« évite de laisser “sans badge” ambigu »).
//
// Les six y sont donc, servis ou non : l'état d'un instrument change avec le
// registre, et un banc qui ne couvre que l'état du jour cesse de garder au
// prochain.
const ENTREES: Array<{
  entree: BibliothequeEntree;
  libelleAttendu: string;
  couleurAttendue: string;
}> = [
  {
    entree: entree({ id: 'Q_VERT', titre: 'Instrument vérifié', certifie: true, statutCertification: 'certifie' }),
    libelleAttendu: 'Scoring vérifié',
    couleurAttendue: 'success',
  },
  {
    entree: entree({ id: 'Q_AMBIGU', titre: 'Instrument ambigu', certifie: false, statutCertification: 'ambigu' }),
    libelleAttendu: 'Scoring ambigu',
    couleurAttendue: 'warning',
  },
  {
    entree: entree({ id: 'Q_AVERIF', titre: 'Instrument à vérifier', certifie: false, statutCertification: 'a_verifier' }),
    libelleAttendu: 'Scoring à vérifier',
    couleurAttendue: 'warning',
  },
  {
    entree: entree({ id: 'Q_NONSCORE', titre: 'Instrument non scoré', certifie: false, statutCertification: 'non_score' }),
    libelleAttendu: 'Non scoré',
    couleurAttendue: 'neutral',
  },
  {
    entree: entree({ id: 'Q_NON', titre: 'Instrument non vérifié', certifie: false, statutCertification: 'non_certifie' }),
    libelleAttendu: 'Scoring non vérifié',
    couleurAttendue: 'neutral',
  },
  {
    // L'état de 21 instruments sur 65, PSQI compris. Le plus exposé, et le seul
    // qu'aucun banc ne voyait.
    entree: entree({ id: 'Q_INCONNU', titre: 'Instrument au statut inconnu', certifie: false, statutCertification: 'inconnu' }),
    libelleAttendu: 'Statut inconnu',
    couleurAttendue: 'neutral',
  },
];

const ENTREE_CABINET = entree({
  id: 'CAB_TEST_01',
  titre: 'Instrument du cabinet de banc',
  certifie: false,
  statutCertification: 'non_certifie',
  cabinet: { statutRelecture: 'valide' },
});

function stubFetch() {
  const ok = (data: unknown) =>
    Promise.resolve({ ok: true, status: 200, json: async () => data } as Response);
  vi.stubGlobal('fetch', (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/api/praticien/file-envoi')) return ok({ brouillons: [] });
    // Rendre `entrees: []` est délibéré : le composant ne remplace ses entrées
    // serveur que si la réponse en porte au moins une. Les entrées passées en
    // prop — celles que ce banc contrôle — restent donc affichées.
    if (url.includes('/api/praticien/bibliotheque')) return ok({ entrees: [] });
    if (url.includes('/api/praticien/instruments')) return ok({ instruments: [] });
    if (url.includes('/api/praticien/patients')) return ok({ patients: [] });
    return ok({});
  });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('BibliothequePanel — libellés de vérification de scoring (D-036)', () => {
  it('couvre les six états de `StatutCertificationRuntime`, sans en perdre un', () => {
    // Anti-vacuité : les boucles ci-dessous sont satisfaites par un tableau
    // réduit. Retirer un état sans le dire est la manière dont un banc cesse
    // silencieusement de garder — c'est le principe que le garde voisin applique
    // déjà à sa propre table.
    expect(ENTREES.map(c => c.entree.statutCertification)).toEqual([
      'certifie',
      'ambigu',
      'a_verifier',
      'non_score',
      'non_certifie',
      'inconnu',
    ]);
  });

  it.each(ENTREES)(
    'la liste du catalogue rend « $libelleAttendu » en $couleurAttendue pour $entree.id',
    async ({ entree: e, libelleAttendu, couleurAttendue }) => {
      stubFetch();
      render(<BibliothequePanel entrees={[e]} />);

      const ligne = (await screen.findByText(e.titre)).closest('li')!;
      const badge = within(ligne).getByText(libelleAttendu);
      expect(badge).toBeTruthy();
      // La COULEUR, pas seulement le mot : un `variant` codé en dur rendrait
      // « Scoring non vérifié » en vert sans rien casser d'autre.
      expect(badge.getAttribute('data-variant')).toBe(couleurAttendue);
    },
  );

  it('aucun badge du catalogue ne porte plus le mot « certifié », dans aucun état', async () => {
    // Contrôle transversal : le banc ci-dessus prouve la présence du bon
    // libellé, celui-ci refuse la coexistence de l'ancien. Les deux sont
    // nécessaires — une présence seule est satisfaite par un écran qui affiche
    // les deux, une absence seule par un écran vide.
    stubFetch();
    render(<BibliothequePanel entrees={ENTREES.map(c => c.entree)} />);

    for (const { entree: e, libelleAttendu } of ENTREES) {
      const ligne = (await screen.findByText(e.titre)).closest('li')!;
      expect(within(ligne).getByText(libelleAttendu)).toBeTruthy();
      expect(ligne.textContent ?? '').not.toMatch(/certifi/i);
    }
  });

  it('aucun état ne perd son badge — « sans badge » est aussi ambigu que le mot nu', async () => {
    // Le composant rend un badge dans TOUS les cas, `inconnu` compris
    // (`BibliothequePanel.tsx`, « évite de laisser “sans badge” ambigu sur un
    // instrument actif »). Sans cette assertion, masquer le badge des 21
    // instruments `inconnu` passait vert.
    stubFetch();
    render(<BibliothequePanel entrees={ENTREES.map(c => c.entree)} />);

    for (const { entree: e, libelleAttendu, couleurAttendue } of ENTREES) {
      const ligne = (await screen.findByText(e.titre)).closest('li')!;
      const badges = within(ligne).getAllByText(libelleAttendu);
      expect(badges.length, `${e.id} : aucun badge de vérification`).toBe(1);
      expect(badges[0].getAttribute('data-variant')).toBe(couleurAttendue);
    }
  });

  it('le badge d’un instrument du cabinet dit que son scoring n’est pas vérifié', async () => {
    stubFetch();
    render(<BibliothequePanel entrees={[ENTREE_CABINET]} />);

    const ligne = (await screen.findByText(ENTREE_CABINET.titre)).closest('li')!;
    const badge = within(ligne).getByText(LIBELLE_INSTRUMENT_CABINET);
    expect(badge).toBeTruthy();
    expect(badge.getAttribute('data-variant')).toBe('warning');
    expect(ligne.textContent ?? '').not.toMatch(/certifi/i);
  });

  it('la prose du tiroir cabinet DIT que le scoring n’est pas vérifié, pas l’inverse', async () => {
    // Le sens, pas seulement le vocabulaire : « leur scoring EST vérifié par
    // WellNeuro » ne porte pas le mot interdit et affirmerait l'inverse de
    // D-034. La constante est épinglée au mot près dans le garde du module ;
    // ici on vérifie qu'elle atteint bien l'écran.
    stubFetch();
    render(<BibliothequePanel entrees={[ENTREE_BASE]} />);

    const tiroir = await waitFor(() => screen.getByTestId('instruments-cabinet'));
    expect(within(tiroir).getByText(TEXTE_INSTRUMENTS_CABINET)).toBeTruthy();
    expect(tiroir.textContent ?? '').not.toMatch(/certifi/i);
  });
});

// ── EVA — relecture et édition d'un instrument sans interprétation (D-088) ──
//
// L'écran de relecture énumérait les bandes sans garde : sur cette famille,
// `detail.scoring.interpretation` est ABSENT en base, et le `.map` faisait
// planter le tiroir. Une section « Bandes » vide n'aurait pas été mieux — elle
// se lit comme une grille oubliée, alors que l'absence est ici le propos.
const EVA_DETAIL = {
  idInstrument: 'CAB_EVA_1',
  titre: 'EVA fatigue — cabinet',
  categorie: 'Pilotage',
  description: null,
  statutRelecture: 'grille_a_relire',
  nbQuestions: 1,
  scoreMax: 10,
  definition: {
    instructions: 'Placez le curseur là où vous vous situez aujourd’hui.',
    sections: [
      {
        id: 'S1',
        questions: [
          {
            id: 'EVA1',
            texte: 'Où en êtes-vous de votre fatigue aujourd’hui ?',
            type: 'number',
            min: 0,
            max: 10,
            unit: '/10',
          },
        ],
      },
    ],
  },
  // AUCUNE clé `interpretation` : c'est exactement ce que porte la base.
  scoring: { type: 'sum_no_interpretation', maxTotal: 10 },
};

function stubFetchEva() {
  const ok = (data: unknown) =>
    Promise.resolve({ ok: true, status: 200, json: async () => data } as Response);
  vi.stubGlobal('fetch', (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/api/praticien/file-envoi')) return ok({ brouillons: [] });
    if (url.includes('/api/praticien/bibliotheque')) return ok({ entrees: [] });
    if (url.includes('/api/praticien/instruments?id=')) return ok({ instrument: EVA_DETAIL });
    if (url.includes('/api/praticien/instruments')) {
      return ok({
        instruments: [
          {
            idInstrument: EVA_DETAIL.idInstrument,
            titre: EVA_DETAIL.titre,
            categorie: EVA_DETAIL.categorie,
            statutRelecture: EVA_DETAIL.statutRelecture,
            nbQuestions: EVA_DETAIL.nbQuestions,
            scoreMax: EVA_DETAIL.scoreMax,
          },
        ],
      });
    }
    if (url.includes('/api/praticien/patients')) return ok({ patients: [] });
    return ok({});
  });
}

describe('BibliothequePanel — EVA sans interprétation (D-088)', () => {
  it('la relecture rend les ancres et DIT l’absence d’interprétation, sans planter', async () => {
    stubFetchEva();
    render(<BibliothequePanel entrees={[ENTREE_BASE]} />);

    fireEvent.click(await screen.findByText('Relire la grille'));

    // L'énoncé et ses ancres — ce qui se relit ici, à défaut de grille.
    expect(await screen.findByText('Énoncés et ancres')).toBeTruthy();
    expect(screen.getByText('Où en êtes-vous de votre fatigue aujourd’hui ?')).toBeTruthy();
    expect(screen.getByText('0–10 /10')).toBeTruthy();

    // La déclaration, au mot près : l'absence est dite, pas laissée à deviner.
    expect(
      screen.getByText(
        'Aucune interprétation : cet instrument pilote la conversation, il ne classe pas.',
      ),
    ).toBeTruthy();

    // Aucune section de bandes, aucune bande d'attente.
    expect(screen.queryByText('Bandes d’interprétation')).toBeNull();
    expect(screen.queryByText(/Grille à définir/)).toBeNull();

    // Le bouton ne promet plus une grille relue : il n'y en a pas.
    expect(screen.getByText('Relu — publier')).toBeTruthy();
    expect(screen.queryByText('Grille relue — publier')).toBeNull();
  });

  it('l’éditeur refuse cette famille au lieu de lui poser une amorce de bande', async () => {
    stubFetchEva();
    render(<BibliothequePanel entrees={[ENTREE_BASE]} />);

    fireEvent.click(await screen.findByText('Modifier'));

    expect(await screen.findByText(/L’éditeur de questionnaire ne le modifie pas/)).toBeTruthy();
    // C'EST LE PIÈGE DU LOT : l'amorce de l'éditeur pose une bande unique
    // « Grille à définir — relecture requise », colorée `warning`. Sur un
    // instrument qui ne classe pas, ce libellé serait un verdict.
    expect(screen.queryByDisplayValue('Grille à définir — relecture requise')).toBeNull();
    expect(screen.queryByText(/Bandes d’interprétation/)).toBeNull();
    expect(screen.queryByLabelText('Libellé de la bande 1')).toBeNull();
  });
});
