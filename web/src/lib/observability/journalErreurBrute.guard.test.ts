import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  createSourceFile, getLeadingCommentRanges, isArrowFunction, isAsExpression, isBinaryExpression, isCallExpression,
  isCatchClause, isExpressionStatement, isFunctionExpression, isIdentifier, isNonNullExpression, isParenthesizedExpression,
  isPropertyAccessExpression, isPropertyAssignment, isTypeOfExpression, ScriptKind, ScriptTarget, SyntaxKind,
  type CallExpression, type Node, type SourceFile,
} from 'typescript';
import { describe, expect, it } from 'vitest';

// CLIQUET : L'ERREUR D'UN `catch` NE PART PAS EN CLAIR DANS UN `console.*`
// (lot autonomie-pieges-restes, partie 20 ; relevé et arbitrage
// 20261126-0758-d, option C).
//
// Le message d'un `PrismaClientValidationError` recopie les arguments de
// l'appel — une date saisie, un identifiant de dossier, un texte du patient —,
// et le client Prisma ne fixe pas `errorFormat`. Un `console.*` qui reçoit
// l'objet d'erreur, son `message`, sa pile, son `meta` ou sa `cause` les écrit
// au journal Scalingo. Formes sûres : `classeEtCode(err)` (`./classeEtCode`),
// `signature(err)`, `err.name`, `err.code`, `err instanceof …`, `typeof err`.
//
// UN CLIQUET, PAS UN INTERDIT. Le relevé a trouvé ces fuites dans une centaine
// de fichiers : le compte de chaque fichier est gelé dans
// `journalErreurBrute.cliquet.json`, le code neuf ne l'augmente pas, et chaque
// site converti abaisse le compte (le banc exige alors de l'écrire). Les routes
// patient se résorbent d'abord.
//
// Périmètre arbitré : `console.*` seulement. `logger.*({ error })` passe par
// `sanitizeError`, qui garde un message tronqué ; il n'est pas compté ici. La
// garde stricte du chantier des fiches d'assiette
// (`lib/fiches-assiette/journaux.guard.test.ts`, [[D-251]]) reste en place.
//
// EXEMPTION : une erreur de domaine dont le message est sûr (une `TypeError`
// de contrat qui ne cite que des noms de champs) se déclare sur la ligne qui
// précède l'appel : `// wn-journal-erreur-sur : <motif d'au moins dix
// caractères>`. Le motif dit pourquoi le message ne cite aucune valeur.
//
// Réécrire le cliquet après une conversion :
//   WN_CLIQUET_JOURNAL_ECRIRE=1 npx vitest run src/lib/observability/journalErreurBrute.guard.test.ts

const RACINE = path.join(process.cwd(), 'src');
const CLIQUET = path.join(RACINE, 'lib', 'observability', 'journalErreurBrute.cliquet.json');
const CONSOLE = /^console\.(?:error|warn|log|info|debug)$/;
// Les aides qui ne rendent que la classe et le code d'une erreur — ou, pour
// `messageJournalisable`, le message seulement hors Prisma. `sanitizeAuditError`
// n'y est pas : elle garde le message, masqué en partie seulement.
const NEUTRALISEURS = new Set([
  'classeEtCode', 'signature', 'signatureErreur', 'nomErreur', 'traceErreur', 'messageJournalisable',
]);
const PROPRIETES_FUITE = new Set(['message', 'stack', 'meta', 'cause']);
const EXEMPTION = /wn-journal-erreur-sur\s*:\s*(.{10,})/;

function fichiersSources(depart: string): string[] {
  if (!existsSync(depart)) return [];
  const trouves: string[] = [];
  for (const entree of readdirSync(depart)) {
    const complet = path.join(depart, entree);
    if (statSync(complet).isDirectory()) {
      if (entree === 'node_modules' || entree === 'generated' || entree === '__tests__') continue;
      trouves.push(...fichiersSources(complet));
    } else if (/\.tsx?$/.test(entree) && !/\.(test|spec)\.tsx?$/.test(entree) && !entree.endsWith('.d.ts')) {
      trouves.push(complet);
    }
  }
  return trouves;
}

function arbreDe(chemin: string, source: string): SourceFile {
  // Le dialecte se lit sur l'extension : un `.ts` lu en TSX rend un arbre
  // tronqué, sans erreur (voir `replisAssietteV1.guard.test.ts`).
  const kind = chemin.endsWith('.tsx') ? ScriptKind.TSX : ScriptKind.TS;
  return createSourceFile(chemin, source, ScriptTarget.Latest, true, kind);
}

function noeuds(racine: Node): Node[] {
  const tous: Node[] = [];
  const descendre = (noeud: Node) => {
    tous.push(noeud);
    noeud.forEachChild(descendre);
  };
  descendre(racine);
  return tous;
}

/** Les noms qui désignent une erreur À CET ENDROIT : `catch (x)` ou rappel de `.catch(x => …)` englobants. */
function erreursEnPortee(appel: Node): Set<string> {
  const noms = new Set<string>();
  for (let n: Node | undefined = appel.parent; n; n = n.parent) {
    if (isCatchClause(n) && n.variableDeclaration && isIdentifier(n.variableDeclaration.name)) {
      noms.add(n.variableDeclaration.name.text);
    }
    if ((isArrowFunction(n) || isFunctionExpression(n)) && n.parent && isCallExpression(n.parent)
      && isPropertyAccessExpression(n.parent.expression) && n.parent.expression.name.text === 'catch'
      && n.parent.arguments[0] === n) {
      const premier = n.parameters[0]?.name;
      if (premier && isIdentifier(premier)) noms.add(premier.text);
    }
  }
  return noms;
}

/** Remonte les enveloppes qui ne changent pas la valeur : `(x)`, `x as T`, `x!`. */
function enveloppe(n: Node): Node {
  let courant = n;
  while (courant.parent && (isParenthesizedExpression(courant.parent) || isAsExpression(courant.parent)
    || isNonNullExpression(courant.parent))) {
    courant = courant.parent;
  }
  return courant;
}

/** L'erreur paraît-elle ici sans être recopiée ? */
function presenceNeutre(id: Node): boolean {
  if ((isPropertyAssignment(id.parent) || isPropertyAccessExpression(id.parent)) && id.parent.name === id) return true;
  const ext = enveloppe(id);
  const parent = ext.parent;
  if (isPropertyAccessExpression(parent) && parent.expression === ext) return !PROPRIETES_FUITE.has(parent.name.text);
  if (isBinaryExpression(parent) && parent.left === ext) return parent.operatorToken.kind === SyntaxKind.InstanceOfKeyword;
  if (isTypeOfExpression(parent)) return true;
  if (isCallExpression(parent) && parent.expression !== ext) {
    return isIdentifier(parent.expression) && NEUTRALISEURS.has(parent.expression.text);
  }
  return false;
}

function exempte(appel: CallExpression, source: string): boolean {
  const instruction = isExpressionStatement(appel.parent) ? appel.parent : appel;
  const commentaires = getLeadingCommentRanges(source, instruction.getFullStart()) ?? [];
  const dernier = commentaires.at(-1);
  return dernier !== undefined && EXEMPTION.test(source.slice(dernier.pos, dernier.end));
}

type Fuite = { ligne: number; fautes: string[] };

/** Les appels `console.*` d'une source qui recopient l'erreur de leur `catch`. */
function fuitesDeJournal(chemin: string, source: string): Fuite[] {
  const arbre = arbreDe(chemin, source);
  const fuites: Fuite[] = [];
  for (const appel of noeuds(arbre).filter(isCallExpression)) {
    if (!CONSOLE.test(appel.expression.getText(arbre))) continue;
    const erreurs = erreursEnPortee(appel);
    if (erreurs.size === 0) continue;
    const fautes = appel.arguments
      .flatMap(noeuds)
      .filter(n => isIdentifier(n) && erreurs.has(n.text) && !presenceNeutre(n))
      .map(n => enveloppe(n).parent.getText(arbre));
    if (fautes.length > 0 && !exempte(appel, source)) {
      fuites.push({ ligne: arbre.getLineAndCharacterOfPosition(appel.getStart(arbre)).line + 1, fautes });
    }
  }
  return fuites;
}

function releve(): Map<string, Fuite[]> {
  const parFichier = new Map<string, Fuite[]>();
  for (const fichier of fichiersSources(RACINE)) {
    const fuites = fuitesDeJournal(fichier, readFileSync(fichier, 'utf8'));
    if (fuites.length > 0) parFichier.set(path.relative(RACINE, fichier).split(path.sep).join('/'), fuites);
  }
  return parFichier;
}

describe('Cliquet : l’erreur d’un catch ne part pas en clair dans un console.* (20261126-0758-d)', () => {
  const actuel = releve();

  if (process.env.WN_CLIQUET_JOURNAL_ECRIRE === '1') {
    it('réécrit le cliquet', () => {
      const gel = Object.fromEntries([...actuel.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([f, l]) => [f, l.length]));
      writeFileSync(CLIQUET, `${JSON.stringify(gel, null, 2)}\n`);
    });
    return;
  }

  const gel = JSON.parse(readFileSync(CLIQUET, 'utf8')) as Record<string, number>;

  it('le banc lit bien le dépôt (il n’est pas vide)', () => {
    const total = [...actuel.values()].reduce((s, l) => s + l.length, 0);
    expect(total).toBeGreaterThan(0);
    // La mesure de référence du relevé : une route patient, une route interne.
    expect(Object.keys(gel).some(f => f.startsWith('app/api/portail/'))).toBe(true);
    expect(Object.keys(gel).some(f => f.startsWith('app/api/internal/'))).toBe(true);
  });

  it('aucun fichier ne dépasse son compte gelé (le code neuf passe par classeEtCode)', () => {
    const depasses = [...actuel.entries()]
      .filter(([fichier, fuites]) => fuites.length > (gel[fichier] ?? 0))
      .map(([fichier, fuites]) => `${fichier} : ${fuites.length} > ${gel[fichier] ?? 0} — `
        + fuites.map(f => `l.${f.ligne} ${f.fautes.join(' | ')}`).join(' ; '));
    expect(depasses).toEqual([]);
  });

  it('le cliquet ne garde aucune marge : un site converti abaisse le compte', () => {
    const marges = Object.entries(gel)
      .filter(([fichier, compte]) => (actuel.get(fichier)?.length ?? 0) < compte)
      .map(([fichier, compte]) => `${fichier} : gelé à ${compte}, mesuré ${actuel.get(fichier)?.length ?? 0}`);
    expect(marges, 'Réécrire le cliquet : WN_CLIQUET_JOURNAL_ECRIRE=1 (voir l’en-tête du banc).').toEqual([]);
  });

  it('le détecteur mord sur chaque forme qui recopie, et laisse passer classe et code', () => {
    const fautes = (corps: string) => fuitesDeJournal('x.ts', corps).flatMap(f => f.fautes);
    // Les deux familles du relevé.
    expect(fautes('try {} catch (error) { console.error(\'x\', error); }')).not.toEqual([]);
    expect(fautes('try {} catch (err) { console.error(\'x\', err instanceof Error ? err.message : String(err)); }'))
      .toHaveLength(2);
    // Les voisines.
    for (const fuite of ['`${err}`', 'JSON.stringify(err)', '{ err }', '{ e: err }', 'err.stack', 'err.meta', 'err.cause',
      '(err as Error).message', 'err!.message', 'sanitizeAuditError(err.message)', 'sanitizeAuditError(err)']) {
      expect(fautes(`try {} catch (err) { console.warn('x', ${fuite}); }`), fuite).not.toEqual([]);
    }
    expect(fautes('main().catch(err => { console.error(\'x\', err); });')).not.toEqual([]);
    expect(fautes('main().catch(function (e) { console.error(\'x\', e.message); });')).not.toEqual([]);
    // Ce qui ne recopie rien.
    for (const sur of ['...classeEtCode(err)', 'signature(err)', 'signatureErreur(err)', 'nomErreur(err)',
      'messageJournalisable(err)', 'err.name', 'err.code', 'err instanceof Error', 'typeof err', '{ error: 1 }',
      'resultat.error']) {
      expect(fautes(`try {} catch (err) { console.error('x', ${sur}); }`), sur).toEqual([]);
    }
    // Hors d'un catch, un nom usuel n'est pas une erreur (faux positifs du relevé : `reason`, `raison`).
    expect(fautes('const reason = \'invalide\'; console.warn(\'x\', reason);')).toEqual([]);
    expect(fautes('function f(error: string) { console.warn(\'x\', error); }')).toEqual([]);
    // Le nom d'erreur d'un autre catch ne déborde pas.
    expect(fautes('try {} catch (err) {} const err = 1; console.log(err);')).toEqual([]);
    // logger.* n'est pas dans le périmètre arbitré.
    expect(fautes('try {} catch (err) { logger.error({ event: E, error: err }); }')).toEqual([]);
    // Exemption motivée sur la ligne qui précède ; un motif trop court ne vaut pas.
    expect(fautes('try {} catch (err) {\n  // wn-journal-erreur-sur : TypeError du contrat, noms de champs seuls\n  console.warn(\'x\', err.message);\n}'))
      .toEqual([]);
    expect(fautes('try {} catch (err) {\n  // wn-journal-erreur-sur : sûr\n  console.warn(\'x\', err.message);\n}')).not.toEqual([]);
  });
});
