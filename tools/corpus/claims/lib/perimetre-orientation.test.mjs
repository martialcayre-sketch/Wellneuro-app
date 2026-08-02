// Rattache la liste figée dans la migration de marquage au REGISTRE RÉEL.
//
// Sans ce banc, le périmètre d'orientation vit dans une liste morte que rien ne
// surveille : la migration `20260801200000_rag_claim_usage_orientation` grave
// 98 identifiants au 2026-08-01, et le registre continue d'évoluer sans elle.
// Une source qui passe en `quarantined` après coup — c'est exactement l'usage
// du mécanisme, 8 sources du périmètre y sont déjà passées — garderait sa
// marque `usage = 'orientation'` pour toujours : la migration est one-shot, il
// n'existe aucun chemin de démarquage, et rien au runtime ne relit
// `lifecycleStatus`.
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
      .filter((n) => n.lifecycleStatus !== 'quarantined')
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

test('les sources en quarantaine du périmètre sont bien hors de la liste', () => {
  const registre = JSON.parse(fs.readFileSync(REGISTRE, 'utf8'));
  const grave = listeDeLaMigration();
  const quarantaine = registre
    .filter((n) => n.corpus === CORPUS)
    .filter((n) => NOTEBOOKS.has(String(n.primaryNotebook || '').slice(0, 2)))
    .filter((n) => n.lifecycleStatus === 'quarantined')
    .map((n) => n.sourceId);

  assert.ok(quarantaine.length > 0, 'aucune source en quarantaine : le banc ne prouverait rien');
  for (const sid of quarantaine) {
    assert.ok(!grave.has(sid), `${sid} est en quarantaine et pourtant marquée par la migration`);
  }
});

test('la perfusion (A-009 amendé) est hors de la liste', () => {
  const grave = listeDeLaMigration();
  for (const sid of EXCLUSIONS_A009) {
    assert.ok(!grave.has(sid), `${sid} est exclue par A-009 et pourtant marquée par la migration`);
  }
});
