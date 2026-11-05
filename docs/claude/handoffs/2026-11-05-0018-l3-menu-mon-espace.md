# Handoff — 2026-11-05 — L3 : menu patient « Mon espace » (D-442)

## Branche et état Git
- Branche `feat/l3-menu-patient`, partie d'`origin/main@7f0ef511`, worktree `.claude/worktrees/l3-menu-patient`. Une PR de code, squash.
- `origin/main` a avancé de deux commits depuis (#1862, #1869) ; seul `docs/FEATURE_FLAGS.md` est commun, sur une autre ligne (orientation), sans conflit attendu.
- Merge par la session, cycle wn-merge complet (autorisation de la série « rails et menus » depuis le 2026-11-03).

## Objectif
Livrer L3 de l'audit « rails et menus » sous [[D-442]], acceptée mot pour mot le 2026-11-04 : bouton « Menu » dans l'en-tête du portail, tiroir « Mon espace », mot-symbole en lien d'accueil, lien d'évitement « Aller au contenu », derrière `WN_PORTAIL_MENU` éteint.

## Décisions prises
- Q40 à Q43 (chapitre 18 de l'audit), recommandations retenues : « Menu » / « Mon espace » ; toutes les pages de session, hub et saisie compris ; majeurs seuls ([[D-283]] §5) ; lien d'évitement dans L3.
- D-442 entrée au registre à son rang ; A6-R1 précisé côté patient ; `.claude/rules/frontend-ui.md` admet le menu comme seule navigation servie par `PanneauSuperpose`.
- Sondes : les dix `Lien*` sont montées une fois par `FournisseurMenuPortail` et partagées par contexte avec « Autres espaces » sur les pages de session. Sur le hub elles se montent tout de suite (le hub en a besoin, quel que soit l'âge) ; ailleurs, seulement menu actif. Hors fournisseur (drapeau éteint), « Autres espaces » monte ses propres sondes comme avant.
- Le menu lit `trust/etat` et `assignations` (D-442 §1) ; la lecture est rejouée à chaque page tant que les murs ne sont pas franchis, puis une fois par jeton.

## Fichiers modifiés
- Neufs : `web/src/components/patient/menu/{MenuMonEspace.tsx, activationMenu.ts, menuDrapeau.ts, textesMenu.ts}` et leurs bancs ; `web/src/components/patient/autres-espaces/SondesAutresEspaces.tsx` ; `web/e2e/portail-menu.spec.ts`.
- Modifiés : `web/src/app/portail/layout.tsx` (+ banc), `NavAutresEspaces.tsx`, `web/playwright.config.ts` (drapeau armé).
- Docs : `docs/DECISIONS.md` (D-442), brouillon D-442 et chapitres 11 et 18 de l'audit, `REGISTRE_FRONTIERES.md`, `.claude/rules/frontend-ui.md`, `docs/FEATURE_FLAGS.md`, `PLAN_WELLNEURO.md` (file C), fragment `changelog.d/2026-11-05-l3-menu-mon-espace.md`.
- Non touchés : `[token]/page.tsx`, `/api/portail/session`, routes, sondes, migrations.

## Validations exécutées
- T1 vert ; T2 `npm run test:worktree -- --fast` vert en 8 min 7 s (331 E2E passés, Chromium et WebKit).
- Mutations : la fermeture au changement de page survivait à un premier banc, réécrit avec un témoin de même chemin.
- Constat à l'écran (chapitre 11, « Constat à l'écran de L3 ») : majeure, mineure, majeur clos, mur « Avant de commencer », 390 px, 1 024 px, confort 112,5 %. L'en-tête garde 133 px à 390 px avec le bouton.

## Problèmes ouverts
- Impression vérifiée par émulation seulement, pas sur papier.
- Mineur clos non constaté à l'écran (épinglé au banc).

## Prochaine action exacte
Après le merge : le drapeau reste éteint. Sa pose prend une place de la file C au-delà de la place 11, après le constat de l'activation précédente (porte 18), par le responsable ; constat attendu sur dossier majeur, mineur et clos, à 390 px et en confort 112,5 %, une page imprimée. Suites de l'audit : L4 facultatif (sur arbitrage de ses entrées, Q25), L5 non engagé.

## Interdits encore actifs
- Jamais le main local ; ni pull, ni merge, ni rebase, ni `git stash`.
- Aucun chiffre sur une surface patient ([[D-333]]). Patients fictifs : Sophie Nicola, Jennifer Martin, Michel Dogné.
- Ni `[token]/page.tsx` ni `/api/portail/session` ; aucune migration.
- Le merge n'est jamais forcé.
