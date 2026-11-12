import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  createSourceFile, forEachChild, isAsExpression, isBinaryExpression, isCallExpression, isExportDeclaration,
  isExternalModuleReference, isIdentifier, isImportDeclaration, isImportTypeNode, isLiteralTypeNode, isMetaProperty,
  isNewExpression, isNonNullExpression, isNumericLiteral, isParenthesizedExpression, isPropertyAccessExpression,
  isSatisfiesExpression, isStringLiteralLike, isTemplateExpression, isTypeAssertionExpression, ScriptKind, ScriptTarget,
  SyntaxKind, type Node,
} from 'typescript';

// Outillage des bancs BP-01 ([[D-266]]) — lecture du SOURCE, jamais exécuté
// par l'application : aucun module de production ne l'importe (le banc des
// importeurs `node:` le dirait). Un banc de structure lit le texte, comme le
// ferait une revue, parce qu'aucune assertion à l'exécution ne voit un import.

/** Racine du dépôt, depuis `web/src/lib/bio-parcours/`. */
export const RACINE = join(__dirname, '..', '..', '..', '..');

/**
 * Fichiers `.ts`/`.tsx`/`.js`/`.jsx` de `web/src`, suivis OU non suivis (mais non ignorés) :
 * le signal doit tenir en local avant le premier `git add` du fichier fautif,
 * et pas seulement en CI (finding M1 du banc des importeurs du verdict d’abstention, `clinical-engine/`).
 * Chemins relatifs à la racine du dépôt, triés.
 */
export function fichiersSource(): string[] {
  const sortie = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '--', 'web/src'],
    { cwd: RACINE, encoding: 'utf8' },
  );
  return [...new Set(sortie.split('\n').filter(estFichierSource))].sort();
}

/**
 * `.ts`/`.tsx`, `.js`/`.jsx` (`allowJs` les admet en production, revue de
 * #2006) et les modules `.mjs`/`.cjs`/`.mts`/`.cts` (revue CodeRabbit de
 * #2006) : aucun n'existe sous `web/src` aujourd'hui, mais un importeur y
 * échapperait au banc.
 */
const EXTENSION_SOURCE = String.raw`\.(?:[cm]?[jt]s|[jt]sx)$`;

export function estFichierSource(chemin: string): boolean {
  return new RegExp(EXTENSION_SOURCE).test(chemin);
}

/** Un fichier de test (banc compris) — hors du périmètre « code de production ». */
export function estUnTest(chemin: string): boolean {
  return new RegExp(String.raw`\.(test|spec)` + EXTENSION_SOURCE).test(chemin) || chemin.includes('/__tests__/');
}

export function lire(chemin: string): string {
  return readFileSync(join(RACINE, chemin), 'utf8');
}

/**
 * Spécificateurs de module importés par un source : `import … from`,
 * `export … from`, `import 'x'`, `import('x')` et `require('x')` (`allowJs`
 * admet du CommonJS sous `web/src`, revue CodeRabbit de #2006), entre
 * apostrophes, guillemets ou accents graves (un gabarit sans expression se
 * résout comme un import statique, `wn-reviewer` sur #2006). Les commentaires
 * sont retirés avant la lecture — une prose qui CITE un module n'en est pas
 * l'importeur (six fichiers de production citent `biology-library` sans
 * l'importer).
 */
export function specificateursImportes(source: string): string[] {
  const sansCommentaires = retirerLignesDeCommentaire(source);
  const motif = /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|\bimport\s+)(['"`])([^'"`\n]+)\1/g;
  return [...sansCommentaires.matchAll(motif)].map(m => m[2]);
}

/**
 * Spécificateurs de module lus par le PARSEUR TypeScript, DÉCODÉS : déclarations
 * `import`/`export … from`, `import x = require('x')`, `import('x')`,
 * `require('x')` et `typeof import('x')`, l'argument lu par sa valeur
 * constante (`IMPORT_NON_CONSTANT` s'il n'en a pas). Là où `specificateursImportes` lit le texte, celui-ci ne
 * manque ni un commentaire glissé entre le mot-clé et la chaîne
 * (`import/**\/"x"`) ni une séquence d'échappement dans le chemin
 * (`"b…"`) — passe Codex sur #2006. Une prose en commentaire n'est pas un
 * nœud : elle n'est jamais lue.
 */
export function specificateursSyntaxiques(source: string, chemin = 'source.tsx'): string[] {
  const nature = chemin.endsWith('.tsx') ? ScriptKind.TSX
    : chemin.endsWith('.jsx') ? ScriptKind.JSX
      : /\.[cm]?js$/.test(chemin) ? ScriptKind.JS
        : /\.[cm]?ts$/.test(chemin) ? ScriptKind.TS : ScriptKind.TSX;
  const fichier = createSourceFile(chemin, source, ScriptTarget.Latest, true, nature);
  const trouves: string[] = [];
  // L'APPELÉ est lu déballé — `(require)(x)`, `(0, require)(x)`,
  // `(require as F)(x)` — et `module.require(x)` en est (contre-passe Codex sur
  // 302b80d8). Toute AUTRE mention de `require` (`const r = require`,
  // `require.context`, `typeof require`) ou de `import.meta` hors de `.url`
  // (`import.meta.webpackContext`) ferme le verrou : aucune n'existe en
  // production, et le bundler en ferait un chargement qu'on ne lit pas.
  const appelesReconnus = new Set<Node>();
  const estRequire = (n: Node) =>
    (isIdentifier(n) && n.text === 'require') || (isPropertyAccessExpression(n) && n.name.text === 'require');
  // L'argument est lu par sa VALEUR CONSTANTE, comme le fait le bundler
  // (parenthèses, concaténations, gabarits, assertions de type) — contre-passe
  // Codex sur #2006. Un argument non constant ferme le verrou : il rend
  // `IMPORT_NON_CONSTANT`, qu'un banc traite comme un lecteur possible (le
  // bundler en ferait un module de contexte, qui embarque tout un dossier).
  const argument = (n: Node | undefined) => trouves.push((n && valeurConstante(n)) ?? IMPORT_NON_CONSTANT);
  const visiter = (n: Node): void => {
    if (isImportDeclaration(n) || isExportDeclaration(n)) {
      if (n.moduleSpecifier) argument(n.moduleSpecifier);
    } else if (isExternalModuleReference(n)) argument(n.expression);
    else if (isImportTypeNode(n) && isLiteralTypeNode(n.argument)) argument(n.argument.literal);
    else if (isCallExpression(n)) {
      const appele = deballer(n.expression);
      if (appele.kind === SyntaxKind.ImportKeyword || estRequire(appele)) {
        appelesReconnus.add(appele);
        argument(n.arguments[0]);
      }
    } else if (isNewExpression(n) && isIdentifier(n.expression) && n.expression.text === 'URL' && estImportMetaUrl(n.arguments?.[1])) {
      // `new URL(x, import.meta.url)` : le bundler embarque `x` (et l'exécute sous `new Worker`).
      argument(n.arguments?.[0]);
    } else if (isIdentifier(n) && n.text === 'require') {
      const porteur = isPropertyAccessExpression(n.parent) && n.parent.name === n ? n.parent : n;
      if (!appelesReconnus.has(porteur)) trouves.push(IMPORT_NON_CONSTANT);
    } else if (isMetaProperty(n) && n.keywordToken === SyntaxKind.ImportKeyword && !estImportMetaUrl(n.parent)) {
      trouves.push(IMPORT_NON_CONSTANT);
    }
    forEachChild(n, visiter);
  };
  visiter(fichier);
  return trouves;
}

/** Rendu par `specificateursSyntaxiques` pour un argument d'import non constant. */
export const IMPORT_NON_CONSTANT = '<import non constant>';

/** L'expression sans parenthèses, assertions de type ni opérande gauche d'une virgule. */
function deballer(n: Node): Node {
  if (
    isParenthesizedExpression(n) || isAsExpression(n) || isSatisfiesExpression(n) ||
    isTypeAssertionExpression(n) || isNonNullExpression(n)
  ) {
    return deballer(n.expression);
  }
  if (isBinaryExpression(n) && n.operatorToken.kind === SyntaxKind.CommaToken) return deballer(n.right);
  return n;
}

/** `import.meta.url`, seule mention de `import.meta` qui ne charge rien. */
function estImportMetaUrl(n: Node | undefined): boolean {
  return (
    n !== undefined && isPropertyAccessExpression(n) && n.name.text === 'url' &&
    isMetaProperty(n.expression) && n.expression.keywordToken === SyntaxKind.ImportKeyword
  );
}

/** Valeur d'une expression chaîne CONSTANTE, ou `null` si elle dépend de l'exécution. */
function valeurConstante(n: Node): string | null {
  if (isStringLiteralLike(n) || isNumericLiteral(n)) return n.text;
  if (
    isParenthesizedExpression(n) || isAsExpression(n) || isSatisfiesExpression(n) ||
    isTypeAssertionExpression(n) || isNonNullExpression(n)
  ) {
    return valeurConstante(n.expression);
  }
  if (isBinaryExpression(n) && n.operatorToken.kind === SyntaxKind.PlusToken) {
    const gauche = valeurConstante(n.left);
    const droite = valeurConstante(n.right);
    return gauche === null || droite === null ? null : gauche + droite;
  }
  if (isTemplateExpression(n)) {
    let valeur = n.head.text;
    for (const segment of n.templateSpans) {
      const v = valeurConstante(segment.expression);
      if (v === null) return null;
      valeur += v + segment.literal.text;
    }
    return valeur;
  }
  return null;
}

/**
 * Retire les blocs `/* … *\/` et les lignes qui COMMENCENT par `//`. Plus
 * grossier que `retirerCommentaires`, mais insensible aux littéraux d'expression
 * régulière (un `/['"]/` y ouvrirait une fausse chaîne) : c'est la forme sûre
 * pour chercher des imports dans tout `web/src`.
 */
export function retirerLignesDeCommentaire(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter(ligne => !/^\s*\/\//.test(ligne))
    .join('\n');
}

/**
 * Retire `//…` et `/* … *\/` sans toucher aux littéraux chaîne. Volontairement
 * simple : les gabarits `${…}` imbriqués ne sont pas analysés — un faux négatif
 * là ne masquerait qu'une prose, jamais un import (un import n'est pas dans un
 * gabarit).
 */
export function retirerCommentaires(source: string): string {
  let sortie = '';
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    const suivant = source[i + 1];
    if (c === '/' && suivant === '/') {
      while (i < source.length && source[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && suivant === '*') {
      i += 2;
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      const fin = c;
      sortie += c;
      i++;
      while (i < source.length && source[i] !== fin) {
        if (source[i] === '\\') {
          sortie += source[i] + (source[i + 1] ?? '');
          i += 2;
          continue;
        }
        sortie += source[i];
        i++;
      }
      sortie += source[i] ?? '';
      i++;
      continue;
    }
    sortie += c;
    i++;
  }
  return sortie;
}

/** Littéraux chaîne d'un source (hors commentaires), contenu sans guillemets. */
export function litterauxChaine(source: string): string[] {
  const sans = retirerCommentaires(source);
  const motif = /(['"`])((?:\\.|(?!\1)[^\\])*)\1/g;
  return [...sans.matchAll(motif)].map(m => m[2]);
}


/**
 * Structures SIGNABLES : tout source de production qui déclare son verrou
 * (`validationExterne: true` ou `false`), signé ou pas encore. Une structure
 * livrée verrou éteint est jugée dès sa naissance, pas seulement à sa signature.
 */
export function fichiersStructuresSignables(): string[] {
  return fichiersSource()
    .filter(f => !estUnTest(f))
    .filter(f => /validationExterne:\s*(?:true|false)\b/.test(retirerLignesDeCommentaire(lire(f))));
}
