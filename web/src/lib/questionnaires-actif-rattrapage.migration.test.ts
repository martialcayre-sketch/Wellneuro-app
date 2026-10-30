import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { IDS_SUSPENDUS, QUESTIONNAIRES_CATALOG } from './questionnaires-catalog';

// D-395 (plan D/51) — `questionnaires.actif` rattrape le catalogue de code pour
// six instruments. La base est la source du contrat
// `packs_instruments_suspendus_v1` : une ligne réactivée à tort ferait taire ce
// contrat sur un instrument encore suspendu, une ligne oubliée le laisserait
// lire une suspension levée.
//
// Ce banc lit le SQL réellement livré, pas une copie. L'application en
// production se constate par conteneur après la release-db.
const MIGRATION = readFileSync(
  join(
    __dirname,
    '../../prisma/migrations/20261029230000_questionnaires_actif_reactives/migration.sql',
  ),
  'utf8',
);

// Le SQL sans ses commentaires : le texte d'explication cite des noms
// d'instruments et des mots (« supprimée ») qui ne sont pas des instructions.
const INSTRUCTIONS = MIGRATION.split('\n')
  .filter(ligne => !ligne.trimStart().startsWith('--'))
  .join('\n');

// Les cinq de D-066, et `Q_ALI_09`, dont `actif` suit `WN_AGENDA_ALI`
// (allumé en production le 2026-10-29).
const REACTIVES_D066 = ['Q_GEO_03', 'Q_GEO_04', 'Q_GEO_05', 'Q_GEO_06', 'Q_NEU_06'];
const SUIT_LE_DRAPEAU = 'Q_ALI_09';

function idsDuUpdate(): string[] {
  const clause = INSTRUCTIONS.match(/"questionnaire_id" IN \(([^)]*)\)/)?.[1];
  expect(clause, 'clause IN de l’UPDATE introuvable').toBeTruthy();
  return [...(clause as string).matchAll(/'([^']+)'/g)].map(m => m[1]);
}

describe('rattrapage de questionnaires.actif (D-395)', () => {
  it('vise exactement les cinq de D-066 et Q_ALI_09', () => {
    expect([...idsDuUpdate()].sort()).toEqual([...REACTIVES_D066, SUIT_LE_DRAPEAU].sort());
  });

  // Lie une migration appliquée à l'état courant du catalogue, et c'est voulu :
  // si une décision future suspend de nouveau l'un des cinq, ce banc rougit, et
  // la base doit suivre par une nouvelle décision (D-395 §2).
  it('les cinq de D-066 sont actifs au catalogue de code', () => {
    for (const id of REACTIVES_D066) {
      expect(QUESTIONNAIRES_CATALOG.some(q => q.id === id), `${id} absent du catalogue`).toBe(true);
      expect(IDS_SUSPENDUS.has(id), `${id} suspendu au catalogue`).toBe(false);
    }
  });

  it('ne réactive aucun instrument que le catalogue suspend sans drapeau', () => {
    // Q_ALI_09 dépend du drapeau, qui est éteint dans les bancs : il est le
    // seul suspendu toléré ici.
    const suspendusVises = idsDuUpdate().filter(id => IDS_SUSPENDUS.has(id) && id !== SUIT_LE_DRAPEAU);
    expect(suspendusVises).toEqual([]);
  });

  it('une seule instruction, un UPDATE borné et idempotent, rien de destructif', () => {
    // Un seul point-virgule hors commentaires : aucune autre instruction
    // (GRANT, COMMENT, DO…) ne passe à côté de l'UPDATE.
    expect(INSTRUCTIONS.match(/;/g)).toHaveLength(1);
    expect(INSTRUCTIONS.match(/\bUPDATE\b/g)).toHaveLength(1);
    expect(INSTRUCTIONS).toMatch(/UPDATE "questionnaires"\s+SET "actif" = true,/);
    expect(INSTRUCTIONS).toMatch(/WHERE "questionnaire_id" IN \([^)]*\)\s+AND NOT "actif";/);
    expect(INSTRUCTIONS).not.toMatch(/\b(DELETE|TRUNCATE|DROP|INSERT|ALTER|CREATE)\b/i);
  });
});
