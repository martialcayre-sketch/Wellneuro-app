import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DOSSIERS_POSITION, LIBELLES_DOSSIERS } from './vocabulaire';

// La base ferme la liste des dossiers ; la route et l'atelier la recopient
// (D-439 §2, D-464). Ce banc lit la DERNIÈRE migration qui pose la contrainte
// et refuse que les deux divergent : un dossier ajouté d'un seul côté serait
// refusé par la base sans que le code le sache, ou proposé à l'atelier sans
// que la base l'accepte.
describe('dossiers de preuve — la liste du code est celle du CHECK', () => {
  const MIGRATIONS = path.resolve(__dirname, '../../../prisma/migrations');
  const POSE = /ADD CONSTRAINT "positions_expert_versions_dossier_ferme"\s+CHECK \("dossier" IN \(([^)]*)\)\)/;
  const derniere = readdirSync(MIGRATIONS)
    .filter(nom => /^[0-9]{14}_/.test(nom))
    .sort()
    .map(nom => ({ nom, sql: readFileSync(path.join(MIGRATIONS, nom, 'migration.sql'), 'utf8') }))
    .filter(m => POSE.test(m.sql))
    .at(-1);

  // Entre la migration d'un dossier entrant et son code, la base en accepte
  // un de plus que la route (D-464 §3 et §5) : le code est un PRÉFIXE de la
  // liste de la base, jamais l'inverse. Aujourd'hui, les deux sont égales.
  it('le code recopie la liste de la dernière migration qui pose la contrainte, dans son ordre', () => {
    expect(derniere).toBeDefined();
    const liste = POSE.exec(derniere!.sql)![1].split(',').map(v => v.trim().replace(/^'|'$/g, ''));
    expect(liste.slice(0, DOSSIERS_POSITION.length)).toEqual([...DOSSIERS_POSITION]);
    expect(liste).toContain('iode_selenium');
    expect(liste).toContain('polyphenols_antioxydants');
    expect(DOSSIERS_POSITION).toHaveLength(7);
  });

  it('les deux dossiers entrés par D-464 ont leur libellé', () => {
    expect(LIBELLES_DOSSIERS.iode_selenium).toBe('Iode et sélénium');
    expect(LIBELLES_DOSSIERS.polyphenols_antioxydants).toBe('Polyphénols et antioxydants');
    for (const d of DOSSIERS_POSITION) expect(LIBELLES_DOSSIERS[d].trim()).not.toBe('');
  });
});
