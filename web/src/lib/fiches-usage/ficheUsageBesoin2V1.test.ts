import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  FICHES_USAGE_BESOIN2_METADATA,
  FICHES_USAGE_BESOIN2_SHA256,
  FICHES_USAGE_BESOIN2_V1,
  ficheDeLaStructure,
  incoherencesDeStructure,
  structureSignee,
  termeDeLaStructure,
  type FicheUsageStructure,
  type StructureFichesUsage,
} from './ficheUsageBesoin2V1';

/** Une fiche synthétique cohérente, à décliner cas par cas. */
const FICHE: FicheUsageStructure = {
  id: 'FU_SYNTH',
  question: 'QC_SYNTH',
  besoins: [2],
  nature: 'mesure_directe',
  usageDecisionnel: 'confirmer_hypothese',
  securiteAdmissibilite: false,
  statutUsage: 'etaye_valide',
  population: 'POP_SYNTH',
  hypotheses: ['HYP_SYNTH'],
  codesAnalyte: [],
  claims: [],
  rubriques: ['question'],
};
const avec = (fiche: Partial<FicheUsageStructure>): StructureFichesUsage => ({
  fiches: [{ ...FICHE, ...fiche }],
  questions: ['QC_SYNTH'],
  hypotheses: ['HYP_SYNTH'],
  populations: ['POP_SYNTH'],
});
/** Un verrou posé, daté — la structure du dépôt n'épingle aucun claim. */
const SIGNEE = { ...FICHES_USAGE_BESOIN2_METADATA, validationExterne: true, dateValidation: '2026-10-16T09:00:00.000Z' };

// La structure est ÉCRITE (2026-11-01) et son verrou ÉTEINT jusqu'à la
// signature du responsable (porte 23 : ses contenus sont les siens). Ce banc
// épingle l'empreinte : toute fiche ajoutée ou retouchée la change, et la sortie
// est de RE-SIGNER, jamais de mettre le littéral à jour en silence. Identifiants
// SYNTHÉTIQUES dans les cas ci-dessous.

describe('structure des fiches d’usage du besoin 2 (D-314 §2)', () => {
  it('épingle l’empreinte de la structure écrite', () => {
    expect(FICHES_USAGE_BESOIN2_SHA256).toBe('f34eda4d16b480bb32a78cf6431f6a9a884293f84d0c3f51b0ed6e5d729ba1d4');
  });

  it('est écrite, verrou éteint, sans signature : rien ne se valide ni ne se sert', () => {
    expect(FICHES_USAGE_BESOIN2_V1.fiches).toHaveLength(30);
    expect(FICHES_USAGE_BESOIN2_V1.hypotheses).toEqual([]);
    expect(FICHES_USAGE_BESOIN2_METADATA.validationExterne).toBe(false);
    expect(FICHES_USAGE_BESOIN2_METADATA.shaPerimetre).toBeNull();
    expect(structureSignee()).toBe(false);
  });

  it('claimsSource est exactement l’union des claims des fiches de la structure', () => {
    const cle = (c: { claimId: string; versionClaim: string }) => `${c.claimId}@${c.versionClaim}`;
    const cites = [...new Set(FICHES_USAGE_BESOIN2_V1.fiches.flatMap(f => f.claims.map(cle)))].sort();
    expect(FICHES_USAGE_BESOIN2_METADATA.claimsSource.map(cle).sort()).toEqual(cites);
  });

  it('une signature ne vaut que sur le périmètre relu : retouchée après signature, la structure ne l’est plus', () => {
    const signee = { ...SIGNEE, shaPerimetre: 'e'.repeat(64) };
    expect(structureSignee(signee, 'e'.repeat(64))).toBe(true);
    expect(structureSignee(signee, 'f'.repeat(64))).toBe(false);
    expect(structureSignee({ ...signee, validationExterne: false }, 'e'.repeat(64))).toBe(false);
  });

  it('une signature sans date, ou à une date hors forme ISO canonique, ne vaut pas', () => {
    const signee = { ...SIGNEE, shaPerimetre: 'e'.repeat(64) };
    expect(structureSignee({ ...signee, dateValidation: null }, 'e'.repeat(64))).toBe(false);
    expect(structureSignee({ ...signee, dateValidation: '2026-10-16' }, 'e'.repeat(64))).toBe(false);
    expect(structureSignee({ ...signee, dateValidation: 'pas une date' }, 'e'.repeat(64))).toBe(false);
  });

  it('claimsSource est exactement l’union des claims des fiches : un claim de fiche non déclaré ferme le verrou', () => {
    const structure = avec({ claims: [{ claimId: 'CLM_SYNTH_A', versionClaim: '1' }, { claimId: 'CLM_SYNTH_B', versionClaim: '2' }] });
    const tous = structure.fiches.flatMap(f => f.claims);
    const signee = { ...SIGNEE, shaPerimetre: 'e'.repeat(64), claimsSource: [...tous] };
    expect(tous.length).toBeGreaterThan(0);
    expect(structureSignee(signee, 'e'.repeat(64), [], structure)).toBe(true);
    expect(structureSignee({ ...signee, claimsSource: tous.slice(1) }, 'e'.repeat(64), [], structure)).toBe(false);
    expect(
      structureSignee({ ...signee, claimsSource: [...tous, { claimId: 'CLM_AUTRE', versionClaim: '1' }] }, 'e'.repeat(64), [], structure),
    ).toBe(false);
  });

  it('trouve une fiche et un terme dans une structure donnée', () => {
    const structure = avec({});
    expect(ficheDeLaStructure('FU_SYNTH', structure)?.population).toBe('POP_SYNTH');
    expect(ficheDeLaStructure('FU_AUTRE', structure)).toBeNull();
    expect(termeDeLaStructure('HYP_SYNTH', structure)).toBe(true);
    expect(termeDeLaStructure('POP_SYNTH', structure)).toBe(true);
    expect(termeDeLaStructure('HYP_AUTRE', structure)).toBe(false);
  });

  // Les règles que toute structure signée devra tenir : elles s'appliquent à
  // la structure du jour, vide aujourd'hui, et la garderont le jour où elle se
  // remplit. Une structure incohérente ne se signe pas, même verrou posé.
  it('la structure du jour est cohérente', () => {
    expect(incoherencesDeStructure()).toEqual([]);
    for (const f of FICHES_USAGE_BESOIN2_V1.fiches) {
      for (const c of f.claims) {
        expect(c.claimId, f.id).toMatch(/^WN-CL-\d{4}-\d{3}$/);
        expect(c.versionClaim, f.id).toMatch(/^v\d+\.\d+$/);
      }
    }
  });

  it('une fiche synthétique complète est cohérente', () => {
    expect(incoherencesDeStructure(avec({}))).toEqual([]);
    expect(incoherencesDeStructure(avec({ securiteAdmissibilite: true, besoins: [2, 4] }))).toEqual([]);
  });

  it.each([
    ['format', { id: 'fu_minuscule' }, 'fu_minuscule:format'],
    ['question non déclarée', { question: 'QC_AUTRE' }, 'FU_SYNTH:question'],
    ['aucun besoin', { besoins: [] }, 'FU_SYNTH:besoins'],
    ['besoin hors des 12', { besoins: [13] }, 'FU_SYNTH:besoins'],
    ['besoin en double', { besoins: [2, 2] }, 'FU_SYNTH:besoins'],
    ['population non déclarée', { population: 'POP_AUTRE' }, 'FU_SYNTH:population'],
    ['hypothèse non déclarée', { hypotheses: ['HYP_AUTRE'] }, 'FU_SYNTH:hypotheses'],
    ['nature inconnue', { nature: 'forte' as never }, 'FU_SYNTH:nature'],
    ['usage inconnu', { usageDecisionnel: 'prescrire' as never }, 'FU_SYNTH:usage_decisionnel'],
    ['statut inconnu', { statutUsage: 'valide' as never }, 'FU_SYNTH:statut_usage'],
    ['aucune rubrique', { rubriques: [] }, 'FU_SYNTH:rubriques'],
    ['rubrique hors liste', { rubriques: ['explication_patient' as never] }, 'FU_SYNTH:rubriques'],
  ])('refuse : %s', (_cas, fiche, attendu) => {
    expect(incoherencesDeStructure(avec(fiche))).toContain(attendu);
  });

  it('nature ↔ statut : une piste exploratoire ou un usage non étayé reste « non validé »', () => {
    for (const nature of ['piste_exploratoire', 'usage_non_etaye'] as const) {
      expect(incoherencesDeStructure(avec({ nature, statutUsage: 'non_valide' }))).toEqual([]);
      for (const statutUsage of ['etaye_valide', 'preuves_limitees'] as const) {
        expect(incoherencesDeStructure(avec({ nature, statutUsage }))).toEqual(['FU_SYNTH:nature_statut']);
      }
    }
    for (const nature of ['mesure_directe', 'information_contributive'] as const) {
      for (const statutUsage of ['etaye_valide', 'preuves_limitees', 'non_valide'] as const) {
        expect(incoherencesDeStructure(avec({ nature, statutUsage }))).toEqual([]);
      }
    }
  });

  it('refuse les listes de la structure mal formées', () => {
    expect(incoherencesDeStructure({ ...avec({}), questions: ['QC_SYNTH', 'question libre'] })).toContain('structure:questions');
    expect(incoherencesDeStructure({ ...avec({}), hypotheses: ['HYP_SYNTH', 'POP_X'] })).toContain('structure:hypotheses');
    expect(incoherencesDeStructure({ ...avec({}), populations: ['POP_SYNTH', 'POP_SYNTH'] })).toContain('structure:populations');
  });

  it('une structure incohérente ne se signe pas, même verrou posé sur son empreinte', () => {
    const signee = { ...SIGNEE, shaPerimetre: 'e'.repeat(64) };
    expect(structureSignee(signee, 'e'.repeat(64), [])).toBe(true);
    expect(structureSignee(signee, 'e'.repeat(64), ['FU_SYNTH:nature_statut'])).toBe(false);
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
