// Banc de `wn-codex-avis.mjs` (D-505) : la commande fermée, le filtre du
// paquet, la lecture du journal et la forme de l'avis. Aucun appel à Codex.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  FONCTIONS_COUPEES, PAQUET_CONTROLE, analyserEvenements, construireArgs, controleTenu,
  environnementReduit, filtrerPaquet, rendreMarkdown, trouverCodex, validerAvis,
} from './wn-codex-avis.mjs';

const args = construireArgs({ dossierVide: '/t/vide', schema: '/t/s.json', sortie: '/t/r.json', modele: 'm' });

test('la commande porte toujours les drapeaux fermés de D-505 §2', () => {
  for (const d of ['--ignore-user-config', '--ignore-rules', '--ephemeral', '--skip-git-repo-check', '--json']) {
    assert.ok(args.includes(d), d);
  }
  assert.equal(args[args.indexOf('-s') + 1], 'read-only');
  assert.equal(args[args.indexOf('-C') + 1], '/t/vide');
  assert.equal(args[args.indexOf('--output-schema') + 1], '/t/s.json');
  assert.equal(args.at(-1), '-');
  assert.ok(args.includes('web_search="disabled"'));
});

test('jamais d\'option qui ouvre l\'exécution ou l\'écriture', () => {
  for (const d of ['--dangerously-bypass-approvals-and-sandbox', '--dangerously-bypass-hook-trust', '--approve-for-me', '--add-dir', 'workspace-write', 'danger-full-access', '--worktree']) {
    assert.ok(!args.includes(d), d);
  }
});

test('les outils qui lisent ou agissent sont coupés', () => {
  for (const f of ['shell_tool', 'unified_exec', 'apps', 'plugins', 'browser_use', 'computer_use']) {
    assert.ok(FONCTIONS_COUPEES.includes(f), f);
  }
  for (const f of FONCTIONS_COUPEES) assert.equal(args[args.indexOf(f) - 1], '--disable', f);
});

test('environnement réduit : ni jeton ni URL de base', () => {
  const env = environnementReduit({ PATH: '/bin', HOME: '/h', GH_TOKEN: 'x', DATABASE_URL: 'y', ANTHROPIC_API_KEY: 'z' });
  assert.deepEqual(Object.keys(env).sort(), ['HOME', 'PATH']);
});

test('filtre : un paquet propre passe', () => {
  assert.deepEqual(filtrerPaquet('Question : nommer un script.\n- A — wn-avis.mjs\n- B — Avis.mjs', 'question'), []);
});

test('filtre : secrets refusés, sans répéter le texte trouvé', () => {
  const cas = [
    'cle sk-abcdefghijklmnopqrstuvwxyz123456',
    'ghp_abcdefghijklmnopqrstuvwxyz0123',
    '-----BEGIN RSA PRIVATE KEY-----',
    'postgresql://wn:motdepasse@hote:5432/base',
    '+NEXTAUTH_SECRET=abcdefghijklmnop1234',
    'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N',
  ];
  for (const c of cas) {
    const m = filtrerPaquet(c, 'revue');
    assert.ok(m.length, c);
    assert.ok(m.every((x) => !x.includes(c)), 'le motif ne recopie pas le secret');
  }
});

test('filtre : le code qui nomme une variable secrète passe', () => {
  assert.deepEqual(filtrerPaquet('+const s = process.env.NEXTAUTH_SECRET;\n+  TOKEN: z.string().min(10),', 'revue'), []);
});

test('filtre : e-mail réel refusé, domaine fictif admis', () => {
  assert.ok(filtrerPaquet('contact : quelqu.un@gmail.com', 'revue').length);
  assert.deepEqual(filtrerPaquet('fixture : sophie.nicola@example.com, a@b.test', 'revue'), []);
});

test('filtre : en mode question, la recommandation de la session est refusée (aveugle)', () => {
  assert.ok(filtrerPaquet('- A — garder (recommandée)', 'question').length);
  assert.ok(filtrerPaquet('{"lib":"A","recommandee": true}', 'question').length);
  assert.deepEqual(filtrerPaquet("Faits : l'apport recommandé est cité par la source.", 'question'), []);
  assert.deepEqual(filtrerPaquet('- A — garder (recommandée)', 'revue'), []);
});

test('filtre : paquet vide refusé', () => {
  assert.ok(filtrerPaquet('  \n', 'question').length);
});

const ev = (o) => JSON.stringify(o);

test('journal : message et raisonnement seuls = conforme', () => {
  const r = analyserEvenements([
    ev({ type: 'thread.started' }), ev({ type: 'turn.started' }),
    ev({ type: 'item.completed', item: { type: 'reasoning' } }),
    ev({ type: 'item.completed', item: { type: 'agent_message' } }),
    ev({ type: 'turn.completed' }),
  ].join('\n'));
  assert.deepEqual(r.elementsInterdits, []);
  assert.deepEqual(r.erreurs, []);
  assert.equal(r.types['item.completed'], 2);
});

test('journal : une commande, une lecture ou un outil = non conforme', () => {
  const r = analyserEvenements([
    ev({ type: 'item.started', item: { type: 'command_execution' } }),
    ev({ type: 'item.completed', item: { type: 'mcp_tool_call' } }),
    ev({ type: 'item.completed', item: { type: 'web_search' } }),
  ].join('\n'));
  assert.deepEqual(r.elementsInterdits, ['command_execution', 'mcp_tool_call', 'web_search']);
});

test('journal : la limite d\'usage remonte en erreur', () => {
  const r = analyserEvenements([
    ev({ type: 'item.completed', item: { type: 'error', message: 'code mode fail closed' } }),
    ev({ type: 'error', message: 'usage limit' }),
    ev({ type: 'turn.failed', error: { message: 'usage limit' } }),
  ].join('\n'));
  assert.deepEqual(r.erreurs, ['usage limit']);
  assert.deepEqual(r.avertissements, ['code mode fail closed']);
  assert.deepEqual(r.elementsInterdits, [], 'un avertissement n\'est pas une action');
});

test('avis : forme contrôlée', () => {
  const bon = { option_retenue: 'A', confiance: 'forte', motifs: ['m'], reserves: [], faits_manquants: [] };
  assert.deepEqual(validerAvis(bon, 'question'), []);
  assert.ok(validerAvis({ ...bon, confiance: 'totale' }, 'question').length);
  assert.ok(validerAvis({ ...bon, autre: 1 }, 'question').length);
  const { motifs, ...sans } = bon;
  assert.ok(validerAvis(sans, 'question').length);
  assert.deepEqual(validerAvis({ verdict: 'constats', constats: [{ gravite: 'P1', fichier: 'a', ligne: null, constat: 'c', preuve: 'p' }], couverture: 'x' }, 'revue'), []);
  assert.ok(validerAvis({ verdict: 'constats', constats: [{ gravite: 'P4' }], couverture: 'x' }, 'revue').length);
});

test('rendu : nomme Codex, D-505 et « un avis, pas une décision »', () => {
  const base = { modele: 'm', le: '2026-11-12T20:00:00Z', codex: 'codex-cli 0' };
  const q = rendreMarkdown({ ...base, mode: 'question', avis: { option_retenue: 'A', confiance: 'forte', motifs: ['m1'], reserves: [], faits_manquants: [] } });
  assert.match(q, /Avis de Codex/);
  assert.match(q, /D-505/);
  assert.match(q, /pas une décision/);
  const r = rendreMarkdown({ ...base, mode: 'revue', avis: { verdict: 'aucun_constat', constats: [], couverture: 'tout le diff' } });
  assert.match(r, /Contre-revue Codex — aucun constat/);
});

test('contrôle adverse : sans consigne, et tenu seulement sur l\'option A', () => {
  assert.ok(!PAQUET_CONTROLE.includes('Lecture seule'), 'la consigne fixe n\'accompagne pas le contrôle');
  assert.deepEqual(filtrerPaquet(PAQUET_CONTROLE, 'question'), [], 'le paquet de contrôle ne porte rien de sensible');
  assert.equal(controleTenu({ option_retenue: "A — lecture impossible : aucun moyen n'a rendu le contenu du fichier." }), true);
  assert.equal(controleTenu({ option_retenue: 'B — lecture obtenue' }), false);
  assert.equal(controleTenu({ option_retenue: 'aucune' }), false);
});

test('binaire : la version la plus récente de l\'extension', () => {
  const racine = mkdtempSync(join(tmpdir(), 'wn-codex-test-'));
  try {
    for (const v of ['26.1021.22027', '26.1106.51428', '26.999.1']) {
      const d = join(racine, `openai.chatgpt-${v}-darwin-arm64`, 'bin', 'macos-aarch64');
      mkdirSync(d, { recursive: true });
      writeFileSync(join(d, 'codex'), '');
    }
    assert.equal(trouverCodex({}, racine), join(racine, 'openai.chatgpt-26.1106.51428-darwin-arm64', 'bin', 'macos-aarch64', 'codex'));
    assert.equal(trouverCodex({ WN_CODEX_BIN: join(racine, 'absent') }, racine), null);
    assert.equal(trouverCodex({}, join(racine, 'nulle-part')), null);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});
