import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CANDIDATS_NABM } from '../biology-library/candidatsNabm';
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
  niveauMesure: 'mesure_standard',
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
/** Un verrou posé, daté, sur les claims de la structure du dépôt — l'empreinte se passe à part. */
const SIGNEE = { ...FICHES_USAGE_BESOIN2_METADATA, validationExterne: true, dateValidation: '2026-10-16T09:00:00.000Z' };

// La structure, signée le 2026-11-01 (D-401), re-signée le 2026-11-03 pour
// B9 et B12 (D-434), est RE-SIGNÉE le 2026-11-05 pour l'iode et le sélénium
// (D-446) : quarante-six fiches, sur la déclaration du responsable
// (porte 23 : ses contenus sont les siens). Les huit fiches des polyphénols et
// antioxydants, écrites le 2026-11-07, portent la structure à cinquante-quatre :
// verrou ÉTEINT jusqu'à la déclaration du responsable. Ce banc
// épingle l'empreinte : toute fiche ajoutée ou retouchée la change, et la sortie
// est de RE-SIGNER, jamais de mettre le littéral à jour en silence. Identifiants
// SYNTHÉTIQUES dans les cas ci-dessous.

describe('structure des fiches d’usage du besoin 2 (D-314 §2)', () => {
  it('épingle l’empreinte de la structure écrite', () => {
    expect(FICHES_USAGE_BESOIN2_SHA256).toBe('58adcff61f30e13f955988caf55ee7781a6b70902a27c89b0dd95f790df93a86');
  });

  it('écrite pour les polyphénols et antioxydants : verrou éteint jusqu’à la déclaration du responsable', () => {
    expect(FICHES_USAGE_BESOIN2_V1.fiches).toHaveLength(54);
    expect(FICHES_USAGE_BESOIN2_V1.hypotheses).toEqual([]);
    expect(FICHES_USAGE_BESOIN2_METADATA.validationExterne).toBe(false);
    expect(FICHES_USAGE_BESOIN2_METADATA.dateValidation).toBeNull();
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

  it('niveau de mesure (DC-45, D-417 §2, §4) : obligatoire, l’une des trois valeurs', () => {
    for (const niveauMesure of ['mesure_standard', 'exploration_fonctionnelle', 'marqueur_experimental'] as const) {
      expect(incoherencesDeStructure(avec({ niveauMesure }))).toEqual([]);
    }
    // Absent : la structure ne se signe pas (re-signature B9/B12, arbitrage du 2026-11-03).
    expect(incoherencesDeStructure(avec({ niveauMesure: undefined as never }))).toEqual(['FU_SYNTH:niveau_mesure']);
    expect(FICHES_USAGE_BESOIN2_V1.fiches.filter(f => f.niveauMesure === undefined)).toEqual([]);
  });

  it('niveau de mesure (D-434 §3, précisée par D-446 §3) : un analyte sans acte NABM exclut la mesure standard', () => {
    // Règle de pré-remplissage relue : acte de groupe OU aucun acte ⇒
    // exploration fonctionnelle. Le banc garde la seule branche que le
    // catalogue des candidats tranche seul : une fiche dont un analyte est en
    // `aucun_acte` ne peut pas être une « mesure standard ».
    const enDefaut = (structure: StructureFichesUsage) =>
      structure.fiches
        .filter(
          f =>
            f.niveauMesure === 'mesure_standard' &&
            f.codesAnalyte.some(code => CANDIDATS_NABM[code]?.situation === 'aucun_acte'),
        )
        .map(f => f.id);
    const sansActe = FICHES_USAGE_BESOIN2_V1.fiches.filter(f =>
      f.codesAnalyte.some(code => CANDIDATS_NABM[code]?.situation === 'aucun_acte'),
    );
    // Anti-vacuité : les huit fiches iode et sélénium (D-446) au moins.
    expect(sansActe.length).toBeGreaterThanOrEqual(8);
    expect(enDefaut(FICHES_USAGE_BESOIN2_V1)).toEqual([]);
    // Mutation : une seule de ces fiches passée en mesure standard rougit.
    const cible = sansActe[0];
    const mutee: StructureFichesUsage = {
      ...FICHES_USAGE_BESOIN2_V1,
      fiches: FICHES_USAGE_BESOIN2_V1.fiches.map(f =>
        f.id === cible.id ? { ...f, niveauMesure: 'mesure_standard' } : f,
      ),
    };
    expect(enDefaut(mutee)).toEqual([cible.id]);
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
    ['niveau de mesure inconnu', { niveauMesure: 'A' as never }, 'FU_SYNTH:niveau_mesure'],
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
    for (const statutUsage of ['etaye_valide', 'preuves_limitees', 'non_valide'] as const) {
      expect(incoherencesDeStructure(avec({ nature: 'mesure_directe', statutUsage }))).toEqual([]);
    }
  });

  it('nature ↔ statut : une information contributive admet au plus « preuves limitées » (D-266 §3, D-417 §3)', () => {
    for (const statutUsage of ['preuves_limitees', 'non_valide'] as const) {
      expect(incoherencesDeStructure(avec({ nature: 'information_contributive', statutUsage }))).toEqual([]);
    }
    expect(incoherencesDeStructure(avec({ nature: 'information_contributive', statutUsage: 'etaye_valide' })))
      .toEqual(['FU_SYNTH:nature_statut']);
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
