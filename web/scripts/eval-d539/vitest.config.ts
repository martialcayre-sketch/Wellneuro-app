import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Configuration PROPRE à l'évaluation de [[D-539]] §8 : elle seule inclut
// `*.eval.ts`. La configuration de `web/` (CI, T1 à T3) ne la voit jamais —
// ce banc appelle vraiment le fournisseur. Lancement : `lancer.sh`.
const web = path.resolve(__dirname, '../..');

export default defineConfig({
  root: web,
  resolve: { alias: { '@': path.resolve(web, 'src') } },
  test: {
    environment: 'node',
    include: ['scripts/eval-d539/**/*.eval.ts'],
    testTimeout: 4 * 60 * 60 * 1000,
  },
});
