// Hook de résolution : mappe l'alias Next `@/` → `web/src/` pour permettre
// d'importer les modules serveur TypeScript (validation.ts, config.ts) depuis
// un test Node hors du build Next. Usage indirect via register-alias.mjs.
//
// IMPORTS RELATIFS SANS EXTENSION DEPUIS UN `.ts` (lot 5 de [[D-251]]). Le code
// de `web/src` écrit `./appariement`, comme le veut le bundler de Next ; Node,
// lui, n'ajoute aucune extension. Sans ce complément, `contrat.ts` et
// `securite.ts` (fiches d'assiette) échouent en `ERR_MODULE_NOT_FOUND`. Le
// complément n'agit que sur un import relatif, sans extension, venu d'un
// fichier `.ts` — des imports qui échouaient tous jusqu'ici : aucun import qui
// se résolvait déjà ne change de cible.

import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const abs = path.resolve(process.cwd(), 'web/src', specifier.slice(2));
    return nextResolve(pathToFileURL(`${abs}.ts`).href, context);
  }
  const parent = context.parentURL ?? '';
  if (
    (specifier.startsWith('./') || specifier.startsWith('../')) &&
    path.extname(specifier) === '' &&
    parent.startsWith('file:') &&
    parent.endsWith('.ts')
  ) {
    const abs = path.resolve(path.dirname(fileURLToPath(parent)), specifier);
    for (const candidat of [`${abs}.ts`, path.join(abs, 'index.ts')]) {
      if (existsSync(candidat)) return nextResolve(pathToFileURL(candidat).href, context);
    }
  }
  return nextResolve(specifier, context);
}
