import { describe, expect, it } from 'vitest';
import {
  codesProposesParLeBilan,
  groupePourConstituant,
  libelleAvecActe,
  libelleDansLesAnalytes,
  libelleNonEvalue,
  libellesValidationMedicale,
  mentionsParMesures,
  phraseAnalyseComposee,
  regrouperAnalytes,
  remboursementsAvecCompositions,
  type CompositionSignee,
} from './compositionsProposition';
import type { Remboursement, StatutRemboursement } from './remboursable';
import type { LigneAnalyteProposition } from './statuts';

function r(statut: StatutRemboursement, codes: string[] = []): Remboursement {
  return { statut, conditions: [], codesActesRetenus: codes };
}

const NFS: CompositionSignee = {
  analyteCode: 'BIO_NFS',
  libelle: 'Numération formule sanguine',
  type: 'groupe',
  composants: [
    { code: 'BIO_HEMOGLOBINE', libelle: 'Hémoglobine', actif: true },
    { code: 'BIO_PLAQUETTES', libelle: 'Plaquettes', actif: true },
  ],
};
const IONO: CompositionSignee = {
  analyteCode: 'BIO_IONOGRAMME',
  libelle: 'Ionogramme',
  type: 'groupe',
  composants: [
    { code: 'BIO_SODIUM', libelle: 'Sodium', actif: true },
    { code: 'BIO_POTASSIUM', libelle: 'Potassium', actif: true },
    { code: 'BIO_CHLORE', libelle: 'Chlore', actif: true },
  ],
};
const IONO_COMPLET: CompositionSignee = {
  analyteCode: 'BIO_IONOGRAMME_COMPLET',
  libelle: 'Ionogramme complet',
  type: 'groupe',
  composants: [...IONO.composants, { code: 'BIO_BICARBONATES', libelle: 'Bicarbonates', actif: true }],
};
const HOMA: CompositionSignee = {
  analyteCode: 'BIO_RATIO_HOMA',
  libelle: 'Indice HOMA',
  type: 'calcul',
  composants: [
    { code: 'BIO_GLYCEMIE_JEUN', libelle: 'Glycémie à jeun', actif: true },
    { code: 'BIO_INSULINE', libelle: 'Insuline', actif: true },
  ],
};
const HEPATIQUE: CompositionSignee = {
  analyteCode: 'BIO_BILAN_HEPATIQUE',
  libelle: 'Bilan hépatique',
  type: 'regroupement',
  composants: [
    { code: 'BIO_ALAT', libelle: 'ALAT', actif: true },
    { code: 'BIO_GGT', libelle: 'GGT', actif: true },
  ],
};

const carte = (...cs: CompositionSignee[]) => new Map(cs.map(c => [c.analyteCode, c]));

const REMBOURSEMENTS = new Map<string, Remboursement>([
  ['BIO_NFS', r('remboursable', ['1104'])],
  ['BIO_HEMOGLOBINE', r('remboursable_si_groupe', ['1104'])],
  ['BIO_PLAQUETTES', r('remboursable', ['1107'])],
  ['BIO_IONOGRAMME', r('remboursable', ['1609'])],
  ['BIO_IONOGRAMME_COMPLET', r('remboursable', ['1610'])],
  ['BIO_SODIUM', r('remboursable_si_groupe', ['1609', '1610'])],
  ['BIO_BICARBONATES', r('remboursable_si_groupe', ['1610'])],
  ['BIO_GLYCEMIE_JEUN', r('remboursable', ['0552'])],
  ['BIO_INSULINE', r('remboursable', ['7422'])],
  ['BIO_FERRITINE', r('remboursable', ['1617'])],
]);

function analyte(code: string, libelle: string): LigneAnalyteProposition {
  return {
    code,
    libelle,
    validationMedicaleRequise: false,
    remboursement: REMBOURSEMENTS.get(code) ?? r('non_evalue'),
  };
}

const lecture = (compositions: Map<string, CompositionSignee>, validation: string[] = []) => ({
  compositions,
  remboursementDe: (code: string) => REMBOURSEMENTS.get(code) ?? r('non_evalue'),
  validationDe: (code: string) => validation.includes(code),
});

describe('groupePourConstituant (D-323 §3)', () => {
  it('le plus petit groupe signé : le sodium va au 1609, pas au 1610', () => {
    expect(groupePourConstituant('BIO_SODIUM', carte(IONO_COMPLET, IONO))?.analyteCode).toBe('BIO_IONOGRAMME');
  });
  it('à taille égale, le premier par code', () => {
    const autre: CompositionSignee = { ...IONO, analyteCode: 'BIO_AUTRE', libelle: 'Autre' };
    expect(groupePourConstituant('BIO_SODIUM', carte(IONO, autre))?.analyteCode).toBe('BIO_AUTRE');
    expect(groupePourConstituant('BIO_SODIUM', carte(autre, IONO))?.analyteCode).toBe('BIO_AUTRE');
  });

  it('un regroupement ni un calcul ne portent personne', () => {
    expect(groupePourConstituant('BIO_ALAT', carte(HEPATIQUE))).toBeNull();
    expect(groupePourConstituant('BIO_INSULINE', carte(HOMA))).toBeNull();
  });
});

describe('regrouperAnalytes — contre-épreuve : sans composition signée, rien ne bouge', () => {
  it('rend la liste telle quelle, à l’identique', () => {
    const analytes = [analyte('BIO_NFS', 'Numération formule sanguine'), analyte('BIO_HEMOGLOBINE', 'Hémoglobine')];
    expect(regrouperAnalytes(analytes, lecture(new Map()))).toEqual(analytes);
  });
});

describe('regrouperAnalytes — §2 : un groupe proposé fait une ligne', () => {
  it('NFS et hémoglobine dans le même bilan : une ligne, constituants dessous', () => {
    const lignes = regrouperAnalytes(
      [analyte('BIO_NFS', 'Numération formule sanguine'), analyte('BIO_HEMOGLOBINE', 'Hémoglobine'), analyte('BIO_FERRITINE', 'Ferritine')],
      lecture(carte(NFS)),
    );
    expect(lignes.map(l => l.code)).toEqual(['BIO_NFS', 'BIO_FERRITINE']);
    expect(lignes[0].constituants?.map(c => c.code)).toEqual(['BIO_HEMOGLOBINE', 'BIO_PLAQUETTES']);
    expect(lignes[0].demandeePour).toBeUndefined();
  });

  it('un regroupement range aussi ses constituants', () => {
    const lignes = regrouperAnalytes(
      [analyte('BIO_ALAT', 'ALAT'), analyte('BIO_BILAN_HEPATIQUE', 'Bilan hépatique')],
      lecture(carte(HEPATIQUE)),
    );
    expect(lignes.map(l => l.code)).toEqual(['BIO_BILAN_HEPATIQUE']);
  });

  it('un calculé ne range rien : ses opérandes restent des lignes', () => {
    const lignes = regrouperAnalytes(
      [analyte('BIO_RATIO_HOMA', 'Indice HOMA'), analyte('BIO_GLYCEMIE_JEUN', 'Glycémie à jeun')],
      lecture(carte(HOMA)),
    );
    expect(lignes.map(l => l.code)).toEqual(['BIO_RATIO_HOMA', 'BIO_GLYCEMIE_JEUN']);
    expect(lignes[0].constituants).toBeUndefined();
  });
});

describe('regrouperAnalytes — §3 : un constituant seul est proposé par son groupe', () => {
  it('hémoglobine seule : NFS à sa place, « demandée pour » elle', () => {
    const lignes = regrouperAnalytes(
      [analyte('BIO_FERRITINE', 'Ferritine'), analyte('BIO_HEMOGLOBINE', 'Hémoglobine')],
      lecture(carte(NFS)),
    );
    expect(lignes.map(l => l.code)).toEqual(['BIO_FERRITINE', 'BIO_NFS']);
    expect(lignes[1]).toMatchObject({
      libelle: 'Numération formule sanguine',
      remboursement: { statut: 'remboursable', codesActesRetenus: ['1104'] },
      demandeePour: [{ code: 'BIO_HEMOGLOBINE', libelle: 'Hémoglobine' }],
    });
  });

  it('un constituant qui a son propre acte reste seul', () => {
    const lignes = regrouperAnalytes([analyte('BIO_PLAQUETTES', 'Plaquettes')], lecture(carte(NFS)));
    expect(lignes.map(l => l.code)).toEqual(['BIO_PLAQUETTES']);
  });

  it('…mais se range sous le groupe qu’un autre constituant fait proposer, sans « demandée pour »', () => {
    const lignes = regrouperAnalytes(
      [analyte('BIO_PLAQUETTES', 'Plaquettes'), analyte('BIO_HEMOGLOBINE', 'Hémoglobine')],
      lecture(carte(NFS)),
    );
    expect(lignes.map(l => l.code)).toEqual(['BIO_NFS']);
    expect(lignes[0].demandeePour).toEqual([{ code: 'BIO_HEMOGLOBINE', libelle: 'Hémoglobine' }]);
  });

  it('un groupe dont l’acte n’est pas remboursable ne remplace pas : l’état du constituant reste dit', () => {
    const lecturePartielle = {
      ...lecture(carte(NFS)),
      remboursementDe: (code: string) => (code === 'BIO_NFS' ? r('non_evalue') : REMBOURSEMENTS.get(code) ?? r('non_evalue')),
    };
    const lignes = regrouperAnalytes(
      [analyte('BIO_PLAQUETTES', 'Plaquettes'), analyte('BIO_HEMOGLOBINE', 'Hémoglobine')],
      lecturePartielle,
    );
    expect(lignes.map(l => l.code)).toEqual(['BIO_PLAQUETTES', 'BIO_HEMOGLOBINE']);
  });

  it('sans groupe signé, le constituant reste seul (inerte)', () => {
    const lignes = regrouperAnalytes([analyte('BIO_HEMOGLOBINE', 'Hémoglobine')], lecture(carte(IONO)));
    expect(lignes.map(l => l.code)).toEqual(['BIO_HEMOGLOBINE']);
  });

  it('sodium seul : le plus petit groupe (1609)', () => {
    const lignes = regrouperAnalytes([analyte('BIO_SODIUM', 'Sodium')], lecture(carte(IONO, IONO_COMPLET)));
    expect(lignes.map(l => l.code)).toEqual(['BIO_IONOGRAMME']);
  });

  it('sodium et bicarbonates : un seul groupe, celui que les bicarbonates imposent (1610)', () => {
    const lignes = regrouperAnalytes(
      [analyte('BIO_SODIUM', 'Sodium'), analyte('BIO_BICARBONATES', 'Bicarbonates')],
      lecture(carte(IONO, IONO_COMPLET)),
    );
    expect(lignes.map(l => l.code)).toEqual(['BIO_IONOGRAMME_COMPLET']);
    expect(lignes[0].demandeePour?.map(c => c.code)).toEqual(['BIO_SODIUM', 'BIO_BICARBONATES']);
  });

  it('sodium avec l’ionogramme complet au bilan : le groupe que le bilan propose déjà', () => {
    const lignes = regrouperAnalytes(
      [analyte('BIO_IONOGRAMME_COMPLET', 'Ionogramme complet'), analyte('BIO_SODIUM', 'Sodium')],
      lecture(carte(IONO, IONO_COMPLET)),
    );
    expect(lignes.map(l => l.code)).toEqual(['BIO_IONOGRAMME_COMPLET']);
    expect(lignes[0].demandeePour).toBeUndefined();
  });
});

describe('remboursementsAvecCompositions — §4 : un calculé hérite de ses mesures', () => {
  it('toutes remboursables : remboursé, par ses mesures et leurs actes', () => {
    const resultat = remboursementsAvecCompositions(REMBOURSEMENTS, carte(HOMA)).get('BIO_RATIO_HOMA')!;
    expect(resultat.statut).toBe('remboursable');
    expect(resultat.codesActesRetenus).toEqual(['0552', '7422']);
    expect(resultat.parMesures?.map(m => [m.code, m.codesActes])).toEqual([
      ['BIO_GLYCEMIE_JEUN', ['0552']],
      ['BIO_INSULINE', ['7422']],
    ]);
  });

  it('une mesure non évaluée rend le calculé non évalué', () => {
    const base = new Map(REMBOURSEMENTS);
    base.delete('BIO_INSULINE');
    expect(remboursementsAvecCompositions(base, carte(HOMA)).get('BIO_RATIO_HOMA')!.statut).toBe('non_evalue');
  });

  it('une mesure « si groupé » compte par son groupe signé — sans lui, par elle-même', () => {
    const avecHb: CompositionSignee = { ...HOMA, composants: [{ code: 'BIO_HEMOGLOBINE', libelle: 'Hémoglobine', actif: true }] };
    expect(remboursementsAvecCompositions(REMBOURSEMENTS, carte(avecHb, NFS)).get('BIO_RATIO_HOMA')!.statut).toBe('remboursable');
    expect(remboursementsAvecCompositions(REMBOURSEMENTS, carte(avecHb)).get('BIO_RATIO_HOMA')!.statut).toBe('remboursable_si_groupe');
  });

  it('un groupe garde son propre remboursement ; sans composition, la carte est intacte', () => {
    expect(remboursementsAvecCompositions(REMBOURSEMENTS, carte(NFS)).get('BIO_NFS')).toBe(REMBOURSEMENTS.get('BIO_NFS'));
    expect(remboursementsAvecCompositions(REMBOURSEMENTS, new Map())).toEqual(REMBOURSEMENTS);
  });
});

describe('le texte, écrit une fois', () => {
  it('groupe : libellé, acte, demandée pour, constituants', () => {
    const [ligne] = regrouperAnalytes([analyte('BIO_HEMOGLOBINE', 'Hémoglobine')], lecture(carte(NFS)));
    expect(phraseAnalyseComposee(ligne, 'constituants')).toBe(
      'Numération formule sanguine (acte 1104), analyse demandée pour : Hémoglobine — constituants : Hémoglobine, Plaquettes.',
    );
    expect(phraseAnalyseComposee(analyte('BIO_FERRITINE', 'Ferritine'), 'constituants')).toBeNull();
  });

  it('un groupe non évalué ne cite pas d’acte', () => {
    const [ligne] = regrouperAnalytes(
      [{ ...analyte('BIO_NFS', 'Numération formule sanguine'), remboursement: r('non_evalue') }],
      lecture(carte(NFS)),
    );
    expect(phraseAnalyseComposee(ligne, 'constituants')).toBe(
      'Numération formule sanguine — constituants : Hémoglobine, Plaquettes.',
    );
  });

  it('« remboursé par ses mesures » pour un calculé remboursé, et seulement lui', () => {
    const homa = remboursementsAvecCompositions(REMBOURSEMENTS, carte(HOMA)).get('BIO_RATIO_HOMA')!;
    expect(mentionsParMesures([
      { ...analyte('BIO_RATIO_HOMA', 'Indice HOMA'), remboursement: homa },
      { ...analyte('BIO_RATIO_HOMA', 'Indice HOMA'), remboursement: homa },
      analyte('BIO_NFS', 'Numération formule sanguine'),
    ])).toEqual(['Indice HOMA : remboursé par ses mesures (Glycémie à jeun 0552, Insuline 7422).']);
    expect(mentionsParMesures([{ ...analyte('BIO_RATIO_HOMA', 'Indice HOMA'), remboursement: { ...homa, statut: 'non_evalue' } }])).toEqual([]);
  });

  it('ranger n’efface pas une validation médicale', () => {
    const lignes = regrouperAnalytes(
      [analyte('BIO_NFS', 'Numération formule sanguine'), analyte('BIO_HEMOGLOBINE', 'Hémoglobine')],
      lecture(carte(NFS), ['BIO_HEMOGLOBINE']),
    );
    expect(libellesValidationMedicale(lignes)).toEqual(['Hémoglobine']);
  });
});

describe('la borne des attentes (D-305 §4) ne bouge pas au regroupement', () => {
  it('ce que le bilan proposait, constituants rangés compris, sans le groupe ajouté', () => {
    const avant = [analyte('BIO_FERRITINE', 'Ferritine'), analyte('BIO_HEMOGLOBINE', 'Hémoglobine')];
    const apres = regrouperAnalytes(avant, lecture(carte(NFS)));
    expect(apres.map(l => l.code)).toEqual(['BIO_FERRITINE', 'BIO_NFS']);
    expect(codesProposesParLeBilan(apres)).toEqual(['BIO_FERRITINE', 'BIO_HEMOGLOBINE']);
    expect(libelleDansLesAnalytes(apres, 'BIO_HEMOGLOBINE')).toBe('Hémoglobine');
    expect(libelleDansLesAnalytes(apres, 'BIO_INCONNU')).toBeNull();
  });

  it('un groupe du bilan compte, ses constituants que le bilan ne proposait pas non', () => {
    const avant = [analyte('BIO_NFS', 'Numération formule sanguine'), analyte('BIO_HEMOGLOBINE', 'Hémoglobine')];
    const apres = regrouperAnalytes(avant, lecture(carte(NFS)));
    expect(codesProposesParLeBilan(apres)).toEqual(['BIO_NFS', 'BIO_HEMOGLOBINE']);
  });

  it('sans composition : les codes de la ligne, à l’identique', () => {
    const avant = [analyte('BIO_NFS', 'Numération formule sanguine'), analyte('BIO_HEMOGLOBINE', 'Hémoglobine')];
    expect(codesProposesParLeBilan(regrouperAnalytes(avant, lecture(new Map())))).toEqual(['BIO_NFS', 'BIO_HEMOGLOBINE']);
  });
});

describe('textes : ce que les mesures disent', () => {
  it('un regroupement remboursé ne cite pas d’acte en propre', () => {
    const hepatique = remboursementsAvecCompositions(
      new Map([['BIO_ALAT', r('remboursable', ['0522'])], ['BIO_GGT', r('remboursable', ['0519'])]]),
      carte(HEPATIQUE),
    ).get('BIO_BILAN_HEPATIQUE')!;
    const [ligne] = regrouperAnalytes(
      [{ ...analyte('BIO_BILAN_HEPATIQUE', 'Bilan hépatique'), remboursement: hepatique }],
      lecture(carte(HEPATIQUE)),
    );
    expect(libelleAvecActe(ligne)).toBe('Bilan hépatique');
  });

  it('« non évalué » nomme la mesure qui manque', () => {
    const base = new Map(REMBOURSEMENTS);
    base.delete('BIO_INSULINE');
    const homa = remboursementsAvecCompositions(base, carte(HOMA)).get('BIO_RATIO_HOMA')!;
    expect(libelleNonEvalue({ ...analyte('BIO_RATIO_HOMA', 'Indice HOMA'), remboursement: homa }))
      .toBe('Indice HOMA (mesure non évaluée : Insuline)');
    expect(libelleNonEvalue(analyte('BIO_FERRITINE', 'Ferritine'))).toBe('Ferritine');
  });
});

describe('revue CodeRabbit de #1545', () => {
  it('le plus petit groupe REMBOURSABLE remplace : 1609 non évalué, le sodium va au 1610', () => {
    const lecture1610 = {
      ...lecture(carte(IONO, IONO_COMPLET)),
      remboursementDe: (code: string) => (code === 'BIO_IONOGRAMME' ? r('non_evalue') : REMBOURSEMENTS.get(code) ?? r('non_evalue')),
    };
    const lignes = regrouperAnalytes([analyte('BIO_SODIUM', 'Sodium')], lecture1610);
    expect(lignes.map(l => l.code)).toEqual(['BIO_IONOGRAMME_COMPLET']);
  });

  it('une mesure retirée du catalogue compte « non évalué » : le calculé ne se lit pas remboursé', () => {
    const homaRetiree: CompositionSignee = {
      ...HOMA,
      composants: [HOMA.composants[0], { ...HOMA.composants[1], actif: false }],
    };
    const resultat = remboursementsAvecCompositions(REMBOURSEMENTS, carte(homaRetiree)).get('BIO_RATIO_HOMA')!;
    expect(resultat.statut).toBe('non_evalue');
    expect(resultat.parMesures?.map(m => [m.code, m.statut])).toEqual([
      ['BIO_GLYCEMIE_JEUN', 'remboursable'],
      ['BIO_INSULINE', 'non_evalue'],
    ]);
  });

  it('un constituant retiré du catalogue ne se cite plus sous son groupe', () => {
    const nfsRetiree: CompositionSignee = {
      ...NFS,
      composants: [NFS.composants[0], { ...NFS.composants[1], actif: false }],
    };
    const [ligne] = regrouperAnalytes([analyte('BIO_NFS', 'Numération formule sanguine')], lecture(carte(nfsRetiree)));
    expect(ligne.constituants?.map(c => c.code)).toEqual(['BIO_HEMOGLOBINE']);
  });
});

describe('remboursementsAvecCompositions — D-326 §1 : un constituant est coté par l’acte de son groupe', () => {
  const base = (...lignes: Array<[string, Remboursement]>) => new Map<string, Remboursement>(lignes);

  it('non évalué : remboursable seulement accompagné, par l’acte du groupe, et le groupe est nommé', () => {
    const resultat = remboursementsAvecCompositions(base(['BIO_NFS', r('remboursable', ['1104'])]), carte(NFS));
    expect(resultat.get('BIO_HEMOGLOBINE')).toEqual({
      statut: 'remboursable_si_groupe',
      conditions: [],
      codesActesRetenus: ['1104'],
      parGroupes: [{ code: 'BIO_NFS', libelle: 'Numération formule sanguine' }],
    });
  });

  it('contre-épreuve : sans composition signée, rien n’hérite', () => {
    const carteSeule = base(['BIO_NFS', r('remboursable', ['1104'])]);
    expect(remboursementsAvecCompositions(carteSeule, new Map()).get('BIO_HEMOGLOBINE')).toBeUndefined();
  });

  it('constituant de deux groupes : les deux actes, les deux groupes', () => {
    const resultat = remboursementsAvecCompositions(
      base(['BIO_IONOGRAMME', r('remboursable', ['1609'])], ['BIO_IONOGRAMME_COMPLET', r('remboursable', ['1610'])]),
      carte(IONO_COMPLET, IONO),
    );
    expect(resultat.get('BIO_CHLORE')!.codesActesRetenus).toEqual(['1609', '1610']);
    expect(resultat.get('BIO_CHLORE')!.parGroupes?.map(g => g.code)).toEqual(['BIO_IONOGRAMME', 'BIO_IONOGRAMME_COMPLET']);
    expect(resultat.get('BIO_BICARBONATES')!.codesActesRetenus).toEqual(['1610']);
  });

  it('remboursable seul ou hors nomenclature : son état tient', () => {
    const plaquettes = r('remboursable', ['1107']);
    const hemoglobine = r('hors_nomenclature');
    const resultat = remboursementsAvecCompositions(
      base(['BIO_NFS', r('remboursable', ['1104'])], ['BIO_PLAQUETTES', plaquettes], ['BIO_HEMOGLOBINE', hemoglobine]),
      carte(NFS),
    );
    expect(resultat.get('BIO_PLAQUETTES')).toBe(plaquettes);
    expect(resultat.get('BIO_HEMOGLOBINE')).toBe(hemoglobine);
  });

  it('déjà « si groupé » par ses signatures : ses actes et ceux du groupe sont réunis', () => {
    const resultat = remboursementsAvecCompositions(
      base(['BIO_NFS', r('remboursable', ['1104'])], ['BIO_HEMOGLOBINE', r('remboursable_si_groupe', ['9999'])]),
      carte(NFS),
    );
    expect(resultat.get('BIO_HEMOGLOBINE')!.codesActesRetenus).toEqual(['9999', '1104']);
  });

  it('un groupe signé « groupe imposé » transmet aussi son acte ; un groupe non évalué ne transmet rien', () => {
    const impose = remboursementsAvecCompositions(base(['BIO_NFS', r('remboursable_si_groupe', ['1104'])]), carte(NFS));
    expect(impose.get('BIO_HEMOGLOBINE')!.statut).toBe('remboursable_si_groupe');
    for (const statut of ['non_evalue', 'hors_nomenclature'] as const) {
      expect(remboursementsAvecCompositions(base(['BIO_NFS', r(statut)]), carte(NFS)).get('BIO_HEMOGLOBINE')).toBeUndefined();
    }
  });

  it('un composant retiré du catalogue n’hérite pas ; un regroupement ne transmet rien', () => {
    const nfsRetiree: CompositionSignee = { ...NFS, composants: [{ ...NFS.composants[0], actif: false }] };
    const retire = remboursementsAvecCompositions(base(['BIO_NFS', r('remboursable', ['1104'])]), carte(nfsRetiree));
    expect(retire.get('BIO_HEMOGLOBINE')).toBeUndefined();
    const hepatique = remboursementsAvecCompositions(base(['BIO_BILAN_HEPATIQUE', r('remboursable', ['0516'])]), carte(HEPATIQUE));
    expect(hepatique.get('BIO_ALAT')).toBeUndefined();
  });

  it('de bout en bout : une hémoglobine sans correspondance propre, proposée seule, est remplacée par la NFS', () => {
    const compositions = carte(NFS);
    const carteHeritee = remboursementsAvecCompositions(base(['BIO_NFS', r('remboursable', ['1104'])]), compositions);
    const remboursementDe = (code: string) => carteHeritee.get(code) ?? r('non_evalue');
    const hemoglobine = { ...analyte('BIO_HEMOGLOBINE', 'Hémoglobine'), remboursement: remboursementDe('BIO_HEMOGLOBINE') };
    const lignes = regrouperAnalytes([hemoglobine], { compositions, remboursementDe, validationDe: () => false });
    expect(lignes.map(l => l.code)).toEqual(['BIO_NFS']);
    expect(lignes[0].demandeePour).toEqual([{ code: 'BIO_HEMOGLOBINE', libelle: 'Hémoglobine' }]);
    // Contre-épreuve : la NFS signée « groupe imposé » ne remplace pas (D-326 §3).
    const imposee = remboursementsAvecCompositions(base(['BIO_NFS', r('remboursable_si_groupe', ['1104'])]), compositions);
    const deImposee = (code: string) => imposee.get(code) ?? r('non_evalue');
    const seule = regrouperAnalytes(
      [{ ...analyte('BIO_HEMOGLOBINE', 'Hémoglobine'), remboursement: deImposee('BIO_HEMOGLOBINE') }],
      { compositions, remboursementDe: deImposee, validationDe: () => false },
    );
    expect(seule.map(l => l.code)).toEqual(['BIO_HEMOGLOBINE']);
  });

  it('un calculé lit l’état hérité de ses mesures', () => {
    const calcul: CompositionSignee = { ...HOMA, composants: [{ code: 'BIO_CHLORE', libelle: 'Chlore', actif: true }] };
    const resultat = remboursementsAvecCompositions(base(['BIO_IONOGRAMME', r('remboursable', ['1609'])]), carte(calcul, IONO));
    expect(resultat.get('BIO_RATIO_HOMA')!.statut).toBe('remboursable');
    expect(resultat.get('BIO_RATIO_HOMA')!.parMesures?.[0]).toMatchObject({ code: 'BIO_CHLORE', codesActes: ['1609'] });
  });
});
