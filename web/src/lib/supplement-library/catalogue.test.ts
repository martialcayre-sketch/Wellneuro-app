import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    supplementProduct: { findMany: vi.fn(), count: vi.fn() },
    ingredientFunctionalThreshold: { findMany: vi.fn() },
    clinicalIntentTag: { findMany: vi.fn() },
    clinicalRule: { findMany: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));

import {
  CatalogueRequeteInvalide,
  OFFSET_MAX,
  PAR_PAGE_DEFAUT,
  PAR_PAGE_MAX,
  appliquerCompletude,
  listerCatalogue,
  lireCompletudeComposition,
  type DimensionsFiche,
} from './catalogue';

const tagSommeil = {
  id: 'tag_sommeil', code: 'sommeil_fragmente', labelFr: 'Sommeil fragmenté', categorie: 'sommeil',
};

function regleMag(overrides: Record<string, unknown> = {}) {
  return {
    id: 'regle_mag', intentTagId: 'tag_sommeil', typeRegle: 'recommande',
    justification: 'Justification magnésium.', conditionSupplementaire: null,
    doseCibleBasse: 100, doseCibleHaute: 300, gradePreuveScientifique: 'modere',
    versionRegle: 1, creeLe: new Date('2026-07-01T00:00:00.000Z'),
    validePar: 'praticien@wellneuro.fr', valideLe: new Date('2026-07-02T00:00:00.000Z'),
    ingredient: { id: 'ing_mag', code: 'magnesium', nomFr: 'Magnésium' },
    formePreferee: { id: 'forme_bisg', code: 'bisglycinate', labelFr: 'Bisglycinate' },
    sourceReference: { id: 'src_1', citation: 'Revue Micronutrition, 2024', lienUrl: null },
    ...overrides,
  };
}

function produit(over: Partial<{ id: string; nomCommercial: string; marque: string; statutFiche: string; niveauCompletude: string; donneesManquantes: string[]; dateDerniereVerification: Date | null; compositions: unknown[] }> = {}) {
  return {
    id: over.id ?? 'prod_mag',
    nomCommercial: over.nomCommercial ?? 'Magnésium Plus',
    marque: over.marque ?? 'MarqueA',
    marche: 'FR',
    sourceProvenance: 'dgccrf',
    sourceIdentifiant: 'DGCCRF-001',
    sourceUrl: null,
    dateDerniereVerification: over.dateDerniereVerification ?? new Date('2026-06-01T00:00:00.000Z'),
    statutFiche: over.statutFiche ?? 'importee',
    niveauCompletude: over.niveauCompletude ?? 'bien_documentee',
    donneesManquantes: over.donneesManquantes ?? [],
    versionFormulation: 1,
    compositions: over.compositions ?? [
      {
        doseParDjr: 200, unite: 'mg', position: 0,
        ingredient: { id: 'ing_mag', code: 'magnesium', nomFr: 'Magnésium' },
        forme: { id: 'forme_bisg', code: 'bisglycinate', labelFr: 'Bisglycinate' },
      },
    ],
  };
}

/** Le `where` transmis à la base pour la page (les deux requêtes le partagent). */
function whereEnvoye() {
  return prisma.supplementProduct.findMany.mock.calls[0][0].where;
}
function argsPage() {
  return prisma.supplementProduct.findMany.mock.calls[0][0];
}
/** Aplatit les conditions du `AND` en une liste inspectable. */
function conditions() {
  return whereEnvoye().AND as Record<string, unknown>[];
}

describe('listerCatalogue (service catalogue C4A)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WN_C4_ENABLED = 'true';
    prisma.supplementProduct.findMany.mockResolvedValue([]);
    prisma.supplementProduct.count.mockResolvedValue(0);
    prisma.ingredientFunctionalThreshold.findMany.mockResolvedValue([]);
    prisma.clinicalIntentTag.findMany.mockResolvedValue([]);
    prisma.clinicalRule.findMany.mockResolvedValue([]);
  });

  it('refuse tout service quand WN_C4_ENABLED est absent ou faux (fail-closed)', async () => {
    delete process.env.WN_C4_ENABLED;
    await expect(listerCatalogue()).rejects.toThrow(/WN_C4_ENABLED/);
    process.env.WN_C4_ENABLED = 'false';
    await expect(listerCatalogue()).rejects.toThrow(/WN_C4_ENABLED/);
    expect(prisma.supplementProduct.findMany).not.toHaveBeenCalled();
  });

  it('gère un catalogue vide sans erreur (aucune fiche)', async () => {
    const res = await listerCatalogue();
    expect(res.fiches).toEqual([]);
    expect(res.total).toBe(0);
    expect(res.aucunScoreGlobal).toBe(true);
    expect(res.contractVersion).toBe('c4-catalogue-v4');
  });

  it('ne produit AUCUN score global agrégé', async () => {
    prisma.supplementProduct.findMany.mockResolvedValue([produit()]);
    prisma.supplementProduct.count.mockResolvedValue(1);
    const res = await listerCatalogue();
    expect(res.aucunScoreGlobal).toBe(true);
    expect(JSON.stringify(res)).not.toMatch(/"(score|note|rang|classement|poids|meilleurChoix)":/i);
  });

  // ─── Pagination : le cœur du lot ──────────────────────────────────────────

  it('ne charge QUE la page demandée, jamais le catalogue entier', async () => {
    prisma.supplementProduct.count.mockResolvedValue(140148);
    await listerCatalogue({ page: 3, parPage: 10 });
    const args = argsPage();
    expect(args.take).toBe(10);
    expect(args.skip).toBe(20);
  });

  it('le total est celui de la BASE, pas la taille de la page', async () => {
    prisma.supplementProduct.findMany.mockResolvedValue([produit()]);
    prisma.supplementProduct.count.mockResolvedValue(140148);
    const res = await listerCatalogue({ recherche: 'magnésium' });
    expect(res.total).toBe(140148);
    expect(res.fiches).toHaveLength(1);
  });

  it('le comptage porte EXACTEMENT le même filtre que la page (sinon total incohérent)', async () => {
    await listerCatalogue({ recherche: 'zinc', filtres: { statut: ['verifiee'] } });
    expect(prisma.supplementProduct.count.mock.calls[0][0].where).toEqual(whereEnvoye());
  });

  it('borne parPage et page, et refuse un offset hors d’atteinte', async () => {
    await listerCatalogue({ parPage: 5000 });
    expect(argsPage().take).toBe(PAR_PAGE_MAX);

    vi.clearAllMocks();
    prisma.supplementProduct.findMany.mockResolvedValue([]);
    prisma.supplementProduct.count.mockResolvedValue(0);
    await listerCatalogue({});
    expect(argsPage().take).toBe(PAR_PAGE_DEFAUT);
    expect(argsPage().skip).toBe(0);

    vi.clearAllMocks();
    prisma.supplementProduct.findMany.mockResolvedValue([]);
    prisma.supplementProduct.count.mockResolvedValue(0);
    await listerCatalogue({ page: -4 });
    expect(argsPage().skip).toBe(0);

    // Au-delà du plafond : refus explicite, jamais une requête qui rame.
    const pageTropLoin = Math.floor(OFFSET_MAX / PAR_PAGE_DEFAUT) + 3;
    await expect(listerCatalogue({ page: pageTropLoin })).rejects.toBeInstanceOf(CatalogueRequeteInvalide);
  });

  it('trie TOUJOURS avec un départage par identifiant (pages stables)', async () => {
    await listerCatalogue({ tri: 'marque' });
    const ordre = argsPage().orderBy as Record<string, unknown>[];
    expect(ordre[0]).toEqual({ marque: 'asc' });
    expect(ordre[ordre.length - 1]).toEqual({ id: 'asc' });
  });

  it('le tri par fraîcheur place les fiches sans date en fin, jamais en tête', async () => {
    await listerCatalogue({ tri: 'fraicheur' });
    const ordre = argsPage().orderBy as Record<string, unknown>[];
    expect(ordre[0]).toEqual({ dateDerniereVerification: { sort: 'desc', nulls: 'last' } });
  });

  it('une clé de tri inconnue retombe sur l’ordre neutre', async () => {
    const res = await listerCatalogue({ tri: 'meilleur' as never });
    expect(res.tri).toBe('neutre');
    expect((argsPage().orderBy as Record<string, unknown>[])[0]).toEqual({ nomCommercial: 'asc' });
  });

  // ─── Filtres : exprimés en base, JAMAIS après la pagination ───────────────

  it('n’applique aucun filtre après la pagination (la page revient telle quelle)', async () => {
    // La base rend une fiche « lacunaire » alors que la facette demande
    // « bien_documentee » : si un filtre mémoire subsistait, elle disparaîtrait
    // de la page tout en restant comptée dans le total — page à trous.
    prisma.supplementProduct.findMany.mockResolvedValue([produit({ niveauCompletude: 'lacunaire' })]);
    prisma.supplementProduct.count.mockResolvedValue(1);
    const res = await listerCatalogue({ filtres: { qualite: ['bien_documentee'] } });
    expect(res.fiches).toHaveLength(1);
    expect(res.total).toBe(1);
  });

  it('exclut en base les fiches inactives et exige un pointeur de version courante', async () => {
    await listerCatalogue();
    expect(conditions()).toEqual(
      expect.arrayContaining([
        { versionCourante: { isNot: null } },
        { statutFiche: { not: 'inactive' } },
      ]),
    );
  });

  it('la recherche porte sur le nom ET la marque, insensible à la casse', async () => {
    await listerCatalogue({ recherche: '  Magnésium  ' });
    expect(conditions()).toEqual(
      expect.arrayContaining([
        {
          OR: [
            { nomCommercial: { contains: 'Magnésium', mode: 'insensitive' } },
            { marque: { contains: 'Magnésium', mode: 'insensitive' } },
          ],
        },
      ]),
    );
  });

  it('neutralise les jokers ILIKE saisis (le champ cherche ce qui y est écrit)', async () => {
    await listerCatalogue({ recherche: 'B_12 100% a\\b' });
    expect(conditions()).toEqual(
      expect.arrayContaining([
        {
          OR: [
            { nomCommercial: { contains: 'B\\_12 100\\% a\\\\b', mode: 'insensitive' } },
            { marque: { contains: 'B\\_12 100\\% a\\\\b', mode: 'insensitive' } },
          ],
        },
      ]),
    );
  });

  it('une recherche vide n’ajoute aucun prédicat de texte', async () => {
    await listerCatalogue({ recherche: '   ' });
    expect(JSON.stringify(conditions())).not.toContain('contains');
  });

  it('les facettes se combinent en ET, les valeurs d’une même facette en OU', async () => {
    await listerCatalogue({ filtres: { qualite: ['bien_documentee', 'partielle'], statut: ['verifiee'] } });
    const conds = conditions();
    expect(conds).toEqual(
      expect.arrayContaining([
        { OR: [{ niveauCompletude: 'bien_documentee' }, { niveauCompletude: 'partielle' }] },
        { statutFiche: 'verifiee' },
      ]),
    );
  });

  it('traduit « données manquantes » en test sur le tableau, dans les deux sens', async () => {
    await listerCatalogue({ filtres: { donneesManquantes: ['aucune'] } });
    expect(conditions()).toEqual(
      expect.arrayContaining([{ donneesManquantes: { isEmpty: true } }]),
    );

    vi.clearAllMocks();
    prisma.supplementProduct.findMany.mockResolvedValue([]);
    prisma.supplementProduct.count.mockResolvedValue(0);
    await listerCatalogue({ filtres: { donneesManquantes: ['liste_explicite'] } });
    expect(conditions()).toEqual(
      expect.arrayContaining([{ donneesManquantes: { isEmpty: false } }]),
    );
  });

  it('une facette dont AUCUNE valeur n’est satisfiable rend un vide, sans requête', async () => {
    // « non_evaluee » n'est jamais produite pour les données manquantes : le
    // filtre ne doit pas être ignoré (ce qui servirait tout le catalogue).
    const res = await listerCatalogue({ filtres: { donneesManquantes: ['non_evaluee'] } });
    expect(res.fiches).toEqual([]);
    expect(res.total).toBe(0);
    expect(prisma.supplementProduct.findMany).not.toHaveBeenCalled();
    expect(prisma.supplementProduct.count).not.toHaveBeenCalled();
  });

  it('« interactions signalées » exige un seuil actif qui bascule ET porte une alerte', async () => {
    await listerCatalogue({ filtres: { interactions: ['signalees'] } });
    expect(conditions()).toEqual(
      expect.arrayContaining([
        {
          compositions: {
            some: {
              ingredient: {
                functionalThresholds: {
                  some: { actif: true, basculeRisque: true, safetyAlertId: { not: null } },
                },
              },
            },
          },
        },
      ]),
    );
  });

  it('« aucune interaction connue » est REFUSÉE tant que la complétude n’est pas prouvée', async () => {
    // Le prédicat « un seuil actif existe, aucun ne bascule » se lit sur les
    // ingrédients RÉSOLUS : sur une fiche partielle, le porteur du signal peut
    // être justement celui qui manque. Un faux vert dans un filtre décide de ce
    // que le praticien voit — refuser, jamais servir approximativement.
    await expect(listerCatalogue({ filtres: { interactions: ['aucune_connue'] } }))
      .rejects.toBeInstanceOf(CatalogueRequeteInvalide);
    expect(prisma.supplementProduct.findMany).not.toHaveBeenCalled();
    expect(prisma.supplementProduct.count).not.toHaveBeenCalled();
  });

  it('refuse « aucune_connue » même mêlée à des valeurs servies (jamais un tri partiel)', async () => {
    await expect(listerCatalogue({ filtres: { interactions: ['signalees', 'aucune_connue'] } }))
      .rejects.toBeInstanceOf(CatalogueRequeteInvalide);
    expect(prisma.supplementProduct.findMany).not.toHaveBeenCalled();
  });

  it('refuse AVANT de résoudre l’intention (aucun travail inutile)', async () => {
    await expect(
      listerCatalogue({ intentionCode: 'sommeil_fragmente', filtres: { interactions: ['aucune_connue'] } }),
    ).rejects.toBeInstanceOf(CatalogueRequeteInvalide);
    expect(prisma.clinicalIntentTag.findMany).not.toHaveBeenCalled();
  });

  it('« interactions non évaluées » exige l’ABSENCE de tout seuil actif', async () => {
    await listerCatalogue({ filtres: { interactions: ['non_evaluee'] } });
    expect(conditions()).toEqual(
      expect.arrayContaining([
        {
          compositions: {
            none: { ingredient: { functionalThresholds: { some: { actif: true } } } },
          },
        },
      ]),
    );
  });

  // ─── Dimensions : calculées sur la page, sémantique inchangée ─────────────

  it('lit la qualité de formulation du niveau de complétude et le statut honnête de la fiche', async () => {
    prisma.supplementProduct.findMany.mockResolvedValue([
      produit({ id: 'p1', statutFiche: 'importee', niveauCompletude: 'partielle', donneesManquantes: ['excipients'] }),
    ]);
    prisma.supplementProduct.count.mockResolvedValue(1);
    const [fiche] = (await listerCatalogue()).fiches;
    expect(fiche.dimensions.qualiteFormulation.valeur).toBe('partielle');
    expect(fiche.statutFiche).toBe('importee');
    expect(fiche.statutLabel).toMatch(/importée/i);
    expect(fiche.dimensions.donneesManquantes.valeur).toBe('liste_explicite');
    expect(fiche.dimensions.donneesManquantes.elements).toEqual(['excipients']);
  });

  it('sans intention : dimensions dépendant du protocole restent « non évaluées » honnêtement', async () => {
    prisma.supplementProduct.findMany.mockResolvedValue([produit()]);
    prisma.supplementProduct.count.mockResolvedValue(1);
    const [fiche] = (await listerCatalogue()).fiches;
    expect(fiche.dimensions.compatibiliteProtocole.valeur).toBe('non_evaluee');
    expect(fiche.dimensions.cumulVsSeuils.valeur).toBe('non_evaluee');
    expect(fiche.dimensions.gradePreuveParIntention.valeurs).toEqual([]);
    expect(fiche.dimensions.biodisponibiliteForme.valeursPresentes).toEqual(['non_evaluee']);
    expect(fiche.reglesCorrespondantes).toBe(0);
    expect(prisma.clinicalRule.findMany).not.toHaveBeenCalled();
  });

  it('les seuils ne sont chargés QUE pour les ingrédients de la page', async () => {
    prisma.supplementProduct.findMany.mockResolvedValue([produit()]);
    prisma.supplementProduct.count.mockResolvedValue(140148);
    await listerCatalogue({ recherche: 'magnésium' });
    expect(prisma.ingredientFunctionalThreshold.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ingredientId: { in: ['ing_mag'] }, actif: true },
      }),
    );
  });

  it('signale les interactions depuis les alertes de sécurité des seuils (sans intention)', async () => {
    prisma.supplementProduct.findMany.mockResolvedValue([produit()]);
    prisma.supplementProduct.count.mockResolvedValue(1);
    prisma.ingredientFunctionalThreshold.findMany.mockResolvedValue([
      {
        ingredientId: 'ing_mag', basculeRisque: true,
        safetyAlert: { code: 'mag_diarrhee', messageFr: 'Doses élevées : risque digestif.', niveauAlerte: 'orange' },
        sourceReference: { id: 'src_seuil', citation: 'ANSES 2023', lienUrl: null },
      },
    ]);
    const [fiche] = (await listerCatalogue()).fiches;
    expect(fiche.dimensions.interactionsSignalees.valeur).toBe('signalees');
    expect(fiche.dimensions.interactionsSignalees.signalements[0].messageFr).toMatch(/digestif/);
    expect(fiche.dimensions.interactionsSignalees.mentionMedecin).toMatch(/médecin traitant/i);
    expect(fiche.referencesScientifiques.map(r => r.id)).toContain('src_seuil');
  });

  it('entrée par intention : grade GRADE par intention, forme préférée et compteur factuel', async () => {
    prisma.supplementProduct.findMany.mockResolvedValue([produit()]);
    prisma.supplementProduct.count.mockResolvedValue(1);
    prisma.clinicalIntentTag.findMany.mockResolvedValue([tagSommeil]);
    prisma.clinicalRule.findMany.mockResolvedValue([regleMag()]);

    const res = await listerCatalogue({ intentionCode: 'sommeil_fragmente' });
    expect(res.intentionFiltre).toEqual({ code: 'sommeil_fragmente', labelFr: 'Sommeil fragmenté' });
    const [fiche] = res.fiches;
    expect(fiche.dimensions.gradePreuveParIntention.valeurs).toEqual([
      expect.objectContaining({ intentionCode: 'sommeil_fragmente', ingredientCode: 'magnesium', grade: 'modere' }),
    ]);
    expect(fiche.dimensions.biodisponibiliteForme.valeursPresentes).toContain('forme_preferee');
    expect(fiche.reglesCorrespondantes).toBe(1);
    expect(fiche.referencesScientifiques.map(r => r.id)).toContain('src_1');
  });

  // ─── Abstention clinique : ne jamais tirer un feu vert du vide ────────────

  it('une fiche SANS composition reste « non évaluée », même avec une intention posée', async () => {
    // C'est le cas de TOUT le catalogue de production (0 composition).
    // Sans cette garde, l'intersection vide se lit « Compatible » et
    // « Aucun cumul » — deux verdicts positifs tirés de l'ignorance.
    prisma.supplementProduct.findMany.mockResolvedValue([produit({ compositions: [] })]);
    prisma.supplementProduct.count.mockResolvedValue(1);
    prisma.clinicalIntentTag.findMany.mockResolvedValue([tagSommeil]);
    prisma.clinicalRule.findMany.mockResolvedValue([regleMag()]);

    const [fiche] = (await listerCatalogue({ intentionCode: 'sommeil_fragmente' })).fiches;
    expect(fiche.dimensions.compatibiliteProtocole.valeur).toBe('non_evaluee');
    expect(fiche.dimensions.cumulVsSeuils.valeur).toBe('non_evaluee');
    expect(fiche.dimensions.cumulVsSeuils.justification).toMatch(/ne vaut pas absence de risque/i);
  });

  it('une fiche partiellement résolue ne rend AUCUN verdict positif', async () => {
    // Le cas que la phase 1b va créer en masse : des compositions existent,
    // sans preuve qu'elles soient toutes là. Lue par « length > 0 », la fiche
    // repasserait « connue » et rendrait Compatible / Aucun cumul.
    prisma.supplementProduct.findMany.mockResolvedValue([produit()]);
    prisma.supplementProduct.count.mockResolvedValue(1);
    prisma.clinicalIntentTag.findMany.mockResolvedValue([tagSommeil]);
    prisma.clinicalRule.findMany.mockResolvedValue([regleMag()]);

    const [fiche] = (await listerCatalogue({ intentionCode: 'sommeil_fragmente' })).fiches;
    expect(fiche.completudeComposition).toBe('partielle');
    expect(fiche.dimensions.compatibiliteProtocole.valeur).toBe('non_evaluee');
    expect(fiche.dimensions.cumulVsSeuils.valeur).toBe('non_evaluee');
    expect(fiche.dimensions.interactionsSignalees.valeur).toBe('non_evaluee');
  });

  it('annonce l’état de la composition sur CHAQUE fiche servie', async () => {
    prisma.supplementProduct.findMany.mockResolvedValue([
      produit({ id: 'p_vide', compositions: [] }),
      produit({ id: 'p_partielle' }),
    ]);
    prisma.supplementProduct.count.mockResolvedValue(2);
    const { fiches } = await listerCatalogue();
    expect(fiches.map((f) => f.completudeComposition)).toEqual(['absente', 'partielle']);
  });

  it('une intention INCONNUE n’ouvre aucune lecture (pas de feu vert par saisie au hasard)', async () => {
    prisma.supplementProduct.findMany.mockResolvedValue([produit()]);
    prisma.supplementProduct.count.mockResolvedValue(1);
    // Aucun tag ne correspond : le code saisi est inconnu.
    prisma.clinicalIntentTag.findMany.mockResolvedValue([]);
    prisma.clinicalRule.findMany.mockResolvedValue([]);

    const res = await listerCatalogue({ intentionCode: 'xyz_nimporte_quoi' });
    expect(res.intentionFiltre).toBeNull();
    const [fiche] = res.fiches;
    expect(fiche.dimensions.compatibiliteProtocole.valeur).toBe('non_evaluee');
    expect(fiche.dimensions.cumulVsSeuils.valeur).toBe('non_evaluee');
  });

  it('marque une forme non préférée quand elle diffère de la forme gouvernée', async () => {
    prisma.supplementProduct.findMany.mockResolvedValue([
      produit({
        compositions: [
          {
            doseParDjr: 200, unite: 'mg', position: 0,
            ingredient: { id: 'ing_mag', code: 'magnesium', nomFr: 'Magnésium' },
            forme: { id: 'forme_oxyde', code: 'oxyde', labelFr: 'Oxyde' },
          },
        ],
      }),
    ]);
    prisma.supplementProduct.count.mockResolvedValue(1);
    prisma.clinicalIntentTag.findMany.mockResolvedValue([tagSommeil]);
    prisma.clinicalRule.findMany.mockResolvedValue([regleMag()]);
    const [fiche] = (await listerCatalogue({ intentionCode: 'sommeil_fragmente' })).fiches;
    expect(fiche.dimensions.biodisponibiliteForme.valeursPresentes).toContain('non_preferee');
  });

  it('l’ordre rendu est celui de la base, jamais retrié en mémoire', async () => {
    prisma.supplementProduct.findMany.mockResolvedValue([
      produit({ id: 'p_z', nomCommercial: 'Zinc Basique' }),
      produit({ id: 'p_a', nomCommercial: 'Acérola' }),
    ]);
    prisma.supplementProduct.count.mockResolvedValue(2);
    const res = await listerCatalogue();
    expect(res.fiches.map(f => f.nomCommercial)).toEqual(['Zinc Basique', 'Acérola']);
  });
});

// ─── Complétude de composition ──────────────────────────────────────────────

describe('lireCompletudeComposition', () => {
  it('aucune ligne : « absente »', () => {
    expect(lireCompletudeComposition(0, null)).toBe('absente');
    expect(lireCompletudeComposition(0, 12)).toBe('absente');
  });

  it('des lignes SANS preuve du total attendu : « partielle », jamais « integre »', () => {
    // L'état de production après la première vague de résolution.
    expect(lireCompletudeComposition(1, null)).toBe('partielle');
    expect(lireCompletudeComposition(999, null)).toBe('partielle');
  });

  it('moins de lignes que la source n’en déclare : « partielle »', () => {
    expect(lireCompletudeComposition(3, 12)).toBe('partielle');
    expect(lireCompletudeComposition(11, 12)).toBe('partielle');
  });

  it('toutes les lignes de la source résolues : « integre »', () => {
    expect(lireCompletudeComposition(12, 12)).toBe('integre');
  });

  it('« integre » est INATTEIGNABLE sans preuve — c’est le fail-closed du lot', () => {
    // La colonne `composition_source_lignes` existe depuis 20260731200000 mais
    // rien ne l'écrit : elle vaut `null` sur les 140 148 fiches. Aucune ne peut
    // donc franchir le seuil, quel que soit le nombre de lignes résolues.
    for (const n of [1, 5, 50, 10_000]) {
      expect(lireCompletudeComposition(n, null)).not.toBe('integre');
    }
  });

  // Un compte attendu de zéro n'est PAS une preuve d'exhaustivité. Sans ce
  // garde, `n >= 0` serait vrai pour toute fiche portant au moins une ligne :
  // une valeur creuse ouvrirait les trois verdicts positifs (`Compatible`,
  // `Aucun cumul`, `Aucune interaction connue`) sur une fiche dont on ne sait
  // rien. Le CHECK en base interdit le négatif, pas le zéro — et zéro est une
  // valeur légitime : 406 fiches de la source ne déclarent aucun actif.
  it('un compte source de ZÉRO ne prouve rien : « partielle », jamais « integre »', () => {
    for (const n of [1, 5, 50, 10_000]) {
      expect(lireCompletudeComposition(n, 0)).toBe('partielle');
    }
    // Et une valeur négative, si elle franchissait un jour la base, ne doit pas
    // davantage valoir preuve.
    expect(lireCompletudeComposition(3, -1)).toBe('partielle');
  });
});

describe('appliquerCompletude — l’asymétrie positif / feu vert', () => {
  function dimensions(over: Partial<DimensionsFiche> = {}): DimensionsFiche {
    return {
      qualiteFormulation: { valeur: 'bien_documentee', justification: 'q' },
      biodisponibiliteForme: { valeurs: [], valeursPresentes: [], justification: 'bio' },
      gradePreuveParIntention: { valeurs: [], justification: 'grade' },
      compatibiliteProtocole: { valeur: 'compatible', justification: 'compat' },
      interactionsSignalees: {
        valeur: 'aucune_connue', signalements: [], mentionMedecin: 'm', justification: 'inter',
      },
      cumulVsSeuils: { valeur: 'aucun', signaux: [], justification: 'cumul' },
      donneesManquantes: { valeur: 'aucune', elements: [], justification: 'dm' },
      fraicheurProvenance: {
        provenance: 'dgccrf', identifiantSource: 'X', urlSource: null,
        dateDerniereVerification: null, versionFormulation: 1,
        statutFiche: 'importee', statutLabel: 'Importée', justification: 'f',
      },
      ...over,
    };
  }

  it('sur « integre », rend les dimensions à l’identique (les calculateurs font foi)', () => {
    const d = dimensions();
    expect(appliquerCompletude(d, 'integre')).toBe(d);
  });

  // Le feu vert exige une composition intègre — dans les deux états incomplets.
  it.each(['absente', 'partielle'] as const)(
    'sur « %s », les trois verdicts positifs par ABSENCE tombent à « non évaluée »',
    (completude) => {
      const d = appliquerCompletude(dimensions(), completude);
      expect(d.cumulVsSeuils.valeur).toBe('non_evaluee');
      expect(d.compatibiliteProtocole.valeur).toBe('non_evaluee');
      expect(d.interactionsSignalees.valeur).toBe('non_evaluee');
    },
  );

  // Un signal TROUVÉ ne dépend pas de ce qu'on ignore : le taire masquerait un
  // risque réel. C'est l'autre moitié de l'asymétrie, et la plus facile à
  // casser en généralisant « tout devient non_evaluee ».
  it.each(['absente', 'partielle'] as const)(
    'sur « %s », un cumul SIGNALÉ survit intact',
    (completude) => {
      const signal = { valeur: 'signale' as const, signaux: [], justification: 'trouvé' };
      const d = appliquerCompletude(dimensions({ cumulVsSeuils: signal }), completude);
      expect(d.cumulVsSeuils).toEqual(signal);
    },
  );

  it.each(['absente', 'partielle'] as const)(
    'sur « %s », des interactions SIGNALÉES survivent intactes',
    (completude) => {
      const signalees = {
        valeur: 'signalees' as const,
        signalements: [{ code: 'a', messageFr: 'm', niveauAlerte: 'orange', ingredientCode: 'zinc' }],
        mentionMedecin: 'm', justification: 'trouvé',
      };
      const d = appliquerCompletude(dimensions({ interactionsSignalees: signalees }), completude);
      expect(d.interactionsSignalees).toEqual(signalees);
    },
  );

  it.each(['vigilance_requise', 'compatible_avec_vigilance'] as const)(
    'la lecture de vigilance « %s » survit à une composition partielle',
    (valeur) => {
      const compat = { valeur, justification: 'signal de la sentinelle' };
      const d = appliquerCompletude(dimensions({ compatibiliteProtocole: compat }), 'partielle');
      expect(d.compatibiliteProtocole).toEqual(compat);
    },
  );

  it('sur « partielle », les énumérations restent mais s’annoncent incomplètes', () => {
    const d = appliquerCompletude(dimensions(), 'partielle');
    expect(d.biodisponibiliteForme.justification).toMatch(/incomplète/i);
    expect(d.gradePreuveParIntention.justification).toMatch(/incomplète/i);
  });

  it('sur « absente », les énumérations ne portent PAS la mention de liste partielle', () => {
    const d = appliquerCompletude(dimensions(), 'absente');
    expect(d.biodisponibiliteForme.justification).toBe('bio');
    expect(d.gradePreuveParIntention.justification).toBe('grade');
  });

  it('distingue les deux ignorances dans la justification servie au praticien', () => {
    expect(appliquerCompletude(dimensions(), 'absente').cumulVsSeuils.justification)
      .toMatch(/composition inconnue/i);
    expect(appliquerCompletude(dimensions(), 'partielle').cumulVsSeuils.justification)
      .toMatch(/partiellement résolue/i);
  });

  it('n’efface jamais la mention « l’absence de signal ne vaut pas absence de risque »', () => {
    for (const completude of ['absente', 'partielle'] as const) {
      const d = appliquerCompletude(dimensions(), completude);
      expect(d.cumulVsSeuils.justification).toMatch(/ne vaut pas absence de risque/i);
      expect(d.interactionsSignalees.justification).toMatch(/ne vaut pas absence de risque/i);
    }
  });

  it('ne touche à AUCUNE dimension indépendante de la composition', () => {
    const d = dimensions();
    const apres = appliquerCompletude(d, 'partielle');
    expect(apres.qualiteFormulation).toEqual(d.qualiteFormulation);
    expect(apres.donneesManquantes).toEqual(d.donneesManquantes);
    expect(apres.fraicheurProvenance).toEqual(d.fraicheurProvenance);
  });
});
