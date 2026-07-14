import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import path from 'node:path';

// Charge DATABASE_URL (et le reste) depuis web/.env.local si disponible (local),
// sinon depuis les variables d'environnement du système (CI). Ceci permet à
// helpers/db.ts (Prisma direct, hors process Next.js) et helpers/auth.ts
// (NEXTAUTH_SECRET) de voir les mêmes valeurs que le serveur testé, que ce soit
// en dev local (avec .env.local) ou en CI (avec variables d'environnement).
const envCandidates = [
  path.join(__dirname, '.env.local'),
  path.join(__dirname, '..', '.env.local'),
];

for (const envPath of envCandidates) {
  // Ne pas écraser les variables déjà présentes dans l'environnement shell.
  loadEnv({ path: envPath, override: false });
}

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error(
    [
      'NEXTAUTH_SECRET manquant pour les tests Playwright.',
      'Ajoutez NEXTAUTH_SECRET dans web/.env.local ou exportez-le dans le shell avant npm run test:e2e.',
    ].join(' ')
  );
}

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  // Un seul worker : le spec manipule directement l'état DB du patient fictif
  // (Michel Dogne, PAT_SEED_03) — des runs concurrents sur le même patient
  // se marcheraient dessus (reset/token/assignations partagés).
  workers: 1,
  reporter: 'list',
  // Marges plus larges que les défauts (30s/5s) : le scénario enchaîne ~15
  // appels serveur contre la DB de dev (pooler Supabase distant en local, ou
  // service Postgres en CI), qui ajoute une latence notable.
  timeout: 120_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'Desktop Chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'iPhone 13', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
