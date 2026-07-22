import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { collate } from './changelog-collate.mjs';

// Banc autonome : chaque test se fabrique un CHANGELOG et un changelog.d/ jetables
// dans un répertoire temporaire, jamais le vrai fichier du dépôt.
function fixture(fragments = {}, changelog = CHANGELOG_INITIAL) {
  const base = mkdtempSync(join(tmpdir(), 'wn-changelog-'));
  const fragDir = join(base, 'changelog.d');
  mkdirSync(fragDir);
  const changelogPath = join(base, 'CHANGELOG.md');
  writeFileSync(changelogPath, changelog);
  for (const [nom, contenu] of Object.entries(fragments)) {
    writeFileSync(join(fragDir, nom), contenu);
  }
  return { fragDir, changelogPath };
}

const CHANGELOG_INITIAL = `# Changelog

Toutes les évolutions notables doivent être documentées ici.

## Non publié

### Entrée existante (2026-07-20)

Corps de l'entrée déjà présente.
`;

test('sans fragment, le CHANGELOG est inchangé et rien n’est écrit', () => {
  const { fragDir, changelogPath } = fixture();
  const avant = readFileSync(changelogPath, 'utf8');
  const res = collate({ fragDir, changelogPath });
  assert.equal(res.inseres, 0);
  assert.equal(readFileSync(changelogPath, 'utf8'), avant);
});

test('un fragment est inséré sous « ## Non publié », avant l’entrée existante', () => {
  const { fragDir, changelogPath } = fixture({
    '2026-07-22-nouvelle.md': '### Nouvelle entrée (2026-07-22)\n\nCorps neuf.\n',
  });
  const res = collate({ fragDir, changelogPath });

  assert.equal(res.inseres, 1);
  const sortie = readFileSync(changelogPath, 'utf8');
  const posMarqueur = sortie.indexOf('## Non publié');
  const posNouvelle = sortie.indexOf('### Nouvelle entrée');
  const posExistante = sortie.indexOf('### Entrée existante');
  // Ordre : marqueur, puis le fragment neuf, puis l'entrée qui était déjà là.
  assert.ok(posMarqueur < posNouvelle && posNouvelle < posExistante);
  // Le fichier de fragment a été supprimé après repli.
  assert.equal(existsSync(join(fragDir, '2026-07-22-nouvelle.md')), false);
});

test('plusieurs fragments : le plus récent (préfixe date) en tête', () => {
  const { fragDir, changelogPath } = fixture({
    '2026-07-21-ancien.md': '### Ancien (2026-07-21)\n\nA.\n',
    '2026-07-23-recent.md': '### Récent (2026-07-23)\n\nR.\n',
    '2026-07-22-milieu.md': '### Milieu (2026-07-22)\n\nM.\n',
  });
  const res = collate({ fragDir, changelogPath });

  assert.equal(res.inseres, 3);
  const sortie = readFileSync(changelogPath, 'utf8');
  const ordre = ['### Récent', '### Milieu', '### Ancien', '### Entrée existante'].map((t) =>
    sortie.indexOf(t),
  );
  assert.deepEqual(ordre, [...ordre].sort((a, b) => a - b));
  assert.ok(ordre.every((p) => p !== -1));
});

test('le README n’est jamais replié ni supprimé', () => {
  const { fragDir, changelogPath } = fixture({
    'README.md': '# convention\n',
    '2026-07-22-x.md': '### X (2026-07-22)\n\nx.\n',
  });
  collate({ fragDir, changelogPath });
  assert.equal(existsSync(join(fragDir, 'README.md')), true);
  assert.deepEqual(readdirSync(fragDir), ['README.md']);
});

test('dry-run : ni écriture ni suppression', () => {
  const { fragDir, changelogPath } = fixture({
    '2026-07-22-x.md': '### X (2026-07-22)\n\nx.\n',
  });
  const avant = readFileSync(changelogPath, 'utf8');
  const res = collate({ fragDir, changelogPath, apply: false });

  assert.equal(res.inseres, 1);
  assert.match(res.contenu, /### X \(2026-07-22\)/); // le résultat simulé contient bien l'entrée
  assert.equal(readFileSync(changelogPath, 'utf8'), avant); // mais le fichier n'a pas bougé
  assert.equal(existsSync(join(fragDir, '2026-07-22-x.md')), true); // ni le fragment
});

test('un marqueur absent lève une erreur explicite', () => {
  const { fragDir, changelogPath } = fixture(
    { '2026-07-22-x.md': '### X (2026-07-22)\n\nx.\n' },
    '# Changelog\n\nPas de section « Non publié » ici.\n',
  );
  assert.throws(() => collate({ fragDir, changelogPath }), /Non publié/);
});

test('pas de lignes vides accumulées à la jointure', () => {
  const { fragDir, changelogPath } = fixture({
    '2026-07-22-x.md': '### X (2026-07-22)\n\nx.\n\n\n', // bords bruyants volontaires
  });
  collate({ fragDir, changelogPath });
  const sortie = readFileSync(changelogPath, 'utf8');
  assert.ok(!sortie.includes('\n\n\n'), 'aucune séquence de trois sauts de ligne');
});
