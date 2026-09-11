// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ComprehensionPanel } from './ComprehensionPanel';

const fetchMock = vi.fn();

const json = (payload: unknown, ok = true) => ({ ok, json: async () => payload });

const version = (partiel: Record<string, unknown> = {}) => ({
  id: 'SYN_1',
  texte: 'Vous venez pour un sommeil qui se casse au milieu de la nuit.',
  redigeeLe: null,
  publieeLe: null,
  creeLe: '2026-08-20T09:00:00.000Z',
  supersedesSyntheseId: null,
  ...partiel,
});

function dossier(partiel: Record<string, unknown> = {}) {
  const syntheses = (partiel.syntheses as unknown[]) ?? [];
  return {
    ok: true,
    syntheses,
    trajectoires: syntheses.map((s) => ({
      idSynthese: (s as { id: string }).id,
      lignes: [s],
    })),
    desaccords: [],
    surfacePatientOuverte: true,
    ...partiel,
  };
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ComprehensionPanel', () => {
  it('DIT LA VÉRITÉ quand la surface patient est fermée, et empêche de publier', async () => {
    fetchMock.mockResolvedValueOnce(json(dossier({ surfacePatientOuverte: false })));
    render(<ComprehensionPanel idPatient="PAT_TEST" />);

    await waitFor(() => expect(screen.getByText(/surface patient n’est pas ouverte/)).toBeTruthy());
    expect((screen.getByText('Publier au patient') as HTMLButtonElement).disabled).toBe(true);
    // Le brouillon, lui, reste possible : préparer n'est pas remettre.
    expect(screen.getByText('Enregistrer en brouillon')).toBeTruthy();
  });

  it('distingue un BROUILLON d’une version publiée, sans ambiguïté', async () => {
    fetchMock.mockResolvedValueOnce(json(dossier({ syntheses: [version()] })));
    render(<ComprehensionPanel idPatient="PAT_TEST" />);

    await waitFor(() =>
      expect(screen.getByText(/Brouillon — le patient ne la voit pas/)).toBeTruthy(),
    );
  });

  it('SIGNALE une course au lieu de la départager en silence', async () => {
    fetchMock.mockResolvedValueOnce(
      json(
        dossier({
          syntheses: [
            version({ id: 'SYN_2', supersedesSyntheseId: 'SYN_0' }),
            version({ id: 'SYN_3', supersedesSyntheseId: 'SYN_0' }),
          ],
        }),
      ),
    );
    render(<ComprehensionPanel idPatient="PAT_TEST" />);

    await waitFor(() =>
      expect(document.body.textContent).toContain('Plusieurs versions courantes coexistent'),
    );
    expect(document.body.textContent).toContain('Aucune n’a été écartée');
    // Le message ne DIAGNOSTIQUE pas la cause : deux têtes peuvent venir d'une
    // course comme d'une version écrite indépendamment. Affirmer « révisées en
    // parallèle » alarmerait sur un incident inexistant (revue LOT-04, M1).
    expect(document.body.textContent).toContain('indépendamment');
    expect(document.body.textContent).toContain('que la plus récente publiée');
    // Et il n'AFFIRME plus une cause qu'il ne connaît pas.
    expect(document.body.textContent).not.toContain('elles ont été révisées en parallèle');
  });

  it('nomme l’état d’un désaccord sans jamais dire « ignoré » ni « non traité »', async () => {
    fetchMock.mockResolvedValueOnce(
      json(
        dossier({
          syntheses: [version({ publieeLe: '2026-08-20T09:00:00.000Z' })],
          desaccords: [
            {
              id: 'DES_1',
              idSynthese: 'SYN_1',
              texte: 'Pas exactement.',
              exprimeLe: null,
              creeLe: '2026-08-21T09:00:00.000Z',
              etat: 'en_attente',
            },
          ],
        }),
      ),
    );
    render(<ComprehensionPanel idPatient="PAT_TEST" />);

    // Le libellé partage sa ligne avec la date : on lit le texte rendu, pas un
    // nœud isolé.
    await waitFor(() => expect(document.body.textContent).toContain('Pas encore de réponse'));
    expect(document.body.textContent).not.toMatch(/ignoré|non traité|résolu|clos/i);
    // Et le panneau rappelle qu'il n'existe pas de geste de fermeture.
    expect(screen.getByText(/ne se ferme pas et ne s’efface pas/)).toBeTruthy();
  });

  it('rend le refus de registre comme une QUESTION, avec un second geste distinct', async () => {
    fetchMock.mockResolvedValueOnce(json(dossier()));
    render(<ComprehensionPanel idPatient="PAT_TEST" />);
    await waitFor(() => expect(screen.getByText('Publier au patient')).toBeTruthy());

    fireEvent.change(screen.getByLabelText('Ce que j’ai compris'), {
      target: { value: 'Votre situation est grave.' },
    });

    fetchMock.mockResolvedValueOnce(
      json(
        { ok: false, reason: 'REGISTRE_ANXIOGENE', error: 'Cette synthèse emploie « grave ».' },
        false,
      ),
    );
    fireEvent.click(screen.getByText('Publier au patient'));

    await waitFor(() => expect(screen.getByText(/emploie « grave »/)).toBeTruthy());
    // Le second geste n'existe QUE si la route a posé la question — et il est
    // distinct du premier : confirmer le registre ne se fait pas d'un clic qui
    // voudrait dire aussi « publier ».
    const confirmer = screen.getByText('Publier tel quel');
    expect(confirmer).toBeTruthy();

    fetchMock.mockResolvedValueOnce(json({ ok: true, synthese: version() }));
    fetchMock.mockResolvedValueOnce(json(dossier()));
    fireEvent.click(confirmer);

    await waitFor(() => {
      const publication = fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST');
      expect(JSON.parse(publication[1][1].body)).toMatchObject({
        publier: true,
        confirmerRegistre: true,
      });
    });
  });

  it('n’offre le second geste que sur question du registre', async () => {
    fetchMock.mockResolvedValueOnce(json(dossier()));
    render(<ComprehensionPanel idPatient="PAT_TEST" />);
    await waitFor(() => expect(screen.getByText('Publier au patient')).toBeTruthy());

    fireEvent.change(screen.getByLabelText('Ce que j’ai compris'), {
      target: { value: 'Un texte neutre.' },
    });
    fetchMock.mockResolvedValueOnce(json({ ok: false, reason: 'invalid', error: 'Refus.' }, false));
    fireEvent.click(screen.getByText('Publier au patient'));

    await waitFor(() => expect(screen.getByText('Refus.')).toBeTruthy());
    expect(screen.queryByText('Publier tel quel')).toBeNull();
  });

  it('le formulaire cède la place dès qu’une version existe, et se rouvre sur un geste', async () => {
    fetchMock.mockResolvedValueOnce(json(dossier({ syntheses: [version()] })));
    render(<ComprehensionPanel idPatient="PAT_TEST" />);

    await waitFor(() => expect(screen.getByText(/sommeil qui se casse/)).toBeTruthy());
    // Une version existe : la saisie n'est plus la première chose visible.
    expect(screen.queryByLabelText('Ce que j’ai compris')).toBeNull();

    fireEvent.click(screen.getByText('Écrire une nouvelle version'));
    expect(screen.getByLabelText('Ce que j’ai compris')).toBeTruthy();

    fireEvent.click(screen.getByText('Annuler'));
    expect(screen.queryByLabelText('Ce que j’ai compris')).toBeNull();
  });

  it('« Réviser cette version » rouvre le formulaire pré-rempli', async () => {
    fetchMock.mockResolvedValueOnce(json(dossier({ syntheses: [version()] })));
    render(<ComprehensionPanel idPatient="PAT_TEST" />);

    await waitFor(() => expect(screen.getByText('Réviser cette version')).toBeTruthy());
    fireEvent.click(screen.getByText('Réviser cette version'));
    const champ = screen.getByLabelText('Ce que j’ai compris') as HTMLTextAreaElement;
    expect(champ.value).toContain('sommeil qui se casse');
  });

  it('n’affiche AUCUN décompte de désaccords', async () => {
    fetchMock.mockResolvedValueOnce(
      json(
        dossier({
          syntheses: [version({ publieeLe: '2026-08-20T09:00:00.000Z' })],
          desaccords: [
            { id: 'D1', idSynthese: 'SYN_1', texte: 'a', exprimeLe: null, creeLe: '2026-08-21T09:00:00.000Z', etat: 'en_attente' },
            { id: 'D2', idSynthese: 'SYN_1', texte: 'b', exprimeLe: null, creeLe: '2026-08-22T09:00:00.000Z', etat: 'en_attente' },
          ],
        }),
      ),
    );
    render(<ComprehensionPanel idPatient="PAT_TEST" />);

    await waitFor(() => expect(screen.getByText('a')).toBeTruthy());
    expect(document.body.textContent).not.toMatch(/2 désaccords|taux|%/i);
  });
});

// ── LE RÉSUMÉ PROPOSÉ ────────────────────────────────────────────────────────
describe('ComprehensionPanel — le résumé proposé', () => {
  const TIRAGE = { id: 'TIR_1', texte: 'Vous décrivez un sommeil qui ne répare pas.', rang: 1 };

  /** Un routeur par URL : l'ordre des appels ne doit rien décider ici. */
  function router(tirageGet: unknown, tiragePost?: unknown) {
    return (url: string, options?: { method?: string }) => {
      if (String(url).includes('/comprehension/proposition')) {
        return Promise.resolve(
          json(options?.method === 'POST' ? (tiragePost ?? tirageGet) : tirageGet),
        );
      }
      return Promise.resolve(json(dossier()));
    };
  }

  const posts = () =>
    fetchMock.mock.calls.filter(([, o]) => (o as { method?: string } | undefined)?.method === 'POST');

  it('SOUS LA BARRE, aucun bouton — et ce qui manque est nommé pièce par pièce', async () => {
    fetchMock.mockImplementation(
      router({ ok: true, etat: 'sources_manquantes', manque: ['deux_syntheses_validees'] }),
    );
    render(<ComprehensionPanel idPatient="PAT_TEST" />);

    await waitFor(() => expect(screen.getByText(/une seconde synthèse validée/)).toBeTruthy());
    expect(screen.queryByRole('button', { name: 'Proposer un résumé' })).toBeNull();
  });

  it('les deux manques se disent ENSEMBLE, sans se confondre', async () => {
    fetchMock.mockImplementation(
      router({ ok: true, etat: 'sources_manquantes', manque: ['deux_syntheses_validees', 'second_rideau'] }),
    );
    render(<ComprehensionPanel idPatient="PAT_TEST" />);

    await waitFor(() =>
      expect(
        screen.getByText(/une seconde synthèse validée et un second rideau de questionnaires/),
      ).toBeTruthy(),
    );
  });

  it('OUVRIR L’ÉCRAN NE FAIT PARLER AUCUNE MACHINE — le bouton est le seul geste', async () => {
    fetchMock.mockImplementation(router({ ok: true, etat: 'aucune' }));
    render(<ComprehensionPanel idPatient="PAT_TEST" />);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Proposer un résumé' })).toBeTruthy());
    expect(posts()).toEqual([]);
  });

  it('le bouton produit un tirage et pré-remplit la zone', async () => {
    fetchMock.mockImplementation(
      router({ ok: true, etat: 'aucune' }, { ok: true, etat: 'proposee', proposition: TIRAGE }),
    );
    render(<ComprehensionPanel idPatient="PAT_TEST" />);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Proposer un résumé' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Proposer un résumé' }));

    await waitFor(() => {
      const zone = screen.getByLabelText('Ce que j’ai compris') as HTMLTextAreaElement;
      expect(zone.value).toBe(TIRAGE.texte);
    });
    expect(screen.getByText(/à relire. Réécrivez-le/)).toBeTruthy();
  });

  it('UN TIRAGE QUI ARRIVE N’ÉCRASE PAS UNE SAISIE EN COURS', async () => {
    // Le piège s'est refermé deux fois dans cette campagne : un banc qui tape
    // APRÈS l'arrivée de la matière ne prouve rien. Ici le texte est tapé
    // pendant que la lecture du tirage est encore en vol.
    let livrer: (v: unknown) => void = () => {};
    const enVol = new Promise((r) => {
      livrer = r;
    });
    fetchMock.mockImplementation((url: string) => {
      if (String(url).includes('/comprehension/proposition')) return enVol;
      return Promise.resolve(json(dossier()));
    });
    render(<ComprehensionPanel idPatient="PAT_TEST" />);

    await waitFor(() => expect(screen.getByLabelText('Ce que j’ai compris')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Ce que j’ai compris'), {
      target: { value: 'Mes mots, tapés avant que le tirage n’arrive.' },
    });

    livrer(json({ ok: true, etat: 'proposee', proposition: TIRAGE }));

    await waitFor(() => {
      const zone = screen.getByLabelText('Ce que j’ai compris') as HTMLTextAreaElement;
      expect(zone.value).toBe('Mes mots, tapés avant que le tirage n’arrive.');
    });
  });

  it('« Une autre » REMPLACE le texte — c’est un geste, pas un pré-remplissage', async () => {
    const AUTRE = { id: 'TIR_2', texte: 'Une autre manière de le dire.', rang: 2 };
    fetchMock.mockImplementation(
      router({ ok: true, etat: 'proposee', proposition: TIRAGE }, { ok: true, etat: 'proposee', proposition: AUTRE }),
    );
    render(<ComprehensionPanel idPatient="PAT_TEST" />);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Une autre' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Une autre' }));

    await waitFor(() => {
      const zone = screen.getByLabelText('Ce que j’ai compris') as HTMLTextAreaElement;
      expect(zone.value).toBe(AUTRE.texte);
    });
  });

  it('LE VERROU : publier est refusé tant que le texte est celui du tirage', async () => {
    fetchMock.mockImplementation(router({ ok: true, etat: 'proposee', proposition: TIRAGE }));
    render(<ComprehensionPanel idPatient="PAT_TEST" />);

    await waitFor(() => {
      const zone = screen.getByLabelText('Ce que j’ai compris') as HTMLTextAreaElement;
      expect(zone.value).toBe(TIRAGE.texte);
    });

    const publier = screen.getByRole('button', { name: 'Publier au patient' }) as HTMLButtonElement;
    expect(publier.disabled).toBe(true);
    expect(screen.getByText(/Relisez-le et réécrivez-le/)).toBeTruthy();

    // LE BROUILLON RESTE POSSIBLE : on tire, on enregistre, on revient relire.
    const brouillon = screen.getByRole('button', { name: 'Enregistrer en brouillon' }) as HTMLButtonElement;
    expect(brouillon.disabled).toBe(false);
  });

  it('réécrire dégrise la publication', async () => {
    fetchMock.mockImplementation(router({ ok: true, etat: 'proposee', proposition: TIRAGE }));
    render(<ComprehensionPanel idPatient="PAT_TEST" />);

    await waitFor(() =>
      expect((screen.getByRole('button', { name: 'Publier au patient' }) as HTMLButtonElement).disabled).toBe(true),
    );
    fireEvent.change(screen.getByLabelText('Ce que j’ai compris'), {
      target: { value: 'Ce que j’ai compris, avec mes mots à moi.' },
    });

    await waitFor(() =>
      expect((screen.getByRole('button', { name: 'Publier au patient' }) as HTMLButtonElement).disabled).toBe(false),
    );
    expect(screen.queryByText(/Relisez-le et réécrivez-le/)).toBeNull();
  });

  it('l’envoi porte `sourceId`, et RIEN D’AUTRE de la provenance', async () => {
    fetchMock.mockImplementation(router({ ok: true, etat: 'proposee', proposition: TIRAGE }));
    render(<ComprehensionPanel idPatient="PAT_TEST" />);

    await waitFor(() => expect(screen.getByLabelText('Ce que j’ai compris')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Ce que j’ai compris'), {
      target: { value: 'Mes mots.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Publier au patient' }));

    await waitFor(() => {
      const envoi = posts().find(([url]) => String(url) === '/api/praticien/comprehension');
      expect(envoi).toBeTruthy();
      const charge = JSON.parse(String((envoi as [string, { body?: string }])[1].body));
      expect(charge.sourceId).toBe('TIR_1');
      // Le modèle et la version de consigne sont lus par le SERVEUR sur la
      // ligne du tirage : un navigateur ne doit pas pouvoir les déclarer.
      expect(charge.modele).toBeUndefined();
      expect(charge.versionConsigne).toBeUndefined();
      expect(charge.source).toBeUndefined();
    });
  });

  it('sans tirage, `sourceId` part NUL — « ses mots »', async () => {
    fetchMock.mockImplementation(router({ ok: true, etat: 'aucune' }));
    render(<ComprehensionPanel idPatient="PAT_TEST" />);

    await waitFor(() => expect(screen.getByLabelText('Ce que j’ai compris')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Ce que j’ai compris'), {
      target: { value: 'Entièrement de ma main.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Publier au patient' }));

    await waitFor(() => {
      const envoi = posts().find(([url]) => String(url) === '/api/praticien/comprehension');
      expect(envoi).toBeTruthy();
      expect(JSON.parse(String((envoi as [string, { body?: string }])[1].body)).sourceId).toBeNull();
    });
  });
});
