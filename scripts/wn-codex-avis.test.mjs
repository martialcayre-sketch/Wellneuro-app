// Banc de `wn-codex-avis.mjs` (D-505) : la commande fermée, le filtre du
// paquet, la lecture du journal et la forme de l'avis. Aucun appel à Codex.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
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

test('filtre : en mode question, e-mail réel et identifiant de dossier refusés', () => {
  assert.ok(filtrerPaquet('contact : quelqu.un@gmail.com', 'question').length);
  assert.ok(filtrerPaquet('dossier ckx9a2b3c4d5e6f7g8h9i0j1k à relire', 'question').length);
  assert.deepEqual(filtrerPaquet('fixture : sophie.nicola@example.com, a@b.test', 'question'), []);
});

test('filtre : en mode revue, un diff P0 ordinaire passe (adresses de fixture du dépôt public)', () => {
  const diff = [
    '+  const praticien = await creerPraticien({ email: "praticien@wellneuro.fr" });',
    '+  expect(res.status).toBe(403);',
    '+  // patient : michel.dogne@example.com',
  ].join('\n');
  assert.deepEqual(filtrerPaquet(diff, 'revue'), []);
});

test('filtre : autres formes de secret refusées', () => {
  for (const c of [
    'GOOGLE_CLIENT_SECRET: GOCSPX-abcdefghijklmnop',
    'sk_live_abcdefghijklmnopqrst',
    'tk-us-abcdefghijklmnopqrstuvwxyz',
    'curl -H "Authorization: Bearer abcdefghijklmnop123"',
    // Concaténé : `check_no_secrets.sh` lirait sinon la fixture comme un secret.
    `{"client${'_'}secret": "abcdefghijklmnop123"}`,
  ]) assert.ok(filtrerPaquet(c, 'revue').length, c);
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
  assert.equal(controleTenu({ option_retenue: 'A — lecture impossible', motifs: ['127.0.0.1 localhost'] }), false, 'un contenu cité perce');
});

test('journal : une ligne `null` est illisible, pas un plantage', () => {
  assert.deepEqual(analyserEvenements('null\n').erreurs, ['ligne de journal illisible']);
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

// --- Bout en bout, avec un faux binaire (WN_CODEX_BIN) ---------------------
// Le faux lit son scénario dans `scenario.json` à côté de lui (l'environnement
// réduit ne lui transmet rien d'autre), écrit l'environnement reçu et ses
// arguments dans `recu.json`, puis joue le scénario.
const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'wn-codex-avis.mjs');
const FAUX = `#!/usr/bin/env node
const fs = require('node:fs'), path = require('node:path');
const ici = __dirname, s = JSON.parse(fs.readFileSync(path.join(ici, 'scenario.json'), 'utf8'));
const a = process.argv.slice(2);
if (a[0] === '--version') { console.log(s.version); process.exit(0); }
if (s.sortirSansLire) process.exit(s.code ?? 2);
fs.writeFileSync(path.join(ici, 'recu.json'), JSON.stringify({ env: process.env, args: a }));
if (s.ecrireDansVide) fs.writeFileSync(path.join(a[a.indexOf('-C') + 1], 'trace'), 'x');
if (s.reponse) fs.writeFileSync(a[a.indexOf('-o') + 1], JSON.stringify(s.reponse));
for (const e of s.evenements) console.log(JSON.stringify(e));
setTimeout(() => process.exit(s.code ?? 0), s.dormirMs ?? 0);
`;
const AVIS = { option_retenue: 'A', confiance: 'forte', motifs: ['m'], reserves: [], faits_manquants: [] };
const MSG = [{ type: 'turn.started' }, { type: 'item.completed', item: { type: 'agent_message' } }, { type: 'turn.completed' }];

function banc(scenario, { args = null, extra = [], paquet = 'Question : nommer un script.\n- A — wn-x\n- B — X', controleVersion = 'faux 1', controleSha = null } = {}) {
  const d = mkdtempSync(join(tmpdir(), 'wn-codex-e2e-'));
  const bin = join(d, 'codex');
  writeFileSync(bin, FAUX); chmodSync(bin, 0o755);
  writeFileSync(join(d, 'scenario.json'), JSON.stringify({ version: 'faux 1', evenements: MSG, reponse: AVIS, ...scenario }));
  writeFileSync(join(d, 'paquet.txt'), paquet);
  const controle = join(d, 'controle.json');
  if (controleVersion) writeFileSync(controle, JSON.stringify({ version: controleVersion, sha256: controleSha ?? createHash('sha256').update(FAUX).digest('hex') }));
  const avant = new Set(readdirSync(tmpdir()).filter((n) => n.startsWith('wn-codex-') && !n.startsWith('wn-codex-e2e') && !n.startsWith('wn-codex-test')));
  const r = spawnSync(process.execPath, [SCRIPT, ...(args ?? ['--mode', 'question', '--paquet', join(d, 'paquet.txt'), '--sortie', join(d, 'avis.json'), ...extra])], {
    encoding: 'utf8',
    env: { ...process.env, WN_CODEX_BIN: bin, WN_CODEX_CONTROLE: controle, GH_TOKEN: 'jeton-de-session', DATABASE_URL: 'postgres://x' },
  });
  const restes = readdirSync(tmpdir()).filter((n) => n.startsWith('wn-codex-') && !n.startsWith('wn-codex-e2e') && !n.startsWith('wn-codex-test') && !avant.has(n));
  const lire = (n) => (existsSync(join(d, n)) ? JSON.parse(readFileSync(join(d, n), 'utf8')) : null);
  const res = { code: r.status, stdout: r.stdout, stderr: r.stderr, recu: lire('recu.json'), avis: lire('avis.json'), controle: lire('controle.json'), restes };
  rmSync(d, { recursive: true, force: true });
  return res;
}

test('bout en bout : avis conforme = 0, environnement réduit, dossier temporaire supprimé', () => {
  const r = banc({});
  assert.equal(r.code, 0, r.stderr);
  assert.equal(r.avis.avis.option_retenue, 'A');
  assert.equal(r.recu.env.GH_TOKEN, undefined, 'aucun jeton de la session ne passe');
  assert.equal(r.recu.env.DATABASE_URL, undefined);
  assert.ok(r.recu.args.includes('--ignore-user-config'));
  assert.deepEqual(r.restes, []);
});

test('bout en bout : paquet refusé = 2, le binaire n\'est pas lancé', () => {
  const r = banc({}, { paquet: 'contact : quelqu.un@gmail.com' });
  assert.equal(r.code, 2);
  assert.equal(r.recu, null);
  assert.equal(r.avis, null);
});

test('bout en bout : version non contrôlée = 4, rien n\'est parti', () => {
  for (const controleVersion of [null, 'faux 0']) {
    const r = banc({}, { controleVersion });
    assert.equal(r.code, 4);
    assert.equal(r.recu, null, 'le binaire n\'a reçu aucun paquet');
    assert.match(r.stderr, /--mode controle/);
  }
  const autreBinaire = banc({}, { controleSha: 'a'.repeat(64) });
  assert.equal(autreBinaire.code, 4, 'même version, autre binaire : refusé');
  assert.equal(autreBinaire.recu, null);
});

test('bout en bout : binaire muet sur sa version = 4, en usage comme en contrôle', () => {
  assert.equal(banc({ version: '' }).code, 4);
  const c = banc({ version: '' }, { args: ['--mode', 'controle'], controleVersion: null });
  assert.equal(c.code, 4);
  assert.equal(c.controle, null, 'rien n\'est inscrit');
});

test('bout en bout : une action = 3, même si le délai expire ; sortie non écrite', () => {
  const action = [{ type: 'item.completed', item: { type: 'command_execution' } }];
  const r = banc({ evenements: action });
  assert.equal(r.code, 3);
  assert.equal(r.avis, null);
  const lent = banc({ evenements: action, dormirMs: 4000 }, { extra: ['--delai', '1'] });
  assert.equal(lent.code, 3, 'l\'action prime sur le délai dépassé');
});

test('bout en bout : binaire mort sans lire un gros paquet = 4, pas un plantage', () => {
  const gros = `Question : forme.\n${'- ligne de diff ordinaire\n'.repeat(12_000)}`;
  const r = banc({ evenements: [], reponse: null, code: 2, sortirSansLire: true }, { paquet: gros });
  assert.equal(r.code, 4, r.stderr);
  assert.doesNotMatch(r.stderr, /EPIPE/);
});

test('bout en bout : délai dépassé sans action = 4', () => {
  const r = banc({ dormirMs: 4000 }, { extra: ['--delai', '1'] });
  assert.equal(r.code, 4);
  assert.match(r.stdout, /delai_depasse/);
  assert.equal(r.avis, null);
});

test('bout en bout : dossier vide modifié = 3 ; réponse absente = 3 ; échec du binaire = 4', () => {
  assert.equal(banc({ ecrireDansVide: true }).code, 3);
  assert.equal(banc({ reponse: null }).code, 3);
  assert.equal(banc({ evenements: [{ type: 'turn.failed', error: { message: 'limite' } }], code: 1 }).code, 4);
});

test('bout en bout : --mode controle tenu écrit la version ; percé = 3 sans l\'écrire', () => {
  const tenu = banc({ reponse: { ...AVIS, option_retenue: "A — lecture impossible" } }, { args: ['--mode', 'controle'], controleVersion: null });
  assert.equal(tenu.code, 0, tenu.stderr);
  assert.equal(tenu.controle.version, 'faux 1');
  assert.equal(tenu.controle.sha256, createHash('sha256').update(FAUX).digest('hex'));
  const perce = banc({ reponse: { ...AVIS, option_retenue: 'B — lecture obtenue' } }, { args: ['--mode', 'controle'], controleVersion: null });
  assert.equal(perce.code, 3);
  assert.equal(perce.controle, null);
});

test('arguments : combinaisons refusées en usage (1)', () => {
  for (const args of [
    ['--mode', 'controle', '--paquet', 'x'],
    ['--mode', 'controle', '--sortie', 'x'],
    ['--mode', 'question', '--paquet', 'x'],
    ['--mode', 'question', '--paquet', 'x', '--sortie', 'y', '--delai', '0'],
    ['--mode', 'question', '--paquet', 'x', '--sortie', 'y', '--delai', 'NaN'],
    ['--mode', 'revue', '--paquet'],
    ['--mode', 'autre', '--paquet', 'x', '--sortie', 'y'],
    ['--inconnu', 'x'],
  ]) assert.equal(banc({}, { args }).code, 1, args.join(' '));
});
