import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { contexteResolution, importsResolus } from '../bio-parcours/resolutionImports';

// GARDE : QUI ÉCRIT LE CATALOGUE DES FICHES D'ASSIETTE ([[D-251]], lots 4 et 6).
//
// La base refuse déjà toute réécriture et tout effacement des deux tables
// (triggers de la migration M1). Ce banc garde l'autre moitié, que la base ne
// voit pas : QUEL CODE écrit.
//   — une version ne se crée QUE par la voie d'ingestion (`ingestion.ts`), qui
//     ne dépose que des brouillons ;
//   — un acte ne se crée QUE par la décision du responsable (`decision.ts`,
//     lot 6), jamais par `ingestion.ts` (`DC-16` : « jamais le même chemin ») ;
//   — les deux chemins ne s'importent pas l'un l'autre : ce qu'ils partagent
//     (les contrôles) vit dans des modules neutres ;
//   — aucun code ne tente de réécrire ou d'effacer, ni par Prisma, ni en SQL
//     brut. Le trigger refuserait, mais une route qui échoue en production est
//     un défaut que le banc voit avant elle.

const RACINE = path.join(process.cwd(), 'src');
const INGESTION = path.join('lib', 'fiches-assiette', 'ingestion.ts');
const DECISION = path.join('lib', 'fiches-assiette', 'decision.ts');

function fichiersSources(depart: string): string[] {
  const trouves: string[] = [];
  for (const entree of readdirSync(depart)) {
    const complet = path.join(depart, entree);
    if (statSync(complet).isDirectory()) {
      if (entree === 'node_modules' || entree === '.next' || entree === 'generated') continue;
      trouves.push(...fichiersSources(complet));
    } else if (/\.tsx?$/.test(entree) && !/\.test\.tsx?$/.test(entree)) {
      trouves.push(complet);
    }
  }
  return trouves;
}

function occurrences(motif: RegExp): { fichier: string; n: number }[] {
  return fichiersSources(RACINE)
    .map(fichier => ({
      fichier: path.relative(RACINE, fichier),
      n: [...readFileSync(fichier, 'utf8').matchAll(new RegExp(motif.source, `${motif.flags}g`))].length,
    }))
    .filter(o => o.n > 0);
}

/**
 * Les imports de `fichier` qui mènent à `motif` : par leur spécificateur
 * (décodé) ou par le FICHIER atteint. LE PARSEUR ET LA RÉSOLUTION (lot
 * `bp17-extension-bancs-garde`) : guillemets doubles, `import()`, `require`,
 * import latéral, alias ou lien symbolique ne cachent plus l'import — l'ancien
 * motif ne lisait que `from '…'`. Un import indéterminé (non constant, nom nu
 * inconnu) mène à tout.
 */
let contexte: ReturnType<typeof contexteResolution> | undefined;
function importsVers(fichier: string, motif: RegExp, source?: string): string[] {
  return importsResolus(`web/src/${fichier.split(path.sep).join('/')}`, (contexte ??= contexteResolution()), source)
    .filter(i => i.indetermine || motif.test(i.specificateur) || (i.atteint !== null && motif.test(i.atteint)))
    .map(i => i.specificateur);
}

const CREER_VERSION = /\.ficheAssietteVersion\s*\.\s*create\s*\(/;
const CREER_ACTE = /\.ficheAssietteActe\s*\.\s*create\s*\(/;
const REECRIRE =
  /\.ficheAssiette(?:Version|Acte)\s*\.\s*(?:createMany|createManyAndReturn|update|updateMany|updateManyAndReturn|upsert|delete|deleteMany)\s*\(/;
const SQL_BRUT = /(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM|TRUNCATE(?:\s+TABLE)?)\s+(?:public\.)?"?fiches_assiette_(?:versions|actes)\b/i;
/**
 * L'ÉCRITURE IMBRIQUÉE (constat de revue) : `ficheAssietteVersion.create({
 * data: { actes: { create: … } } })` déposerait une version DÉJÀ validée, et
 * `ficheAssietteActe.create({ data: { version: { create: … } } })` créerait une
 * version depuis la décision. Ni l'une ni l'autre ne passe par les motifs
 * ci-dessus. Cherchée dans les fichiers qui nomment le catalogue.
 */
const IMBRIQUEE = /\b(?:actes|version)\s*:\s*\{\s*(?:create|createMany|connectOrCreate|upsert)\b/;

function imbriquees(): { fichier: string; n: number }[] {
  return occurrences(IMBRIQUEE).filter(o => /ficheAssiette/.test(readFileSync(path.join(RACINE, o.fichier), 'utf8')));
}

describe('Catalogue des fiches d’assiette — qui écrit (D-251, lots 4 et 6)', () => {
  it('seule la voie d’ingestion crée une version — et elle le fait (le banc n’est pas vide)', () => {
    expect(occurrences(CREER_VERSION)).toEqual([{ fichier: INGESTION, n: 1 }]);
  });

  it('seule la décision du responsable crée un acte, en un seul endroit — jamais l’ingestion', () => {
    expect(occurrences(CREER_ACTE)).toEqual([{ fichier: DECISION, n: 1 }]);
    expect(DECISION).not.toBe(INGESTION);
  });

  it('le dépôt et la décision ne s’importent pas l’un l’autre (DC-16)', () => {
    expect(importsVers(DECISION, /ingestion|api\/internal/)).toEqual([]);
    expect(importsVers(INGESTION, /decision/)).toEqual([]);
    // CONTRE-ÉPREUVE (absente avant le lot) : les formes que l'ancien motif ne voyait pas.
    for (const source of [
      'import { x } from "./ingestion";',
      "const i = await import('./ingestion');",
      "import './ingestion';",
      'const r = require("@/app/api/" + "internal/x/route");',
      'const m = await import(chemin);',
    ]) {
      expect(importsVers(DECISION, /ingestion|api\/internal/, source), source).toHaveLength(1);
    }
    expect(importsVers(DECISION, /ingestion|api\/internal/, "import { y } from './controles';")).toEqual([]);
  });

  it('aucun code ne réécrit ni n’efface une version ou un acte, par Prisma ou en SQL brut', () => {
    expect(occurrences(REECRIRE)).toEqual([]);
    expect(occurrences(SQL_BRUT)).toEqual([]);
  });

  it('aucune écriture imbriquée ne crée un acte avec sa version, ni une version avec son acte', () => {
    expect(imbriquees()).toEqual([]);
    expect(IMBRIQUEE.test('data: { actes: { create: { acte: "validee" } } }')).toBe(true);
    expect(IMBRIQUEE.test('data: { version: { connectOrCreate: {} } }')).toBe(true);
    expect(IMBRIQUEE.test('actes: { orderBy: { ordre: "desc" }, take: 1 }')).toBe(false);
  });

  it('le motif SQL reconnaît bien les formes qu’il doit refuser', () => {
    expect(SQL_BRUT.test('INSERT INTO public.fiches_assiette_versions')).toBe(true);
    expect(SQL_BRUT.test('update "fiches_assiette_actes" set')).toBe(true);
    expect(SQL_BRUT.test('pg_advisory_xact_lock(hashtext(fiches_assiette_versions:WN-SRC-0300))')).toBe(false);
  });
});
