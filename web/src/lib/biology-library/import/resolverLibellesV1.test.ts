import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  indexerPourBanc,
  normaliserLibelle,
  RESOLVER_LIBELLES_METADATA,
  RESOLVER_LIBELLES_SHA256,
  RESOLVER_LIBELLES_V1,
  resolverSigne,
  resoudreLibelle,
  resoudreLigne,
} from './resolverLibellesV1';
import { unitesConcordent } from './valeurLue';

const MIGRATIONS = path.join(process.cwd(), 'prisma', 'migrations');

/** Les codes d'analytes INSÉRÉS par les migrations — le catalogue réel. */
function codesDuCatalogue(): Set<string> {
  const codes = new Set<string>();
  for (const dossier of readdirSync(MIGRATIONS)) {
    let sql: string;
    try {
      sql = readFileSync(path.join(MIGRATIONS, dossier, 'migration.sql'), 'utf8');
    } catch {
      continue;
    }
    for (const m of sql.matchAll(/\('bioan_[a-z0-9_]+',\s*'([A-Z0-9_]+)'/g)) codes.add(m[1]);
  }
  return codes;
}

/** Code → unité des analytes INSÉRÉS par les migrations : le catalogue réel. */
function unitesDuCatalogue(): Map<string, string | null> {
  const unites = new Map<string, string | null>();
  for (const dossier of readdirSync(MIGRATIONS)) {
    let sql: string;
    try {
      sql = readFileSync(path.join(MIGRATIONS, dossier, 'migration.sql'), 'utf8');
    } catch {
      continue;
    }
    for (const m of sql.matchAll(/\('bioan_[a-z0-9_]+',\s*'([A-Z0-9_]+)',\s*'(?:[^']|'')*',\s*(NULL|'[^']*')/g)) {
      unites.set(m[1], m[2] === 'NULL' ? null : m[2].slice(1, -1));
    }
  }
  return unites;
}

const INDEX = indexerPourBanc(RESOLVER_LIBELLES_V1);

describe('resolver libellé → analyte — la table', () => {
  it('ne propose que des codes qui existent au catalogue (sinon la FK refuserait l’import entier)', () => {
    const catalogue = codesDuCatalogue();
    expect(catalogue.size).toBeGreaterThan(40);
    const inconnus = [...new Set(RESOLVER_LIBELLES_V1.map(e => e.code))].filter(c => !catalogue.has(c));
    expect(inconnus).toEqual([]);
  });

  it('ne rattache aucun panel composite sans unité', () => {
    const codes = new Set(RESOLVER_LIBELLES_V1.map(e => e.code));
    for (const composite of ['BIO_PROFIL_LIPIDIQUE', 'BIO_NFS', 'BIO_BILAN_HEPATIQUE', 'BIO_IONOGRAMME']) {
      expect(codes.has(composite), composite).toBe(false);
    }
  });

  it('aucune entrée n’est recopiée deux fois à l’identique', () => {
    const vues = RESOLVER_LIBELLES_V1.map(e => `${normaliserLibelle(e.libelle)}→${e.code}`);
    expect(new Set(vues).size).toBe(vues.length);
  });
});

describe('resolver — la résolution (table supposée signée)', () => {
  const resoudre = (l: string) => resoudreLibelle(l, true, INDEX);

  it('normalise accents, casse et ponctuation', () => {
    expect(normaliserLibelle('25-OH Vitamine D (D2+D3)')).toBe('25 oh vitamine d d2 d3');
    expect(resoudre('FERRITINÉMIE')).toEqual({ statut: 'resolu', code: 'BIO_FERRITINE' });
    expect(resoudre('25 oh vitamine d')).toEqual({ statut: 'resolu', code: 'BIO_VITAMINE_D_25OH' });
  });

  it('ne retire jamais une parenthèse : elle peut dire la matrice (revue, P1-2)', () => {
    for (const l of ['Zonuline (selles)', 'BDNF (plasma)', 'Glutathion (réduit)', 'Ferritine (chimiluminescence)', 'Ferritine (sérum)']) {
      expect(resoudre(l), l).toEqual({ statut: 'inconnu', code: null });
    }
    // Une parenthèse qui fait partie d'une entrée relue, elle, se résout.
    expect(resoudre('Vitamine D (25-OH)')).toEqual({ statut: 'resolu', code: 'BIO_VITAMINE_D_25OH' });
  });

  it('rend `ambigu` sans code quand un libellé désigne deux analytes', () => {
    expect(resoudre('Cortisol salivaire')).toEqual({ statut: 'ambigu', code: null });
    expect(resoudre('IgA sécrétoires')).toEqual({ statut: 'ambigu', code: null });
  });

  it('ne rattache pas un libellé générique dont la matrice n’est pas dite', () => {
    for (const l of ['Zinc', 'Magnésium', 'Glycémie', 'CRP', 'Cuivre', 'Glutathion', 'Zonuline', 'BDNF', 'Fer', 'Sodium', 'Potassium', 'Chlore', '']) {
      expect(resoudre(l), l).toEqual({ statut: 'inconnu', code: null });
    }
  });
});

describe('resolver — la signature, fail-closed', () => {
  it('est signé (D-259, re-signé par D-260 puis D-262) sur la table relue : la proposition s’ouvre', () => {
    expect(RESOLVER_LIBELLES_METADATA.validationExterne).toBe(true);
    expect(RESOLVER_LIBELLES_METADATA.shaPerimetre).toBe(RESOLVER_LIBELLES_SHA256);
    expect(resolverSigne()).toBe(true);
    expect(resoudreLibelle('Ferritine')).toEqual({ statut: 'resolu', code: 'BIO_FERRITINE' });
    expect(resoudreLibelle('Cortisol salivaire')).toEqual({ statut: 'ambigu', code: null });
    expect(resoudreLibelle('Zonuline')).toEqual({ statut: 'inconnu', code: null });
  });

  it('rattache les libellés réels ajoutés par D-260, et rien de plus large', () => {
    expect(resoudreLibelle('Coefficient de saturation en fer de la transferrine')).toEqual({ statut: 'resolu', code: 'BIO_COEF_SATURATION' });
    expect(resoudreLibelle('Vitamine D 25 OH (D2 + D3)')).toEqual({ statut: 'resolu', code: 'BIO_VITAMINE_D_25OH' });
    expect(resoudreLibelle('Acide folique - érythrocytes (Chimiluminescence-Dxl-Beckman Coulter)'))
      .toEqual({ statut: 'resolu', code: 'BIO_FOLATES_ERYTHROCYTAIRES' });
    // Sans la parenthèse, ou générique : rien n'est deviné.
    expect(resoudreLibelle('Acide folique')).toEqual({ statut: 'inconnu', code: null });
    expect(resoudreLibelle('Fer')).toEqual({ statut: 'inconnu', code: null });
  });

  it('ne s’ouvre qu’avec les cinq termes, et se referme si la table bouge', () => {
    const signee = {
      version: 'resolver-libelles-v1',
      validationExterne: true,
      dateValidation: '2026-10-02T10:00:00.000Z',
      sourceReference: 'relecture praticien',
      shaPerimetre: RESOLVER_LIBELLES_SHA256,
    };
    expect(resolverSigne(signee)).toBe(true);
    expect(resolverSigne({ ...signee, validationExterne: false })).toBe(false);
    expect(resolverSigne({ ...signee, dateValidation: '2026-10-02' })).toBe(false);
    expect(resolverSigne({ ...signee, sourceReference: ' ' })).toBe(false);
    expect(resolverSigne({ ...signee, shaPerimetre: null })).toBe(false);
    expect(resolverSigne(signee, 'a'.repeat(64))).toBe(false);
  });
});

describe('resolver — une ligne : le libellé, puis l’unité qui départage ([[D-262]])', () => {
  const UNITES = unitesDuCatalogue();
  const ligne = (l: string, u: string | null) => resoudreLigne(l, u, UNITES, true, INDEX);

  it('lit les unités de TOUT le catalogue, nouvelle unité du DFG comprise', () => {
    expect(UNITES.size).toBe(85);
    expect(UNITES.get('BIO_DFG_CKD_EPI')).toBe('mL/min/1,73 m²');
    expect(UNITES.get('BIO_NFS')).toBeNull();
  });

  it('départage la formule leucocytaire : % ou valeur absolue', () => {
    expect(ligne('Polynucléaires neutrophiles', '%')).toEqual({ statut: 'resolu', code: 'BIO_NEUTROPHILES_PCT' });
    expect(ligne('Polynucléaires neutrophiles', 'G/L')).toEqual({ statut: 'resolu', code: 'BIO_NEUTROPHILES' });
    expect(ligne('Monocytes', '10^9/L')).toEqual({ statut: 'resolu', code: 'BIO_MONOCYTES' });
  });

  it('reste `ambigu` si l’unité ne départage pas — absente, étrangère ou commune aux deux', () => {
    expect(ligne('Lymphocytes', null)).toEqual({ statut: 'ambigu', code: null });
    expect(ligne('Lymphocytes', '/mm3')).toEqual({ statut: 'ambigu', code: null });
    expect(ligne('Cortisol salivaire', 'nmol/L')).toEqual({ statut: 'ambigu', code: null });
  });

  it('un code absent du catalogue lu ne survit pas au départage', () => {
    const partiel = new Map([['BIO_NEUTROPHILES', '10^9/L']]);
    expect(resoudreLigne('Polynucléaires neutrophiles', '%', partiel, true, INDEX)).toEqual({ statut: 'ambigu', code: null });
  });

  it('ne touche jamais une résolution unique, même en unité divergente', () => {
    expect(ligne('Créatinine', 'mg/L')).toEqual({ statut: 'resolu', code: 'BIO_CREATININE' });
  });

  it('non signée, ne propose rien', () => {
    expect(resoudreLigne('Polynucléaires neutrophiles', '%', UNITES, false, INDEX)).toEqual({ statut: 'inconnu', code: null });
  });
});

describe('banc — un compte rendu courant, libellés et unités tels qu’imprimés ([[D-262]])', () => {
  // Les 58 lignes du premier compte rendu de production, SANS valeur et sans
  // identité : le libellé et l'unité imprimés. Attendu : le code proposé, puis
  // la concordance de l'unité lue avec celle du catalogue — la ligne dans
  // l'autre unité est écartée par le praticien, jamais convertie (D-157).
  const UNITES = unitesDuCatalogue();
  const BANC: Array<[string, string | null, string | null, boolean]> = [
    ['Hématies', 'T/L', 'BIO_HEMATIES', true],
    ['Hémoglobine', 'g/dL', 'BIO_HEMOGLOBINE', false],
    ['Hématocrite', '%', 'BIO_HEMATOCRITE', true],
    ['V.G.M', 'fL', 'BIO_VGM', true],
    ['T.C.M.H', 'pg', 'BIO_TCMH', true],
    ['C.C.M.H', 'g/dL', 'BIO_CCMH', false],
    ['I.D.R', '%', 'BIO_IDR', true],
    ['Leucocytes', 'G/L', 'BIO_LEUCOCYTES', true],
    ['Polynucléaires neutrophiles', '%', 'BIO_NEUTROPHILES_PCT', true],
    ['Polynucléaires neutrophiles', 'G/L', 'BIO_NEUTROPHILES', true],
    ['Polynucléaires éosinophiles', '%', 'BIO_EOSINOPHILES_PCT', true],
    ['Polynucléaires éosinophiles', 'G/L', 'BIO_EOSINOPHILES', true],
    ['Polynucléaires basophiles', '%', 'BIO_BASOPHILES_PCT', true],
    ['Polynucléaires basophiles', 'G/L', 'BIO_BASOPHILES', true],
    ['Lymphocytes', '%', 'BIO_LYMPHOCYTES_PCT', true],
    ['Lymphocytes', 'G/L', 'BIO_LYMPHOCYTES', true],
    ['Monocytes', '%', 'BIO_MONOCYTES_PCT', true],
    ['Monocytes', 'G/L', 'BIO_MONOCYTES', true],
    ['Plaquettes', 'G/L', 'BIO_PLAQUETTES', true],
    ['Volume Plaquettaire Moyen', 'fl', 'BIO_VPM', true],
    ['Sodium sérique', 'mmol/L', 'BIO_SODIUM', true],
    ['Potassium sérique', 'mmol/L', 'BIO_POTASSIUM', true],
    ['Chlore sérique', 'mmol/L', 'BIO_CHLORE', true],
    ['Créatinine', 'µmol/L', 'BIO_CREATININE', true],
    ['Créatinine', 'mg/L', 'BIO_CREATININE', false],
    ['Estimation du DFG selon la formule CKD\u2212EPI', 'mL/min/1,73m2', 'BIO_DFG_CKD_EPI', true],
    ['Ferritine', 'µg/L', 'BIO_FERRITINE', true],
    ['Ferritine', 'pmol/L', 'BIO_FERRITINE', false],
    ['Fer', 'µmol/L', null, false],
    ['Fer', 'µg/dL', null, false],
    ['Transferrine', 'g/L', 'BIO_TRANSFERRINE', true],
    ['Transferrine', 'mmol/L', 'BIO_TRANSFERRINE', false],
    ['Capacité totale de fixation en fer de la transferrine', 'µmol/L', 'BIO_CTF', true],
    ['Capacité totale de fixation en fer de la transferrine', 'µg/dL', 'BIO_CTF', false],
    ['Coefficient de saturation en fer de la transferrine', '%', 'BIO_COEF_SATURATION', true],
    ['Vitamine B12', 'pg/mL', 'BIO_VITAMINE_B12', false],
    ['Vitamine B12', 'pmol/L', 'BIO_VITAMINE_B12', true],
    ['CRP (Protéine C Réactive)', 'mg/L', 'BIO_CRP', true],
    ['ASAT (Transaminases TGO)', 'U/L', 'BIO_ASAT', true],
    ['ALAT (Transaminases TGP)', 'U/L', 'BIO_ALAT', true],
    ['GGT (Gamma Glutamyl Transpeptidase)', 'U/L', 'BIO_GGT', true],
    ['Glycémie à jeun', 'g/L', 'BIO_GLYCEMIE_JEUN', false],
    ['Glycémie à jeun', 'mmol/L', 'BIO_GLYCEMIE_JEUN', true],
    ['Aspect', null, null, false],
    ['Triglycérides', 'g/L', 'BIO_TRIGLYCERIDES', false],
    ['Triglycérides', 'mmol/L', 'BIO_TRIGLYCERIDES', true],
    ['Cholestérol total', 'g/L', 'BIO_CHOLESTEROL_TOTAL', false],
    ['Cholestérol total', 'mmol/L', 'BIO_CHOLESTEROL_TOTAL', true],
    ['Cholestérol HDL', 'g/L', 'BIO_HDL', false],
    ['Cholestérol HDL', 'mmol/L', 'BIO_HDL', true],
    ['Cholestérol non\u2212HDL', 'g/L', 'BIO_NON_HDL', false],
    ['Cholestérol non\u2212HDL', 'mmol/L', 'BIO_NON_HDL', true],
    ['Cholestérol LDL calculé', 'g/L', 'BIO_LDL_CALCULE', false],
    ['Cholestérol LDL calculé', 'mmol/L', 'BIO_LDL_CALCULE', true],
    ['Vitamine D 25 OH (D2 + D3)', 'ng/mL', 'BIO_VITAMINE_D_25OH', true],
    ['Vitamine D 25 OH (D2 + D3)', 'nmol/L', 'BIO_VITAMINE_D_25OH', false],
    ['TSH', 'mUI/L', 'BIO_TSH_US', true],
    ['Acide folique - érythrocytes (Chimiluminescence-Dxl-Beckman Coulter)', 'ng/mL', 'BIO_FOLATES_ERYTHROCYTAIRES', false],
  ];

  it('couvre les 58 lignes', () => {
    expect(BANC).toHaveLength(58);
  });

  it.each(BANC)('« %s » en %s → %s (unité concordante : %s)', (libelle, unite, code, concorde) => {
    const resolution = resoudreLigne(libelle, unite, UNITES);
    expect(resolution.code).toBe(code);
    if (code !== null) expect(unitesConcordent(unite, UNITES.get(code) ?? null)).toBe(concorde);
  });

  it('chaque mesure courante a UNE ligne validable : 40 sur 58', () => {
    expect(BANC.filter(([, , code, concorde]) => code !== null && concorde)).toHaveLength(40);
  });
});
