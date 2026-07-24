// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AtelierReglesPanel } from './AtelierReglesPanel';

const fetchMock = vi.fn();

const json = (payload: unknown, ok = true) => ({ ok, json: async () => payload });

const URL_LISTE_PREFIX = '/api/praticien/regles?';
const URL_CREATION = '/api/praticien/regles';
const URL_VOCABULAIRE = '/api/praticien/regles/vocabulaire';
const URL_VALIDATION = '/api/praticien/regles/validation';
const URL_DESACTIVATION = '/api/praticien/regles/desactivation';
const URL_REVISION = '/api/praticien/regles/revision';
const URL_PREVISUALISATION = '/api/praticien/regles/previsualisation';

const REGLE = {
  id: 'regle_1',
  statut: 'brouillon',
  versionRegle: 2,
  typeRegle: 'recommande',
  poids: 1,
  intention: { id: 'tag_sommeil', code: 'sommeil_fragmente', labelFr: 'Sommeil fragmenté', categorie: 'sommeil' },
  ingredient: { id: 'ing_mag', code: 'magnesium', nomFr: 'Magnésium' },
  formePreferee: { id: 'forme_bisg', code: 'bisglycinate', labelFr: 'Bisglycinate' },
  doseCibleBasse: 100,
  doseCibleHaute: 300,
  gradePreuve: 'modere',
  justification: 'Justification sourcée du magnésium.',
  conditionSupplementaire: null,
  source: { id: 'src_1', citation: 'Revue Micronutrition, 2024', lienUrl: null },
  creeLe: '2026-07-20T10:00:00.000Z',
  validePar: null,
  valideLe: null,
  lignee: [
    {
      id: 'regle_0',
      versionRegle: 1,
      statut: 'desactivee',
      gradePreuve: 'faible',
      justification: 'Ancienne justification.',
      validePar: 'praticien@wellneuro.fr',
      valideLe: '2026-07-01T00:00:00.000Z',
      creeLe: '2026-06-20T00:00:00.000Z',
    },
  ],
};

const REGLE_VALIDEE = {
  ...REGLE,
  id: 'regle_2',
  statut: 'validee',
  validePar: 'praticien@wellneuro.fr',
  valideLe: '2026-07-22T00:00:00.000Z',
  lignee: [],
};

const LISTE = {
  ok: true,
  statut: 'brouillon',
  total: 1,
  regles: [REGLE],
  compteurs: { brouillons: 1, validees: 1, desactivees: 0 },
};

const VOCABULAIRE = {
  ok: true,
  intentions: [REGLE.intention],
  criteres: [{ id: 'crit_1', code: 'sous_isrs', labelFr: 'Sous ISRS', categorie: null }],
  ingredients: [
    {
      id: 'ing_mag',
      code: 'magnesium',
      nomFr: 'Magnésium',
      formes: [{ id: 'forme_bisg', code: 'bisglycinate', labelFr: 'Bisglycinate' }],
    },
  ],
  sources: [{ id: 'src_1', citation: 'Revue Micronutrition, 2024', lienUrl: null }],
};

const RESOLUTION_PREVIEW = {
  ok: true,
  resolution: {
    contractVersion: 'c4b-resolution-v1',
    intentions: [
      {
        intention: REGLE.intention,
        regles: [
          {
            regleId: 'regle_1',
            versionRegle: 2,
            typeRegle: 'recommande',
            ingredient: REGLE.ingredient,
            formePreferee: REGLE.formePreferee,
            doseCibleBasse: 100,
            doseCibleHaute: 300,
            gradePreuve: 'modere',
            justification: REGLE.justification,
            conditionSupplementaire: null,
            source: REGLE.source,
            creeLe: REGLE.creeLe,
            validePar: null,
            valideLe: null,
            regleValidee: false,
          },
        ],
      },
    ],
    codesInconnus: [],
    aucunScoreAgrege: true,
  },
};

/**
 * Route les appels sur leurs URLs EXACTES, comme le ferait le serveur : un
 * POST hors des routes de l'atelier ou un GET inconnu échoue — le test
 * vérifie donc l'endpoint, pas seulement la méthode.
 */
function router(
  surcharges: {
    listes?: Record<string, unknown>;
    listeDefaut?: unknown;
    posts?: Record<string, { payload: unknown; ok?: boolean }>;
  } = {},
) {
  return (url: string, options?: { method?: string }) => {
    if (options?.method === 'POST') {
      const surcharge = surcharges.posts?.[url];
      if (surcharge) return Promise.resolve(json(surcharge.payload, surcharge.ok ?? true));
      if (url === URL_VALIDATION) {
        return Promise.resolve(
          json({ ok: true, regle: { ...REGLE, statut: 'validee' }, versionsDesactivees: 1 }),
        );
      }
      if (url === URL_DESACTIVATION) {
        return Promise.resolve(json({ ok: true, regle: { ...REGLE, statut: 'desactivee' } }));
      }
      if (url === URL_REVISION) {
        return Promise.resolve(json({ ok: true, regle: { ...REGLE, id: 'regle_3', versionRegle: 3 } }));
      }
      if (url === URL_CREATION) {
        return Promise.resolve(json({ ok: true, regle: { ...REGLE, id: 'regle_4', versionRegle: 1 } }));
      }
      if (url === URL_PREVISUALISATION) return Promise.resolve(json(RESOLUTION_PREVIEW));
      if (url === URL_VOCABULAIRE) {
        return Promise.resolve(
          json({ ok: true, type: 'intention', entree: VOCABULAIRE.intentions[0] }),
        );
      }
      return Promise.resolve(json({}, false));
    }
    if (url === URL_VOCABULAIRE) return Promise.resolve(json(VOCABULAIRE));
    if (url.startsWith(URL_LISTE_PREFIX)) {
      const statut = new URLSearchParams(url.split('?')[1]).get('statut') ?? '';
      const parStatut = surcharges.listes?.[statut];
      return Promise.resolve(json(parStatut ?? surcharges.listeDefaut ?? LISTE));
    }
    return Promise.resolve(json({}, false));
  };
}

const appelsPost = () => fetchMock.mock.calls.filter(([, options]) => options?.method === 'POST');
const appelsListe = () =>
  fetchMock.mock.calls.filter(
    ([url, options]) => options?.method !== 'POST' && String(url).startsWith(URL_LISTE_PREFIX),
  );

async function attendreLaListe() {
  render(<AtelierReglesPanel />);
  await waitFor(() => expect(screen.getByText(/Justification sourcée du magnésium/)).toBeTruthy());
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('AtelierReglesPanel (Atelier de règles cliniques v1)', () => {
  it('charge les brouillons (statut, limit, offset dans l’URL) et affiche règle, lignée et compteurs', async () => {
    fetchMock.mockImplementation(router());
    await attendreLaListe();

    const [urlInitiale] = appelsListe()[0];
    expect(urlInitiale).toBe('/api/praticien/regles?statut=brouillon&limit=20&offset=0');

    // La règle : ingrédient, version, type, verbatim de justification, source.
    expect(screen.getByText(/Magnésium — Bisglycinate/)).toBeTruthy();
    expect(screen.getAllByText('v2').length).toBeGreaterThan(0);
    expect(screen.getByText('recommande')).toBeTruthy();
    expect(screen.getByText('Source : Revue Micronutrition, 2024')).toBeTruthy();

    // Le grade est étiqueté « preuve scientifique » (échelle GRADE) — jamais
    // un A/B/C/D nu qui prêterait à confusion avec le moteur d'équilibre.
    expect(screen.getByText('preuve scientifique — Modéré')).toBeTruthy();

    // Statut honnête : un brouillon n'est PAS servi par la résolution.
    expect(screen.getByText('Brouillon — non servie par la résolution')).toBeTruthy();

    // La lignée est visible, version supersédée et signataire compris.
    expect(screen.getByText(/Lignée — 1 autre version/)).toBeTruthy();
    expect(screen.getByText(/Ancienne justification/)).toBeTruthy();

    // Tuiles de compteurs (les libellés existent AUSSI en onglets — d'où le All).
    expect(screen.getAllByText('Brouillons').length).toBeGreaterThan(1);
    expect(screen.getAllByText('Validées').length).toBeGreaterThan(1);
    expect(screen.getAllByText('Désactivées').length).toBeGreaterThan(1);
  });

  it('valide en deux temps : armer, puis signer sur la route validation — et recharge la liste', async () => {
    fetchMock.mockImplementation(router());
    await attendreLaListe();
    const listesAvant = appelsListe().length;

    // 1er clic : arme la confirmation, RIEN n'est envoyé.
    fireEvent.click(screen.getByRole('button', { name: 'Valider' }));
    expect(appelsPost()).toHaveLength(0);
    expect(screen.getByText(/Signer la validation de cette règle/)).toBeTruthy();

    // 2e clic : signe, avec le statut vu à l'écran (anti-écrasement).
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer la validation' }));
    await waitFor(() => {
      const posts = appelsPost();
      expect(posts).toHaveLength(1);
      expect(posts[0][0]).toBe(URL_VALIDATION);
      expect(JSON.parse(posts[0][1].body)).toEqual({
        regleId: 'regle_1',
        statutAttendu: 'brouillon',
      });
    });
    await waitFor(() => expect(appelsListe().length).toBeGreaterThan(listesAvant));
  });

  it('l’annulation de l’armement ne signe rien', async () => {
    fetchMock.mockImplementation(router());
    await attendreLaListe();

    fireEvent.click(screen.getByRole('button', { name: 'Valider' }));
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(screen.getByRole('button', { name: 'Valider' })).toBeTruthy();
    expect(appelsPost()).toHaveLength(0);
  });

  it('désactive en deux temps : raison OBLIGATOIRE avant confirmation, transmise à la route', async () => {
    fetchMock.mockImplementation(router());
    await attendreLaListe();

    fireEvent.click(screen.getByRole('button', { name: 'Désactiver' }));
    expect(appelsPost()).toHaveLength(0);
    const champRaison = screen.getByLabelText(/Raison de la désactivation/);

    // La confirmation reste bloquée tant que la raison est vide.
    expect(
      (screen.getByRole('button', { name: 'Confirmer la désactivation' }) as HTMLButtonElement).disabled,
    ).toBe(true);

    fireEvent.change(champRaison, { target: { value: 'Doublon d’une lignée existante.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer la désactivation' }));

    await waitFor(() => {
      const posts = appelsPost();
      expect(posts).toHaveLength(1);
      expect(posts[0][0]).toBe(URL_DESACTIVATION);
      expect(JSON.parse(posts[0][1].body)).toEqual({
        regleId: 'regle_1',
        statutAttendu: 'brouillon',
        raison: 'Doublon d’une lignée existante.',
      });
    });
  });

  it('change d’onglet : recharge avec le statut demandé, offset remis à zéro', async () => {
    fetchMock.mockImplementation(
      router({
        listes: {
          validee: { ...LISTE, statut: 'validee', regles: [REGLE_VALIDEE] },
        },
      }),
    );
    await attendreLaListe();

    fireEvent.click(screen.getByRole('tab', { name: 'Validées' }));
    await waitFor(() => {
      const urls = appelsListe().map(([url]) => url);
      expect(urls).toContain('/api/praticien/regles?statut=validee&limit=20&offset=0');
    });
    expect(await screen.findByText(/validée par praticien@wellneuro.fr/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Réviser' })).toBeTruthy();
  });

  it('réviser n’édite JAMAIS en place : le formulaire soumet une nouvelle version sur la route revision', async () => {
    fetchMock.mockImplementation(
      router({
        listes: {
          validee: { ...LISTE, statut: 'validee', regles: [REGLE_VALIDEE] },
        },
      }),
    );
    await attendreLaListe();
    fireEvent.click(screen.getByRole('tab', { name: 'Validées' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Réviser' }));

    // Le formulaire annonce la mécanique append-only.
    expect(screen.getByText(/une nouvelle version \(v3\) naîtra en brouillon/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Justification de la révision'), {
      target: { value: 'Justification mise à jour, méta-analyse 2026.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Créer la révision (brouillon)' }));

    await waitFor(() => {
      const posts = appelsPost();
      expect(posts).toHaveLength(1);
      expect(posts[0][0]).toBe(URL_REVISION);
      expect(JSON.parse(posts[0][1].body)).toEqual({
        regleId: 'regle_2',
        gradePreuveScientifique: 'modere',
        justification: 'Justification mise à jour, méta-analyse 2026.',
        sourceReferenceId: 'src_1',
        formePrefereeId: 'forme_bisg',
        doseCibleBasse: 100,
        doseCibleHaute: 300,
      });
    });
    // Aucun PUT/PATCH nulle part : la révision est un POST de création.
    expect(fetchMock.mock.calls.every(([, options]) => !['PUT', 'PATCH'].includes(options?.method ?? ''))).toBe(true);
  });

  it('crée un brouillon depuis le formulaire : lignée neuve, champs requis, POST sur la route de création', async () => {
    fetchMock.mockImplementation(router());
    await attendreLaListe();

    const bouton = screen.getByRole('button', { name: 'Créer le brouillon' }) as HTMLButtonElement;
    expect(bouton.disabled).toBe(true); // rien de rempli : pas de création possible

    fireEvent.change(screen.getByLabelText('Intention clinique'), { target: { value: 'tag_sommeil' } });
    fireEvent.change(screen.getByLabelText('Ingrédient'), { target: { value: 'ing_mag' } });
    fireEvent.change(screen.getByLabelText('Grade de preuve scientifique (échelle GRADE)'), {
      target: { value: 'fort' },
    });
    fireEvent.change(screen.getByLabelText('Source'), { target: { value: 'src_1' } });
    fireEvent.change(screen.getByLabelText('Justification'), {
      target: { value: 'Nouvelle règle sourcée.' },
    });
    expect(bouton.disabled).toBe(false);
    fireEvent.click(bouton);

    await waitFor(() => {
      const posts = appelsPost();
      expect(posts).toHaveLength(1);
      expect(posts[0][0]).toBe(URL_CREATION);
      expect(JSON.parse(posts[0][1].body)).toEqual({
        intentTagId: 'tag_sommeil',
        ingredientId: 'ing_mag',
        typeRegle: 'recommande',
        gradePreuveScientifique: 'fort',
        justification: 'Nouvelle règle sourcée.',
        sourceReferenceId: 'src_1',
        poids: 1,
      });
    });
    expect(await screen.findByText(/Brouillon créé/)).toBeTruthy();
  });

  it('teste une intention : la prévisualisation marque les brouillons comme non servis', async () => {
    fetchMock.mockImplementation(router());
    await attendreLaListe();

    fireEvent.change(screen.getByLabelText('Codes d’intention à tester'), {
      target: { value: ' sommeil_fragmente , stress_chronique ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tester la résolution' }));

    await waitFor(() => {
      const posts = appelsPost();
      expect(posts).toHaveLength(1);
      expect(posts[0][0]).toBe(URL_PREVISUALISATION);
      // Codes nettoyés (espaces, vides) avant l'envoi.
      expect(JSON.parse(posts[0][1].body)).toEqual({
        codes: ['sommeil_fragmente', 'stress_chronique'],
      });
    });
    // Le brouillon apparaît, MARQUÉ — jamais présenté comme une règle servie.
    expect(await screen.findByText('brouillon — non servie')).toBeTruthy();
  });

  it('ajoute une intention au vocabulaire gouverné', async () => {
    fetchMock.mockImplementation(router());
    await attendreLaListe();

    fireEvent.change(screen.getByLabelText('Code de l’entrée'), {
      target: { value: 'stress_chronique' },
    });
    fireEvent.change(screen.getByLabelText('Libellé français de l’entrée'), {
      target: { value: 'Stress chronique' },
    });
    fireEvent.change(screen.getByLabelText('Catégorie de l’entrée'), {
      target: { value: 'stress' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter au vocabulaire' }));

    await waitFor(() => {
      const posts = appelsPost();
      expect(posts).toHaveLength(1);
      expect(posts[0][0]).toBe(URL_VOCABULAIRE);
      expect(JSON.parse(posts[0][1].body)).toEqual({
        type: 'intention',
        code: 'stress_chronique',
        labelFr: 'Stress chronique',
        categorie: 'stress',
      });
    });
  });

  it('affiche l’erreur renvoyée par le serveur sur une action', async () => {
    fetchMock.mockImplementation(
      router({
        posts: {
          [URL_VALIDATION]: {
            payload: {
              ok: false,
              reason: 'version_depassee',
              error:
                'Une version au moins aussi récente de cette lignée est déjà validée — repartez d’une révision.',
            },
            ok: false,
          },
        },
      }),
    );
    await attendreLaListe();

    fireEvent.click(screen.getByRole('button', { name: 'Valider' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer la validation' }));
    await waitFor(() =>
      expect(screen.getByText(/Une version au moins aussi récente de cette lignée/)).toBeTruthy(),
    );
  });

  it('montre l’état vide sans le confondre avec une erreur, et propose de réessayer sur un échec de lecture', async () => {
    fetchMock.mockImplementation(router({ listeDefaut: { ...LISTE, total: 0, regles: [] } }));
    render(<AtelierReglesPanel />);
    await waitFor(() => expect(screen.getByText(/Aucun brouillon en attente/)).toBeTruthy());
    cleanup();

    fetchMock.mockImplementation(() =>
      Promise.resolve(json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, false)),
    );
    render(<AtelierReglesPanel />);
    await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThan(0));
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeTruthy();
  });
});
