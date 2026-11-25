// Banc du bloc SECURITY de `scripts/wn-kit-doctor.mjs`, sur des répertoires
// de fixtures jetables (lot `kit-doctor-secrets-verdict-exact`).
//
// Le doctor recopiait un unique booléen sur ses lignes « No secrets in … » :
// une occurrence documentaire sous docs/ rougissait aussi .wn/ et .claude/,
// sans nommer le fichier (40/43 constaté sur main le 2026-11-07 et le
// 2026-11-25). Le banc tient quatre promesses :
//   1. chaque ligne ne juge que ses propres racines ;
//   2. une ligne rouge nomme fichier et motif, jamais la valeur trouvée ;
//   3. les exemptions suivent GREP_EXCLUDES de scripts/check_no_secrets.sh
//      (répertoires .git, node_modules, .next, generated, pgdata ; fichiers
//      package-lock.json, *.lock, .env*.local*) ;
//   4. chaque bloc s'imprime, même après un bloc rouge (`every` taisait les
//      suivants — une fixture rougit toujours STRUCTURE).
// Le doctor se joue depuis la racine de la fixture (`cwd`), comme en vrai.

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'wn-kit-doctor.mjs');

function fixture(fichiers) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wn-kit-doctor-'));
  for (const [rel, contenu] of Object.entries(fichiers)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, contenu);
  }
  return dir;
}

function securite(dir) {
  // Sans les GIT_* hérités (crochet git) : le bloc GIT lit la fixture, pas le dépôt.
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));
  const r = spawnSync(process.execPath, [SCRIPT, 'check'], { cwd: dir, encoding: 'utf8', env });
  fs.rmSync(dir, { recursive: true, force: true });
  const sortie = r.stdout;
  const debut = sortie.indexOf('[SECURITY]');
  assert.notEqual(debut, -1, `bloc SECURITY absent de la sortie :\n${sortie}`);
  const bloc = sortie.slice(debut).split('\n').filter((l) => l.startsWith('✓ No secrets') || l.startsWith('✗ No secrets'));
  const lignes = {};
  for (const l of bloc) {
    const m = l.match(/^([✓✗]) No secrets in (\S+)(?: \((.*)\))?$/);
    assert.ok(m, `ligne illisible : ${l}`);
    lignes[m[2]] = { ok: m[1] === '✓', detail: m[3] ?? '' };
  }
  return { lignes, sortie };
}

const PROPRE = '# Rien ici\n';
const BASE = {
  '.wn/notes.md': PROPRE,
  '.claude/skills/a/SKILL.md': PROPRE,
  '.claude/agents/b.md': PROPRE,
  '.github/prompts/c.md': PROPRE,
  'docs/d.md': PROPRE,
};

test('arbre propre : quatre lignes vertes, sans détail', () => {
  const { lignes } = securite(fixture(BASE));
  assert.deepEqual(Object.keys(lignes), ['.wn/', '.claude/', '.github/prompts/', 'docs/']);
  for (const [nom, l] of Object.entries(lignes)) {
    assert.equal(l.ok, true, nom);
    assert.equal(l.detail, '', nom);
  }
});

test('une occurrence sous docs/ ne rougit que docs/, et la nomme', () => {
  const { lignes, sortie } = securite(
    fixture({ ...BASE, 'docs/campagne/prompt.md': 'Lancer : DATABASE_URL=valeur-qui-ne-sort-pas npx prisma\n' })
  );
  assert.equal(lignes['.wn/'].ok, true);
  assert.equal(lignes['.claude/'].ok, true);
  assert.equal(lignes['.github/prompts/'].ok, true);
  assert.equal(lignes['docs/'].ok, false);
  assert.equal(lignes['docs/'].detail, "docs/campagne/prompt.md : 'DATABASE_URL='");
  assert.doesNotMatch(sortie, /valeur-qui-ne-sort-pas/);
});

test('une occurrence sous .claude/agents ne rougit que .claude/ ; plusieurs se listent toutes, triées', () => {
  const { lignes } = securite(
    fixture({
      ...BASE,
      '.claude/agents/z.md': 'NEXTAUTH_SECRET=x\n',
      '.claude/skills/a/SKILL.md': 'DATABASE_URL=x et NEXTAUTH_SECRET=y\n',
    })
  );
  assert.equal(lignes['docs/'].ok, true);
  assert.equal(lignes['.wn/'].ok, true);
  assert.equal(lignes['.claude/'].ok, false);
  assert.equal(
    lignes['.claude/'].detail,
    ".claude/agents/z.md : 'NEXTAUTH_SECRET=' ; .claude/skills/a/SKILL.md : 'DATABASE_URL=' ; .claude/skills/a/SKILL.md : 'NEXTAUTH_SECRET='"
  );
});

test('.wn/ et .github/prompts/ se jugent chacun à part', () => {
  const { lignes } = securite(
    fixture({ ...BASE, '.wn/state.json': '{"x":"GOOGLE_CLIENT_SECRET="}\n', '.github/prompts/p.yml': 'k: ANTHROPIC_API_KEY=\n' })
  );
  assert.equal(lignes['.wn/'].ok, false);
  assert.equal(lignes['.wn/'].detail, ".wn/state.json : 'GOOGLE_CLIENT_SECRET='");
  assert.equal(lignes['.github/prompts/'].ok, false);
  assert.equal(lignes['.github/prompts/'].detail, ".github/prompts/p.yml : 'ANTHROPIC_API_KEY='");
  assert.equal(lignes['.claude/'].ok, true);
  assert.equal(lignes['docs/'].ok, true);
});

test('exemptions alignées sur check_no_secrets.sh : répertoires et fichiers exclus ne sont pas lus', () => {
  const motif = 'DATABASE_URL=x\n';
  const { lignes } = securite(
    fixture({
      ...BASE,
      'docs/node_modules/m.md': motif,
      'docs/.next/n.json': motif,
      'docs/generated/g.md': motif,
      'docs/pgdata/p.md': motif,
      'docs/.git/h.md': motif,
      'docs/package-lock.json': motif,
      'docs/autre.lock': motif,
      'docs/.env.test.local.md': motif,
    })
  );
  assert.equal(lignes['docs/'].ok, true, lignes['docs/'].detail);
});

test('contre-épreuve des exemptions : un répertoire voisin non exclu reste lu', () => {
  const { lignes } = securite(fixture({ ...BASE, 'docs/.github/g.md': 'DATABASE_URL=x\n' }));
  assert.equal(lignes['docs/'].ok, false);
  assert.equal(lignes['docs/'].detail, "docs/.github/g.md : 'DATABASE_URL='");
});

test('racine absente : ligne verte qui le dit', () => {
  const { lignes } = securite(fixture({ 'docs/d.md': PROPRE }));
  assert.deepEqual(lignes['.wn/'], { ok: true, detail: 'absent' });
  assert.deepEqual(lignes['.claude/'], { ok: true, detail: 'absent' });
  assert.deepEqual(lignes['docs/'], { ok: true, detail: '' });
});

test('une racine absente sur deux est nommée, à côté des occurrences', () => {
  const { '.claude/agents/b.md': _sansAgents, ...base } = BASE;
  const { lignes } = securite(fixture(base));
  assert.deepEqual(lignes['.claude/'], { ok: true, detail: '.claude/agents absent' });
  const rouge = securite(fixture({ ...base, '.claude/skills/a/SKILL.md': 'DATABASE_URL=x\n' }));
  assert.deepEqual(rouge.lignes['.claude/'], {
    ok: false,
    detail: ".claude/skills/a/SKILL.md : 'DATABASE_URL=' ; .claude/agents absent",
  });
});

test('chaque bloc s’imprime après un bloc rouge, et le total les compte tous', () => {
  const { sortie } = securite(fixture(BASE));
  assert.match(sortie, /\[STRUCTURE\][\s\S]*✗ \.wn\/config\.yml/);
  for (const bloc of ['[STRUCTURE]', '[GIT]', '[SECURITY]']) assert.ok(sortie.includes(bloc), bloc);
  const totaux = [...sortie.matchAll(/→ (\d+)\/(\d+) passed/g)].map((m) => Number(m[2]));
  const global = sortie.match(/(\d+)\/(\d+) checks passed/);
  assert.ok(global);
  assert.equal(totaux.reduce((a, b) => a + b, 0), Number(global[2]));
});
