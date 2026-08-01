// Banc de CÂBLAGE des gardes de troncature.
//
//   node --test tools/corpus/certify/lib/cablage.test.mjs
//
// Pourquoi ce banc existe, alors que `troncature.test.mjs` couvre déjà les
// gardes : ce dernier prouve que les fonctions MORDENT, pas qu'on les APPELLE.
// Supprimez l'appel dans `certify.mjs` et tous ses cas restent verts, pendant
// que le banc rejoue « aucun objet JSON dans la réponse » sur une réponse
// coupée — l'état exact du 2026-07-30, qui a fermé `Q_PED_03` sur un faux
// diagnostic. Le correctif serait alors mort sans que rien ne le signale.
//
// Les fonctions de lecture sont privées à `certify.mjs` et exigent deux clés
// d'API : il n'existe aucune couture pour les appeler en test. On inspecte donc
// la SOURCE. C'est grossier, et c'est assumé — ce banc ne vérifie qu'une chose,
// l'ORDRE de deux appels, et cette chose est précisément celle qui a manqué.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = await fs.readFile(path.join(ICI, '..', 'certify.mjs'), 'utf8');

/** Corps d'une fonction `async function <nom>(…) { … }` de la source. */
function corpsDe(nom) {
  const debut = SOURCE.indexOf(`async function ${nom}(`);
  assert.notEqual(debut, -1, `fonction \`${nom}\` introuvable dans certify.mjs — banc à remettre à jour`);
  const ouvrante = SOURCE.indexOf('{', debut);
  let profondeur = 0;
  for (let i = ouvrante; i < SOURCE.length; i++) {
    if (SOURCE[i] === '{') profondeur++;
    else if (SOURCE[i] === '}' && --profondeur === 0) return SOURCE.slice(ouvrante, i + 1);
  }
  assert.fail(`accolade fermante de \`${nom}\` introuvable`);
}

const CAS = [
  { lecture: 'lectureStructuranteClaude', garde: 'verifierReponseClaude' },
  { lecture: 'lectureStructuranteGpt', garde: 'verifierReponseGpt' },
];

for (const { lecture, garde } of CAS) {
  test(`${lecture} appelle ${garde}`, () => {
    assert.match(
      corpsDe(lecture),
      new RegExp(`${garde}\\s*\\(`),
      `le garde n'est plus appelé : une réponse coupée repartirait au parse`,
    );
  });

  test(`${lecture} appelle ${garde} AVANT extraireJson`, () => {
    const corps = corpsDe(lecture);
    const posGarde = corps.search(new RegExp(`${garde}\\s*\\(`));
    const posParse = corps.search(/extraireJson\s*\(/);
    assert.notEqual(posParse, -1, 'extraireJson n’est plus appelé — banc à remettre à jour');
    assert.ok(
      posGarde < posParse,
      `${garde} doit précéder extraireJson : après le parse, l’erreur de parse a déjà masqué la vraie cause`,
    );
  });
}

test('les deux gardes sont bien importés depuis le module testé', () => {
  assert.match(SOURCE, /import\s*\{[^}]*verifierReponseClaude[^}]*\}\s*from\s*'\.\/lib\/troncature\.mjs'/);
  assert.match(SOURCE, /import\s*\{[^}]*verifierReponseGpt[^}]*\}\s*from\s*'\.\/lib\/troncature\.mjs'/);
});

test('les deux lectures disposent du MÊME plafond de sortie', () => {
  // L'asymétrie 32000 / 8192 est la cause première de l'échec du 2026-07-30 :
  // elle ne coupait qu'une lecture sur deux, donc elle ne se voyait que comme
  // un croisement manquant. Ce cas la fige.
  const plafondClaude = corpsDe('lectureStructuranteClaude').match(/max_tokens:\s*(\d+)/)?.[1];
  const plafondGpt = corpsDe('lectureStructuranteGpt').match(/max_output_tokens:\s*(\d+)/)?.[1];
  assert.ok(plafondClaude, 'plafond de la lecture B introuvable');
  assert.ok(plafondGpt, 'plafond de la lecture C introuvable');
  assert.equal(
    plafondGpt,
    plafondClaude,
    'une lecture qui plafonne plus bas que l’autre coupe seule, et le croisement échoue sans que la cause se voie',
  );
});
