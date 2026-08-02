// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
// catalogue.ts importe prisma au chargement (pour FACETTES/types) : on le
// neutralise, ce test ne touche jamais la base.
vi.mock('@/lib/prisma', () => ({ prisma: {} }));

import {
  FACETTES,
  FACETTES_INDISPONIBLES,
  FACETTES_SERVIES,
  OFFSET_MAX,
  VALEURS_FACETTE_INDISPONIBLES,
  type CatalogueResult,
  type FicheComplement,
} from '@/lib/supplement-library/catalogue';
import {
  FACETTES_GRISEES,
  OFFSET_MAX_ECRAN,
  RayonComplementsPanel,
  VALEURS_FACETTE,
  VALEURS_FACETTE_GRISEES,
} from './RayonComplementsPanel';

// La fiche justificative est stubbée : on teste ici l'instrument (liste,
// facettes, tri, tiroir), pas le détail déjà couvert par FicheComplementPanel.test.
vi.mock('@/components/complements/FicheComplementPanel', () => ({
  FicheComplementPanel: ({ fiche }: { fiche: FicheComplement }) => (
    <div data-testid="fiche-stub">Détail de {fiche.nomCommercial}</div>
  ),
}));

const fetchMock = vi.fn();
const json = (payload: unknown, ok = true) => ({ ok, json: async () => payload });

function fiche(over: Partial<FicheComplement> = {}): FicheComplement {
  return {
    produitId: over.produitId ?? 'prod_mag',
    nomCommercial: over.nomCommercial ?? 'Magnésium Plus',
    marque: over.marque ?? 'MarqueA',
    marche: 'FR',
    statutFiche: over.statutFiche ?? 'importee',
    statutLabel: 'Fiche importée — non vérifiée',
    composition: [],
    completudeComposition: over.completudeComposition ?? 'absente',
    dimensions: {
      qualiteFormulation: { valeur: 'bien_documentee', justification: '' },
      biodisponibiliteForme: { valeurs: [], valeursPresentes: ['non_evaluee'], justification: '' },
      gradePreuveParIntention: { valeurs: [], justification: '' },
      compatibiliteProtocole: { valeur: 'non_evaluee', justification: '' },
      interactionsSignalees: { valeur: 'non_evaluee', signalements: [], mentionMedecin: '', justification: '' },
      cumulVsSeuils: { valeur: 'non_evaluee', signaux: [], justification: '' },
      donneesManquantes: { valeur: 'aucune', elements: [], justification: '' },
      fraicheurProvenance: {
        provenance: 'dgccrf', identifiantSource: 'DGCCRF-001', urlSource: null,
        dateDerniereVerification: null, versionFormulation: 1,
        statutFiche: 'importee', statutLabel: 'Fiche importée — non vérifiée', justification: '',
      },
    },
    reglesCorrespondantes: over.reglesCorrespondantes ?? 0,
    referencesScientifiques: [],
  };
}

function catalogue(over: Partial<CatalogueResult> = {}): CatalogueResult {
  return {
    contractVersion: 'c4-catalogue-v4',
    aucunScoreGlobal: true,
    intentionFiltre: over.intentionFiltre ?? null,
    codesInconnus: [],
    tri: over.tri ?? 'neutre',
    recherche: over.recherche ?? '',
    page: over.page ?? 1,
    parPage: over.parPage ?? 25,
    total: over.total ?? over.fiches?.length ?? 0,
    fiches: over.fiches ?? [],
    facettes: FACETTES,
    facettesServies: FACETTES_SERVIES,
    facettesIndisponibles: FACETTES_INDISPONIBLES,
  };
}

function routerFetch(cat: CatalogueResult) {
  return (url: string | URL) => {
    const u = String(url);
    if (u.includes('/complements/corpus')) {
      return Promise.resolve(json({ ok: true, corpusVide: true, claims: [], message: '' }));
    }
    if (u.includes('/api/praticien/complements')) {
      return Promise.resolve(json({ ok: true, ...cat }));
    }
    return Promise.resolve(json({}, false));
  };
}

/** Pose un critère de recherche — l'écran n'interroge rien avant. */
function rechercher(texte: string) {
  fireEvent.change(screen.getByLabelText('Rechercher un produit ou une marque'), {
    target: { value: texte },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Rechercher' }));
}

function urlsAppelees(): string[] {
  return fetchMock.mock.calls.map(([u]) => String(u));
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('RayonComplementsPanel (instrument à tiroir)', () => {
  // ─── Garde anti-dérive du vocabulaire recopié ─────────────────────────────

  it('le vocabulaire des facettes de l’écran est celui du service, valeur pour valeur', () => {
    // L'écran recopie les valeurs pour ne pas embarquer Prisma côté client :
    // sans cette garde, une valeur ajoutée au service resterait invisible, ou
    // une valeur supprimée deviendrait un filtre que la base refuse.
    expect(Object.keys(VALEURS_FACETTE).sort()).toEqual([...FACETTES_SERVIES].sort());
    for (const cle of FACETTES_SERVIES) {
      expect(VALEURS_FACETTE[cle]).toEqual(FACETTES[cle]);
    }
  });

  it('les valeurs grisées de l’écran sont EXACTEMENT celles que le service refuse', () => {
    // Deuxième garde de dérive, sur la même faille : une valeur retirée du
    // service et laissée cliquable ici produirait un 400 en face d'un clic
    // légitime ; l'inverse laisserait un critère mort à l'écran.
    expect(VALEURS_FACETTE_GRISEES).toEqual(VALEURS_FACETTE_INDISPONIBLES);
    // Les deux sont VIDES depuis la bascule d'`interactions` (2026-08-01) :
    // l'égalité ci-dessus est donc tautologique, et le resterait si les deux
    // divergeaient un jour vers deux formes vides différentes. On le dit
    // plutôt que de laisser croire à une garde active.
    expect(Object.keys(VALEURS_FACETTE_GRISEES)).toEqual([]);
  });

  // La garde qui MANQUAIT : rien ne comparait les facettes grisées de l'écran
  // aux facettes que le service déclare indisponibles. Basculer `interactions`
  // côté service sans toucher l'écran aurait laissé une facette cliquable dont
  // chaque clic rendait 400.
  it('les facettes grisées de l’écran sont EXACTEMENT celles que le service déclare indisponibles', () => {
    expect([...FACETTES_GRISEES].sort()).toEqual([...FACETTES_INDISPONIBLES].sort());
  });

  it('toute valeur grisée appartient bien au vocabulaire de sa facette', () => {
    for (const [cle, valeurs] of Object.entries(VALEURS_FACETTE_GRISEES)) {
      for (const valeur of valeurs ?? []) {
        expect(VALEURS_FACETTE[cle as keyof typeof VALEURS_FACETTE]).toContain(valeur);
      }
    }
  });

  it('le plafond d’offset de l’écran est celui du service', () => {
    expect(OFFSET_MAX_ECRAN).toBe(OFFSET_MAX);
  });

  it('annonce dans la LISTE qu’un compteur de règles est sous-estimé', async () => {
    // C'est la liste que le praticien parcourt, pas le tiroir : sans mention
    // ici, « 3 règles correspondantes » se lit comme un décompte complet.
    fetchMock.mockImplementation(routerFetch(catalogue({
      fiches: [fiche({ completudeComposition: 'partielle', reglesCorrespondantes: 3 })],
      total: 1,
    })));
    render(<RayonComplementsPanel />);
    rechercher('magnésium');
    await waitFor(() => expect(screen.getByText(/composition partiellement résolue/i)).toBeTruthy());
  });

  it('n’ajoute aucune mention sur une fiche à composition absente', async () => {
    fetchMock.mockImplementation(routerFetch(catalogue({
      fiches: [fiche({ completudeComposition: 'absente', reglesCorrespondantes: 0 })],
      total: 1,
    })));
    render(<RayonComplementsPanel />);
    rechercher('magnésium');
    await waitFor(() => expect(screen.getByText(/Magnésium Plus/)).toBeTruthy());
    expect(screen.queryByText(/composition partiellement résolue/i)).toBeNull();
  });

  // ─── Facette entière indisponible : montrée, désactivée, expliquée ────────

  it('« Interactions » est affichée mais entièrement désactivée, avec sa raison', () => {
    render(<RayonComplementsPanel />);
    expect(screen.getByText('Interactions')).toBeTruthy();
    // Aucune de ses trois valeurs n'est offerte au clic.
    for (const valeur of ['Signalées', 'Aucune connue']) {
      expect(screen.queryByRole('button', { name: valeur })).toBeNull();
    }
    expect(
      screen.getAllByText(/règles cliniques et les seuils d’ingrédients/i).length,
    ).toBeGreaterThan(0);
  });

  // Le message promettait « après l'import de la composition ». L'import a
  // lieu, et les critères restent indisponibles : ce sont les règles et les
  // seuils qui manquent. Une promesse datée qui ne se réalise pas au terme
  // annoncé use la confiance dans toutes les autres.
  it('la raison affichée ne promet plus l’import de la composition', () => {
    render(<RayonComplementsPanel />);
    expect(screen.queryByText(/après l’import de la composition/i)).toBeNull();
  });

  it('aucune valeur n’est grisée à l’unité — la facette entière l’est', () => {
    render(<RayonComplementsPanel />);
    const grises = (screen.getAllByRole('button') as HTMLButtonElement[])
      .filter((b) => b.disabled)
      .map((b) => b.textContent);
    expect(grises).toEqual([]);
  });

  it('« Non évaluée » reste cliquable là où elle est encore servie', () => {
    render(<RayonComplementsPanel />);
    const nonEvaluee = screen.getAllByRole('button', { name: 'Non évaluée' }) as HTMLButtonElement[];
    expect(nonEvaluee.length).toBeGreaterThan(0);
    expect(nonEvaluee.every((b) => !b.disabled)).toBe(true);
  });

  // ─── Le mur d'entrée : rien n'est chargé sans critère ─────────────────────

  it('n’interroge RIEN au montage et invite à poser un critère', async () => {
    fetchMock.mockImplementation(routerFetch(catalogue({ fiches: [fiche()] })));
    render(<RayonComplementsPanel />);
    await waitFor(() => expect(screen.getByText(/Recherchez un nom, une marque/)).toBeTruthy());
    expect(urlsAppelees().some((u) => u.includes('/api/praticien/complements'))).toBe(false);
  });

  it('charge et liste les fiches dès qu’une recherche est lancée', async () => {
    fetchMock.mockImplementation(routerFetch(catalogue({ fiches: [fiche({ nomCommercial: 'Magnésium Plus' })] })));
    render(<RayonComplementsPanel />);
    rechercher('magnésium');
    await waitFor(() => expect(screen.getByText('Magnésium Plus')).toBeTruthy());
    expect(urlsAppelees().some((u) => u.includes('q=magn'))).toBe(true);
  });

  it('affiche un message métier clair et désactive le panneau quand le rayon est désactivé', async () => {
    fetchMock.mockImplementation((url: string | URL) => {
      const u = String(url);
      if (u.includes('/api/praticien/complements')) {
        return Promise.resolve(json({ ok: false, reason: 'flag_eteint', error: 'Rayon compléments indisponible.' }, false));
      }
      return Promise.resolve(json({ ok: true, corpusVide: true, claims: [], message: '' }));
    });
    render(<RayonComplementsPanel />);
    rechercher('magnésium');
    await waitFor(() => expect(screen.getByText(/Le rayon compléments n['’]est pas encore ouvert sur cet environnement/i)).toBeTruthy());
    expect(screen.getByRole('status').textContent).toContain('Les filtres et la consultation du catalogue');
    const input = screen.getByLabelText('Rechercher un produit ou une marque') as HTMLInputElement;
    expect(input.disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Rechercher' }).getAttribute('disabled')).not.toBeNull();
  });

  it('une facette seule suffit à déclencher le chargement', async () => {
    fetchMock.mockImplementation(routerFetch(catalogue({ fiches: [fiche()] })));
    render(<RayonComplementsPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Bien documentée' }));
    await waitFor(() => {
      expect(urlsAppelees().some((u) => u.includes('qualite=bien_documentee'))).toBe(true);
    });
  });

  // ─── Pagination ───────────────────────────────────────────────────────────

  it('affiche le total de la BASE et le nombre de pages, pas la taille de la page', async () => {
    fetchMock.mockImplementation(routerFetch(
      catalogue({ fiches: [fiche()], total: 140148, parPage: 25, page: 1 }),
    ));
    render(<RayonComplementsPanel />);
    rechercher('magnésium');
    await waitFor(() => expect(screen.getByText(/140148 fiches au total/)).toBeTruthy());
    // Le total est celui de la base ; le nombre de pages est borné par le
    // plafond d'offset (cf. le test dédié plus bas).
    expect(screen.getByText(/Page 1 sur /)).toBeTruthy();
  });

  it('la page suivante est demandée au serveur', async () => {
    fetchMock.mockImplementation(routerFetch(catalogue({ fiches: [fiche()], total: 100, parPage: 25 })));
    render(<RayonComplementsPanel />);
    rechercher('magnésium');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Page suivante' })).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Page suivante' }));
    await waitFor(() => expect(urlsAppelees().some((u) => u.includes('page=2'))).toBe(true));
  });

  it('« page précédente » est désactivée sur la première page', async () => {
    fetchMock.mockImplementation(routerFetch(catalogue({ fiches: [fiche()], total: 100, parPage: 25 })));
    render(<RayonComplementsPanel />);
    rechercher('magnésium');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Page précédente' })).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Page précédente' })).toHaveProperty('disabled', true);
  });

  it('« page suivante » est désactivée sur la dernière page', async () => {
    fetchMock.mockImplementation(routerFetch(
      catalogue({ fiches: [fiche()], total: 3, parPage: 25, page: 1 }),
    ));
    render(<RayonComplementsPanel />);
    rechercher('magnésium');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Page suivante' })).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Page suivante' })).toHaveProperty('disabled', true);
  });

  it('n’annonce que les pages réellement atteignables (plafond d’offset)', async () => {
    // 140 148 fiches à 25 par page = 5606 pages, mais le service refuse
    // au-delà de l'offset plafond : annoncer 5606 serait un compte faux.
    fetchMock.mockImplementation(routerFetch(
      catalogue({ fiches: [fiche()], total: 140148, parPage: 25, page: 1 }),
    ));
    render(<RayonComplementsPanel />);
    rechercher('magnésium');
    const atteignables = Math.floor(OFFSET_MAX / 25) + 1;
    await waitFor(() => expect(screen.getByText(new RegExp(`Page 1 sur ${atteignables}`))).toBeTruthy());
    expect(screen.queryByText(/sur 5606/)).toBeNull();
  });

  it('changer le tri ramène à la première page', async () => {
    fetchMock.mockImplementation(routerFetch(catalogue({ fiches: [fiche()], total: 500, parPage: 25 })));
    render(<RayonComplementsPanel />);
    rechercher('magnésium');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Page suivante' })).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Page suivante' }));
    await waitFor(() => expect(urlsAppelees().some((u) => u.includes('page=2'))).toBe(true));

    fireEvent.change(screen.getByLabelText('Clé de tri (mono-dimension)'), { target: { value: 'marque' } });
    await waitFor(() => expect(urlsAppelees().some((u) => u.includes('tri=marque'))).toBe(true));
    const derniere = urlsAppelees()[urlsAppelees().length - 1];
    expect(derniere).toContain('tri=marque');
    expect(derniere).not.toContain('page=2');
  });

  it('un critère neuf ramène à la première page (sinon on ouvre sur une page vide)', async () => {
    fetchMock.mockImplementation(routerFetch(catalogue({ fiches: [fiche()], total: 500, parPage: 25 })));
    render(<RayonComplementsPanel />);
    rechercher('magnésium');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Page suivante' })).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Page suivante' }));
    await waitFor(() => expect(urlsAppelees().some((u) => u.includes('page=2'))).toBe(true));

    // Nouvelle recherche : la requête ne doit plus porter page=2.
    rechercher('zinc');
    await waitFor(() => expect(urlsAppelees().some((u) => u.includes('q=zinc'))).toBe(true));
    const derniere = urlsAppelees()[urlsAppelees().length - 1];
    expect(derniere).toContain('q=zinc');
    expect(derniere).not.toContain('page=2');
  });

  // ─── Course de requêtes : la dernière ÉMISE gagne, pas la première reçue ──

  it('une réponse périmée n’écrase jamais la courante', async () => {
    // Deux requêtes en vol, résolues dans l'ordre INVERSE de leur émission.
    // Sans jeton de séquence, la lente (« vitamine ») arrive après la rapide
    // (« zinc ») et repeuple l'écran avec des fiches hors critère.
    const differees: Array<(v: unknown) => void> = [];
    fetchMock.mockImplementation((url: string | URL) => {
      const u = String(url);
      if (u.includes('/complements/corpus')) {
        return Promise.resolve(json({ ok: true, corpusVide: true, claims: [], message: '' }));
      }
      const lente = u.includes('q=vitamine');
      const charge = json({
        ok: true,
        ...catalogue({
          fiches: [fiche({ nomCommercial: lente ? 'Vitamine périmée' : 'Zinc courant' })],
          total: 1,
        }),
      });
      if (lente) return new Promise((resolve) => differees.push(() => resolve(charge)));
      return Promise.resolve(charge);
    });

    render(<RayonComplementsPanel />);
    rechercher('vitamine'); // requête lente, émise en premier
    rechercher('zinc'); // requête rapide, émise ensuite → doit gagner

    await waitFor(() => expect(screen.getByText('Zinc courant')).toBeTruthy());
    differees.forEach((resoudre) => resoudre(undefined)); // la lente arrive enfin

    await waitFor(() => expect(screen.getByText('Zinc courant')).toBeTruthy());
    expect(screen.queryByText('Vitamine périmée')).toBeNull();
  });

  it('vider les critères invalide la réponse encore en vol', async () => {
    const differees: Array<(v: unknown) => void> = [];
    fetchMock.mockImplementation((url: string | URL) => {
      const u = String(url);
      if (u.includes('/complements/corpus')) {
        return Promise.resolve(json({ ok: true, corpusVide: true, claims: [], message: '' }));
      }
      const charge = json({ ok: true, ...catalogue({ fiches: [fiche()], total: 1 }) });
      return new Promise((resolve) => differees.push(() => resolve(charge)));
    });

    render(<RayonComplementsPanel />);
    rechercher('magnésium');
    // L'utilisateur efface avant que la réponse n'arrive.
    fireEvent.click(screen.getByRole('button', { name: 'Effacer la recherche' }));
    differees.forEach((resoudre) => resoudre(undefined));

    await waitFor(() => expect(screen.getByText(/Recherchez un nom, une marque/)).toBeTruthy());
    expect(screen.queryByText('Magnésium Plus')).toBeNull();
  });

  // ─── Honnêteté des états ──────────────────────────────────────────────────

  it('un résultat vide se dit « aucune fiche ne correspond », jamais une erreur', async () => {
    fetchMock.mockImplementation(routerFetch(catalogue({ fiches: [] })));
    render(<RayonComplementsPanel />);
    rechercher('introuvable');
    await waitFor(() => expect(screen.getByText(/Aucune fiche ne correspond/)).toBeTruthy());
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('un échec de chargement propose de réessayer (jamais confondu avec un vide)', async () => {
    fetchMock.mockResolvedValue(json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, false));
    render(<RayonComplementsPanel />);
    rechercher('magnésium');
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeTruthy();
  });

  it('affiche le message du serveur quand il en donne un (pagination hors bornes)', async () => {
    fetchMock.mockResolvedValue(json(
      { ok: false, reason: 'offset_trop_loin', error: 'Cette page est trop loin dans le catalogue — affinez la recherche.' },
      false,
    ));
    render(<RayonComplementsPanel />);
    rechercher('magnésium');
    await waitFor(() => expect(screen.getByText(/trop loin dans le catalogue/)).toBeTruthy());
  });

  it('les critères sans donnée sont annoncés comme tels, jamais offerts au clic', async () => {
    fetchMock.mockImplementation(routerFetch(catalogue({ fiches: [fiche()] })));
    render(<RayonComplementsPanel />);
    rechercher('magnésium');
    await waitFor(() => expect(screen.getByText('Magnésium Plus')).toBeTruthy());

    expect(
      screen.getAllByText(/règles cliniques et les seuils d’ingrédients/i).length,
    ).toBeGreaterThan(0);
    // Aucune valeur de ces facettes n'est cliquable — `Signalées` incluse
    // depuis que la facette `interactions` a rejoint les grisées.
    expect(screen.queryByRole('button', { name: 'Forme préférée' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Fort' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Signalées' })).toBeNull();
  });

  it('le tri indisponible n’est pas proposé', async () => {
    fetchMock.mockImplementation(routerFetch(catalogue({ fiches: [fiche()] })));
    render(<RayonComplementsPanel />);
    rechercher('magnésium');
    await waitFor(() => expect(screen.getByText('Magnésium Plus')).toBeTruthy());
    expect(screen.queryByText(/nombre de règles correspondantes/)).toBeNull();
  });

  it('le tri mono-dimension est porté dans la requête', async () => {
    fetchMock.mockImplementation(routerFetch(catalogue({ fiches: [fiche()] })));
    render(<RayonComplementsPanel />);
    rechercher('magnésium');
    await waitFor(() => expect(screen.getByText('Magnésium Plus')).toBeTruthy());

    fireEvent.change(screen.getByLabelText('Clé de tri (mono-dimension)'), { target: { value: 'marque' } });
    await waitFor(() => expect(urlsAppelees().some((u) => u.includes('tri=marque'))).toBe(true));
  });

  it('ouvre la fiche justificative dans le tiroir au clic', async () => {
    fetchMock.mockImplementation(routerFetch(catalogue({ fiches: [fiche({ nomCommercial: 'Magnésium Plus' })] })));
    render(<RayonComplementsPanel />);
    rechercher('magnésium');
    await waitFor(() => expect(screen.getByText('Magnésium Plus')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: /Magnésium Plus/ }));
    await waitFor(() => expect(screen.getByTestId('fiche-stub')).toBeTruthy());
    expect(screen.getByText('Détail de Magnésium Plus')).toBeTruthy();
  });
});
