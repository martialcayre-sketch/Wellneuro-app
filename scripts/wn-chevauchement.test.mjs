// Banc du signal de chevauchement (D-373 §4) — sans réseau : l'API est
// simulée. Le signal ne refuse jamais : chaque cas vérifie le code 0.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SORTIE_SIGNAL, SORTIE_USAGE, analyserArguments, croiser, estDocument, rendre, signaler } from './wn-chevauchement.mjs';
import { PLAFOND_FICHIERS_PR } from './wn-sonde-release-db.mjs';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');

const autre = (numero, fichiers, extra = {}) => ({ numero, titre: `PR ${numero}`, brouillon: false, fichiers, ...extra });

test('documents : les `*.md`, et eux seuls', () => {
  assert.ok(estDocument('docs/claude/PLAN_WELLNEURO.md'));
  assert.ok(estDocument('CLAUDE.md'));
  assert.ok(!estDocument('scripts/wn-merge.mjs'));
  assert.ok(!estDocument('web/src/app/page.tsx'));
});

test('croisement : code et documents séparés, PR sans chemin commun omises, tri par ampleur', () => {
  const r = croiser(
    ['web/src/a.ts', 'web/src/b.ts', 'docs/DECISIONS.md', 'scripts/c.mjs'],
    [autre(10, ['web/src/a.ts', 'docs/DECISIONS.md']), autre(11, ['web/src/x.ts']), autre(12, ['web/src/a.ts', 'web/src/b.ts']), autre(13, ['docs/DECISIONS.md'])],
  );
  assert.deepEqual(r.code.map((x) => [x.numero, x.chemins]), [
    [12, ['web/src/a.ts', 'web/src/b.ts']],
    [10, ['web/src/a.ts']],
  ]);
  assert.deepEqual(r.documents.map((x) => x.numero), [10, 13]);
});

test('rendu : chevauchement de code PR par PR, documents en résumé distinct, ligne machine', () => {
  const lignes = rendre(5, {
    code: [{ numero: 12, titre: 'Lot X', brouillon: true, chemins: ['web/src/a.ts'] }],
    documents: [
      { numero: 10, titre: 'A', brouillon: false, chemins: ['docs/DECISIONS.md', 'docs/claude/PLAN_WELLNEURO.md'] },
      { numero: 13, titre: 'B', brouillon: false, chemins: ['docs/DECISIONS.md'] },
    ],
  });
  assert.match(lignes[0], /^⚠ 1 PR ouverte\(s\) .* signal, pas un refus/);
  assert.match(lignes[1], /#12 \(brouillon\) Lot X — 1 chemin\(s\) : web\/src\/a\.ts/);
  assert.equal(lignes[2], '· documents communs, 2 PR : docs/DECISIONS.md (#10, #13), docs/claude/PLAN_WELLNEURO.md (#10)');
  assert.equal(lignes.at(-1), 'CHEVAUCHEMENT pr=5 prs_code=1 chemins_code=1 prs_documents=2');
  const vide = rendre(5, { code: [], documents: [] });
  assert.match(vide[0], /^✓ aucune PR ouverte/);
  assert.equal(vide.length, 2);
});

/** L'API simulée : `fichiers` par numéro de PR, `ouvertes` la liste des PR ouvertes. */
function api({ fichiers, ouvertes }) {
  return (chemin) => {
    const m = /pulls\/(\d+)\/files/.exec(chemin);
    if (m) return [fichiers[m[1]] ?? []];
    if (chemin.includes('pulls?state=open')) return [ouvertes];
    throw new Error(`chemin inattendu : ${chemin}`);
  };
}

test('collecte : la PR elle-même est exclue, l’ancien nom d’un fichier renommé compte', () => {
  const r = signaler({
    pr: 5,
    lireJson: api({
      fichiers: {
        5: [{ filename: 'web/src/neuf.ts', previous_filename: 'web/src/ancien.ts' }],
        6: [{ filename: 'web/src/ancien.ts' }],
      },
      ouvertes: [
        { number: 5, title: 'elle-même' },
        { number: 6, title: 'touche l’ancien nom', draft: false },
      ],
    }),
  });
  assert.equal(r.code, SORTIE_SIGNAL);
  assert.match(r.lignes[1], /#6 touche l’ancien nom — 1 chemin\(s\) : web\/src\/ancien\.ts/);
  assert.ok(!r.lignes.some((l) => l.startsWith('  #5 ')));
});

test('collecte : une liste tronquée est dite, le signal reste rendu', () => {
  const beaucoup = Array.from({ length: PLAFOND_FICHIERS_PR }, (_, i) => ({ filename: `f${i}.ts` }));
  const r = signaler({ pr: 5, lireJson: api({ fichiers: { 5: [{ filename: 'f1.ts' }], 6: beaucoup }, ouvertes: [{ number: 6, title: 'grosse' }] }) });
  assert.equal(r.code, SORTIE_SIGNAL);
  assert.ok(r.lignes.some((l) => /#6 : liste de fichiers tronquée/.test(l)));
});

test('collecte : une PR voisine illisible est dite, les autres restent croisées', () => {
  const lireJson = (chemin) => {
    if (chemin.includes('pulls/6/files')) throw new Error('HTTP 502');
    return api({ fichiers: { 5: [{ filename: 'web/src/a.ts' }], 7: [{ filename: 'web/src/a.ts' }] }, ouvertes: [{ number: 6, title: 'illisible' }, { number: 7, title: 'voisine' }] })(chemin);
  };
  const r = signaler({ pr: 5, lireJson });
  assert.equal(r.code, SORTIE_SIGNAL);
  assert.match(r.lignes[1], /#7 voisine/);
  assert.ok(r.lignes.includes('· fichiers illisibles, PR non croisée(s) : #6.'));
});

test('collecte : lecture impossible — dit, et sort en 0 (jamais de refus)', () => {
  const r = signaler({
    pr: 5,
    lireJson: () => {
      throw new Error('HTTP 502\ndétail');
    },
  });
  assert.equal(r.code, SORTIE_SIGNAL);
  assert.match(r.lignes[0], /^⚠ signal de chevauchement indisponible .* HTTP 502$/);
  assert.equal(r.lignes.at(-1), 'CHEVAUCHEMENT pr=5 illisible');
});

test('arguments : un numéro de PR, rien d’autre', () => {
  assert.deepEqual(analyserArguments(['12']), { pr: 12 });
  for (const argv of [[], ['0'], ['12', '13'], ['abc']]) assert.ok(analyserArguments(argv).erreur, JSON.stringify(argv));
});

test('CLI : un usage invalide sort en 3 sans rien lire', () => {
  const r = spawnSync(process.execPath, [join(RACINE, 'scripts/wn-chevauchement.mjs')], { encoding: 'utf8' });
  assert.equal(r.status, SORTIE_USAGE);
  assert.match(r.stderr, /usage/);
});

test('parité : le banc est enregistré dans `bancs-outillage-check`', () => {
  const scripts = JSON.parse(readFileSync(join(RACINE, 'web/package.json'), 'utf8')).scripts;
  assert.match(scripts['bancs-outillage-check'], /scripts\/wn-chevauchement\.test\.mjs/);
});
