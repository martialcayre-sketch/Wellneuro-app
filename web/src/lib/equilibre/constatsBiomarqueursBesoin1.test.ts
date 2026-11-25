import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ANALYTES_LUS_BESOIN_1,
  ANALYTE_HBA1C,
  ANALYTE_HOMA_NON_LU,
  ANALYTE_INDEX_OMEGA3,
  REFERENCE_HBA1C,
  REPERE_INDEX_OMEGA3,
  constatHba1c,
  constatIndexOmega3,
  constatsBiomarqueursBesoin1,
  type ResultatLu,
} from './constatsBiomarqueursBesoin1';

// LES DEUX BIOMARQUEURS DU BESOIN 1 ([[D-548]] §2.2, [[D-516]] §5.2 et §5.3).

const lu = (valeur: string, unite: string | null = '%'): ResultatLu => ({ valeur, unite, preleveLe: '2026-11-01T08:00:00.000Z' });

describe("l'HbA1c : valeur de référence signée", () => {
  it('porte 6,5 % et le claim qui la porte', () => {
    expect(REFERENCE_HBA1C).toMatchObject({ valeur: 6.5, unite: '%', claimReference: 'WN-CL-0654-001' });
  });
  it("sous 6,5 %, aucune interprétation n'est donnée", () => {
    const c = constatHba1c(lu('5.4'))!;
    expect(c.lecture).toBe('sous_reference');
    expect(c.lignes.join(' ')).toContain("aucune interprétation n'est donnée");
    expect(c.lignes.join(' ')).not.toContain('diabète');
  });
  it('à 6,5 % et au-delà : la valeur de référence, aucun diagnostic, un second résultat', () => {
    for (const v of ['6.5', '7.1']) {
      const c = constatHba1c(lu(v))!;
      expect(c.lecture).toBe(v === '6.5' ? 'egale_reference' : 'au_dessus_reference');
      expect(c.lignes.join(' ')).toContain('aucun diagnostic');
      expect(c.lignes.join(' ')).toContain('second résultat');
    }
  });
  it('une unité inconnue ne donne aucune lecture — jamais une conversion', () => {
    const c = constatHba1c(lu('48', 'mmol/mol'))!;
    expect(c.lecture).toBe('unite_non_reconnue');
    expect(c.lignes.join(' ')).toContain('aucune lecture');
  });
  it('aucun résultat : aucun constat', () => {
    expect(constatHba1c(null)).toBeNull();
  });
});

describe("l'index oméga-3 : repère signé", () => {
  it('porte 8 % ; le repère interne et la publication primaire sont distingués', () => {
    expect(REPERE_INDEX_OMEGA3.valeur).toBe(8);
    expect(REPERE_INDEX_OMEGA3.claimPublicationPrimaire).toBe('WN-CL-0655-002');
    expect(REPERE_INDEX_OMEGA3.claimsRepereInterne).toContain('WN-CL-0045-009');
  });
  it('la valeur égale au repère n’est rangée ni au-dessus ni en dessous', () => {
    expect(constatIndexOmega3(lu('8'))!.lignes[0]).toContain('égale au repère');
    expect(constatIndexOmega3(lu('7.9'))!.lignes[0]).toContain('inférieure au repère');
    expect(constatIndexOmega3(lu('8.1'))!.lignes[0]).toContain('supérieure au repère');
  });
  it("la distinction du repère s'affiche avec lui, ainsi que la variation d'un laboratoire à l'autre", () => {
    const texte = constatIndexOmega3(lu('6'))!.lignes.join(' ');
    expect(texte).toContain('interprétation neuropsychique');
    expect(texte).toContain('laboratoire à l');
  });
});

describe('trois constats séparés, hors couverture', () => {
  it('deux constats, un par analyte lu, sans lien entre eux', () => {
    const derniers = new Map<string, ResultatLu>([
      [ANALYTE_HBA1C, lu('5.2')],
      [ANALYTE_INDEX_OMEGA3, lu('9')],
    ]);
    const constats = constatsBiomarqueursBesoin1(derniers);
    expect(constats.map(c => c.analyteCode)).toEqual([ANALYTE_HBA1C, ANALYTE_INDEX_OMEGA3]);
    // Le constat de l'un ne dépend pas de la valeur de l'autre.
    const seul = constatsBiomarqueursBesoin1(new Map([[ANALYTE_HBA1C, lu('5.2')]]));
    expect(seul).toEqual([constats[0]]);
  });

  it('le troisième biomarqueur (HOMA) est NON LU : absent des analytes lus, ignoré même s’il est fourni', () => {
    expect(ANALYTES_LUS_BESOIN_1).toEqual([ANALYTE_HBA1C, ANALYTE_INDEX_OMEGA3]);
    expect([...ANALYTES_LUS_BESOIN_1]).not.toContain(ANALYTE_HOMA_NON_LU);
    const constats = constatsBiomarqueursBesoin1(new Map([[ANALYTE_HOMA_NON_LU, lu('3.2', null)]]));
    expect(constats).toEqual([]);
  });

  it("le service ne demande que les deux analytes lus, et ne nomme jamais l'indice HOMA", () => {
    const service = readFileSync(path.resolve(__dirname, 'constatsBiomarqueursBesoin1Service.ts'), 'utf8');
    expect(service).toContain('ANALYTES_LUS_BESOIN_1');
    expect(service).not.toMatch(/HOMA/i);
  });

  it("aucun module de la couverture ne lit les biomarqueurs : le besoin 1 reste porté par l'enquête seule", () => {
    for (const fichier of ['score.ts', 'constants.ts', 'objetsCliniques.ts']) {
      const source = readFileSync(path.resolve(__dirname, fichier), 'utf8');
      expect(source).not.toContain('constatsBiomarqueursBesoin1');
      expect(source).not.toContain('BIO_HBA1C');
      expect(source).not.toContain('BIO_INDEX_OMEGA3');
    }
  });
});
