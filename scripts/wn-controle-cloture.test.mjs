// Banc du contrôle de clôture (E56). Il prouve que le garde refuse ce qu'il
// annonce refuser — un garde redevenu muet resterait vert, c'est la leçon de
// l'anti-secrets.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { SESSION_LOG, fichiersPresents, lignesAjoutees, verdictCloture } from './wn-controle-cloture.mjs';

const CODE = 'web/src/lib/protocol/cabinet.ts';
const HANDOFF = 'docs/claude/handoffs/2026-10-18-0400-sujet.md';

test('code + entrée SESSION_LOG + fragment de handoff : clôture présente', () => {
  assert.deepEqual(
    verdictCloture({ fichiers: [CODE, SESSION_LOG, HANDOFF], lignesAjouteesSessionLog: 4 }),
    { ok: true, manques: [] },
  );
});

test('handoff sans SESSION_LOG : refusé — le cas des PR du 15 au 18 octobre', () => {
  const { ok, manques } = verdictCloture({ fichiers: [CODE, HANDOFF], lignesAjouteesSessionLog: 0 });
  assert.equal(ok, false);
  assert.deepEqual(manques, [`une entrée ajoutée à ${SESSION_LOG}`]);
});

test('SESSION_LOG sans handoff : refusé', () => {
  const { ok, manques } = verdictCloture({ fichiers: [CODE, SESSION_LOG], lignesAjouteesSessionLog: 3 });
  assert.equal(ok, false);
  assert.equal(manques.length, 1);
  assert.match(manques[0], /fragment de handoff/);
});

test('ni l’un ni l’autre : les deux manques sont dits', () => {
  assert.equal(verdictCloture({ fichiers: [CODE], lignesAjouteesSessionLog: 0 }).manques.length, 2);
});

test('SESSION_LOG touché sans ligne ajoutée (retouche, suppression) : pas une entrée', () => {
  const { ok } = verdictCloture({ fichiers: [CODE, SESSION_LOG, HANDOFF], lignesAjouteesSessionLog: 0 });
  assert.equal(ok, false);
});

test('le README des handoffs, ou un fichier sans horodatage, n’est pas un handoff', () => {
  for (const faux of ['docs/claude/handoffs/README.md', 'docs/claude/handoffs/notes.md']) {
    const { ok } = verdictCloture({ fichiers: [CODE, SESSION_LOG, faux], lignesAjouteesSessionLog: 2 });
    assert.equal(ok, false, faux);
  }
});

test('un handoff supprimé ne clôt rien ; un renommage compte sous son nouveau nom', () => {
  const nameStatus = [
    `M\t${CODE}`,
    `M\t${SESSION_LOG}`,
    'D\tdocs/claude/handoffs/2026-10-01-0900-ancien.md',
    'R100\tdocs/brouillon.md\tdocs/claude/handoffs/2026-10-18-0400-renomme.md',
  ].join('\n');
  const fichiers = fichiersPresents(nameStatus);
  assert.ok(!fichiers.includes('docs/claude/handoffs/2026-10-01-0900-ancien.md'));
  assert.ok(fichiers.includes('docs/claude/handoffs/2026-10-18-0400-renomme.md'));
  const seulementSupprime = fichiersPresents(`M\t${CODE}\nM\t${SESSION_LOG}\nD\t${HANDOFF}`);
  assert.equal(verdictCloture({ fichiers: seulementSupprime, lignesAjouteesSessionLog: 2 }).ok, false);
});

test('lignes ajoutées lues dans un numstat ; fichier absent ou binaire : 0', () => {
  const numstat = `12\t0\t${SESSION_LOG}\n3\t1\tweb/src/x.ts\n`;
  assert.equal(lignesAjoutees(numstat, SESSION_LOG), 12);
  assert.equal(lignesAjoutees('', SESSION_LOG), 0);
  assert.equal(lignesAjoutees(`-\t-\t${SESSION_LOG}`, SESSION_LOG), 0);
});
