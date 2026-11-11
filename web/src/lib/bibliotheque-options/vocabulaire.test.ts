import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  estIdentifiantOption,
  lireRenvoi,
  OPTION_ID_LONGUEUR_MAX,
  RE_OPTION,
  RUBRIQUES_OPTION,
} from './vocabulaire';

// La base ferme les neuf rubriques et borne l'identifiant d'option (migration
// de la PR 2, D-480 §3). Ce banc LIT LE FICHIER SQL, jamais la base, et rougit
// si les deux divergent : une rubrique ajoutée d'un seul côté serait refusée
// par la base sans que le code le sache, ou acceptée par le code sans que la
// base le sache.

const RACINE = path.resolve(__dirname, '../../../..');
const MIGRATION = path.join(
  RACINE,
  'web/prisma/migrations/20261111180000_bibliotheque_options_textes_v1/migration.sql',
);
const sql = readFileSync(MIGRATION, 'utf8');

/** Le corps du CHECK nommé `contrainte`, jusqu'à la virgule ou au point-virgule de fin. */
function check(contrainte: string): string {
  const debut = sql.indexOf(`ADD CONSTRAINT "${contrainte}"`);
  expect(debut, `contrainte introuvable dans la migration : ${contrainte}`).toBeGreaterThan(-1);
  const corps = /CHECK\s*\(([\s\S]*?)\)\s*[,;]/.exec(sql.slice(debut));
  expect(corps, `CHECK introuvable après ${contrainte}`).not.toBeNull();
  return (corps as RegExpExecArray)[1];
}

describe('vocabulaire de la bibliothèque — aligné sur la migration (D-480 §1, §3)', () => {
  it('le CHECK des versions ferme exactement les neuf rubriques du module, dans le même ordre', () => {
    const fermees = [...check('bibliotheque_options_textes_rubrique_fermee').matchAll(/'([a-z_]+)'/g)].map(m => m[1]);
    expect(fermees).toEqual([...RUBRIQUES_OPTION]);
  });

  it('la population n’est pas une rubrique : elle passe par renvoi (D-480 §1)', () => {
    expect(RUBRIQUES_OPTION).not.toContain('population');
  });

  it('le CHECK de l’identifiant d’option est celui que le format du module respecte', () => {
    const corps = check('bibliotheque_options_textes_option_format').replace(/\s+/g, ' ').trim();
    expect(corps).toBe(`"option_id" ~ '^\\S+$' AND char_length("option_id") <= ${OPTION_ID_LONGUEUR_MAX}`);
  });

  it('tout identifiant conforme passe le CHECK de la base (aucun blanc, borné)', () => {
    expect(RE_OPTION.source).not.toMatch(/\\s| /);
    for (const id of ['OPT_1', 'OPT_A_B_C', `OPT_${'Z'.repeat(OPTION_ID_LONGUEUR_MAX - 4)}`]) {
      expect(estIdentifiantOption(id), id).toBe(true);
      expect(/^\S+$/.test(id) && id.length <= OPTION_ID_LONGUEUR_MAX, id).toBe(true);
    }
    for (const id of ['', 'OPT_', 'OPT_ A', 'opt_a', 'OPT-A', 'HYP_A', `OPT_${'Z'.repeat(OPTION_ID_LONGUEUR_MAX - 3)}`]) {
      expect(estIdentifiantOption(id), id).toBe(false);
    }
  });
});

describe('renvois (D-480 §4)', () => {
  it('lit un claim, une position, l’information manquante', () => {
    expect(lireRenvoi('WN-CL-9999-001@v1.0')).toEqual({ nature: 'claim', claimId: 'WN-CL-9999-001', versionClaim: 'v1.0' });
    expect(lireRenvoi('WN-PE-9999@v0.2')).toEqual({ nature: 'position', positionId: 'WN-PE-9999', version: 'v0.2' });
    expect(lireRenvoi('information_manquante')).toEqual({ nature: 'information_manquante' });
  });

  it('refuse tout autre texte', () => {
    for (const valeur of ['', 'WN-CL-9999-001', 'WN-CL-9999-001@1.0', 'WN-PE-9999@1.0', 'WN-PE-9999@v1', 'manquante', 'WN-CL-9999-001@v1.0 ']) {
      expect(lireRenvoi(valeur), valeur).toBeNull();
    }
  });
});
