import { describe, expect, it } from 'vitest';
import { fichiersSource, lire, retirerLignesDeCommentaire } from './balayageSources';

// BP-01 ([[D-266]]) — `signature(err)` est imposé sur les routes biologie.
// `err.message` d'un `PrismaClientValidationError` rend les arguments de la
// requête : une valeur mesurée, un identifiant de dossier, le texte d'un
// courrier (`biology-library/saisieMessages.ts`, `signature`). Ce qu'une route
// biologie a le droit d'écrire d'une erreur : son nom et son code.
//
// ADMIS : `signature(err)`, `...classeEtCode(err)` (même contenu : nom et code,
// `observability/classeEtCode.ts`), `err.name`, un libellé fixe.
// REFUSÉ, dans les arguments de tout `console.*` : `.message`, `.stack`,
// `String(x)`, `JSON.stringify(x)`, et l'erreur passée brute.
//
// PÉRIMÈTRE : les `route.ts` sous `api/praticien/biologie/`, la route des
// portes biologiques et son service. Le jour du lot, neuf lignes (six routes et
// le service) écrivaient `err.message` : corrigées dans le même diff que ce
// banc. Les autres modules de `biology-library` ne sont pas balayés ici — la
// limite est écrite pour ne pas sur-promettre.
function estRouteBiologie(chemin: string): boolean {
  return /^web\/src\/app\/api\/praticien\/biologie\/(.+\/)?route\.ts$/.test(chemin)
    || chemin === 'web/src/app/api/praticien/assiettes-indiquees/portes-biologiques/route.ts'
    || chemin === 'web/src/lib/clinical/portesBiologiquesService.ts';
}

/** Les appels `console.*(…)` d'un source, parenthèses appariées. */
export function appelsConsole(source: string): string[] {
  const texte = retirerLignesDeCommentaire(source);
  const appels: string[] = [];
  for (const m of texte.matchAll(/\bconsole\.\w+\s*\(/g)) {
    let profondeur = 0;
    let fin = m.index + m[0].length - 1;
    let chaine: string | null = null;
    for (; fin < texte.length; fin++) {
      const c = texte[fin];
      // Une parenthèse DANS un littéral ne compte pas : `'[x] (lecture)'`
      // fermait l'appel trop tôt et laissait l'erreur hors du morceau jugé.
      if (chaine) {
        if (c === '\\') fin++;
        else if (c === chaine) chaine = null;
        continue;
      }
      if (c === "'" || c === '"' || c === '`') chaine = c;
      else if (c === '(') profondeur++;
      else if (c === ')' && --profondeur === 0) break;
    }
    appels.push(texte.slice(m.index, fin + 1));
  }
  return appels;
}

/** Les noms usuels d'une erreur capturée. */
const NOM_ERREUR = '(?:err|error|erreur|e|ex|cause)';

const FUITE = [
  /\.message\b/,
  /\[\s*['"`]message['"`]\s*\]/,
  /\.stack\b/,
  /\bString\s*\(/,
  /\bJSON\.stringify\s*\(/,
  // L'erreur dans un objet (`{ err }`), un gabarit (`${err}`), un cast (`err as Error`).
  new RegExp(`\\{\\s*${NOM_ERREUR}\\s*[,}]`),
  new RegExp(`\\$\\{\\s*${NOM_ERREUR}\\s*\\}`),
  new RegExp(`\\b${NOM_ERREUR}\\s+as\\b`),
];

/** Arguments de premier niveau d'un appel `console.x(…)`. */
function argumentsDe(appel: string): string[] {
  const corps = appel.slice(appel.indexOf('(') + 1, -1);
  const args: string[] = [];
  let profondeur = 0;
  let courant = '';
  for (const c of corps) {
    if ('([{'.includes(c)) profondeur++;
    else if (')]}'.includes(c)) profondeur--;
    if (c === ',' && profondeur === 0) {
      args.push(courant.trim());
      courant = '';
    } else courant += c;
  }
  if (courant.trim()) args.push(courant.trim());
  return args;
}

/** Les appels qui laissent passer le contenu d'une erreur. */
export function appelsFuyants(source: string): string[] {
  return appelsConsole(source).filter(appel =>
    FUITE.some(motif => motif.test(appel))
    // L'erreur passée brute : un argument qui n'est QUE l'identifiant capturé
    // (ou son étalement) — `console.error(x, err)` rend message et pile.
    || argumentsDe(appel).some(arg => new RegExp(`^(?:\\.\\.\\.)?${NOM_ERREUR}$`).test(arg)));
}

describe('routes biologie — journal par signature, jamais par message (BP-01)', () => {
  const routes = fichiersSource().filter(estRouteBiologie);

  it('le périmètre n\'est pas vide (le balayage voit les routes)', () => {
    expect(routes.length).toBeGreaterThanOrEqual(13);
  });

  for (const route of routes) {
    it(`${route} : aucun console.* ne rend le contenu d'une erreur`, () => {
      expect(appelsFuyants(lire(route)), 'remplacer par `signature(err)`').toEqual([]);
    });
  }

  // CONTRE-ÉPREUVE : la mutation attendue — rétablir `err.message` — rougit,
  // sur une ligne comme sur plusieurs ; la forme admise passe.
  it('le détecteur voit les formes fuyantes et admet signature/classeEtCode', () => {
    const source = [
      "console.error('[x]', err instanceof Error ? err.message : String(err));",
      'console.error(',
      "  '[y]',",
      '  err,',
      ');',
      "console.warn('[z]', JSON.stringify(erreur));",
      "console.error('[a] (lecture)', { err });",
      'console.error(`[b] ${err}`);',
      "console.error('[c]', (ex as Error).name, cause);",
      "console.error('[d]', err['message']);",
      "console.error('[ok]', signature(err));",
      "console.error('[ok2]', ...classeEtCode(err));",
      "console.error('[ok3]', err instanceof Error ? err.name : 'inconnue');",
      "// console.error('[prose]', err.message);",
    ].join('\n');
    expect(appelsFuyants(source)).toHaveLength(7);
  });
});
