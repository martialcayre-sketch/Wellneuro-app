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

## [2026-07-11] — Campagne C0-UX : LOT-03 (navigation mobile), clôturé

**Décisions prises** : `MobileBottomNav.tsx` créé (barre basse 4 entrées Accueil/Patients/Synthèses/Plus + bottom sheet Paramètres, sans props). Coupure à trois breakpoints introduite dans `NavBar.tsx` (rail `≥1024px` inchangé, panneau ☰ resserré à `768–1024px`, nav basse `<768px` nouvelle) — le code n'avait qu'une coupure à deux niveaux sur `lg` auparavant. Sheet accessible (Escape, focus géré) volontairement non rétrofitée sur le panneau ☰ existant (hors périmètre).

**Validations exécutées** : `type-check`, `check_no_secrets.sh`, capture manuelle 375/900/1100px (aucune régression LOT-02), 3 patients de démo confirmés sur mobile, nouveau test Playwright (4/4 sur `Desktop Chromium`). `/wn-review` : GO, aucun bloquant (dette non bloquante déjà documentée dans le lot : pas de focus trap, duplication `isActive`).

**Options écartées** : rétrofit clavier/focus sur le panneau ☰ tablette (LOT-02) — hors périmètre, risque de régression.

**Prochaine action prioritaire** : LOT-04 (validation et handoff vers C1), sur instruction explicite.

**Questions ouvertes** : aucune nouvelle. iPhone 13/WebKit non exécutable en local (limitation d'environnement préexistante, OK en CI).

## [2026-07-11] — Campagne C0-UX : LOT-04 (validation et handoff), clôturé — campagne terminée

**Décisions prises** : les 11 critères d'acceptation §17 de `sources/UX_WELLNEURO_3_0.md` vérifiés contre l'implémentation réelle (`NavBar.tsx`, `MobileBottomNav.tsx`, `SidebarRail.tsx`) — 10 conformes, 1 partiel (mobile réel non testable dans cet environnement, émulation Playwright utilisée en substitut, non bloquant). Verdict **GO** rédigé dans `CAMPAGNE.md` : C1 peut démarrer son travail de fiche patient cockpit dans le nouveau shell. `docs/design-system-d1.md` vérifié exact (déjà à jour depuis LOT-03, aucune correction nécessaire). Entrée ajoutée à `docs/checklist_tests_end_to_end.md`. Campagne C0-UX marquée `terminé` (frontmatter `CAMPAGNE.md`).

**Validations exécutées** : `type-check`, `check_no_secrets.sh`, captures Playwright à 375/768/1024/1440px sur `/dashboard` (aucun défilement horizontal), suite e2e complète repassée (4/4, dont le test dédié « mobile bottom navigation »).

**Options écartées** : retraiter la dette non bloquante déjà actée en LOT-03 (absence de *focus trap* complet dans la sheet mobile « Plus ») — hors périmètre LOT-04. Modifier `PROGRAMME_WELLNEURO_3_0.md` — vérifié, le tableau des campagnes n'encode pas de statut littéral à corriger.

**Prochaine action prioritaire** : C1 (Décision clinique 21 jours V1) peut démarrer, sur instruction explicite — sa dépendance « C0 + C0-UX » est désormais satisfaite.

**Questions ouvertes** : validation tactile sur mobile réel toujours en attente (même limitation d'environnement que R1/LOT-03) ; à faire dès qu'un device physique est disponible, non bloquant.

## [2026-07-12] — Intégration livraison « ux campagne » (réalignement programme 3.0)

**Décisions prises** : livraison externe (registre de frontières) intégrée en 3 PR, discipline imposée par la livraison. PR #31 amendée : HC-F remplacée (tout clair, questionnaires → QX nouvelle), LOT-03 **supprimé** (contenu non fourni), LOT-05/06 supprimés, vocabulaire corrigé. PR #32 : `REGISTRE_FRONTIERES.md` (nouveau) + réalignement PROGRAMME/ACTIVE_CAMPAIGN/README + 4 amendements. PR #33 : C1 compilée, C2-C5 cadrées (N+1). Push forcé de #31 fait par l'utilisateur (hook sécurité).

**Validations exécutées** : `check_no_secrets.sh` par PR, grep vocabulaire interdit, `git diff --stat` limité à `docs/`, SHA distant = local après push.

**Options écartées** : réécrire `LOT-03` HC-F au lieu de le supprimer — contenu non spécifié par la livraison.

**Prochaine action prioritaire** : merger #31, #32 puis #33 dans cet ordre, puis activer HC-F LOT-00 sur instruction explicite.

**Questions ouvertes** : `lots/LOT-07…` (HC-F) désaligné avec la nouvelle table à 6 lots, laissé en l'état, à trancher.

## [2026-07-12] — Campagne HC-F : recalage des lots, LOT-00 et LOT-01 clôturés (PR #34, #35)

**Décisions prises** : lots HC-F recalés sur l'amendement de `CAMPAGNE.md` (LOT-07→LOT-05, retrait Jour/Nuit et questionnaires de LOT-00/01/02). LOT-00 exécuté (audit réel, arbitrages validés par l'utilisateur, `LOT-03` rédigé). Correctif sécurité séparé : `api/patient/reponses` n'exposait pas de score patient filtré, corrigé. LOT-01 exécuté : thème praticien basculé au clair, navigation restée sombre via nouveau namespace `--rail-*`. Revue indépendante (PR #35) : 2 constats corrigés (badge rail invisible sur son fond, note documentaire `SynthesePanel.tsx` inexacte).

**Validations exécutées** : `type-check`, `lint`, `check_no_secrets.sh`, e2e (`dashboard-praticien`, `portail-parcours`) verts ; vérifications visuelles manuelles ; CI GitHub Actions verte avant chaque merge (PR #34, #35).

**Options écartées** : aucune hors périmètre déjà documenté.

**Prochaine action prioritaire** : LOT-02 (shell premium, icônes Lucide) — autorisé explicitement par l'utilisateur.

**Questions ouvertes** : captures de référence LOT-00 non produites (outil indisponible) ; `.gitignore` local non commité, hors périmètre de cette session.

## [2026-07-13] — Campagne HC-F : LOT-02 clôturé (PR #37)

**Décisions prises** : icônes texte/emoji du shell (`AC`/`PT`/`SY`/`PM`, ☰, 🔔, ▾, ‹›, ✕, •••) remplacées par Lucide React ; recherche, cloche et carte « Patients de démonstration » retirées (affordances non fonctionnelles/interdites). Tiroir tablette et sheet mobile migrés vers `@radix-ui/react-dialog` (focus trap réel, corrige une lacune du tiroir qui n'avait ni Escape ni focus trap). Bug découvert en implémentant : `Dialog.Portal` rend hors de `[data-theme="praticien"]`, les tokens `--rail-*` ne résolvaient à rien (fond transparent) — corrigé en posant `data-theme="praticien"` sur `Dialog.Overlay`/`Dialog.Content`, documenté dans `design-system-d1.md`. Revue indépendante (PR #37) : test manquant sur le tiroir tablette (jamais exercé à viewport tablette) et imprécision doc (`--foreground` déjà sur `:root`) — corrigés.

**Validations exécutées** : `type-check`, `lint`, `check_no_secrets.sh`, e2e (`dashboard-praticien` 5/5 dont le nouveau test tiroir, `portail-parcours`) verts ; vérifications visuelles manuelles ; CI verte avant merge.

**Options écartées** : palette de commandes — confirmée différée (arbitrage LOT-00), non révisée.

**Prochaine action prioritaire** : LOT-03 (surfaces génériques + mécanismes transverses), à autoriser explicitement.

**Questions ouvertes** : cas limite non testé — redimensionnement tablette→desktop tiroir ouvert (le contenu du dialog reste focusable bien que masqué par CSS) ; jugé non bloquant par la revue.

## [2026-07-13] — Campagne HC-F : LOT-03 clôturé (PR #40)

**Décisions prises** : 3 mécanismes livrés (`ModeConsultation`, `TwoLevelReading`, `PrévisualisationPatient`), refactor complet de `PatientsPanel.tsx` vers des composants `Input`/`Select`/`Button` partagés, restylage `/dashboard` et `/dashboard/parametres`. `PrévisualisationPatient` réutilise `ConsultationScreen.tsx` (props additifs) via une nouvelle route practicien `api/praticien/apercu-patient/reponses`, miroir patient-safe — contourne le fait que ce composant s'auto-fetch via un cookie de session portail inutilisable depuis le dashboard.

**Options écartées** : aucune hors périmètre déjà documenté.

**Validations** : type-check/lint/check_no_secrets/Vitest verts ; Playwright 13/13 (Desktop Chromium, WebKit non exécutable localement). CI verte, revue indépendante go (3 constats non bloquants corrigés).

**Prochaine action prioritaire** : LOT-04 (portail patient clair), à autoriser explicitement.

**Questions ouvertes** : aucune nouvelle.

## [2026-07-13] — Campagne HC-F : LOT-04 clôturé (revue appliquée, GO)

**Décisions prises** : LOT-04 implémenté (primitives partagées, pagination fiche/anamnèse, autosave wizard, hub orienté action, dialogs accessibles, confort de lecture). Revue indépendante : 4 constats non bloquants corrigés — TTL 30 jours sur le brouillon wizard (RGPD), test unitaire `portail-visite.test.ts` ajouté, garde-fou d'annulation restauré dans le hub, reset `status='loading'` sur Réessayer du dispatcher. Second passage `/wn-review` : verdict **GO**, 2 constats résiduels non bloquants acceptés (brouillon non chiffré, validation de forme JSON manquante).

**Validations exécutées** : type-check, Vitest (14/14 fichiers, 77/77 tests), eslint, check_no_secrets verts ; e2e Playwright non exécutable dans ce sandbox (blocage réseau polices Google, pré-existant, documenté).

**Options écartées** : rejouer l'e2e après les correctifs — aucune information nouvelle attendue, aucun ne touche les polices/`layout.tsx`.

**Prochaine action prioritaire** : revalidation e2e/manuelle humaine (mobile/zoom/clavier/lecteur d'écran/thème/prévisualisation) avant d'autoriser LOT-05.

**Questions ouvertes** : aucune nouvelle.

## [2026-07-13] — Campagne HC-F : LOT-05 livré (PR #43), verdict GO avec dettes

**Décisions prises** : branche `lot-05` détectée recréée par erreur depuis l'ancienne base commune avec `lot-04` (23 fichiers/~900 lignes de LOT-04 absents) — corrigée par rebase sur la pointe réelle de LOT-04 (`9218d07`), force-push après confirmation explicite (hook `block-risky-commands.mjs`). Revalidation e2e de la porte laissée ouverte par LOT-04 menée à son terme (pas seulement tentée) : 4 échecs Desktop Chromium diagnostiqués (`wn-debugger`) comme la même classe de problème d'environnement déjà rencontrée en LOT-03 (synthèse d'événements souris CDP bloquante en headless dans ce sandbox) ; contournement LOT-03 réappliqué (`xvfb-run -a … --headed`, après installation du paquet système `xauth` manquant) → **13/13 Desktop Chromium verts**. WebKit/iPhone 13 reste non exécutable (librairies système manquantes, cause distincte confirmée, limitation pré-existante acceptée). Livrables produits : `LEXIQUE_UX_WELLNEURO.md`, `HANDOFF_FUTURES_IMPLANTATIONS.md`, `MATRICE_MIGRATION_UX.md`, `DETTE_UX_RESIDUELLE.md`, `VALIDATION_FINALE.md` ; `design-system-d1.md` amendé (§4bis mécanismes transverses canonisés, traçabilité LOT-00 à LOT-05) ; `checklist_tests_end_to_end.md` amendé (section Campagne HC-F). Divergence documentaire signalée sans être corrigée globalement : orthographe « Dogne »/« Dogné » incohérente entre la décision HC-F du 2026-07-12 et `CLAUDE.md`/le code de test réel — 1 occurrence interne à la campagne corrigée (`AUDIT_UI_REEL.md`), le reste (16 fichiers hors `archive/`, dont du code de test) laissé en l'état par prudence (risque de casser des seeds DB sans vérification).

**Validations exécutées** : `check_no_secrets.sh`, `type-check`, `lint`, Vitest (14/14, 77/77), e2e Desktop Chromium (13/13) verts. WebKit/iPhone 13 rouge (limitation d'environnement, non applicative). `package-lock.json` auto-patché par `npm`/`playwright` restauré (`git checkout`) avant commit, comme en LOT-04.

**Options écartées** : corriger globalement l'orthographe « Dogné »/« Dogne » dans le code de test et `CLAUDE.md` — hors périmètre LOT-05, risque de régression sur des seeds DB non vérifiées ; installer les ~30 dépendances système manquantes pour WebKit — disproportionné pour un lot documentaire.

**Prochaine action prioritaire** : validation explicite de l'utilisateur pour clôturer la campagne HC-F (dernière case `Done` de LOT-05 et statut `CAMPAGNE.md` volontairement laissés non cochés) ; push du rebase + de ce commit depuis un terminal utilisateur (`WN_ALLOW_RISKY_COMMAND=1 git push --force-with-lease`, hook bloquant depuis l'agent) ; ensuite C1 et QX peuvent démarrer en parallèle (dépendances HC-F satisfaites).

**Questions ouvertes** : arbitrer la divergence « Dogne »/« Dogné » à l'échelle du projet (aligner tout sur une forme unique, y compris `CLAUDE.md` et les seeds de test) ou acter qu'elle reste propre à HC-F.

## [2026-07-14] — Campagne HC-F : LOT-05 finalisé, campagne clôturée

**Décisions prises** : divergence « Dogne »/« Dogné » tranchée par l'utilisateur (aligner tout le projet). Vérification préalable de la donnée réelle (`web/prisma/seed.ts:47`, `nom: 'Dogne'`, sans accent) et confirmation qu'aucune assertion e2e ne compare la chaîne accentuée (seulement commentaires et un libellé `describe`) — correction donc sans risque pour les tests. 17 fichiers projet-wide alignés sur la forme sans accent (`CLAUDE.md`, `AGENTS.md`, `README.md`, `README_AUTOMATISATION_CLAUDE_CODE.md`, `.wn/config.yml`, docs `docs/claude/*`, `tests/patients_fictifs.md`, `web/playwright.config.ts`, `web/e2e/portail-parcours.spec.ts`, `web/e2e/helpers/db.ts`, `web/e2e/README.md`). `docs/claude/SESSION_LOG.md` volontairement non rétro-modifié (journal append-only). Autres dettes de `DETTE_UX_RESIDUELLE.md` passées en revue et laissées en l'état : toutes hors périmètre HC-F explicite (`CAMPAGNE.md` § Hors périmètre — routes API métier, auth, persistance serveur) ou limitations d'environnement non résolvables ici (WebKit). `DETTE_UX_RESIDUELLE.md`, `VALIDATION_FINALE.md`, `CAMPAGNE.md` et `lots/LOT-05-gouvernance-handoff.md` mis à jour pour refléter la résolution. Campagne HC-F marquée `terminée` (frontmatter `CAMPAGNE.md`), dernière case `Done` de LOT-05 cochée sur confirmation explicite de l'utilisateur.

**Validations exécutées** : `check_no_secrets.sh`, `type-check`, `lint`, Vitest (14/14, 77/77), e2e Desktop Chromium (13/13, via `xvfb-run -a … --headed`) — tous verts après le correctif orthographique. `package-lock.json` auto-patché restauré avant commit.

**Options écartées** : corriger les autres dettes de `DETTE_UX_RESIDUELLE.md` (persistance serveur, `email` en query string legacy, focus trap incomplet, WebKit) — toutes explicitement hors périmètre HC-F ou limitations d'environnement, pas des « constats résiduels » actionnables sans étendre le périmètre.

**Prochaine action prioritaire** : C1 et QX peuvent démarrer en parallèle (dépendances HC-F satisfaites, aucune restante).

**Questions ouvertes** : aucune — la seule question ouverte du lot précédent (arbitrage Dogne/Dogné) est résolue.

## [2026-07-13] — Réconciliation WN Ultimate v2 : architecture 3.2 promue

**Décisions prises** : promotion conditionnelle de l'architecture, sans
adoption des paramètres cliniques non sourcés. C1 porte les contrats purs et
les brouillons ; C2 la persistance, l'activation et le longitudinal ; JA est
créée comme campagne autonome ; C5A devient intrinsèque et C5B contextuel.
La priorité moteur reste une proposition distincte de la sélection praticien.
Le registre sanitaire versionne 391 notices sans URL/chemin/identifiant Drive,
toutes avec droits à vérifier, revue non effectuée et aucun hash. Le dossier
portable brut et ses ZIP restent hors Git.

**Orchestration** : `.wn/state.json` devient l'autorité machine, initialisée
sur HC-F LOT-05. `ACTIVE_CAMPAIGN.md` est une vue générée. Les commandes
`activate`, `deactivate` et `sync` sont ajoutées ; aucune campagne non close ou
rangée sous `_prepared` ne devient active implicitement.

**Validations exécutées** : JSON du registre valide, 391 `sourceId` uniques,
aucun champ localisateur ; tests unitaires orchestration 4/4 ; `type-check` ;
certification de 63 questionnaires ; contrôle anti-secrets ; `git diff
--check`.

**Options écartées** : activation globale du corpus ; projection du journal
vers `Q_ALI_01`/`Q_ALI_02` ; propriété du contrat intrinsèque/contextuel par C4
ou C5 ; migration Prisma ; modification du 60/20/20 ou des seuils existants.

**Prochaine action prioritaire** : démarrer C1 et QX en parallèle dans des
worktrees isolés, selon l'ordre défini par `ARCHITECTURE_CLINIQUE_3_2.md`.

**Questions ouvertes / gates** : validation clinique des seuils, marqueurs,
axes, fiabilité et rétention ; corpus G0–G6 ; toute migration C2/G5.

## [2026-07-14] — Incident production : auth NextAuth cassée (hotfix PR #45, test PR #46)

**Décisions prises** : diagnostic — toutes les routes `/api/auth/*` en 500
depuis le 2026-07-13 ~19:40 UTC ; cause racine PR #39 (wrapper observabilité
appelant le handler NextAuth sans le contexte App Router), PR #44 hors de
cause. Hotfix mergé (PR #45) : transmission du contexte
`{ params: { nextauth } }`. Test de régression mergé (PR #46) : mock fidèle du
dispatch next-auth v4 + alias `@/*` ajouté à `vitest.config.ts`. Prod rétablie
à 00:53 UTC, vérifiée stable (session/csrf/providers 200, aucune erreur
runtime résiduelle).

**Options écartées** : rollback Vercel (aurait retiré LOT-04) ; test du vrai
handler next-auth sous Vitest (exige l'AsyncLocalStorage d'un vrai serveur
Next).

**Prochaine action prioritaire** : vérification humaine d'un login Google
complet.

**Questions ouvertes** : aucune ; aucun lot de campagne concerné (hors
périmètre C1/QX).

## [2026-07-14] — Campagne QX : LOT-02 terminé

**Décisions prises** : renderer `micro_batch` activé uniquement pour `Q_NEU_03`, en neuf lots visuels conservant strictement les 25 items, leurs options, le payload et le scoring. Navigation, reprise de brouillon, progression et accessibilité clavier/lecteur d’écran couvertes.

**Validations exécutées** : Vitest ciblé 11/11, type-check, certification scoring des 63 questionnaires, contrôle anti-secrets, contrôle navigateur à 375 px et largeur équivalente au zoom 200 %, revue indépendante GO.

**Options écartées** : autres renderers, mélange nominal, migration et persistance serveur — hors périmètre ou encore bloqués par certification.

**Prochaine action prioritaire** : intégrer LOT-02 vers `campaign/qx-experience-questionnaires/integration`, puis ouvrir LOT-03 dans un worktree dédié.

**Questions ouvertes** : aucune.
