import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';

// Charge DATABASE_URL (et le reste) depuis web/.env.local, comme le fait déjà
// `next dev` — nécessaire ici pour que helpers/db.ts (Prisma direct, hors
// process Next.js) et helpers/auth.ts (NEXTAUTH_SECRET) voient les mêmes
// valeurs que le serveur de dev démarré ci-dessous.
loadEnv({ path: '.env.local' });

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  // Un seul worker : le spec manipule directement l'état DB du patient fictif
  // (Michel Dogné, PAT_SEED_03) — des runs concurrents sur le même patient
  // se marcheraient dessus (reset/token/assignations partagés).
  workers: 1,
  reporter: 'list',
  // Marges plus larges que les défauts (30s/5s) : le scénario enchaîne ~15
  // appels serveur contre la DB de dev (pooler Supabase distant), qui ajoute
  // une latence notable par rapport à une base locale.
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
