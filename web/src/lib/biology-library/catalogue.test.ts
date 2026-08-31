import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    biologyAnalyte: { findMany: vi.fn() },
    biologyPanel: { findMany: vi.fn() },
    biologyCatalogVersionCourante: { findUnique: vi.fn() },
    biologyNabmActe: { findMany: vi.fn() },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma }));

import { listerCatalogueBiologie } from './catalogue';

function analyteBase(surcharge: Record<string, unknown> = {}) {
  return {
    code: 'BIO_FERRITINE',
    libelle: 'Ferritine',
    libellePatient: 'Réserves en fer',
    unite: 'ng/mL',
    typePrelevement: 'sang_veineux',
    delaiRenduIndicatif: null,
    sourceProvenance: 'saisie_praticien',
    statutFiche: 'importee',
    niveauCompletude: 'partielle',
    donneesManquantes: [],
    incertitudes: null,
    verifieLe: null,
    validationMedicaleRequise: false,
    plagesReference: [],
    plagesFonctionnelles: [],
    correspondancesNabm: [],
    preanalytiques: [],
    itemsPanel: [],
    ...surcharge,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  prisma.biologyAnalyte.findMany.mockResolvedValue([]);
  prisma.biologyPanel.findMany.mockResolvedValue([]);
  prisma.biologyCatalogVersionCourante.findUnique.mockResolvedValue(null);
  prisma.biologyNabmActe.findMany.mockResolvedValue([]);
});

describe('remboursement — dérivé par remboursable.ts, jamais recalculé ici', () => {
  it('aucune correspondance : non_evalue, et la table des actes n’est PAS interrogée', async () => {
    prisma.biologyAnalyte.findMany.mockResolvedValue([analyteBase()]);
    prisma.biologyCatalogVersionCourante.findUnique.mockResolvedValue({
      versionSource: 'V105',
      nombreEntrees: 987,
      importeLe: new Date('2026-07-26T00:00:00.000Z'),
    });

    const catalogue = await listerCatalogueBiologie();

    expect(catalogue.analytes[0].remboursement).toEqual({
      statut: 'non_evalue',
      conditions: [],
      codesActesRetenus: [],
    });
    // Sans code cité, la requête des 987 actes ne part pas.
    expect(prisma.biologyNabmActe.findMany).not.toHaveBeenCalled();
  });

  it('correspondance SIGNÉE vers un acte actif du millésime courant : remboursable, conditions affichées', async () => {
    prisma.biologyAnalyte.findMany.mockResolvedValue([
      analyteBase({
        correspondancesNabm: [
          { codeActe: '1104', nature: 'isole', verifiePar: 'praticien@wellneuro.fr' },
        ],
      }),
    ]);
    prisma.biologyCatalogVersionCourante.findUnique.mockResolvedValue({
      versionSource: 'V105',
      nombreEntrees: 987,
      importeLe: new Date('2026-07-26T00:00:00.000Z'),
    });
    prisma.biologyNabmActe.findMany.mockResolvedValue([
      {
        codeActe: '1104',
        inactif: false,
        ententePrealable: true,
        acteReserve: null,
        remboursementTotal: true,
      },
    ]);

    const catalogue = await listerCatalogueBiologie();

    expect(catalogue.analytes[0].remboursement).toEqual({
      statut: 'remboursable',
      conditions: ['entente_prealable'],
      codesActesRetenus: ['1104'],
    });
    // Seuls les codes cités sont chargés, dans le millésime pointé.
    expect(prisma.biologyNabmActe.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { versionSource: 'V105', codeActe: { in: ['1104'] } },
      }),
    );
  });

  it('correspondance signée mais source jamais importée (pas de pointeur) : hors_nomenclature', async () => {
    prisma.biologyAnalyte.findMany.mockResolvedValue([
      analyteBase({
        correspondancesNabm: [
          { codeActe: '1104', nature: 'isole', verifiePar: 'praticien@wellneuro.fr' },
        ],
      }),
    ]);
    prisma.biologyCatalogVersionCourante.findUnique.mockResolvedValue(null);

    const catalogue = await listerCatalogueBiologie();

    expect(catalogue.analytes[0].remboursement.statut).toBe('hors_nomenclature');
    expect(prisma.biologyNabmActe.findMany).not.toHaveBeenCalled();
  });
});

describe('fiches et panels — passage fidèle, absences comprises', () => {
  it('les deux référentiels sont transmis séparément, une colonne vide reste vide', async () => {
    prisma.biologyAnalyte.findMany.mockResolvedValue([
      analyteBase({
        plagesFonctionnelles: [
          {
            borneMin: 50,
            borneMax: 80,
            unite: 'ng/mL',
            population: 'adulte_tout_venant',
            claimId: 'WN-CL-0044-003',
            versionClaim: '1',
            niveauPreuve: 'mecanisme',
          },
        ],
      }),
    ]);

    const catalogue = await listerCatalogueBiologie();
    const fiche = catalogue.analytes[0];

    expect(fiche.plagesLaboratoire).toEqual([]);
    expect(fiche.plagesFonctionnelles).toHaveLength(1);
    expect(fiche.plagesFonctionnelles[0].claimId).toBe('WN-CL-0044-003');
  });

  it('un panel inactif citant l’analyte n’apparaît pas sur la fiche', async () => {
    prisma.biologyAnalyte.findMany.mockResolvedValue([
      analyteBase({
        itemsPanel: [
          { panel: { code: 'PANEL_FATIGUE_1', libelle: 'Fatigue', niveau: 'socle', actif: true } },
          { panel: { code: 'PANEL_RETIRE', libelle: 'Retiré', niveau: 'socle', actif: false } },
        ],
      }),
    ]);

    const catalogue = await listerCatalogueBiologie();

    expect(catalogue.analytes[0].panels).toEqual([
      { code: 'PANEL_FATIGUE_1', libelle: 'Fatigue', niveau: 'socle' },
    ]);
  });

  it('un item de panel porte SOIT un analyte SOIT un ratio, typé pour l’écran', async () => {
    prisma.biologyPanel.findMany.mockResolvedValue([
      {
        code: 'PANEL_METABOLIQUE_1',
        libelle: 'Métabolique',
        niveau: 'socle',
        objectif: null,
        items: [
          { analyte: { code: 'BIO_GLYCEMIE', libelle: 'Glycémie à jeun' }, ratio: null },
          { analyte: null, ratio: { code: 'RATIO_HOMA', libelle: 'HOMA' } },
        ],
      },
    ]);

    const catalogue = await listerCatalogueBiologie();

    expect(catalogue.panels[0].items).toEqual([
      { type: 'analyte', code: 'BIO_GLYCEMIE', libelle: 'Glycémie à jeun' },
      { type: 'ratio', code: 'RATIO_HOMA', libelle: 'HOMA' },
    ]);
  });

  it('verifieLe et le millésime sortent en ISO, prêts pour l’écran', async () => {
    prisma.biologyAnalyte.findMany.mockResolvedValue([
      analyteBase({ verifieLe: new Date('2026-08-17T00:00:00.000Z') }),
    ]);
    prisma.biologyCatalogVersionCourante.findUnique.mockResolvedValue({
      versionSource: 'V105',
      nombreEntrees: 987,
      importeLe: new Date('2026-07-26T00:00:00.000Z'),
    });

    const catalogue = await listerCatalogueBiologie();

    expect(catalogue.analytes[0].verifieLe).toBe('2026-08-17T00:00:00.000Z');
    expect(catalogue.millesimeNabm).toEqual({
      versionSource: 'V105',
      nombreEntrees: 987,
      importeLe: '2026-07-26T00:00:00.000Z',
    });
  });
});
