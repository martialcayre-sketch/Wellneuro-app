// Rattache la liste figée dans la migration de marquage au REGISTRE RÉEL.
//
// Sans ce banc, le périmètre d'orientation vit dans une liste morte que rien ne
// surveille : la migration `20260801200000_rag_claim_usage_orientation` grave
// 106 identifiants au 2026-08-02, et le registre continue d'évoluer sans elle.
// Une source qui passe en `quarantined` après coup n'est pas traitée de la même
// manière selon son type : les sources prescriptives du périmètre sont
// réintégrées par la levée actée le 2026-08-02, les autres restent exclues.
// La migration est one-shot ; elle fige le contrat de périmètre au moment du
// marquage, et le banc force à décider quoi faire des claims déjà marqués.
//
// Ce banc échoue au premier écart. C'est le but : il force à DÉCIDER quoi faire
// des claims déjà marqués, au lieu de laisser la base et le registre diverger
// en silence.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXCLUSIONS_A009 } from './filtre-orientation.mjs';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const REGISTRE = path.join(RACINE, 'docs/claude/corpus/source_registry.json');
const MIGRATION = path.join(
  RACINE,
  'web/prisma/migrations/20260801200000_rag_claim_usage_orientation/migration.sql',
);

// Le périmètre annoncé par la migration, recalculé depuis le registre.
const CORPUS = 'NNPP2_Annee2';
const NOTEBOOKS = new Set(['02', '03', '04', '05', '06', '07', '11']);

function perimetreDepuisRegistre() {
  const registre = JSON.parse(fs.readFileSync(REGISTRE, 'utf8'));
  return new Set(
    registre
      .filter((n) => n.corpus === CORPUS)
      .filter((n) => NOTEBOOKS.has(String(n.primaryNotebook || '').slice(0, 2)))
      .filter((n) => n.lifecycleStatus !== 'quarantined' || n.prescriptive === true)
      .filter((n) => !EXCLUSIONS_A009.includes(n.sourceId))
      .map((n) => n.sourceId),
  );
}

function listeDeLaMigration() {
  const sql = fs.readFileSync(MIGRATION, 'utf8');
  const corps = sql.split('$$');
  assert.ok(corps.length > 1, 'corps de la fonction SQL introuvable');
  return new Set(corps[1].match(/'(WN-SRC-\d{4})'/g).map((s) => s.replaceAll("'", '')));
}

test('la liste figée dans la migration est exactement le périmètre du registre', () => {
  const attendu = perimetreDepuisRegistre();
  const grave = listeDeLaMigration();

  const enTrop = [...grave].filter((s) => !attendu.has(s)).sort();
  const manquants = [...attendu].filter((s) => !grave.has(s)).sort();

  assert.deepEqual(
    enTrop,
    [],
    `sources marquées par la migration mais HORS périmètre du registre (quarantaine posée depuis ? notebook changé ?) : ${enTrop.join(', ')} — décider du démarquage avant de laisser diverger`,
  );
  assert.deepEqual(
    manquants,
    [],
    `sources du périmètre que la migration NE marque pas : ${manquants.join(', ')} — une migration complémentaire est due`,
  );
});

test('les 8 sources prescriptives réintégrées figurent dans la migration', () => {
  const grave = listeDeLaMigration();
  for (const sid of ['WN-SRC-0318', 'WN-SRC-0327', 'WN-SRC-0328', 'WN-SRC-0329', 'WN-SRC-0331', 'WN-SRC-0332', 'WN-SRC-0358', 'WN-SRC-0370']) {
    assert.ok(grave.has(sid), `${sid} doit être réintégré dans le périmètre orientation`);
  }
});

test('la perfusion (A-009 amendé) est hors de la liste', () => {
  const grave = listeDeLaMigration();
  for (const sid of EXCLUSIONS_A009) {
    assert.ok(!grave.has(sid), `${sid} est exclue par A-009 et pourtant marquée par la migration`);
  }
});
