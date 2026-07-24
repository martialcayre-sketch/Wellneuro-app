import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    supplementProductVersionCourante: { findMany: vi.fn() },
    ingredientFunctionalThreshold: { findMany: vi.fn() },
    clinicalIntentTag: { findMany: vi.fn() },
    clinicalRule: { findMany: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { listerCatalogue } from './catalogue';

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

function ligneProduit(over: Partial<{ id: string; nomCommercial: string; marque: string; statutFiche: string; niveauCompletude: string; donneesManquantes: string[]; dateDerniereVerification: Date | null; compositions: unknown[] }> = {}) {
  const product = {
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
        doseParPortion: 200, unite: 'mg', position: 0,
        ingredient: { id: 'ing_mag', code: 'magnesium', nomFr: 'Magnésium' },
        forme: { id: 'forme_bisg', code: 'bisglycinate', labelFr: 'Bisglycinate' },
      },
    ],
  };
  return { productId: product.id, product };
}

describe('listerCatalogue (service catalogue C4A)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WN_C4_ENABLED = 'true';
    prisma.supplementProductVersionCourante.findMany.mockResolvedValue([]);
    prisma.ingredientFunctionalThreshold.findMany.mockResolvedValue([]);
    prisma.clinicalIntentTag.findMany.mockResolvedValue([]);
    prisma.clinicalRule.findMany.mockResolvedValue([]);
  });

  it('refuse tout service quand WN_C4_ENABLED est absent ou faux (fail-closed)', async () => {
    delete process.env.WN_C4_ENABLED;
    await expect(listerCatalogue()).rejects.toThrow(/WN_C4_ENABLED/);
    process.env.WN_C4_ENABLED = 'false';
    await expect(listerCatalogue()).rejects.toThrow(/WN_C4_ENABLED/);
    expect(prisma.supplementProductVersionCourante.findMany).not.toHaveBeenCalled();
  });

  it('gère un catalogue vide sans erreur (aucune fiche)', async () => {
    const res = await listerCatalogue();
    expect(res.fiches).toEqual([]);
    expect(res.total).toBe(0);
    expect(res.aucunScoreGlobal).toBe(true);
  });

  it('ne produit AUCUN score global agrégé', async () => {
    prisma.supplementProductVersionCourante.findMany.mockResolvedValue([ligneProduit()]);
    const res = await listerCatalogue();
    expect(res.aucunScoreGlobal).toBe(true);
    // Aucune clé de score / classement / note / rang en sortie.
    expect(JSON.stringify(res)).not.toMatch(/"(score|note|rang|classement|poids|meilleurChoix)":/i);
  });

  it('lit la qualité de formulation du niveau de complétude et le statut honnête de la fiche', async () => {
    prisma.supplementProductVersionCourante.findMany.mockResolvedValue([
      ligneProduit({ id: 'p1', statutFiche: 'importee', niveauCompletude: 'partielle', donneesManquantes: ['excipients'] }),
    ]);
    const [fiche] = (await listerCatalogue()).fiches;
    expect(fiche.dimensions.qualiteFormulation.valeur).toBe('partielle');
    expect(fiche.statutFiche).toBe('importee');
    expect(fiche.statutLabel).toMatch(/importée/i);
    expect(fiche.dimensions.donneesManquantes.valeur).toBe('liste_explicite');
    expect(fiche.dimensions.donneesManquantes.elements).toEqual(['excipients']);
  });

  it('sans intention : dimensions dépendant du protocole restent « non évaluées » honnêtement', async () => {
    prisma.supplementProductVersionCourante.findMany.mockResolvedValue([ligneProduit()]);
    const [fiche] = (await listerCatalogue()).fiches;
    expect(fiche.dimensions.compatibiliteProtocole.valeur).toBe('non_evaluee');
    expect(fiche.dimensions.cumulVsSeuils.valeur).toBe('non_evaluee');
    expect(fiche.dimensions.gradePreuveParIntention.valeurs).toEqual([]);
    expect(fiche.dimensions.biodisponibiliteForme.valeursPresentes).toEqual(['non_evaluee']);
    expect(fiche.reglesCorrespondantes).toBe(0);
    // La résolution n'a pas été appelée : aucune intention demandée.
    expect(prisma.clinicalRule.findMany).not.toHaveBeenCalled();
  });

  it('signale les interactions depuis les alertes de sécurité des seuils (sans intention)', async () => {
    prisma.supplementProductVersionCourante.findMany.mockResolvedValue([ligneProduit()]);
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
    // La source du seuil enrichit les références scientifiques de la fiche.
    expect(fiche.referencesScientifiques.map(r => r.id)).toContain('src_seuil');
  });

  it('entrée par intention : grade GRADE par intention, forme préférée et compteur factuel', async () => {
    prisma.supplementProductVersionCourante.findMany.mockResolvedValue([ligneProduit()]);
    prisma.clinicalIntentTag.findMany.mockResolvedValue([tagSommeil]);
    prisma.clinicalRule.findMany.mockResolvedValue([regleMag()]);

    const res = await listerCatalogue({ intentionCode: 'sommeil_fragmente' });
    expect(res.intentionFiltre).toEqual({ code: 'sommeil_fragmente', labelFr: 'Sommeil fragmenté' });
    const [fiche] = res.fiches;
    expect(fiche.dimensions.gradePreuveParIntention.valeurs).toEqual([
      expect.objectContaining({ intentionCode: 'sommeil_fragmente', ingredientCode: 'magnesium', grade: 'modere' }),
    ]);
    // La forme de la fiche (bisglycinate) EST la forme préférée de la règle.
    expect(fiche.dimensions.biodisponibiliteForme.valeursPresentes).toContain('forme_preferee');
    expect(fiche.reglesCorrespondantes).toBe(1);
    expect(fiche.referencesScientifiques.map(r => r.id)).toContain('src_1');
  });

  it('marque une forme non préférée quand elle diffère de la forme gouvernée', async () => {
    prisma.supplementProductVersionCourante.findMany.mockResolvedValue([
      ligneProduit({
        compositions: [
          {
            doseParPortion: 200, unite: 'mg', position: 0,
            ingredient: { id: 'ing_mag', code: 'magnesium', nomFr: 'Magnésium' },
            forme: { id: 'forme_oxyde', code: 'oxyde', labelFr: 'Oxyde' },
          },
        ],
      }),
    ]);
    prisma.clinicalIntentTag.findMany.mockResolvedValue([tagSommeil]);
    prisma.clinicalRule.findMany.mockResolvedValue([regleMag()]);
    const [fiche] = (await listerCatalogue({ intentionCode: 'sommeil_fragmente' })).fiches;
    expect(fiche.dimensions.biodisponibiliteForme.valeursPresentes).toContain('non_preferee');
  });

  it('les facettes filtrent INDÉPENDAMMENT (chaque dimension, sans pondérer les autres)', async () => {
    prisma.supplementProductVersionCourante.findMany.mockResolvedValue([
      ligneProduit({ id: 'p_bien', nomCommercial: 'Alpha', niveauCompletude: 'bien_documentee' }),
      ligneProduit({ id: 'p_lac', nomCommercial: 'Bravo', niveauCompletude: 'lacunaire' }),
    ]);
    const toutes = await listerCatalogue();
    expect(toutes.fiches).toHaveLength(2);

    // Facette qualité seule : ne garde que la fiche « bien documentée ».
    const filtre = await listerCatalogue({ filtres: { qualite: ['bien_documentee'] } });
    expect(filtre.fiches.map(f => f.produitId)).toEqual(['p_bien']);

    // Facette statut indépendante : les deux sont « importee » → aucune exclue.
    const parStatut = await listerCatalogue({ filtres: { statut: ['importee'] } });
    expect(parStatut.fiches).toHaveLength(2);

    // Deux facettes se combinent en ET : qualité bien_documentee ET statut verifiee → aucune.
    const combine = await listerCatalogue({ filtres: { qualite: ['bien_documentee'], statut: ['verifiee'] } });
    expect(combine.fiches).toHaveLength(0);
  });

  it('trie en mono-dimension, ordre neutre alphabétique par défaut', async () => {
    prisma.supplementProductVersionCourante.findMany.mockResolvedValue([
      ligneProduit({ id: 'p_z', nomCommercial: 'Zinc Basique' }),
      ligneProduit({ id: 'p_a', nomCommercial: 'Acérola' }),
    ]);
    const neutre = await listerCatalogue();
    expect(neutre.tri).toBe('neutre');
    expect(neutre.fiches.map(f => f.nomCommercial)).toEqual(['Acérola', 'Zinc Basique']);

    const parMarque = await listerCatalogue({ tri: 'marque' });
    expect(parMarque.tri).toBe('marque');

    // Une clé de tri inconnue retombe sur l'ordre neutre.
    const inconnu = await listerCatalogue({ tri: 'meilleur' as never });
    expect(inconnu.tri).toBe('neutre');
  });
});
