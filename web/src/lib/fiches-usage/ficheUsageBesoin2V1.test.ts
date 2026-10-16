import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  FICHES_USAGE_BESOIN2_METADATA,
  FICHES_USAGE_BESOIN2_SHA256,
  FICHES_USAGE_BESOIN2_V1,
  ficheDeLaStructure,
  structureSignee,
  termeDeLaStructure,
  type StructureFichesUsage,
} from './ficheUsageBesoin2V1';
import { natureDuTerme, RE_FICHE_USAGE, RUBRIQUES_FICHE_USAGE } from './vocabulaire';

// La structure est livrée VIDE et verrou ÉTEINT (porte 23 : ses contenus sont
// ceux du responsable). Ce banc épingle l'empreinte : toute fiche ajoutée la
// change, et la sortie est de RE-SIGNER, jamais de mettre le littéral à jour en
// silence. Identifiants SYNTHÉTIQUES dans les cas ci-dessous.

describe('structure des fiches d’usage du besoin 2 (D-314 §2)', () => {
  it('épingle l’empreinte de la structure livrée', () => {
    expect(FICHES_USAGE_BESOIN2_SHA256).toBe('bba5e229dd7d37363ca7d136b1743c7d4b092ca02f3f5b74bde8d36e5f76ab66');
  });

  it('est livrée vide, verrou éteint, sans signature : rien ne se valide ni ne se sert', () => {
    expect(FICHES_USAGE_BESOIN2_V1.fiches).toEqual([]);
    expect(FICHES_USAGE_BESOIN2_METADATA.validationExterne).toBe(false);
    expect(FICHES_USAGE_BESOIN2_METADATA.shaPerimetre).toBeNull();
    expect(structureSignee()).toBe(false);
  });

  it('une signature ne vaut que sur le périmètre relu : retouchée après signature, la structure ne l’est plus', () => {
    const signee = { ...FICHES_USAGE_BESOIN2_METADATA, validationExterne: true, shaPerimetre: 'e'.repeat(64) };
    expect(structureSignee(signee, 'e'.repeat(64))).toBe(true);
    expect(structureSignee(signee, 'f'.repeat(64))).toBe(false);
    expect(structureSignee({ ...signee, validationExterne: false }, 'e'.repeat(64))).toBe(false);
  });

  it('trouve une fiche et un terme dans une structure donnée', () => {
    const structure: StructureFichesUsage = {
      fiches: [
        { id: 'FU_SYNTH', population: 'POP_SYNTH', hypotheses: ['HYP_SYNTH'], codesAnalyte: [], claims: [], rubriques: ['question'] },
      ],
      hypotheses: ['HYP_SYNTH'],
      populations: ['POP_SYNTH'],
    };
    expect(ficheDeLaStructure('FU_SYNTH', structure)?.population).toBe('POP_SYNTH');
    expect(ficheDeLaStructure('FU_AUTRE', structure)).toBeNull();
    expect(termeDeLaStructure('HYP_SYNTH', structure)).toBe(true);
    expect(termeDeLaStructure('POP_SYNTH', structure)).toBe(true);
    expect(termeDeLaStructure('HYP_AUTRE', structure)).toBe(false);
  });

  // Les invariants que toute fiche signée devra tenir : ils s'appliquent à la
  // structure du jour, vide aujourd'hui, et la garderont le jour où elle se
  // remplit.
  it('chaque fiche tient ses formats, sa population déclarée et ses rubriques fermées', () => {
    const { fiches, hypotheses, populations } = FICHES_USAGE_BESOIN2_V1;
    const ids = fiches.map(f => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const terme of hypotheses) expect(natureDuTerme(terme), terme).toBe('hypothese');
    for (const terme of populations) expect(natureDuTerme(terme), terme).toBe('population');
    for (const f of fiches) {
      expect(f.id, f.id).toMatch(RE_FICHE_USAGE);
      expect(populations, `${f.id} : population hors de la liste fermée`).toContain(f.population);
      for (const h of f.hypotheses) expect(hypotheses, `${f.id} : ${h}`).toContain(h);
      expect(f.rubriques.length, `${f.id} : aucune rubrique attendue`).toBeGreaterThan(0);
      expect(new Set(f.rubriques).size, `${f.id} : rubrique en double`).toBe(f.rubriques.length);
      for (const r of f.rubriques) expect(RUBRIQUES_FICHE_USAGE, `${f.id} : ${r}`).toContain(r);
      for (const c of f.claims) {
        expect(c.claimId, f.id).toMatch(/^WN-CL-\d{4}-\d{3}$/);
        expect(c.versionClaim, f.id).toMatch(/^v\d+\.\d+$/);
      }
    }
  });

  it('chaque code d’analyte cité existe au catalogue que les migrations insèrent', () => {
    // Patron de `candidatsNabm.test.ts` : le catalogue est en base, ses codes
    // dans les migrations. Un code absent ferait une fiche sans analyte à l'écran.
    const migrations = join(__dirname, '../../../prisma/migrations');
    const catalogue = new Set<string>();
    for (const dossier of readdirSync(migrations, { withFileTypes: true })) {
      if (!dossier.isDirectory()) continue;
      const sql = readFileSync(join(migrations, dossier.name, 'migration.sql'), 'utf8');
      for (const bloc of sql.matchAll(/INSERT INTO "biology_analytes"[\s\S]*?;/g)) {
        for (const m of bloc[0].matchAll(/'(BIO_[A-Z0-9_]+)'/g)) catalogue.add(m[1]);
      }
    }
    expect(catalogue.size).toBeGreaterThan(0);
    for (const f of FICHES_USAGE_BESOIN2_V1.fiches) {
      for (const code of f.codesAnalyte) expect(catalogue.has(code), `${f.id} : ${code}`).toBe(true);
    }
  });
});
