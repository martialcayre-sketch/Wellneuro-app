// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AgendaAlimentaireJournal, motifAujourdHuiNonNotable } from './AgendaAlimentaireJournal';
import { calculerFenetreAliDepuisDates } from '@/lib/agenda-alimentaire/fenetre';
import type { JourReponses } from '@/lib/agenda-alimentaire/types';

// Ce que ces tests protègent :
//
//  1. les DEUX INVARIANTS QUI VIENNENT DE TOMBER — `emplacements[0].renseignee`
//     n'est plus nécessairement vrai, et `dateDebut !== null` n'implique plus
//     `jours.length > 0`. Un écran qui déduit « il y a une fenêtre donc il y a
//     une journée » casse sur un agenda dont toutes les lignes sont en
//     quarantaine ;
//  2. l'ouverture DIRECTE en saisie quand la journée du jour n'est pas notée ;
//  3. l'absence de tout agrégat et de tout bouton de clôture ;
//  4. le message de refus du serveur rendu tel quel, jamais réinventé ;
//  5. LE CHEMIN DE CORRECTION — le bouton n'apparaît que là où la route accepte
//     l'écriture, le formulaire s'ouvre pré-rempli, l'envoi porte le
//     `supersedesJourId` rendu par le GET, et un 409 de course recharge l'écran
//     au lieu de laisser un formulaire condamné à échouer.

const AUJOURD_HUI = '2026-08-10';

/** Réponses par défaut d'une journée notée : la forme la plus courte du contrat. */
const REPONSES_MINIMALES: JourReponses = { aucunePrise: true };

function reponse(body: unknown, status = 200) {
  return Promise.resolve({ status, json: () => Promise.resolve(body) } as Response);
}

function corpsGet(surcharge: Record<string, unknown> = {}) {
  const dates = (surcharge.datesNotees as string[] | undefined) ?? [];
  const datesIllisibles = (surcharge.datesIllisibles as string[] | undefined) ?? [];
  const reponsesParDate = (surcharge.reponsesParDate as Record<string, JourReponses> | undefined) ?? {};
  const fenetre = calculerFenetreAliDepuisDates([...dates], AUJOURD_HUI, { datesIllisibles });
  return {
    ok: true,
    fenetre,
    // `id` = tête de chaîne active de la date. Le GET le rend depuis L4b ; c'est
    // la seule valeur que le POST accepte comme `supersedesJourId`.
    jours: dates.map((d, i) => ({
      id: `jour_${i + 1}`,
      dateJour: d,
      reponses: reponsesParDate[d] ?? REPONSES_MINIMALES,
    })),
    derniereJournee: null,
    statutReponses: 'non_rempli',
    aujourdHui: AUJOURD_HUI,
    illisibles: datesIllisibles.length,
    ...('statutReponses' in surcharge ? { statutReponses: surcharge.statutReponses } : {}),
  };
}

function monterAvec(corps: unknown) {
  const fetchMock = vi.fn().mockImplementation(() => reponse(corps));
  vi.stubGlobal('fetch', fetchMock);
  render(<AgendaAlimentaireJournal idAssignation="ASS_TEST" onRetourHub={() => {}} />);
  return fetchMock;
}

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('les invariants tombés', () => {
  it('survit à `jours: []` avec une `dateDebut` non nulle (toutes les lignes en quarantaine)', async () => {
    const corps = corpsGet({ datesIllisibles: ['2026-08-01', AUJOURD_HUI] });
    expect(corps.fenetre.dateDebut).toBe('2026-08-01');
    expect(corps.jours).toHaveLength(0);
    monterAvec(corps);
    // La frise s'affiche, le compte vaut zéro, et rien ne plante.
    expect(await screen.findByText(/0 journée notée sur 21/i)).toBeTruthy();
  });

  it('ne suppose pas que le premier emplacement est renseigné', async () => {
    const corps = corpsGet({
      datesIllisibles: ['2026-08-01'],
      datesNotees: ['2026-08-03', AUJOURD_HUI],
    });
    expect(corps.fenetre.dateDebut).toBe('2026-08-01');
    expect(corps.fenetre.emplacements[0].renseignee).toBe(false);
    expect(corps.fenetre.emplacements[0].illisible).toBe(true);
    monterAvec(corps);
    expect(await screen.findByText(/2 journées notées sur 21/i)).toBeTruthy();
  });
});

describe('aiguillage des trois modes', () => {
  it('ouvre DIRECTEMENT en saisie quand la journée du jour n’est pas notée', async () => {
    monterAvec(corpsGet({ datesNotees: ['2026-08-09'] }));
    expect(await screen.findByRole('button', { name: /ajouter une prise/i })).toBeTruthy();
  });

  it('rend la frise quand la journée du jour est déjà notée, SANS ouvrir le formulaire d’office', async () => {
    // Corriger est un geste délibéré : l'écran rend la frise et un bouton, pas
    // un formulaire pré-rempli à chaque rechargement.
    monterAvec(corpsGet({ datesNotees: ['2026-08-09', AUJOURD_HUI] }));
    expect(await screen.findByRole('button', { name: /modifier ma journée/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /ajouter une prise/i })).toBeNull();
  });

  it('propose de noter la veille tant qu’elle est libre', async () => {
    monterAvec(corpsGet({ datesNotees: ['2026-08-08', AUJOURD_HUI] }));
    expect(await screen.findByRole('button', { name: /noter la journée d’hier/i })).toBeTruthy();
  });

  it('un agenda clôturé rend la frise en consultation, sans aucune saisie', async () => {
    monterAvec(corpsGet({ datesNotees: ['2026-08-09'], statutReponses: 'verrouille' }));
    expect(await screen.findByText(/merci pour vos trois semaines/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /ajouter une prise/i })).toBeNull();
  });

  it('`modification_demandee` est clos au même titre que `verrouille`', async () => {
    monterAvec(corpsGet({ datesNotees: ['2026-08-09'], statutReponses: 'modification_demandee' }));
    expect(await screen.findByText(/merci pour vos trois semaines/i)).toBeTruthy();
  });
});

describe('ce que l’écran ne montre jamais', () => {
  it('n’offre aucun bouton de clôture patient — aucune route de clôture n’existe', async () => {
    monterAvec(corpsGet({ datesNotees: ['2026-08-09', AUJOURD_HUI] }));
    await screen.findByRole('button', { name: /modifier ma journée/i });
    expect(screen.queryByRole('button', { name: /transmettre|terminer/i })).toBeNull();
  });

  it('n’affiche aucun agrégat : le seul chiffre est un compte de saisies', async () => {
    monterAvec(corpsGet({ datesNotees: ['2026-08-09', AUJOURD_HUI] }));
    await screen.findByRole('button', { name: /modifier ma journée/i });
    const texte = document.body.textContent ?? '';
    expect(texte).not.toMatch(/moyenne|médiane|jeûne|indice|score|tendance|régularité/i);
    expect(texte).not.toMatch(/gramme|kcal|calorie|portion/i);
  });
});

describe('refus du serveur', () => {
  it('rend le message du serveur tel quel plutôt qu’un message maison', async () => {
    const corps = corpsGet({ datesNotees: ['2026-08-09'] });
    const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) =>
      init?.method === 'POST'
        ? reponse(
            {
              ok: false,
              reason: 'hors_fenetre_21j',
              error:
                'Votre période de recueil de 21 jours est écoulée : cette journée n’en fait pas partie.',
            },
            409,
          )
        : reponse(corps),
    );
    vi.stubGlobal('fetch', fetchMock);
    render(<AgendaAlimentaireJournal idAssignation="ASS_TEST" onRetourHub={() => {}} />);

    fireEvent.click(await screen.findByRole('button', { name: /ajouter une prise/i }));
    fireEvent.click(screen.getByRole('button', { name: /protéines à votre première prise \?\s*oui/i }));
    fireEvent.click(screen.getByRole('button', { name: /légumes à au moins deux prises \?\s*oui/i }));
    fireEvent.click(screen.getByRole('button', { name: /fruits ou des fruits à coque \?\s*oui/i }));
    fireEvent.click(screen.getByRole('button', { name: /produits ultra-transformés \?\s*non/i }));
    fireEvent.click(screen.getByRole('button', { name: /c’est noté/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toMatch(/période de recueil de 21 jours/i),
    );
  });

  it('une erreur de chargement propose de réessayer, en français', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => Promise.reject(new Error('boom'))),
    );
    render(<AgendaAlimentaireJournal idAssignation="ASS_TEST" onRetourHub={() => {}} />);
    expect(await screen.findByText(/connexion interrompue/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /réessayer/i })).toBeTruthy();
  });
});

/**
 * ── LE CHEMIN DE CORRECTION ──────────────────────────────────────────────────
 * La route accepte de rejouer une journée notée à condition que le POST porte un
 * `supersedesJourId` désignant sa tête de chaîne active. Tant que le GET ne
 * rendait pas cet `id`, le geste était inatteignable et le bouton avait été
 * retiré. Ces tests épinglent les deux moitiés : OÙ le bouton apparaît, et CE
 * QU'IL ENVOIE.
 */
describe('correction d’une journée déjà notée', () => {
  const posterEtRepondre = (corps: unknown, reponsePost: unknown, statutPost = 201) => {
    const fetchMock = vi
      .fn()
      .mockImplementation((_url: string, init?: RequestInit) =>
        init?.method === 'POST' ? reponse(reponsePost, statutPost) : reponse(corps),
      );
    vi.stubGlobal('fetch', fetchMock);
    render(<AgendaAlimentaireJournal idAssignation="ASS_TEST" onRetourHub={() => {}} />);
    return fetchMock;
  };

  const corpsPoste = (fetchMock: ReturnType<typeof vi.fn>): Record<string, unknown> => {
    const appel = fetchMock.mock.calls.find(
      (c) => (c[1] as RequestInit | undefined)?.method === 'POST',
    );
    return JSON.parse((appel?.[1] as RequestInit).body as string) as Record<string, unknown>;
  };

  it('offre « Modifier ma journée » quand la journée du jour est notée', async () => {
    monterAvec(corpsGet({ datesNotees: ['2026-08-09', AUJOURD_HUI] }));
    expect(await screen.findByRole('button', { name: /modifier ma journée/i })).toBeTruthy();
  });

  it('n’offre PAS la correction sur une journée en QUARANTAINE — le motif reste distinct', async () => {
    // Toute écriture sur cette date est refusée en 409 `agenda_illisible`, la
    // correction comprise : proposer le geste serait proposer un refus.
    monterAvec(corpsGet({ datesNotees: ['2026-08-09'], datesIllisibles: [AUJOURD_HUI] }));
    // `findAllBy…` : la carte de motif est un div dans un div, tous deux
    // porteurs du même texte — `findByText` y verrait deux éléments.
    expect(await screen.findAllByText(/pas pu relire/i)).not.toHaveLength(0);
    expect(screen.queryByRole('button', { name: /modifier ma journée/i })).toBeNull();
  });

  it('n’offre PAS la correction HORS des 21 jours — la borne porte sur la date, pas sur l’état', async () => {
    monterAvec(corpsGet({ datesNotees: ['2026-07-01'] }));
    expect(await screen.findAllByText(/période de recueil de 21 jours est écoulée/i)).not.toHaveLength(0);
    expect(screen.queryByRole('button', { name: /modifier ma journée/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /corriger la journée d’hier/i })).toBeNull();
  });

  it('propose de CORRIGER la veille quand elle est déjà notée', async () => {
    monterAvec(corpsGet({ datesNotees: ['2026-08-09', AUJOURD_HUI] }));
    expect(await screen.findByRole('button', { name: /corriger la journée d’hier/i })).toBeTruthy();
  });

  it('ouvre le formulaire PRÉ-REMPLI — une abstention `null` se réaffiche en abstention', async () => {
    // Le piège nommé du lot : `null` est la réponse « je ne sais pas », pas une
    // absence. Relu par `if (x)` ou `!x`, il se réafficherait en « Non » — et le
    // patient renverrait une réponse qu'il n'a jamais donnée.
    monterAvec(
      corpsGet({
        datesNotees: [AUJOURD_HUI],
        reponsesParDate: {
          [AUJOURD_HUI]: {
            prises: [{ heure: '08:00', nature: 'repas' }],
            premierePriseProteines: true,
            legumesDeuxPrises: null,
            fruitsOuOleagineux: false,
            ultraTransformes: false,
          } satisfies JourReponses,
        },
      }),
    );
    fireEvent.click(await screen.findByRole('button', { name: /modifier ma journée/i }));

    expect(screen.getByTestId('prise-08:00')).toBeTruthy();
    const enfonce = (motif: RegExp) =>
      screen.getByRole('button', { name: motif }).getAttribute('aria-pressed');
    expect(enfonce(/protéines à votre première prise \?\s*oui/i)).toBe('true');
    // L'abstention, et surtout PAS « Non ».
    expect(enfonce(/légumes à au moins deux prises \?\s*je ne sais pas/i)).toBe('true');
    expect(enfonce(/légumes à au moins deux prises \?\s*non/i)).toBe('false');
    expect(enfonce(/produits ultra-transformés \?\s*non/i)).toBe('true');
    // Pré-rempli = envoyable sans rien retoucher.
    expect((screen.getByRole('button', { name: /corriger ✓/i }) as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it('envoie le `supersedesJourId` rendu par le GET pour cette date', async () => {
    const fetchMock = posterEtRepondre(
      corpsGet({ datesNotees: ['2026-08-09', AUJOURD_HUI] }),
      { ok: true, jourId: 'jour_neuf' },
    );
    fireEvent.click(await screen.findByRole('button', { name: /modifier ma journée/i }));
    fireEvent.click(screen.getByRole('button', { name: /corriger ✓/i }));

    await waitFor(() => expect(corpsPoste(fetchMock).supersedesJourId).toBe('jour_2'));
    expect(corpsPoste(fetchMock).dateJour).toBe(AUJOURD_HUI);
  });

  it('corrige la VEILLE avec l’identifiant de la veille, jamais celui du jour', async () => {
    const fetchMock = posterEtRepondre(
      corpsGet({ datesNotees: ['2026-08-09', AUJOURD_HUI] }),
      { ok: true, jourId: 'jour_neuf' },
    );
    fireEvent.click(await screen.findByRole('button', { name: /corriger la journée d’hier/i }));
    fireEvent.click(screen.getByRole('button', { name: /corriger ✓/i }));

    await waitFor(() => expect(corpsPoste(fetchMock).supersedesJourId).toBe('jour_1'));
    expect(corpsPoste(fetchMock).dateJour).toBe('2026-08-09');
  });

  it('une saisie INITIALE reste vierge et n’envoie AUCUN `supersedesJourId`', async () => {
    // NON-RÉGRESSION. La doctrine « rien n'est pré-coché » vise la saisie
    // initiale : le pré-remplissage est réservé à la correction, et un
    // `supersedesJourId` sur une date vierge serait refusé en 409.
    const fetchMock = posterEtRepondre(corpsGet({ datesNotees: ['2026-08-09'] }), {
      ok: true,
      jourId: 'jour_neuf',
    });
    await screen.findByRole('button', { name: /ajouter une prise/i });
    expect(
      screen.getAllByRole('button').filter((b) => b.getAttribute('aria-pressed') === 'true'),
    ).toHaveLength(0);
    expect(screen.queryByTestId('prise-08:00')).toBeNull();

    fireEvent.click(screen.getByLabelText(/rien mangé ni bu de sucré/i));
    fireEvent.click(screen.getByRole('button', { name: /c’est noté ✓/i }));

    await waitFor(() => expect(corpsPoste(fetchMock).dateJour).toBe(AUJOURD_HUI));
    expect('supersedesJourId' in corpsPoste(fetchMock)).toBe(false);
  });

  it('un 409 de course rend le message du serveur PUIS recharge — jamais un formulaire condamné', async () => {
    // Deux appareils : la tête de chaîne a changé entre le GET et le POST. Le
    // formulaire ouvert porte un identifiant périmé ; le renvoyer échouerait à
    // l'identique, indéfiniment.
    const fetchMock = posterEtRepondre(
      corpsGet({ datesNotees: ['2026-08-09', AUJOURD_HUI] }),
      {
        ok: false,
        reason: 'correction_invalide',
        error: 'La journée à corriger ne correspond pas à celle enregistrée pour cette date.',
      },
      409,
    );
    fireEvent.click(await screen.findByRole('button', { name: /modifier ma journée/i }));
    fireEvent.click(screen.getByRole('button', { name: /corriger ✓/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toMatch(/ne correspond pas/i),
    );
    // Rechargement effectif : deux lectures, la seconde déclenchée par le refus.
    const lectures = fetchMock.mock.calls.filter(
      (c) => (c[1] as RequestInit | undefined)?.method !== 'POST',
    );
    expect(lectures).toHaveLength(2);
    // Et l'écran est revenu sur la frise : plus de formulaire ouvert.
    expect(screen.queryByRole('button', { name: /corriger ✓/i })).toBeNull();
  });
});

describe('motif de non-saisie', () => {
  const fenetre = (datesNotees: string[], datesIllisibles: string[] = []) =>
    calculerFenetreAliDepuisDates(datesNotees, AUJOURD_HUI, { datesIllisibles });

  it('nomme la quarantaine plutôt que de dire « déjà notée »', () => {
    expect(motifAujourdHuiNonNotable(fenetre([], [AUJOURD_HUI]), AUJOURD_HUI)).toMatch(
      /pas pu relire/i,
    );
  });

  it('la quarantaine l’emporte sur « déjà notée » : les deux drapeaux coexistent', () => {
    // Modèle append-only : une même date peut porter une tête de chaîne relue ET
    // une ligne qu'on ne sait pas relire. Le motif à donner est celui du refus
    // que la route opposera — `agenda_illisible` —, jamais l'état de la saisie
    // existante. C'est le seul cas où une date NOTÉE revient dans cette
    // fonction : ailleurs, notée veut dire corrigible, donc pas bloquée.
    expect(motifAujourdHuiNonNotable(fenetre([AUJOURD_HUI], [AUJOURD_HUI]), AUJOURD_HUI)).toMatch(
      /pas pu relire/i,
    );
  });

  it('dit la fenêtre close quand aujourd’hui sort des 21 jours', () => {
    expect(motifAujourdHuiNonNotable(fenetre(['2026-06-01']), AUJOURD_HUI)).toMatch(/21 jours/i);
  });
});
