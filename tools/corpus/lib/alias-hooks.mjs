// Hook de résolution : mappe l'alias Next `@/` → `web/src/` pour permettre
// d'importer les modules serveur TypeScript (validation.ts, config.ts) depuis
// un test Node hors du build Next. Usage indirect via register-alias.mjs.

import path from 'node:path';
import { pathToFileURL } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const abs = path.resolve(process.cwd(), 'web/src', specifier.slice(2));
    return nextResolve(pathToFileURL(`${abs}.ts`).href, context);
  }
  return nextResolve(specifier, context);
}
