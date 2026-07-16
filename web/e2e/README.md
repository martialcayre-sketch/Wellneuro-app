# Tests Playwright — parcours portail patient

Formalise en tests committés le parcours Phase 0 de
`docs/checklist_tests_end_to_end.md` (déjà validé manuellement le 2026-07-10,
jamais committé jusqu'ici). Tourne uniquement sur le patient fictif **Michel
Dogne** (`PAT_SEED_03`) — jamais de donnée patient réelle.

## Prérequis locaux

1. Une base Postgres de dev accessible via `DATABASE_URL` (celle de
   `web/.env.local`, la même que pour `npm run dev`).
2. Les trois patients fictifs seedés : `cd web && npm run prisma:seed`
   (idempotent, peut être relancé sans risque).
3. `NEXTAUTH_SECRET` défini dans l'environnement (même valeur que le serveur
   testé) — nécessaire pour fabriquer le cookie de session praticien utilisé
   à l'étape "Déblocage côté praticien" (voir `helpers/auth.ts`).
4. Navigateurs Playwright installés une fois : `npx playwright install chromium`.

## Lancer les tests

```bash
cd web
npm run test:e2e
```

Alternative depuis la racine du dépôt:

```bash
npm --prefix web run test:e2e
```

Le serveur `npm run dev` est démarré automatiquement par
`playwright.config.ts` si aucun serveur n'écoute déjà sur
`PLAYWRIGHT_BASE_URL` (défaut `http://localhost:3000`).

Le chargement des variables d'environnement est résolu via des chemins absolus:

- priorité à `web/.env.local`;
- fallback optionnel sur `.env.local` à la racine du dépôt;
- les variables déjà exportées dans le shell restent prioritaires.

Les tests échouent immédiatement si `NEXTAUTH_SECRET` est absent.

## Ce que fait le test

Un seul scénario séquentiel (`test.describe.serial`), exécuté sur deux
profils (Desktop Chromium + iPhone 13) :

1. Nettoie l'état "portail" laissé par un run précédent (assignations/
   consultations créées par le test) — direct en base via Prisma
   (`helpers/db.ts`), sans jamais toucher aux 5 réponses historiques du seed.
   Provisionne ensuite une consultation fraîche via la vraie route praticien
   (`POST /api/praticien/consultations`, avec le cookie de session NextAuth
   fabriqué pour le test) — c'est cette route qui émet le token d'accès, comme
   en conditions réelles (un patient sans consultation n'a rien à voir sur le
   portail).
2. Gate email → consentement → fiche signalétique → anamnèse → attribution
   automatique du pack "Base de consultation".
3. Ouvre le premier questionnaire assigné, sauvegarde un brouillon local puis
   le réinitialise, répond génériquement à toutes les sections (sans
   dépendre du contenu exact d'un questionnaire précis du catalogue) et
   transmet.
4. Vérifie côté serveur qu'une tentative de re-soumission renvoie bien 409
   (`already_done`).
5. Vérifie la vue verrouillée en lecture seule, et demande une correction.
6. Fabrique un cookie de session NextAuth praticien (sans automatiser le login
   Google OAuth réel — fragile et hors périmètre du parcours patient), débloque
   la demande de correction côté praticien, puis reboucle : le patient corrige
   et retransmet.

## Points connus

- Le test vérifie explicitement que `GET /api/patient/reponses` n'expose plus
  l'email en query string — `docs/checklist_tests_end_to_end.md` documentait
  encore ce point comme résiduel (run manuel du 2026-07-10), mais c'est déjà
  corrigé par le lot R9 (email retiré de `ConsultationScreen`, session cookie
  uniquement). La doc de checklist reste à mettre à jour séparément.
- La validation tactile sur téléphone réel (au-delà de l'émulation iPhone 13)
  reste hors périmètre de l'automatisation.

## Exécution depuis un worktree git

Avec `npm run test:e2e` seul, tous les worktrees (`.worktrees/*`) partagent la
même `DATABASE_URL` et le même patient fictif Michel Dogné (`PAT_SEED_03`),
dont l'état est réinitialisé par `resetPortailState` au début de chaque run —
**un seul run e2e à la fois**, toutes copies du dépôt confondues.

Pour valider plusieurs worktrees en parallèle sans contamination :
`npm run test:worktree` (`scripts/wn-test-worktree.sh`) reproduit toute la
séquence du job CI `verify` avec un PostgreSQL éphémère propre au worktree
(ports dérivés du chemin, base recréée puis détruite à chaque run, seed
fictif). Usage détaillé, options et overrides : en-tête de
`scripts/wn-test-worktree.sh`.

## Serveur testé : `next dev` ou build de production

Par défaut, Playwright lance `next dev` (itération locale, réutilise un
serveur déjà démarré). Avec `PLAYWRIGHT_WEB_SERVER=start`, il lance
`next start` sur le build produit par `npm run build` : c'est le même artefact
que le déploiement Vercel (bundles React prod, prerender identique) et les
tests sont plus rapides — aucune compilation à la demande pendant le parcours.
En mode `start`, le port doit être libre (pas de réutilisation silencieuse
d'un `next dev` d'une autre branche). La CI et `npm run test:worktree`
(séquence complète) utilisent ce mode ; `--fast` reste sur `next dev` car il
ne construit pas de build.

## CI

Ce spec tourne en CI (job `verify` de `.github/workflows/ci.yml`) : service
PostgreSQL éphémère, migrations Prisma, contrôle de dérive
schéma↔migrations, seed fictif, puis Playwright contre le build de
production (`PLAYWRIGHT_WEB_SERVER=start`) sur les deux projets
(Chromium + WebKit). Les déclencheurs couvrent `main` et les branches
`campaign/**/integration`. Pour reproduire localement la même séquence :
`npm run test:worktree` (voir ci-dessus).
