import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    biologyAnalyte: { findMany: vi.fn() },
    biologyPanel: { findMany: vi.fn() },
    biologyCatalogVersionCourante: { findUnique: vi.fn() },
    biologyNabmActe: { findMany: vi.fn() },
    biologyAnalyteComposition: { findMany: vi.fn() },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma }));

const { claimsValidesAuCorpus, claimsNonSupplantesAuCorpus } = vi.hoisted(() => ({
  claimsValidesAuCorpus: vi.fn(),
  claimsNonSupplantesAuCorpus: vi.fn(),
}));
vi.mock('@/lib/rag/claims/validite', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/rag/claims/validite')>()),
  claimsValidesAuCorpus,
  claimsNonSupplantesAuCorpus,
}));

import { listerCatalogueBiologie } from './catalogue';
import { INDICATIONS_BIOLOGIE_V1 } from './indicationsBiologieV1';

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
    constatNabm: null,
    preanalytiques: [],
    liensCliniques: [],
    ...surcharge,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  prisma.biologyAnalyte.findMany.mockResolvedValue([]);
  prisma.biologyPanel.findMany.mockResolvedValue([]);
  prisma.biologyCatalogVersionCourante.findUnique.mockResolvedValue(null);
  prisma.biologyNabmActe.findMany.mockResolvedValue([]);
  prisma.biologyAnalyteComposition.findMany.mockResolvedValue([]);
  claimsValidesAuCorpus.mockResolvedValue(new Set());
  claimsNonSupplantesAuCorpus.mockResolvedValue(new Set());
});

describe('remboursement d’un calculé signé — hérité de ses mesures (D-323 §4)', () => {
  const signee = (code: string, libelle: string, acteCode: string) =>
    analyteBase({
      code,
      libelle,
      correspondancesNabm: [{ codeActe: acteCode, nature: 'isole', verifiePar: 'praticien@wellneuro.fr' }],
    });

  beforeEach(() => {
    prisma.biologyCatalogVersionCourante.findUnique.mockResolvedValue({
      versionSource: 'V105',
      nombreEntrees: 987,
      importeLe: new Date('2026-07-26T00:00:00.000Z'),
    });
    prisma.biologyNabmActe.findMany.mockResolvedValue(
      ['0552', '7422'].map(codeActe => ({ codeActe, inactif: false, ententePrealable: false, acteReserve: false, remboursementTotal: true })),
    );
  });

  it('composition signée : la fiche du calculé dit « remboursable », par ses mesures', async () => {
    prisma.biologyAnalyte.findMany.mockResolvedValue([
      analyteBase({ code: 'BIO_RATIO_HOMA', libelle: 'Indice HOMA' }),
      signee('BIO_GLYCEMIE_JEUN', 'Glycémie à jeun', '0552'),
      signee('BIO_INSULINE', 'Insuline', '7422'),
    ]);
    prisma.biologyAnalyteComposition.findMany.mockResolvedValue([
  {
    analyteCode: 'BIO_RATIO_HOMA',
    type: 'calcul',
    analyte: { libelle: 'Indice HOMA' },
    items: [
      { composant: { code: 'BIO_GLYCEMIE_JEUN', libelle: 'Glycémie à jeun', actif: true } },
      { composant: { code: 'BIO_INSULINE', libelle: 'Insuline', actif: true } },
    ],
  },
]);
    const fiche = (await listerCatalogueBiologie()).analytes.find(a => a.code === 'BIO_RATIO_HOMA')!;
    expect(fiche.remboursement.statut).toBe('remboursable');
    expect(fiche.remboursement.parMesures?.map(m => m.code)).toEqual(['BIO_GLYCEMIE_JEUN', 'BIO_INSULINE']);
    expect(prisma.biologyAnalyteComposition.findMany.mock.calls[0][0].where).toEqual({ retireeLe: null, analyte: { actif: true } });
  });

  it('contre-épreuve : sans composition signée, le calculé reste « non évalué »', async () => {
    prisma.biologyAnalyte.findMany.mockResolvedValue([
      analyteBase({ code: 'BIO_RATIO_HOMA', libelle: 'Indice HOMA' }),
      signee('BIO_GLYCEMIE_JEUN', 'Glycémie à jeun', '0552'),
    ]);
    const fiche = (await listerCatalogueBiologie()).analytes.find(a => a.code === 'BIO_RATIO_HOMA')!;
    expect(fiche.remboursement).toEqual({ statut: 'non_evalue', conditions: [], codesActesRetenus: [] });
  });
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

  it('correspondances uniquement NON signées : non_evalue, et la requête des actes ne part pas non plus', async () => {
    // Verrouille le filtre posé en revue (commit Copilot d9efc6d0) : une ligne
    // non signée est une proposition de rapprochement — `deriverRemboursement`
    // ne la lira pas, charger ses actes serait un aller-retour pour rien.
    prisma.biologyAnalyte.findMany.mockResolvedValue([
      analyteBase({
        correspondancesNabm: [{ codeActe: '1104', nature: 'isole', verifiePar: null }],
      }),
    ]);
    prisma.biologyCatalogVersionCourante.findUnique.mockResolvedValue({
      versionSource: 'V105',
      nombreEntrees: 987,
      importeLe: new Date('2026-07-26T00:00:00.000Z'),
    });

    const catalogue = await listerCatalogueBiologie();

    expect(catalogue.analytes[0].remboursement.statut).toBe('non_evalue');
    expect(prisma.biologyNabmActe.findMany).not.toHaveBeenCalled();
  });

  it('constat « aucun acte » sur le millésime courant : hors_nomenclature ; sur un millésime antérieur : non_evalue (M-3c)', async () => {
    const pointeur = { versionSource: 'V105', nombreEntrees: 987, importeLe: new Date('2026-07-26T00:00:00.000Z') };
    prisma.biologyCatalogVersionCourante.findUnique.mockResolvedValue(pointeur);
    prisma.biologyAnalyte.findMany.mockResolvedValue([
      analyteBase({ code: 'BIO_CAR', constatNabm: { millesime: 'V105' } }),
      analyteBase({ code: 'BIO_HOMOCYSTEINE', constatNabm: { millesime: 'V104' } }),
    ]);

    const catalogue = await listerCatalogueBiologie();

    expect(catalogue.analytes.map(a => [a.code, a.remboursement.statut])).toEqual([
      ['BIO_CAR', 'hors_nomenclature'],
      ['BIO_HOMOCYSTEINE', 'non_evalue'],
    ]);
    // Le constat se lit avec l'analyte : pas de requête des actes pour lui.
    expect(prisma.biologyNabmActe.findMany).not.toHaveBeenCalled();
    expect(prisma.biologyAnalyte.findMany.mock.calls[0][0].select.constatNabm).toEqual({ select: { millesime: true } });
  });

  it('constat « aucun acte » sans nomenclature importée (pas de pointeur) : non_evalue', async () => {
    prisma.biologyAnalyte.findMany.mockResolvedValue([analyteBase({ constatNabm: { millesime: 'V105' } })]);

    const catalogue = await listerCatalogueBiologie();

    expect(catalogue.analytes[0].remboursement.statut).toBe('non_evalue');
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

describe('fiches — passage fidèle, absences comprises', () => {
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

  it('plus aucun bilan servi : ni liste au catalogue, ni bilans sur la fiche (D-320 §2)', async () => {
    prisma.biologyAnalyte.findMany.mockResolvedValue([analyteBase()]);

    const catalogue = await listerCatalogueBiologie();

    expect(catalogue).not.toHaveProperty('panels');
    expect(catalogue.analytes[0]).not.toHaveProperty('panels');
    expect(catalogue.analytes[0].nonIndiques).toEqual([]);
  });

  it('seuls les bilans des règles non indiquées, actifs, sont lus — pour leur libellé', async () => {
    await listerCatalogueBiologie();

    expect(prisma.biologyPanel.findMany).toHaveBeenCalledWith({
      where: { actif: true, code: { in: ['PANEL_MG_PLASMATIQUE', 'PANEL_CORTISOL_ISOLE'] } },
      select: { code: true, libelle: true },
    });
  });

  it('l’alternative porte l’exploration non indiquée, motif VERBATIM de la table signée (D-320 §3)', async () => {
    prisma.biologyAnalyte.findMany.mockResolvedValue([
      analyteBase({ code: 'BIO_MAGNESIUM_ERYTHROCYTAIRE', libelle: 'Magnésium érythrocytaire' }),
      analyteBase({ code: 'BIO_CAR', libelle: 'Cortisol awakening response' }),
      analyteBase(),
    ]);
    prisma.biologyPanel.findMany.mockResolvedValue([
      { code: 'PANEL_MG_PLASMATIQUE', libelle: 'Magnésium plasmatique' },
      { code: 'PANEL_CORTISOL_ISOLE', libelle: 'Cortisol matinal isolé' },
    ]);
    const motif = (id: string) => INDICATIONS_BIOLOGIE_V1.find(regle => regle.id === id)?.motif;

    const catalogue = await listerCatalogueBiologie();
    const [mg, car, ferritine] = catalogue.analytes;

    expect(mg.nonIndiques).toEqual([
      { exploration: 'Magnésium plasmatique', motif: motif('BIO-NIA-01'), claimId: 'WN-CL-0242-007' },
    ]);
    expect(car.nonIndiques).toEqual([
      { exploration: 'Cortisol matinal isolé', motif: motif('BIO-NIA-02'), claimId: 'WN-CL-0042-007' },
    ]);
    expect(ferritine.nonIndiques).toEqual([]);
  });

  it('un bilan non indiqué retiré du catalogue (inactif, donc non lu) ne s’affiche plus', async () => {
    prisma.biologyAnalyte.findMany.mockResolvedValue([
      analyteBase({ code: 'BIO_MAGNESIUM_ERYTHROCYTAIRE', libelle: 'Magnésium érythrocytaire' }),
    ]);
    prisma.biologyPanel.findMany.mockResolvedValue([]);

    const catalogue = await listerCatalogueBiologie();

    expect(catalogue.analytes[0].nonIndiques).toEqual([]);
  });

  // F79 (D-351) : seuls les liens d'axe ACTIFS sont lus — les liens nutriment
  // (F52) n'ont pas d'écran — et un niveau nul sort « non gradé ».
  it('les liens d’axe actifs seuls sont lus, un niveau nul sort non gradé', async () => {
    prisma.biologyAnalyte.findMany.mockResolvedValue([
      analyteBase({
        liensCliniques: [
          {
            cibleCode: 'inflammation',
            direction: 'haut_evocateur',
            claimId: 'WN-CL-0999-001',
            versionClaim: 'v1.0',
            niveauPreuve: null,
          },
        ],
      }),
    ]);

    claimsValidesAuCorpus.mockResolvedValue(new Set(['WN-CL-0999-001::v1.0']));
    claimsNonSupplantesAuCorpus.mockResolvedValue(new Set(['WN-CL-0999-001::v1.0']));

    const catalogue = await listerCatalogueBiologie();

    const select = prisma.biologyAnalyte.findMany.mock.calls[0][0].select;
    expect(select.liensCliniques.where).toEqual({ actif: true, cibleType: 'axe' });
    expect(catalogue.analytes[0].liensAxe).toEqual([
      {
        axe: 'inflammation',
        sens: 'haut_evocateur',
        claimId: 'WN-CL-0999-001',
        versionClaim: 'v1.0',
        niveauPreuve: { statut: 'non_gradé' },
      },
    ]);
  });

  // D-140 : un claim repassé hors VALIDE entre deux releases tait son lien dès
  // la lecture ; la fiche dit qu'un lien est tu, jamais qu'il est fondé.
  it('un lien dont le claim n’est plus valide au corpus est tu, et compté', async () => {
    const lien = (claimId: string) => ({
      cibleCode: 'inflammation',
      direction: 'haut_evocateur',
      claimId,
      versionClaim: 'v1.0',
      niveauPreuve: null,
    });
    prisma.biologyAnalyte.findMany.mockResolvedValue([
      analyteBase({ liensCliniques: [lien('WN-CL-0999-001'), lien('WN-CL-0999-002')] }),
    ]);
    claimsValidesAuCorpus.mockResolvedValue(new Set(['WN-CL-0999-002::v1.0']));
    claimsNonSupplantesAuCorpus.mockResolvedValue(
      new Set(['WN-CL-0999-001::v1.0', 'WN-CL-0999-002::v1.0']),
    );

    const [fiche] = (await listerCatalogueBiologie()).analytes;

    expect(claimsValidesAuCorpus).toHaveBeenCalledWith([
      { claimId: 'WN-CL-0999-001', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0999-002', versionClaim: 'v1.0' },
    ]);
    expect(fiche.liensAxe.map(l => l.claimId)).toEqual(['WN-CL-0999-002']);
    expect(fiche.liensAxeSuspendus).toBe(1);
  });

  // D-351 §5 : un claim encore VALIDE mais SUPPLANTÉ, que le préflight de
  // release-db refuse, est tu de la même façon.
  it('un lien dont le claim VALIDE est supplanté est tu, et compté', async () => {
    prisma.biologyAnalyte.findMany.mockResolvedValue([
      analyteBase({
        liensCliniques: [
          {
            cibleCode: 'inflammation',
            direction: 'haut_evocateur',
            claimId: 'WN-CL-0999-001',
            versionClaim: 'v1.0',
            niveauPreuve: null,
          },
        ],
      }),
    ]);
    claimsValidesAuCorpus.mockResolvedValue(new Set(['WN-CL-0999-001::v1.0']));
    claimsNonSupplantesAuCorpus.mockResolvedValue(new Set());

    const [fiche] = (await listerCatalogueBiologie()).analytes;

    expect(fiche.liensAxe).toEqual([]);
    expect(fiche.liensAxeSuspendus).toBe(1);
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
