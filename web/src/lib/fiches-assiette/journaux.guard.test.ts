import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import {
  createSourceFile, isArrowFunction, isBinaryExpression, isCallExpression, isCatchClause, isFunctionExpression,
  isIdentifier, isPropertyAccessExpression, isPropertyAssignment, isTypeOfExpression, ScriptKind, ScriptTarget,
  SyntaxKind, type Identifier, type Node, type SourceFile,
} from 'typescript';
import { describe, expect, it } from 'vitest';

// GARDE : CE QUE LES JOURNAUX DU CHANTIER RECOPIENT D'UNE ERREUR ([[D-251]] §4,
// contre-revue adverse du 2026-09-29, P1-1).
//
// Le message d'une erreur Prisma peut recopier les arguments de l'appel : le
// texte d'une version de fiche, un identifiant de dossier, un code d'assiette.
// `logger.*` n'en protège pas : `sanitizeError` garde le message, tronqué et
// masqué en partie seulement. Dans un `console.*` ou un `logger.*` de ces
// fichiers, l'erreur d'un `catch` ne peut donc paraître que sous trois formes :
// `err.name`, `err instanceof …`, `typeof err` — ou passée à `classeEtCode`.
// Toute autre présence (nue, `String(err)`, `${err}`, `error: err`) la
// recopie ; et aucun `.message` ni `.stack` n'y figure, d'où qu'il vienne.
//
// L'ARBRE, PAS LE TEXTE. Une première version lisait les arguments au
// caractère près : un gabarit `${err}` y passait pour une chaîne opaque, et un
// `\'` échappé faisait dérailler la lecture (revue de #1252).

const RACINE = path.join(process.cwd(), 'src');
const PERIMETRE = [
  'lib/fiches-assiette',
  'app/api/praticien/fiches-assiette',
  'app/api/internal/fiches-assiette',
  'app/api/portail/fiches-assiette',
  'app/api/portail/lectures',
  'app/api/praticien/protocoles/diffusion',
  'components/fiches-assiette',
  'components/patient/fiches-assiette',
  'app/portail/[token]/fiches',
  // BIO-INGEST LOT-02 ([[D-256]]) : l'import de comptes rendus. Une erreur
  // Prisma y recopierait un libellé ou une valeur lue — même règle, même banc.
  'lib/biology-library/import',
  'app/api/praticien/biologie/import',
  // Contre-revue adverse du 2026-10-10 (M16) : les autres écrivains et
  // lecteurs de la biologie journalisaient hors du banc — la transmission du
  // patient, la saisie du praticien, unitaire et groupée.
  'app/api/portail/comptes-rendus',
  'app/api/praticien/biologie/resultats',
];
// Hors de `src/` : le cron de purge à l'échéance (même contre-revue, M16). Son
// erreur vient d'un `.catch(err => …)` : le paramètre du rappel compte comme
// celui d'un `catch` (revue Copilot de #1388).
const FICHIERS_HORS_SRC = [path.join(process.cwd(), 'scripts', 'purgeComptesRendusEcheance.ts')];
const JOURNAL = /^(?:console\.(?:error|warn|log|info|debug)|logger\.(?:error|warn|info|debug|security|fatal))$/;
// `signature` (saisieMessages.ts) : nom et code Prisma, comme `classeEtCode`.
const NEUTRALISEURS = new Set(['classeEtCode', 'signature']);

function fichiersSources(depart: string): string[] {
  if (!existsSync(depart)) return [];
  const trouves: string[] = [];
  for (const entree of readdirSync(depart)) {
    const complet = path.join(depart, entree);
    if (statSync(complet).isDirectory()) trouves.push(...fichiersSources(complet));
    else if (/\.tsx?$/.test(entree) && !/\.test\.tsx?$/.test(entree)) trouves.push(complet);
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

/** L'erreur d'un `catch` paraît-elle ici sous une forme qui ne la recopie pas ? */
function presenceNeutre(id: Node): boolean {
  const parent = id.parent;
  // Un NOM, pas une valeur : la clé `error:` d'un objet, le `.error` d'un accès.
  if ((isPropertyAssignment(parent) || isPropertyAccessExpression(parent)) && parent.name === id) return true;
  if (isPropertyAccessExpression(parent) && parent.expression === id) return parent.name.text === 'name';
  if (isBinaryExpression(parent) && parent.left === id) return parent.operatorToken.kind === SyntaxKind.InstanceOfKeyword;
  if (isTypeOfExpression(parent)) return true;
  if (isCallExpression(parent) && parent.expression !== id) {
    return isIdentifier(parent.expression) && NEUTRALISEURS.has(parent.expression.text);
  }
  return false;
}

type Appel = { ligne: number; texte: string; fautes: string[] };

/** Les appels de journal d'une source, et ce que chacun recopie d'une erreur. */
function appelsDeJournal(chemin: string, source: string): Appel[] {
  const arbre = arbreDe(chemin, source);
  const tous = noeuds(arbre);
  // L'erreur d'un `catch`, et celle du rappel d'un `.catch(…)` de promesse.
  const rappelsCatch = tous
    .filter(isCallExpression)
    .filter(a => isPropertyAccessExpression(a.expression) && a.expression.name.text === 'catch')
    .map(a => a.arguments[0])
    .filter(f => f !== undefined && (isArrowFunction(f) || isFunctionExpression(f)))
    .map(f => (f as { parameters: readonly { name: Node }[] }).parameters[0]?.name);
  const erreurs = new Set(
    [...tous.filter(isCatchClause).map(c => c.variableDeclaration?.name), ...rappelsCatch]
      .filter((n): n is Identifier => n !== undefined && isIdentifier(n))
      .map(n => n.text),
  );
  return tous
    .filter(isCallExpression)
    .filter(appel => JOURNAL.test(appel.expression.getText(arbre)))
    .map(appel => {
      const fautes: string[] = [];
      for (const n of appel.arguments.flatMap(noeuds)) {
        if (isPropertyAccessExpression(n) && ['message', 'stack'].includes(n.name.text)) fautes.push(n.getText(arbre));
        else if (isIdentifier(n) && erreurs.has(n.text) && !presenceNeutre(n)) fautes.push(n.parent.getText(arbre));
      }
      return {
        ligne: arbre.getLineAndCharacterOfPosition(appel.getStart(arbre)).line + 1,
        texte: appel.getText(arbre),
        fautes,
      };
    });
}

describe('Journaux des fiches d’assiette — classe et code, jamais le message (D-251, P1-1)', () => {
  const appels = PERIMETRE
    .flatMap(dossier => fichiersSources(path.join(RACINE, dossier)))
    .concat(FICHIERS_HORS_SRC)
    .flatMap(fichier => appelsDeJournal(fichier, readFileSync(fichier, 'utf8'))
      .map(a => ({ ...a, fichier: path.relative(RACINE, fichier) })));

  it('le banc lit bien les journaux du chantier (il n’est pas vide)', () => {
    expect(appels.length).toBeGreaterThanOrEqual(15);
    for (const lieu of [['protocoles', 'diffusion'], ['internal', 'fiches-assiette'], ['portail', 'lectures']]) {
      expect(appels.some(a => a.fichier.includes(path.join(...lieu)))).toBe(true);
    }
    expect(appels.some(a => a.texte.startsWith('logger.'))).toBe(true);
    expect(appels.some(a => a.fichier.includes(path.join('biologie', 'import')))).toBe(true);
    expect(appels.some(a => a.fichier.includes(path.join('biology-library', 'import')))).toBe(true);
    for (const lieu of [['portail', 'comptes-rendus'], ['biologie', 'resultats', 'bilan'], ['scripts', 'purgeComptesRendusEcheance']]) {
      expect(appels.some(a => a.fichier.includes(path.join(...lieu)))).toBe(true);
    }
  });

  it('aucun console.* ni logger.* ne recopie le message, la pile ou l’objet d’une erreur', () => {
    const fautifs = appels
      .filter(a => a.fautes.length > 0)
      .map(a => `${a.fichier}:${a.ligne} — ${a.fautes.join(' | ')}`);
    expect(fautifs).toEqual([]);
  });

  it('le détecteur mord sur chaque forme qui recopie, et laisse passer classe et code', () => {
    const fautes = (corps: string) => appelsDeJournal('x.ts', corps).flatMap(a => a.fautes);
    // Les formes trouvées par la contre-revue.
    expect(fautes('try {} catch (err) { console.error(\'x\', err instanceof Error ? err.message : String(err)); }')).not.toEqual([]);
    expect(fautes('try {} catch (error) { console.error(\'x\', error); }')).not.toEqual([]);
    expect(fautes('try {} catch (erreur) { logger.error({ event: E, error: erreur }); }')).not.toEqual([]);
    // Les deux contournements relevés par la revue de #1252.
    expect(fautes('try {} catch (err) { console.warn(`échec : ${err}`); }')).not.toEqual([]);
    expect(fautes('try {} catch (err) { console.warn(\'can\\\'t\', err.stack); }')).not.toEqual([]);
    // Et quelques voisines.
    expect(fautes('try {} catch (err) { console.warn(\'x\', { err }); }')).not.toEqual([]);
    expect(fautes('try {} catch (err) { console.warn(\'x\', JSON.stringify(err)); }')).not.toEqual([]);
    // Ce qui ne recopie rien.
    expect(fautes('try {} catch (err) { console.error(\'x\', ...classeEtCode(err)); }')).toEqual([]);
    expect(fautes('try {} catch (err) { console.error(\'x\', signature(err)); }')).toEqual([]);
    // Le rappel d'un `.catch` de promesse, forme du cron de purge (revue de #1388).
    for (const fuite of ['err', 'String(err)', '`${err}`', 'JSON.stringify(err)']) {
      expect(fautes(`main().catch(err => { console.error('x', ${fuite}); });`)).not.toEqual([]);
    }
    expect(fautes('main().catch(function (e) { console.error(\'x\', e); });')).not.toEqual([]);
    expect(fautes('main().catch(err => { console.error(\'x\', ...classeEtCode(err)); });')).toEqual([]);
    expect(fautes('try {} catch (err) { console.error(\'x\', err instanceof Error ? err.name : typeof err, code); }')).toEqual([]);
    expect(fautes('try {} catch (erreur) { logger.error({ event: E, metadata: { erreur: classeEtCode(erreur) } }); }')).toEqual([]);
    expect(fautes('try {} catch (error) { console.error(\'x\', resultat.error, { error: 1 }); }')).toEqual([]);
    // Et le détecteur voit bien l'appel (il ne se tait pas faute de l'avoir trouvé).
    expect(appelsDeJournal('x.ts', 'try {} catch (e) { logger.warn({ event: E }); }')).toHaveLength(1);
  });
});
