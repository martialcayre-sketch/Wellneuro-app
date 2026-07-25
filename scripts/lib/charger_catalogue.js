'use strict';

// Chargement du catalogue de questionnaires TypeScript depuis un script Node.
//
// Extrait de `check_questionnaire_certification.js` (inchangé dans sa
// mécanique) pour être RÉUTILISÉ par le banc de certification
// (`tools/corpus/certify/`) : le banc doit comparer la source à ce que
// l'application sert VRAIMENT, ce qui suppose d'évaluer le même catalogue et
// d'exécuter le même `calculateScore` — pas d'en relire une copie.
//
// Aucune dépendance au cwd : les chemins sont dérivés de la racine du dépôt.

const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

const RACINE = path.resolve(__dirname, '..', '..');
const CHEMIN_QUESTIONS = path.join(RACINE, 'web/src/lib/questions.ts');

// TypeScript est une devDependency de web/ — résolution indépendante du cwd
// (le script est lancé depuis web/ par `npm run scoring-check`, mais rien ne
// doit en dépendre).
const ts = createRequire(path.join(RACINE, 'web', 'package.json'))('typescript');

// Le catalogue est du TypeScript depuis la levée de `@ts-nocheck` (lot
// G-TRUST-04) : chaque fichier est transpilé avant l'eval, les annotations
// disparaissent. ORDRE IMPOSÉ : le dédoublonnage des helpers
// (`stripDuplicateQuestionHelpers`) travaille ligne à ligne sur la source
// BRUTE, où les one-liners `function q(...)` et `const O_* =` sont garantis —
// l'émetteur TypeScript, lui, re-imprime ces déclarations sur plusieurs
// lignes. Prouvé neutre sur le catalogue pré-typage : même verdict, mêmes
// 63 clés, mêmes fixtures.
function transpileTs(source, fileName) {
  return ts.transpileModule(source, {
    fileName,
    compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.ESNext },
  }).outputText;
}

// Le catalogue est découpé par domaine (lot 7) : `questions.ts` importe des
// modules locaux (`./questionnaires/*`). Ce chargement évalue le catalogue
// comme un script autonome ; il faut donc « inliner » ces imports relatifs
// locaux (déps d'abord, dédupliquées) avant l'eval, puis retirer les mots-clés
// `export`.
function stripModuleSource(source) {
  return source
    .replace(/^\s*import\s+[^;]*?from\s+['"]\.[^'"]*['"];?\s*$/gm, '')
    .replace(/^\s*export\s+\*\s+from\s+['"]\.[^'"]*['"];?\s*$/gm, '')
    .replace(/^\s*export\s+\{[^}]*\}\s+from\s+['"]\.[^'"]*['"];?\s*$/gm, '')
    .replace(/^export\s+(const|function|class|let|var)\b/gm, '$1')
    .replace(/^export\s+default\s+/gm, '')
    // Un module dont tous les exports sont des types (questionnaire-types.ts,
    // inliné via un `import type`) transpile en un `export {};` résiduel,
    // invalide dans un script eval.
    .replace(/^\s*export\s*\{\s*\};?\s*$/gm, '');
}

function localImportPaths(source, dir) {
  const re = /(import\s+[^;]*?from\s+['"](\.[^'"]*)['"])|(export\s+(?:\*|\{[^}]*\})\s+from\s+['"](\.[^'"]*)['"])/g;
  const out = [];
  let match;
  while ((match = re.exec(source))) {
    const rel = match[2] || match[4];
    if (!rel) continue;
    let abs = path.resolve(dir, rel);
    if (!abs.endsWith('.ts')) abs += '.ts';
    out.push(abs);
  }
  return out;
}

function stripDuplicateQuestionHelpers(source) {
  if (!source.includes('QUESTIONNAIRE_CATALOGUE')) return source;
  const duplicateNames = new Set(['O_RPS', 'O_JPT', 'O_04', 'O_03jt', 'O_YN', 'O_UPPS', 'O_YOUNG', 'O_BMS', 'O_CUNGI', 'O_PAS', 'O_ZARIT', 'O_DASS', 'O_CONNERS']);
  return source.split('\n').filter(line => {
    const constMatch = line.match(/^const ([A-Za-z0-9_]+)\s*=/);
    if (constMatch && duplicateNames.has(constMatch[1])) return false;
    if (/^function q(n|s)?\(/.test(line)) return false;
    return true;
  }).join('\n');
}

function inlineModule(file, seen, parts) {
  const abs = path.resolve(file);
  if (seen.has(abs)) return;
  seen.add(abs);
  const raw = fs.readFileSync(abs, 'utf8');
  for (const dep of localImportPaths(raw, path.dirname(abs))) inlineModule(dep, seen, parts);
  // Dédoublonner sur la source brute (one-liners garantis), transpiler, puis
  // retirer la syntaxe module de la sortie ré-imprimée.
  parts.push(stripModuleSource(transpileTs(stripDuplicateQuestionHelpers(raw), abs)));
}

/**
 * Évalue le catalogue servi et rend ses deux surfaces utiles.
 * @returns {{QUESTIONNAIRE_CATALOGUE: Record<string, any>, calculateScore: Function}}
 */
function chargerCatalogue() {
  const parts = [];
  inlineModule(CHEMIN_QUESTIONS, new Set(), parts);
  const source = parts.join('\n');
  return new Function(`${source}\nreturn { QUESTIONNAIRE_CATALOGUE, calculateScore };`)();
}

module.exports = { chargerCatalogue, RACINE };
