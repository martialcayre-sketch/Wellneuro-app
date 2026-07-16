import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import { execSync } from 'node:child_process';
import path from 'node:path';

// Depuis un worktree git (.worktrees/*), `.env.local` n'existe pas (gitignoré,
// présent uniquement dans le checkout principal). `--git-common-dir` pointe
// toujours vers le `.git` du checkout principal, quel que soit le worktree.
const repoRoot = path.resolve(__dirname, '..');
let mainRoot = repoRoot;
try {
  const gitCommonDir = execSync('git rev-parse --path-format=absolute --git-common-dir', {
    cwd: __dirname,
    stdio: ['ignore', 'pipe', 'ignore'],
  })
    .toString()
    .trim();
  mainRoot = path.dirname(gitCommonDir);
} catch {
  // Hors dépôt git (archive, CI exotique) : comportement historique inchangé.
}
const isWorktree = mainRoot !== repoRoot;

// Charge DATABASE_URL (et le reste) depuis web/.env.local si disponible (local),
// sinon depuis les variables d'environnement du système (CI). Ceci permet à
// helpers/db.ts (Prisma direct, hors process Next.js) et helpers/auth.ts
// (NEXTAUTH_SECRET) de voir les mêmes valeurs que le serveur testé, que ce soit
// en dev local (avec .env.local) ou en CI (avec variables d'environnement).
// Dans un worktree, fallback sur le web/.env.local du checkout principal —
// le serveur dev lancé par `webServer` hérite de ce process.env, donc il voit
// aussi ces variables même sans .env.local propre au worktree.
const envCandidates = [
  path.join(__dirname, '.env.local'),
  path.join(repoRoot, '.env.local'),
  ...(isWorktree
    ? [path.join(mainRoot, 'web', '.env.local'), path.join(mainRoot, '.env.local')]
    : []),
];

for (const envPath of envCandidates) {
  // Ne pas écraser les variables déjà présentes dans l'environnement shell.
  loadEnv({ path: envPath, override: false });
}

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error(
    [
      'NEXTAUTH_SECRET manquant pour les tests Playwright.',
      'Ajoutez NEXTAUTH_SECRET dans web/.env.local (checkout principal ou worktree)',
      'ou exportez-le dans le shell avant npm run test:e2e.',
    ].join(' ')
  );
}

// Port dédié par worktree : évite qu'un run e2e lancé depuis un worktree
// réutilise silencieusement le serveur dev du checkout principal sur :3000 —
// et teste donc le code d'une autre branche. L'index dans `git worktree list`
// garantit un port unique par worktree au même instant (un hash du chemin
// produisait des collisions, ex. qx-integration/qx-lot03).
function worktreePort(root: string): number {
  try {
    const worktrees = execSync('git worktree list --porcelain', {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .split('\n')
      .filter((line) => line.startsWith('worktree '))
      .map((line) => path.resolve(line.slice('worktree '.length)));
    const index = worktrees.indexOf(root);
    if (index > 0) return 3100 + index;
  } catch {
    // git indisponible : port de repli fixe ci-dessous.
  }
  return 3100;
}

const port = isWorktree ? worktreePort(repoRoot) : 3000;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;

// PLAYWRIGHT_WEB_SERVER=start : sert le build de production (`next start`,
// exige un `npm run build` préalable) — même artefact que le déploiement
// Vercel, démarrage en quelques secondes, aucune compilation à la demande
// pendant les tests. Défaut : `next dev` (itération locale).
const webServerMode = process.env.PLAYWRIGHT_WEB_SERVER ?? 'dev';
if (webServerMode !== 'dev' && webServerMode !== 'start') {
  throw new Error(
    `PLAYWRIGHT_WEB_SERVER invalide : « ${webServerMode} » (valeurs acceptées : dev, start).`
  );
}

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  // Un seul worker : le spec manipule directement l'état DB du patient fictif
  // (Michel Dogné, PAT_SEED_03) — des runs concurrents sur le même patient
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
    // Aligne le port du serveur sur baseURL (y compris un
    // PLAYWRIGHT_BASE_URL explicite), sinon Next.js retomberait sur :3000.
    command: `npm run ${webServerMode} -- -p ${new URL(baseURL).port || '3000'}`,
    url: baseURL,
    // En mode start, exiger un port libre : réutiliser un serveur déjà lancé
    // risquerait de tester silencieusement un `next dev` (autre build, voire
    // autre branche) à la place du build de production attendu.
    reuseExistingServer: webServerMode === 'dev',
    // 240s : le premier boot dev dans un worktree fraîchement provisionné est
    // lent (patch SWC du lockfile + compilation initiale) et dépasse 120s.
    timeout: 240_000,
  },
});
