# Journal de session — Wellneuro NNPP2

> **Archivage** : les entrées du 2026-07-04 au 2026-07-10 ont été compactées dans `docs/archive/sessions/SESSION_LOG_2026-07-04_to_2026-07-10_compact.md`. Le journal actif ne conserve que les entrées récentes utiles à la reprise.

## 2026-07-11 — Clôture R8 (suite) : commit

**Décisions prises** : R8 (suite) livré et committé (`fec6def`) — 32 tests Vitest et parcours Playwright du portail patient exécuté réellement en Chromium contre la DB de dev. Étape Vitest ajoutée à la CI. Des changements non liés existaient dans l'arbre (`wn-campaign`, `SKILL.md`, dossier vide) et ont été exclus du commit.

**Options écartées** : committer aussi les fichiers wn-campaign (hors périmètre).

**Risques résiduels** : iPhone 13/WebKit non exécuté réellement ; Playwright hors CI ; changements wn-campaign encore non committés dans l'arbre de travail.

**Prochaine action prioritaire** : reprendre R10/R8-Vitest sur `resolvePackQuestionnaireIds` ou Playwright-en-CI selon priorité.

**Questions ouvertes** : aucune.

## 2026-07-11 — Campagne WN-Doc-Assainissement (clôture)

**Décisions prises** : campagne entièrement complétée et pushée vers `origin/main`. Roadmaps séparées en technique / produit, 4 plus anciennes entrées de session archivées, templates déplacés, et la doc de référence a été réalignée.

**Validations exécutées** : `bash scripts/check_no_secrets.sh`, `cd web && npm run type-check`, `git push`, `git status` clean.

**Prochaine action prioritaire** : aucune — campagne terminée.

**Questions ouvertes** : aucune.

## 2026-07-11 — R8.1 : Tests Vitest sur `resolveQidsLogic`

**Décisions prises** : fonction pure `resolveQidsLogic(registryQids, legacyQids)` extraite et testée avec 8 cas Vitest. `resolvePackQuestionnaireIds()` l'utilise désormais.

**Validations exécutées** : 8 nouveaux tests Vitest, 32 existants verts, TypeScript sans erreur.

**Prochaine action prioritaire** : R8.2 (Playwright-en-CI) ou R8.3 (consolidation `.check.ts`).

**Questions ouvertes** : aucune.

## 2026-07-11 — R8.3 : Consolidation `.check.ts` → Vitest

**Décisions prises** : les 4 fichiers `.check.ts` ont été remplacés par 21 tests Vitest couvrant `Mon équilibre`. `npm run test` passe à 61 tests.

**Validations exécutées** : 21 nouveaux tests Vitest, 61 tests au total, TypeScript sans erreur.

**Prochaine action prioritaire** : R8.2 (Playwright-en-CI) ou R10 selon priorité.

**Questions ouvertes** : aucune.

## 2026-07-11 — R8.2 : Playwright-en-CI

**Décisions prises** : PostgreSQL de CI provisionné, seed exécuté, Playwright branché sur `dashboard-praticien.spec.ts` et le parcours patient. CI GitHub Actions mise à jour.

**Validations exécutées** : type-check, secrets, migration/seed, E2E local prêt pour CI.

**Prochaine action prioritaire** : observer le premier run réel du workflow CI.

**Questions ouvertes** : aucune.

## 2026-07-11 — Intégration de la refonte UX dans WN3.0

**Décisions prises** : campagne `C0-UX` créée pour raccrocher la refonte UX au programme WN3.0, sans renumérotation, sur le périmètre shell praticien uniquement.

**Validations exécutées** : JSON valide, contrôle secrets OK, type-check sans régression.

**Prochaine action prioritaire** : LOT-00 de C0-UX, après validation de C0.

**Questions ouvertes** : état du rail mémorisé, recherche globale, dashboard personnalisable, navigation mobile praticien.

## [2026-07-11] — Campagne C0 : LOT-00/LOT-01/LOT-02

**Décisions prises** : audit lecture seule confirmé par 3 agents Explore. Aucune dette Sheets/OAuth active. Une seule correction factuelle a été nécessaire : la ligne R8 de la roadmap était obsolète et a été mise à jour.

**Fichiers modifiés** : `docs/ROADMAP_TECHNIQUE.md`, `docs/roadmap.md`, et les lots de la campagne documentaire correspondante.

**Prochaine action prioritaire** : LOT-03 (validation et handoff).

**Questions ouvertes** : dette de pagination / compatibilité cockpit non auditée dans ce passage.

## [2026-07-11] — Campagne C0 : LOT-03 (validation et handoff, clôture)

**Décisions prises** : campagne C0 clôturée — **GO**, aucune divergence documentaire bloquante restante. Point #7 (suppression de `PROJET_CONTEXTE_MINIMAL.md`/`README_MINIMAL.md`) confirmé intentionnel par l'utilisateur en session, marqué « Confirmé » dans la matrice LOT-00. Clarification découverte : le handoff pointe vers **C0-UX** (`2026-07-11-refonte-ux-shell-3-0`), pas directement vers C1 — `PROGRAMME_WELLNEURO_3_0.md` montre l'ordre réel C0 → C0-UX → C1, C1 dépendant de « C0 + C0-UX ». `ACTIVE_CAMPAIGN.md` mis à jour pour pointer vers C0-UX (LOT-00, non démarré, à lancer sur instruction explicite).

**Validations exécutées** : `bash scripts/check_no_secrets.sh` OK, `cd web && npm run type-check` OK. `scoring-check`/smoke test/mobile non applicables (lot 100 % documentaire).

**Fichiers modifiés** : `lots/LOT-00-audit-sources-verite.md`, `lots/LOT-03-validation-handoff.md`, `CAMPAGNE.md` (C0), `docs/claude/campagnes/ACTIVE_CAMPAIGN.md`.

**Options écartées** : pointer directement `ACTIVE_CAMPAIGN.md` vers C1 (rejeté — dépendance C0-UX non satisfaite) ; démarrer un lot de C0-UX dans ce même passage (hors périmètre de LOT-03, décision laissée à l'utilisateur).

**Dette non bloquante** : pagination/cockpit non auditée, reportée à une campagne technique future si besoin.

**Prochaine action prioritaire** : LOT-00 de C0-UX (cadrage et arbitrage des questions ouvertes, zéro code), sur instruction explicite.

**Questions ouvertes** : celles de `CAMPAGNE.md` de C0-UX (rail mémorisé, périmètre recherche globale, dashboard personnalisable, 4 entrées navigation mobile).

## [2026-07-11] — Campagne C0-UX : LOT-01 (audit et réconciliation des tokens sémantiques)

**Décisions prises** : tableau de correspondance complet entre les 15 tokens proposés en §11.1 du document source et les tokens D1 existants (`docs/design-system-d1.md` §6). 7 déjà couverts (pas d'ajout), 5 ajoutés en additif (`surface-elevated`, `status-success/warning/danger/info`, `focus-ring`), 2 volontairement non ajoutés et justifiés (`surface-patient` redondant avec l'architecture par thème, `text-secondary` sans consommateur identifié). Aucun token D1 existant renommé ou modifié ; garde-fou `--primary`/`--accent` (`SynthesePanel.tsx`) vérifié intact.

**Validations exécutées** : `npm run type-check` OK, `check_no_secrets.sh` OK. Commit `401ae4a` (inclut aussi le reste de l'assainissement documentaire WN-Doc en attente).

**Fichiers modifiés** : `web/src/app/globals.css`, `web/tailwind.config.ts`, `docs/design-system-d1.md`, lots/CAMPAGNE.md de C0-UX.

**Écart signalé** : `docs/claude/PROJET_CONTEXTE_MINIMAL.md`/`README_MINIMAL.md` restent non suivis sur disque (suppression déjà indexée par ailleurs) — volontairement non ré-ajoutés au commit, à nettoyer si confirmé inutile.

**Prochaine action prioritaire** : LOT-02 (shell desktop/tablette), sur instruction explicite.

**Questions ouvertes** : aucune nouvelle.

## [2026-07-11] — CI GitHub Actions verte (R8.2) + synchronisation statut C0-UX

**Décisions prises** : les 5 causes indépendantes de l'échec systématique de la CI Playwright (« 6 failed, 2 passed » en boucle depuis l'activation R8.2) diagnostiquées et corrigées une à une, chacune vérifiée sur un run CI réel avant de passer à la suivante : (1) WebKit non installé (`ci.yml`), (2) assertion de titre dashboard obsolète, (3) violation strict-mode Playwright révélée par (2), (4) `prisma db seed` silencieusement no-op en Prisma 7 faute de `migrations.seed` dans `prisma.config.ts` (404 `patient_not_found`), (5) pack par défaut « Base de consultation » jamais créé par du code (seulement via l'UI praticien sur la base de dev) — absent d'une base CI fraîche, d'où un 404 `pack_not_found` pris pour un timeout de 120s par le test. Run `29163220360` : **succès, 4m34s**. Par ailleurs, via `/wn-review` : désynchronisation `CAMPAIGN_META.json`/`CAMPAGNE.md` de C0-UX corrigée (`statut: "en_cours"` dans le frontmatter, seule source lue par `wn-campaign.mjs`).

**Validations exécutées** : `gh run view --log-failed` à chaque itération, `npm run type-check`, `bash scripts/check_no_secrets.sh`, `npm run prisma:seed` en local (garde anti-doublon vérifiée sur la base de dev existante), `node scripts/wn-campaign.mjs status`.

**Fichiers modifiés** : `.github/workflows/ci.yml`, `web/e2e/dashboard-praticien.spec.ts`, `web/prisma.config.ts`, `web/prisma/seed.ts`, `docs/claude/campagnes/2026-07-11-refonte-ux-shell-3-0/CAMPAGNE.md`.

**Options écartées** : corriger le comptage `0/6 lots` de `wn-campaign.mjs` pour C0-UX (désync distincte détectée par `/wn-review`, hors périmètre de cette demande) ; nettoyer `PROJET_CONTEXTE_MINIMAL.md`/`README_MINIMAL.md`/`​.worktrees/` (résidus déjà signalés en 07-11, décision laissée à l'utilisateur).

**Prochaine action prioritaire** : LOT-02 de C0-UX (shell desktop/tablette), sur instruction explicite ; committer les redirections `wn-r0`…`wn-r6` + `CAMPAGNE.md` C0-UX en attente.

**Questions ouvertes** : comptage de lots `wn-campaign.mjs` (0/6 vs 2/5 réels) à corriger si jugé utile ; sort des résidus non suivis (`PROJET_CONTEXTE_MINIMAL.md`, `README_MINIMAL.md`, `.worktrees/`).

## [2026-07-11] — Campagne C0-UX : LOT-02 (shell desktop/tablette), clôturé

**Décisions prises** : `NavBar` reconstruit depuis le wireframe LOT-00 (rail compact ⇄ étendu mémorisé en `localStorage`, panneau overlay tablette portrait/mobile, nouveau `SidebarRail.tsx` partagé). Une fusion concurrente d'une autre session (confirmée intentionnelle) a temporairement réintroduit une ébauche non conforme et cassé le type-check ; réconciliée en réappliquant la version approuvée. Deux bugs réels corrigés au passage : test Playwright dont l'assertion `.first()` ignorait la visibilité réelle (filtrage `:visible`), et abréviations "Patients"/"Paramètres" identiques ("PA") en rail compact.

**Validations exécutées** : type-check, lint, `check_no_secrets.sh`, CI GitHub Actions verte (3 runs consécutifs), captures desktop/tablette/mobile, parcours clavier complet.

**Options écartées** : reprendre du contenu de l'ébauche concurrente (hero header, badges, nav mobile prématurée) — hors périmètre LOT-00/LOT-02.

**Prochaine action prioritaire** : LOT-03 (navigation mobile), sur instruction explicite.

**Questions ouvertes** : aucune nouvelle.
