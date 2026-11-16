import path from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { prealablesManquants } from './src/lib/worktreePret';

// Worktree neuf : sans ses propres dépendances, Vitest remonte au `node_modules`
// de la copie principale et rend un vert trompeur (src/lib/worktreePret.ts).
const manquants = prealablesManquants(__dirname);
if (manquants.length) {
  throw new Error(
    `web/ n'est pas prêt pour Vitest — manquant : ${manquants.join(', ')}. ` +
      'Worktree neuf : cd web && npm ci && npx prisma generate.',
  );
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Miroir de l'alias "@/*" de tsconfig.json, requis par les tests qui
    // importent des modules applicatifs (ex. routes API).
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'prisma/**/*.test.ts'],
  },
});
