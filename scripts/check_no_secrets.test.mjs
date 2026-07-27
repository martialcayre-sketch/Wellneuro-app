// Banc du contrôle anti-secrets : il prouve que `check_no_secrets.sh` refuse ce
// qu'il annonce refuser.
//
// Raison d'être, datée. Le 2026-07-27, un fichier `secrets/wn-drive-sa.json`
// — une clé privée de compte de service Google — se trouvait dans le checkout
// principal sans être couvert par `.gitignore`. Le contrôle anti-secrets ne
// l'aurait pas rattrapé : ses motifs exigeaient que le séparateur suive
// l'identifiant directement (`private_key[[:space:]]*[:=]`), alors qu'un JSON
// écrit `"private_key":` — le guillemet fermant s'intercale. Les deux modes
// étaient aveugles pareil, et `npm run check` répondait « OK ».
//
// Un garde qui se tait sur le format le plus courant d'une clé privée ne
// protège de rien. Ce banc est ce qui empêche la correction de se reperdre au
// prochain remaniement des motifs.
//
// Les fragments sensibles sont assemblés par concaténation (`'private' +
// '_key'`) à dessein : écrits en toutes lettres, ils feraient échouer le
// contrôle sur ce fichier même. La solution alternative — exclure ce fichier du
// scan — créerait un angle mort exploitable, exactement ce qu'on corrige ici.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(ICI, 'check_no_secrets.sh');

const CLE_PRIVEE = 'private' + '_key';
const CLE_SECRET = 'client' + '_secret';
const CLE_API = 'ANTHROPIC' + '_API_KEY';
const DEBUT_PEM = '-----BEGIN' + ' PRIVATE KEY-----';

/** JSON de compte de service Google — forme réelle, contenu factice. */
const COMPTE_DE_SERVICE = [
  '{',
  '  "type": "service_account",',
  '  "project_id": "exemple-factice",',
  `  "${CLE_PRIVEE}": "${DEBUT_PEM}\\nCONTENU-DE-TEST-SANS-VALEUR\\n-----END PRIVATE KEY-----\\n",`,
  '  "client_email": "faux@exemple-factice.iam.gserviceaccount.com"',
  '}',
  '',
].join('\n');

const CONFIG_OAUTH = `{\n  "${CLE_SECRET}": "GOCSPX-contenu000factice000"\n}\n`;

/** Forme historique `CLE=valeur`, que les motifs attrapaient déjà. */
const DOTENV = `${CLE_API}=sk-ant-contenu000factice000\n`;

const ANODIN = 'export const seuil = 12;\n// Aucune clé ici.\n';

function git(cwd, ...args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(r.status, 0, `git ${args.join(' ')} a échoué : ${r.stderr}`);
}

/**
 * Dépôt jetable portant une copie du script. `ROOT_DIR` étant dérivé du chemin
 * du script lui-même, la copie s'y ancre et n'inspecte jamais le vrai dépôt.
 */
function bancTemporaire(fichiers) {
  const racine = mkdtempSync(join(tmpdir(), 'wn-anti-secrets-'));
  mkdirSync(join(racine, 'scripts'));
  copyFileSync(SCRIPT, join(racine, 'scripts', 'check_no_secrets.sh'));
  git(racine, 'init', '--quiet');
  git(racine, 'config', 'user.email', 'banc@exemple.test');
  git(racine, 'config', 'user.name', 'Banc');
  writeFileSync(join(racine, 'README.md'), '# Banc\n');
  git(racine, 'add', 'README.md');
  git(racine, 'commit', '--quiet', '-m', 'socle');
  for (const [chemin, contenu] of Object.entries(fichiers)) {
    writeFileSync(join(racine, chemin), contenu);
  }
  return racine;
}

function lancer(racine, ...args) {
  const r = spawnSync('bash', [join(racine, 'scripts', 'check_no_secrets.sh'), ...args], {
    cwd: racine,
    encoding: 'utf8',
  });
  return { code: r.status, sortie: `${r.stdout}${r.stderr}` };
}

function avecBanc(fichiers, corps) {
  const racine = bancTemporaire(fichiers);
  try {
    corps(racine);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
}

describe('check_no_secrets.sh — ce qui doit être refusé', () => {
  test('une clé privée de compte de service, en mode complet', () => {
    avecBanc({ 'compte.json': COMPTE_DE_SERVICE }, racine => {
      const { code, sortie } = lancer(racine);
      assert.equal(code, 1, `le contrôle a accepté une clé privée JSON : ${sortie}`);
      assert.match(sortie, new RegExp(CLE_PRIVEE));
    });
  });

  test('la même clé privée indexée, en mode --staged', () => {
    // C'est le mode qui tourne avant chaque commit : s'il se tait, le secret
    // entre dans l'historique et le mode complet ne le rattrape qu'en CI,
    // c'est-à-dire trop tard.
    avecBanc({ 'compte.json': COMPTE_DE_SERVICE }, racine => {
      git(racine, 'add', 'compte.json');
      const { code, sortie } = lancer(racine, '--staged');
      assert.equal(code, 1, `le contrôle a accepté une clé privée JSON indexée : ${sortie}`);
    });
  });

  test('un secret client OAuth au format JSON', () => {
    avecBanc({ 'oauth.json': CONFIG_OAUTH }, racine => {
      const { code } = lancer(racine);
      assert.equal(code, 1, 'le contrôle a accepté un client_secret JSON');
    });
  });

  test('la forme historique CLE=valeur reste refusée', () => {
    // Non-régression : l'élargissement aux guillemets ne doit rien perdre.
    avecBanc({ 'config.txt': DOTENV }, racine => {
      const { code } = lancer(racine);
      assert.equal(code, 1, 'le contrôle a accepté une clé au format dotenv');
    });
  });
});

describe('check_no_secrets.sh — ce qui doit passer', () => {
  test('un dépôt sans secret est accepté', () => {
    // Contrôle négatif indispensable : sans lui, un script qui refuserait
    // TOUT ferait passer les quatre cas ci-dessus au vert.
    avecBanc({ 'src.ts': ANODIN }, racine => {
      const { code, sortie } = lancer(racine);
      assert.equal(code, 0, `le contrôle a refusé un dépôt sain : ${sortie}`);
      assert.match(sortie, /OK/);
    });
  });

  test('un dépôt sans secret est accepté en mode --staged', () => {
    avecBanc({ 'src.ts': ANODIN }, racine => {
      git(racine, 'add', 'src.ts');
      const { code } = lancer(racine, '--staged');
      assert.equal(code, 0, 'le contrôle a refusé des lignes indexées saines');
    });
  });
});
