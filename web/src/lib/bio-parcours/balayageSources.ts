import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Outillage des bancs BP-01 ([[D-266]]) — lecture du SOURCE, jamais exécuté
// par l'application : aucun module de production ne l'importe (le banc des
// importeurs `node:` le dirait). Un banc de structure lit le texte, comme le
// ferait une revue, parce qu'aucune assertion à l'exécution ne voit un import.

/** Racine du dépôt, depuis `web/src/lib/bio-parcours/`. */
export const RACINE = join(__dirname, '..', '..', '..', '..');

/**
 * Fichiers `.ts`/`.tsx` de `web/src`, suivis OU non suivis (mais non ignorés) :
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
  return [...new Set(sortie.split('\n').filter(f => /\.tsx?$/.test(f)))].sort();
}

/** Un fichier de test (banc compris) — hors du périmètre « code de production ». */
export function estUnTest(chemin: string): boolean {
  return /\.(test|spec)\.tsx?$/.test(chemin) || chemin.includes('/__tests__/');
}

export function lire(chemin: string): string {
  return readFileSync(join(RACINE, chemin), 'utf8');
}

/**
 * Spécificateurs de module importés par un source : `import … from`,
 * `export … from`, `import 'x'` et `import('x')`. Les commentaires sont retirés
 * avant la lecture — une prose qui CITE un module n'en est pas l'importeur
 * (six fichiers de production citent `biology-library` sans l'importer).
 */
export function specificateursImportes(source: string): string[] {
  const sansCommentaires = retirerLignesDeCommentaire(source);
  const motif = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])([^'"\n]+)\1/g;
  return [...sansCommentaires.matchAll(motif)].map(m => m[2]);
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
