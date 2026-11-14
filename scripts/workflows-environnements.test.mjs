// Banc des environnements protégés (D-520 §7 et §8, garde 3).
//
// POURQUOI. Sans relecteur requis, l'environnement `release-db` ne garde plus
// que sa politique de branche et son minuteur : tout job qui le déclare et
// tourne sur `main` atteint le jeton Scalingo, qui écrit en production.
// `deploy-production` porte un jeton de même nature, sous sa seule politique
// de branche. Ce banc parcourt TOUS les workflows et refuse ces deux
// environnements hors des jobs admis ci-dessous. Ajouter un job admis est une
// PR P0 (`docs/claude/POLITIQUE_REVUE.md`), qui modifie aussi cette liste.
//
// PAR LE TEXTE, SANS PARSEUR YAML (aucun n'est résolvable depuis la racine,
// même raison que `release-db-invariants.test.mjs`). L'analyse est donc
// fermée : toute forme qu'elle ne sait pas lire jusqu'à un nom littéral —
// expression `${{ }}`, ancre `*x`, bloc sans `name:`, carte en flux,
// échappement `\uXXXX` — compte comme un environnement protégé, refusé hors
// des jobs admis. Le mot « environment » hors d'une déclaration simple aussi,
// même dans le texte d'un script : reformuler plutôt qu'élargir ce banc. Les
// noms d'environnement GitHub ne distinguent pas la casse : la comparaison
// non plus.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOSSIER = '.github/workflows';

export const PROTEGES = ['release-db', 'deploy-production'];

/** Les seuls jobs admis à déclarer un environnement protégé : `fichier:job → environnement`. */
export const ADMIS = new Map([
  ['.github/workflows/release-db.yml:release', 'release-db'],
  ['.github/workflows/deploiement-production.yml:observation', 'deploy-production'],
  ['.github/workflows/deploiement-production.yml:deploiement', 'deploy-production'],
]);

const ILLISIBLE = '(illisible)';

/** Une valeur scalaire YAML, sans commentaire ni guillemets ; `ILLISIBLE` si elle n'est pas un nom littéral. */
function nomLitteral(brut) {
  let v = brut.trim();
  if (/^["']/.test(v)) {
    const m = /^(["'])(.*?)\1/.exec(v);
    if (!m) return ILLISIBLE;
    v = m[2];
  } else {
    v = v.replace(/\s+#.*$/, '').trim();
  }
  // Expression, ancre, étiquette, bloc littéral, échappement, ou reste d'une
  // carte en flux : rien de tout cela n'est un nom littéral.
  if (!v || v.includes('${{') || /^[*&!|>]/.test(v) || /[\\{}[\],]/.test(v)) return ILLISIBLE;
  return v.toLowerCase();
}

/**
 * Chaque déclaration `environment:` d'un workflow : `{ job, environnement, ligne }`.
 * Le job est la dernière clé d'indentation 2 sous `jobs:` (`?` avant elle).
 */
export function environnementsDe(source) {
  const lignes = source.split('\n');
  const trouves = [];
  let dansJobs = false;
  let job = '?';
  lignes.forEach((ligne, i) => {
    if (/^\S/.test(ligne)) {
      dansJobs = /^jobs:\s*(#.*)?$/.test(ligne);
      job = '?';
    } else if (dansJobs) {
      const entete = /^ {2}([^\s#:][^:]*):\s*(#.*)?$/.exec(ligne);
      if (entete) job = entete[1].trim().replace(/^["']|["']$/g, '');
    }
    if (/^\s*#/.test(ligne)) return;
    const decl = /^(\s*)(?:-\s+)?["']?environment["']?\s*:(.*)$/.exec(ligne);
    // FERMÉ : le mot « environment » hors de cette forme simple (carte en
    // flux, clé en casse, texte d'un script), ou un échappement YAML qui
    // pourrait l'écrire, compte comme une déclaration illisible.
    // Une clé explicite (`? clé`) ou un alias en clé (`*k :`) peut écrire la
    // clé sans que le mot figure entier sur une ligne (revue wn-reviewer).
    const cleOpaque = /^\s*(-\s+)?\?(\s|$)/.test(ligne) || /^\s*(-\s+)?\*\S+\s*:/.test(ligne);
    if (!decl || /\\[uUx][0-9a-fA-F]/.test(ligne)) {
      if (decl || cleOpaque || /environment/i.test(ligne) || /\\[uUx][0-9a-fA-F]/.test(ligne)) {
        trouves.push({ job, environnement: ILLISIBLE, ligne: i + 1 });
      }
      return;
    }
    const indent = decl[1].length;
    const reste = decl[2].replace(/^\s+#.*$/, '').trim();
    let environnement;
    if (reste.startsWith('{')) {
      const m = /\bname\s*:\s*([^,}]+)/.exec(reste);
      environnement = m ? nomLitteral(m[1]) : ILLISIBLE;
    } else if (reste) {
      environnement = nomLitteral(reste);
    } else {
      // Forme bloc : chercher `name:` dans les lignes plus indentées qui suivent.
      environnement = ILLISIBLE;
      for (const suite of lignes.slice(i + 1)) {
        if (suite.trim() === '' || /^\s*#/.test(suite)) continue;
        if (suite.match(/^(\s*)/)[1].length <= indent) break;
        const m = /^\s*name\s*:(.*)$/.exec(suite);
        if (m) {
          environnement = nomLitteral(m[1]);
          break;
        }
      }
    }
    trouves.push({ job, environnement, ligne: i + 1 });
  });
  return trouves;
}

const estProtege = (env) => env === ILLISIBLE || PROTEGES.includes(env);

/** Les déclarations protégées d'un ensemble de fichiers `{ chemin: source }`, hors liste admise. */
export function horsAdmis(fichiers) {
  const fautes = [];
  for (const [chemin, source] of Object.entries(fichiers)) {
    for (const d of environnementsDe(source)) {
      if (!estProtege(d.environnement)) continue;
      if (ADMIS.get(`${chemin}:${d.job}`) !== d.environnement) fautes.push(`${chemin}:${d.ligne} (job ${d.job}) → ${d.environnement}`);
    }
  }
  return fautes;
}

function lireWorkflows() {
  return Object.fromEntries(
    readdirSync(join(RACINE, DOSSIER))
      .filter((f) => /\.ya?ml$/.test(f))
      .sort()
      .map((f) => [`${DOSSIER}/${f}`, readFileSync(join(RACINE, DOSSIER, f), 'utf8')]),
  );
}

test('D-520 §8 — aucun workflow ne déclare release-db ou deploy-production hors des jobs admis', () => {
  const fichiers = lireWorkflows();
  assert.ok(Object.keys(fichiers).length >= 3, 'dossier des workflows vide : la lecture a perdu sa cible');
  assert.deepEqual(horsAdmis(fichiers), [], 'environnement protégé hors des jobs admis — PR P0, et la liste ADMIS de ce banc');
});

test('D-520 §8 — chaque job admis déclare bien son environnement (la liste ne survit pas à son objet)', () => {
  const fichiers = lireWorkflows();
  for (const [cle, attendu] of ADMIS) {
    const [chemin, job] = cle.split(':');
    assert.ok(fichiers[chemin], `workflow admis absent : ${chemin}`);
    const trouves = environnementsDe(fichiers[chemin]).filter((d) => d.job === job);
    assert.deepEqual(
      trouves.map((d) => d.environnement),
      [attendu],
      `${cle} doit déclarer \`environment: ${attendu}\`, une fois`,
    );
  }
});

// ── Contre-épreuves : chaque forme se voit ──────────────────────────────────

const jobUnique = (corps) => `name: essai\non: push\njobs:\n  intrus:\n    runs-on: ubuntu-latest\n${corps}\n    steps:\n      - run: echo\n`;

test('contre-épreuve — toutes les formes d’un environnement protégé sont lues', () => {
  const formes = {
    'scalaire': '    environment: release-db',
    'guillemets doubles': '    environment: "release-db"',
    'guillemets simples': "    environment: 'deploy-production'",
    'casse': '    environment: Release-DB',
    'commentaire': '    environment: release-db # pour voir',
    'carte en ligne': '    environment: { name: release-db, url: https://x.invalid }',
    'bloc': '    environment:\n      url: https://x.invalid\n      name: deploy-production',
    'expression': '    environment: ${{ inputs.cible }}',
    'expression dans un bloc': '    environment:\n      name: ${{ inputs.cible }}',
    'ancre': '    environment: *cible',
    'bloc sans nom': '    environment:\n      url: https://x.invalid',
  };
  for (const [nom, corps] of Object.entries(formes)) {
    const fautes = horsAdmis({ '.github/workflows/essai.yml': jobUnique(corps) });
    assert.equal(fautes.length, 1, `${nom} : ${JSON.stringify(fautes)}`);
    assert.match(fautes[0], /job intrus/, nom);
  }
});

test('contre-épreuve — les formes en flux et les échappements sont refusés (contre-revues Codex et wn-reviewer)', () => {
  const formes = {
    'job en carte en ligne': 'name: essai\non: push\njobs:\n  intrus: { runs-on: ubuntu-latest, environment: release-db, steps: [{ run: echo }] }\n',
    'jobs en carte en ligne': 'name: essai\non: push\njobs: { intrus: { runs-on: ubuntu-latest, environment: release-db } }\n',
    'carte sur deux lignes': 'name: essai\non: push\njobs:\n  intrus: {\n    runs-on: ubuntu-latest,\n    environment: release-db }\n',
    'échappement unicode': jobUnique('    environment: "release\\u002ddb"'),
    'clé échappée': jobUnique('    "\\u0065nvironment": release-db'),
    'clé en casse': jobUnique('    Environment: release-db'),
    // Revue de l'écart (wn-reviewer) : une clé coupée par un saut de ligne échappé.
    'clé explicite': jobUnique('    ? "envi\\\n      ronment"\n    : release-db'),
    'alias en clé': jobUnique('    *k : release-db'),
  };
  for (const [nom, source] of Object.entries(formes)) {
    const fautes = horsAdmis({ '.github/workflows/essai.yml': source });
    assert.ok(fautes.length >= 1, `${nom} : aucune faute vue`);
  }
});

/** `workflow_call` sous toute forme non commentée : clé, liste en flux, scalaire. */
const appelable = (source) => /^[^#\n]*\bworkflow_call\b/m.test(source);

test('D-520 §7 — les workflows admis ne sont pas appelables d’ailleurs (`workflow_call`)', () => {
  const fichiers = lireWorkflows();
  for (const chemin of new Set([...ADMIS.keys()].map((c) => c.split(':')[0]))) {
    assert.ok(!appelable(fichiers[chemin]), `${chemin} : un appelant hériterait de ses jobs admis`);
  }
  for (const forme of ['on:\n  workflow_call:\n', 'on: [push, workflow_call]\n', 'on: workflow_call\n']) {
    assert.ok(appelable(forme), forme);
  }
  assert.ok(!appelable('on: push\n# workflow_call retiré\n'));
});

test('contre-épreuve — un job admis dans un autre fichier, ou un autre job du fichier admis, est refusé', () => {
  const ailleurs = horsAdmis({ '.github/workflows/autre.yml': jobUnique('    environment: release-db').replace('intrus', 'release') });
  assert.equal(ailleurs.length, 1);
  const voisin = horsAdmis({ '.github/workflows/release-db.yml': jobUnique('    environment: release-db') });
  assert.equal(voisin.length, 1);
  const croise = horsAdmis({ '.github/workflows/release-db.yml': jobUnique('    environment: deploy-production').replace('intrus', 'release') });
  assert.equal(croise.length, 1, 'le job admis pour release-db ne l’est pas pour deploy-production');
});

test('contre-épreuve — un environnement ordinaire et un commentaire ne sont pas refusés', () => {
  assert.deepEqual(horsAdmis({ '.github/workflows/essai.yml': jobUnique('    environment: preview') }), []);
  assert.deepEqual(horsAdmis({ '.github/workflows/essai.yml': jobUnique('    # environment: release-db') }), []);
  assert.deepEqual(horsAdmis({ '.github/workflows/release-db.yml': jobUnique('    environment: release-db').replace('intrus', 'release') }), []);
});
