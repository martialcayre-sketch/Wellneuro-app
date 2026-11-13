import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as ts from 'typescript';
import type { Node, PropertyAccessExpression } from 'typescript';

// LIÉES UNE FOIS, au chargement : sous Vitest, chaque import nommé d'un paquet
// CommonJS devient un accès par l'espace de noms du module, payé à chaque
// appel — sur les deux millions de nœuds de `web/src`, le parcours en prenait
// dix fois plus que le parseur lui-même (mesuré : 77 s contre 7 s).
const {
  createSourceFile, forEachChild, isArrayLiteralExpression, isAsExpression, isBinaryExpression, isCallExpression,
  isElementAccessExpression, isExportDeclaration, isFunctionLike, isObjectLiteralExpression,
  isExternalModuleReference, isIdentifier, isImportDeclaration, isImportEqualsDeclaration, isImportTypeNode,
  isLiteralTypeNode, isMetaProperty, isNamedExports, isNamedImports, isNewExpression, isNonNullExpression, isNumericLiteral, isParenthesizedExpression, isPropertyAccessExpression,
  isSatisfiesExpression, isStringLiteralLike, isTemplateExpression, isTypeAssertionExpression, ScriptKind, ScriptTarget,
  SyntaxKind,
} = ts;

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
  return importsSyntaxiques(source, chemin).map(i => i.specificateur);
}

/** Un import lu par le parseur : son spécificateur, et s'il n'importe QUE des types. */
export interface ImportSyntaxique {
  specificateur: string;
  /**
   * `import type …`, `export type … from`, `import { type A, type B }` (tous
   * les noms en `type`), `import type X = require(…)` et `typeof import(…)` :
   * effacés à la compilation, ils ne chargent rien. Tout le reste est un
   * import de VALEUR — un import nommé sans `type`, même s'il ne sert qu'en
   * type, est compté comme valeur (lecture prudente).
   */
  typeSeul: boolean;
}

/** Comme `specificateursSyntaxiques`, chaque import marqué de type seul ou de valeur. */
export function importsSyntaxiques(source: string, chemin = 'source.tsx'): ImportSyntaxique[] {
  const nature = chemin.endsWith('.tsx') ? ScriptKind.TSX
    : chemin.endsWith('.jsx') ? ScriptKind.JSX
      : /\.[cm]?js$/.test(chemin) ? ScriptKind.JS
        : /\.[cm]?ts$/.test(chemin) ? ScriptKind.TS : ScriptKind.TSX;
  const fichier = createSourceFile(chemin, source, ScriptTarget.Latest, true, nature);
  const trouves: ImportSyntaxique[] = [];
  const sentinelle = () => trouves.push({ specificateur: IMPORT_NON_CONSTANT, typeSeul: false });
  // L'APPELÉ est lu déballé — `(require)(x)`, `(0, require)(x)`,
  // `(require as F)(x)` —, et `module.require(x)` comme `module["require"](x)`
  // en sont (contre-passes Codex sur 302b80d8 et c847d0f5). Toute AUTRE
  // mention de `require` (`const r = require`, `require.context`,
  // `typeof require`) ferme le verrou ; de même toute mention de `import.meta`
  // qui n'est pas la base d'un `new URL(x, import.meta.url)` reconnu
  // (`import.meta.webpackContext`, `new globalThis.URL(…)`). Aucune n'existe en
  // production, et le bundler en ferait un chargement qu'on ne lit pas.
  const reconnus = new Set<Node>();
  const estRequire = (n: Node): boolean =>
    (isIdentifier(n) && n.text === 'require' && !(isPropertyAccessExpression(n.parent) && n.parent.name === n)) ||
    (isPropertyAccessExpression(n) && n.name.text === 'require') ||
    (isElementAccessExpression(n) && valeurConstante(n.argumentExpression) === 'require');
  // L'argument est lu par sa VALEUR CONSTANTE, comme le fait le bundler
  // (parenthèses, concaténations, gabarits, assertions de type) — contre-passe
  // Codex sur #2006. Un argument non constant ferme le verrou : il rend
  // `IMPORT_NON_CONSTANT`, qu'un banc traite comme un lecteur possible (le
  // bundler en ferait un module de contexte, qui embarque tout un dossier).
  const argument = (n: Node | undefined, typeSeul = false) => {
    const valeur = n && valeurConstante(n);
    trouves.push(valeur == null ? { specificateur: IMPORT_NON_CONSTANT, typeSeul: false } : { specificateur: valeur, typeSeul });
  };
  // `define([...], f)` AMD : le bundler charge chaque dépendance du tableau
  // (`wn-reviewer` sur #2006). Le nom d'un module nommé, une fabrique ou un
  // objet ne chargent rien ; tout autre argument, et toute autre mention de
  // `define`, ferment le verrou. Aucune n'existe en production.
  const estDefine = (n: Node): boolean =>
    isIdentifier(n) && n.text === 'define' && (n.parent as { name?: Node } | undefined)?.name !== n;
  const dependancesAmd = (args: readonly Node[]) => {
    for (const brut of args) {
      const a = deballer(brut);
      if (isArrayLiteralExpression(a)) a.elements.forEach(e => argument(e));
      // Une fabrique À PARAMÈTRES ferme le verrou : le bundler renomme le
      // paramètre placé en face de `"require"` (ou le premier, sans tableau),
      // et `r("x")` charge `x` (contre-passe `wn-reviewer` sur b1524e75).
      else if (isFunctionLike(a) && a.parameters.length > 0) sentinelle();
      else if (!(isStringLiteralLike(a) || isFunctionLike(a) || isObjectLiteralExpression(a))) {
        sentinelle();
      }
    }
  };
  // Le pragma de source JSX (`@jsx` suivi de `ImportSource x`) fait importer
  // `x/jsx-runtime` au compilateur. Un pragma est un commentaire, que le
  // parseur ne rend pas, et sa valeur ne se lit pas sûrement dans le texte : un
  // `*/` collé, un séparateur U+0085 que SWC admet et que `\s` ignore
  // (contre-passes `wn-reviewer` sur #2006). TOUTE mention ferme donc le
  // verrou, prose comprise. Aucune n'existe en production — ce fichier écrit le
  // mot en deux morceaux pour ne pas s'y compter.
  if (PRAGMA_SOURCE_JSX.test(source)) sentinelle();
  // `module.hot.accept(x)` et `module.hot.decline(x)` : le remplacement à
  // chaud de webpack charge `x` (routé de #2006 vers BP-17 PR 4). En
  // développement seulement — un build de production n'embarque rien —, mais
  // la forme est lue comme un import : une chaîne ou un tableau de chaînes
  // constantes rendent leurs chemins ; un rappel seul (auto-acceptation) ne
  // charge rien. Toute AUTRE mention de `module.hot` (`const h = module.hot`,
  // `module.hot.dispose`, un argument non constant) ferme le verrou. Aucune
  // n'existe en production.
  const estHot = (n: Node): boolean =>
    (isPropertyAccessExpression(n) && n.name.text === 'hot' && isIdentifier(n.expression) && n.expression.text === 'module') ||
    (isElementAccessExpression(n) && valeurConstante(n.argumentExpression) === 'hot' &&
      isIdentifier(n.expression) && n.expression.text === 'module');
  const dependancesHot = (arg: Node | undefined) => {
    const a = arg && deballer(arg);
    if (!a || isFunctionLike(a)) return;
    if (isArrayLiteralExpression(a)) a.elements.forEach(e => argument(e));
    else argument(a);
  };
  const visiter = (n: Node): void => {
    if (isImportDeclaration(n)) {
      const clause = n.importClause;
      const liaisons = clause?.namedBindings;
      const typeSeul = !!clause && (
        clause.isTypeOnly ||
        (!clause.name && !!liaisons && isNamedImports(liaisons) && liaisons.elements.length > 0 &&
          liaisons.elements.every(e => e.isTypeOnly))
      );
      argument(n.moduleSpecifier, typeSeul);
    } else if (isExportDeclaration(n)) {
      const clause = n.exportClause;
      const typeSeul = n.isTypeOnly ||
        (!!clause && isNamedExports(clause) && clause.elements.length > 0 && clause.elements.every(e => e.isTypeOnly));
      if (n.moduleSpecifier) argument(n.moduleSpecifier, typeSeul);
    } else if (isExternalModuleReference(n)) {
      argument(n.expression, isImportEqualsDeclaration(n.parent) && n.parent.isTypeOnly);
    } else if (isImportTypeNode(n) && isLiteralTypeNode(n.argument)) argument(n.argument.literal, true);
    else if (isCallExpression(n)) {
      const appele = deballer(n.expression);
      if (appele.kind === SyntaxKind.ImportKeyword || estRequire(appele)) {
        reconnus.add(appele);
        argument(n.arguments[0]);
      } else if (estDefine(appele)) {
        reconnus.add(appele);
        dependancesAmd(n.arguments);
      } else if (
        (isPropertyAccessExpression(appele) || isElementAccessExpression(appele)) &&
        ['accept', 'decline'].includes(
          (isPropertyAccessExpression(appele) ? appele.name.text : valeurConstante(appele.argumentExpression)) ?? '',
        ) &&
        estHot(deballer(appele.expression))
      ) {
        reconnus.add(deballer(appele.expression));
        dependancesHot(n.arguments[0]);
      }
    } else if (isNewExpression(n)) {
      // `new URL(x, import.meta.url)`, constructeur et base déballés : le
      // bundler embarque `x` (et l'exécute sous `new Worker`).
      const constructeur = deballer(n.expression);
      const base = n.arguments?.[1] && deballer(n.arguments[1]);
      if (isIdentifier(constructeur) && constructeur.text === 'URL' && base && estImportMetaUrl(base)) {
        reconnus.add(base.expression);
        argument(n.arguments?.[0]);
      }
    } else if (estRequire(n) || estDefine(n) || estHot(n)) {
      if (!reconnus.has(n)) sentinelle();
    } else if (isMetaProperty(n) && n.keywordToken === SyntaxKind.ImportKeyword && !reconnus.has(n)) {
      sentinelle();
    }
    forEachChild(n, visiter);
  };
  visiter(fichier);
  return trouves;
}

const PRAGMA_SOURCE_JSX = new RegExp('jsx' + 'ImportSource', 'i');

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

/** `import.meta.url` — admis seulement comme base d'un `new URL` reconnu. */
function estImportMetaUrl(n: Node): n is PropertyAccessExpression {
  return (
    isPropertyAccessExpression(n) && n.name.text === 'url' &&
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
