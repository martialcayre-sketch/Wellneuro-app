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
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, rmSync, chmodSync } from 'node:fs';
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

/**
 * Prose documentaire citant des noms de variables — reprise de
 * `docs/claude/REGLES_CRITIQUES.md`. C'est la classe de faux positifs qui a
 * fait écarter le séparateur permissif (11 correspondances). Sans ce cas, le
 * banc ne verrouille que la sensibilité du contrôle, jamais sa spécificité :
 * un motif redevenu trop large passerait au vert.
 *
 * Une SEULE ligne, longue, comme dans le fichier réel : `grep` travaille ligne
 * par ligne, et répartir la phrase sur plusieurs lignes détruirait justement la
 * propriété qu'on éprouve — c'est le voisinage de deux identifiants sur la même
 * ligne qui piège un séparateur trop permissif.
 *
 * Seule fixture à écrire ses identifiants en toutes lettres, contrairement à la
 * règle de concaténation posée en tête de fichier : c'est le point du cas. Elle
 * doit ressembler à la prose réelle, et elle ne peut pas déclencher le contrôle
 * — le backtick fermant bloque le séparateur, ce que le scan complet du dépôt
 * vérifie à chaque exécution.
 */
const PROSE =
  "Toute configuration sensible (`DATABASE_URL`, `ANTHROPIC_API_KEY`, " +
  '`GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `SMTP_URL`) passe uniquement par des ' +
  "variables d'environnement (`web/.env.local` en dev, variables Vercel en production).\n";

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
  // `emplacements` isole ce que le script prétend être des emplacements : la
  // sortie standard, privée de la ligne de conclusion. C'est sur cet ensemble
  // que porte l'invariant « rien d'autre qu'un emplacement ne sort d'ici ».
  const emplacements = r.stdout
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('OK:'));
  return { code: r.status, sortie: `${r.stdout}${r.stderr}`, emplacements };
}

/**
 * Même chose, mais avec un `git` qui échoue — `safe.directory`, conteneur à uid
 * différent, `git` hors du PATH. Le contrôle doit le dire, pas se taire.
 */
function lancerAvecGitEnPanne(racine, ...args) {
  const faux = join(racine, 'faux-bin');
  mkdirSync(faux, { recursive: true });
  const shim = join(faux, 'git');
  writeFileSync(shim, '#!/bin/sh\necho "fatal: detected dubious ownership" >&2\nexit 128\n');
  chmodSync(shim, 0o755);
  const r = spawnSync('bash', [join(racine, 'scripts', 'check_no_secrets.sh'), ...args], {
    cwd: racine,
    encoding: 'utf8',
    env: { ...process.env, PATH: `${faux}:${process.env.PATH}` },
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
      // Sans cette assertion, le cas passe au vert sur n'importe quel `exit 1`
      // — un mode `--staged` cassé le satisferait sans rien détecter.
      assert.match(sortie, new RegExp(CLE_PRIVEE));
      assert.match(sortie, /compte\.json/);
    });
  });

  test('un secret client OAuth au format JSON', () => {
    avecBanc({ 'oauth.json': CONFIG_OAUTH }, racine => {
      const { code } = lancer(racine);
      assert.equal(code, 1, 'le contrôle a accepté un client_secret JSON');
    });
  });

  test('un fichier dont le nom commence par « : », en mode --staged', () => {
    // Le nom rendu par git lui est redonné en PATHSPEC, et `:` y ouvre la
    // syntaxe magique : sans `:(literal)`, ce fichier ne matche plus rien et
    // sort du contrôle en silence. Même classe que le piège du « ++ » — une
    // donnée qui redevient de la syntaxe.
    avecBanc({ ':note.md': COMPTE_DE_SERVICE }, racine => {
      git(racine, 'add', '-A');
      const { code, sortie } = lancer(racine, '--staged');
      assert.equal(code, 1, `un nom de fichier magique a contourné le contrôle : ${sortie}`);
      assert.doesNotMatch(sortie, /CONTENU-DE-TEST-SANS-VALEUR/, 'le corps de la clé a fuité');
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

describe('check_no_secrets.sh — ce qu’il ne doit jamais imprimer', () => {
  test('la détection rend l’emplacement, jamais le corps du secret', () => {
    // `grep -n` imprimait la ligne entière : sur un compte de service, la clé
    // privée complète, dans le terminal — donc dans un journal de session,
    // donc à un copier-coller du dépôt. Le contrôle doit dire OÙ, pas QUOI.
    avecBanc({ 'compte.json': COMPTE_DE_SERVICE }, racine => {
      const { code, sortie } = lancer(racine);
      assert.equal(code, 1);
      assert.match(sortie, /compte\.json/, 'le fichier fautif doit être nommé');
      assert.doesNotMatch(sortie, /BEGIN PRIVATE KEY/, 'le corps de la clé a fuité');
      assert.doesNotMatch(sortie, /CONTENU-DE-TEST-SANS-VALEUR/, 'le corps de la clé a fuité');
    });
  });

  test('en mode --staged non plus', () => {
    avecBanc({ 'compte.json': COMPTE_DE_SERVICE }, racine => {
      git(racine, 'add', 'compte.json');
      const { code, sortie } = lancer(racine, '--staged');
      assert.equal(code, 1);
      assert.doesNotMatch(sortie, /BEGIN PRIVATE KEY/, 'le corps de la clé a fuité');
      assert.doesNotMatch(sortie, /CONTENU-DE-TEST-SANS-VALEUR/, 'le corps de la clé a fuité');
    });
  });

  test('tout ce qui sort est un emplacement, quelle qu’en soit la cause', () => {
    // Invariant plutôt qu'énumération. Chercher deux chaînes précises ne
    // verrouille que le fixture qui les porte ; exiger la FORME de chaque ligne
    // attrape aussi les fuites qu'on n'a pas su prévoir.
    avecBanc({ 'compte.json': COMPTE_DE_SERVICE }, racine => {
      const complet = lancer(racine);
      assert.equal(complet.code, 1);
      assert.ok(complet.emplacements.length > 0, 'aucun emplacement : le cas ne prouve rien');
      for (const ligne of complet.emplacements) {
        assert.match(ligne, /^\.\/[^:]+:\d+$/, `sortie non conforme à « chemin:ligne » : ${ligne}`);
      }
      git(racine, 'add', 'compte.json');
      const indexe = lancer(racine, '--staged');
      assert.equal(indexe.code, 1);
      assert.ok(indexe.emplacements.length > 0, 'aucun emplacement : le cas ne prouve rien');
      for (const ligne of indexe.emplacements) {
        assert.equal(ligne, 'compte.json', `sortie non conforme à un chemin indexé : ${ligne}`);
      }
    });
  });

  test('une ligne ajoutée commençant par « ++ » ne devient pas l’emplacement', () => {
    // `++ texte` produit une ligne de diff `+++ texte`, indiscernable d'un
    // en-tête de fichier. Un analyseur qui lit le nom dans le diff en fait un
    // « emplacement » — et imprime donc le contenu. Ici la ligne suivante porte
    // le secret : le piège fuit ET masque, puisque la ligne avalée n'est jamais
    // scannée.
    // Le secret est SUR la ligne piégée, pas sur la suivante : c'est ce qui
    // rend le cas discriminant. Placé en dessous, il serait trouvé même par un
    // analyseur qui saute les `+++`, et le test passerait sans rien prouver.
    const PIEGE = [
      `++ "${CLE_PRIVEE}": "${DEBUT_PEM}\\nCONTENU-DE-TEST-SANS-VALEUR\\n"`,
      'Une ligne ordinaire, pour que le fichier ait une suite.',
      '',
    ].join('\n');
    avecBanc({ 'piege.md': PIEGE }, racine => {
      git(racine, 'add', 'piege.md');
      const { code, sortie, emplacements } = lancer(racine, '--staged');
      assert.equal(code, 1, `la clé privée n’a pas été détectée : ${sortie}`);
      assert.doesNotMatch(sortie, /CONTENU-DE-TEST-SANS-VALEUR/, 'le corps de la clé a fuité');
      for (const ligne of emplacements) {
        assert.equal(ligne, 'piege.md', `emplacement dérivé du contenu : ${ligne}`);
      }
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

  test('la prose documentaire citant des noms de variables est acceptée', () => {
    // Verrou de SPÉCIFICITÉ. C'est cette classe qui a fait écarter le
    // séparateur permissif : il y trouvait 11 correspondances, toutes fausses.
    // Sans ce cas, un motif redevenu trop large satisferait tout le banc.
    avecBanc({ 'REGLES.md': PROSE }, racine => {
      const { code, sortie } = lancer(racine);
      assert.equal(code, 0, `le contrôle a refusé de la prose documentaire : ${sortie}`);
    });
  });
});

// Ce que le contrôle NE fait PAS, nommé plutôt que passé sous silence. Chaque
// ligne est une forme de secret qu'il laisse passer aujourd'hui : la liste est
// le périmètre réel du garde, et sa levée demande un autre outil qu'un motif.
describe('check_no_secrets.sh — quand il ne peut pas conclure', () => {
  test('un git en panne fait sortir en 2, jamais en 0', () => {
    // Le pire mode de défaillance d'un garde : répondre « OK » sans avoir rien
    // lu. `safe.directory`, un conteneur à uid différent, un `git` absent du
    // PATH suffisaient. « Je n'ai pas pu vérifier » n'est pas « rien trouvé ».
    avecBanc({ 'compte.json': COMPTE_DE_SERVICE }, racine => {
      git(racine, 'add', 'compte.json');
      const { code, sortie } = lancerAvecGitEnPanne(racine, '--staged');
      assert.equal(code, 2, `le contrôle a conclu sans pouvoir lire l’index : ${sortie}`);
      assert.doesNotMatch(sortie, /^OK:/m, 'le contrôle a annoncé « OK » sans rien lire');
      assert.match(sortie, /NON CONCLUANT/);
    });
  });
});

describe('check_no_secrets.sh — hors périmètre assumé', () => {
  // Un fichier binaire indexé illustre les deux : le mode complet le voit
  // (`Binary file X matches`, sur stdout côté BSD, sur stderr côté GNU ≥ 3.5 —
  // troisième forme du « grep n'est pas grep »), le mode indexé non, faute de
  // `@@` dans un diff binaire. Le garde d'avant-commit laisse donc passer ce
  // que le CI attrapera après que le commit existe.
  test.todo('un secret dans un fichier binaire, en mode --staged');
  test.todo('l’invariant de forme face à « Binary file X matches »');
  test.todo('une clé privée sans identifiant devant (.pem, .p12, clé SSH nue)');
  test.todo('un JSON échappé dans du JSON, ou un compte de service en base64');
  test.todo('une URL de connexion portant un mot de passe');
  test.todo('un jeton porteur (Authorization: Bearer …)');
  test.todo('GOOGLE_CLIENT_SECRET — 8 placeholders de test bloqueraient le build');
});
