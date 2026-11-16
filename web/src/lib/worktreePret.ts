import { existsSync } from 'node:fs';
import path from 'node:path';

// CE QU'UN WORKTREE NEUF N'A PAS ENCORE (lot `autonomie-pieges-restes`,
// partie 4). `git worktree add` laisse `web/node_modules` vide et le client
// Prisma non généré. Vitest remontait alors en silence au `node_modules` de la
// copie principale, en retard de centaines de commits : des tests ciblés
// passaient sur des dépendances qui n'étaient pas celles de la branche
// (constaté le 2026-11-05, lot #1873). `vitest.config.ts` s'arrête net, avec
// le remède, tant qu'un préalable manque.

/** Fichier témoin (relatif à `web/`) → commande qui le produit. */
export const PREALABLES_WORKTREE: ReadonlyArray<readonly [string, string]> = [
  ['node_modules/vitest/package.json', 'npm ci'],
  ['src/generated/prisma/index.js', 'npx prisma generate'],
];

/** Les préalables absents de `web`, chacun suivi de son remède. */
export function prealablesManquants(web: string): string[] {
  return PREALABLES_WORKTREE.filter(([fichier]) => !existsSync(path.join(web, fichier))).map(
    ([fichier, remede]) => `${fichier} (${remede})`,
  );
}
