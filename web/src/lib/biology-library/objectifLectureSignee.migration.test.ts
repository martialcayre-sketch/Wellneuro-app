import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { INDICATIONS_BIOLOGIE_V1 } from './indicationsBiologieV1';

// D-389 §4 — la colonne « objectif » des deux panels non indiqués se réécrit
// sans le mot « verbatim » : claim et motif lus dans la table signée, jamais
// recopiés ici, et la migration d'août reste telle qu'elle a été appliquée.

const MIGRATIONS = path.resolve(__dirname, '../../../prisma/migrations');
const MIGRATION = '20261028120000_biology_panels_objectif_lecture_signee';
const MIGRATION_AOUT = '20260817090000_catalogue_biologie_niveau_1_donnees';

const sql = readFileSync(path.join(MIGRATIONS, MIGRATION, 'migration.sql'), 'utf8');

/** Les UPDATE de la migration : code visé, valeur écrite, valeur de la garde d'idempotence. */
function misesAJour(): { code: string; valeur: string; garde: string }[] {
  const litteral = "'((?:[^']|'')*)'";
  const forme = new RegExp(
    `^UPDATE "biology_panels" SET "objectif" = ${litteral}, "updated_at" = CURRENT_TIMESTAMP `
      + `WHERE "code" = '([A-Z_]+)' AND "objectif" IS DISTINCT FROM ${litteral};$`,
    'gm',
  );
  const lire = (s: string) => s.replace(/''/g, "'");
  return [...sql.matchAll(forme)].map(m => ({ code: m[2], valeur: lire(m[1]), garde: lire(m[3]) }));
}

const nonIndiquees = INDICATIONS_BIOLOGIE_V1.filter(r => r.mode === 'non_indique_actuellement');

describe('migration de la colonne « objectif » (D-389 §4)', () => {
  it('vise les deux panels non indiqués de la table, et eux seuls', () => {
    expect(nonIndiquees.map(r => r.id).sort()).toEqual(['BIO-NIA-01', 'BIO-NIA-02']);
    expect(misesAJour().map(u => u.code).sort()).toEqual(nonIndiquees.map(r => r.panelCode).sort());
    expect(sql.match(/^UPDATE /gm)).toHaveLength(2);
  });

  it('écrit le claim et le motif de la table, mot pour mot', () => {
    for (const regle of nonIndiquees) {
      expect(regle.justificationClaims).toHaveLength(1);
      const { claimId } = regle.justificationClaims[0];
      const attendu = `Non indiqué actuellement — ${claimId}, lecture signée du responsable : « ${regle.motif} »`;
      const maj = misesAJour().find(u => u.code === regle.panelCode);
      expect(maj?.valeur).toBe(attendu);
      expect(maj?.garde).toBe(attendu);
    }
  });

  it('ne dit plus « verbatim »', () => {
    expect(sql).not.toMatch(/verbatim/i);
  });

  it('ne porte que des données : aucun DDL, aucune autre écriture', () => {
    expect(sql).not.toMatch(/\b(ALTER|CREATE|DROP|TRUNCATE|INSERT|DELETE|GRANT|REVOKE)\b/i);
  });

  it('laisse la migration d’août intacte', () => {
    const aout = readFileSync(path.join(MIGRATIONS, MIGRATION_AOUT, 'migration.sql'));
    expect(createHash('sha256').update(aout).digest('hex')).toBe(
      '5d65dcb7ba7c5a6c365bc5fc0333265ad58f6825dc134ec264cdba5ae1e44f87',
    );
  });
});
