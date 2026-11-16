# Handoff — 2026-11-16 — Refonte Lien / Empreinte, PAT-7c : zoom au téléphone

## Branche et état du dépôt

- Branche `claude/refonte-lien-pat7c-zoom`, créée depuis `origin/main` (`e6412209`), avancée par `--ff-only` à `a3abf821` (merge de #2170, PAT-7b), puis à `944c49d3`. Worktree `.claude/worktrees/pat4-questionnaires-agendas` (session PAT).
- Code d'interface seul : deux pages, un fragment de changelog, ce handoff. Aucune migration, aucun drapeau.
- La session ne merge pas : c'est l'intégrateur qui merge, sur « prête @<sha> ».

## Objectif

Corriger le seul débordement à 320 px relevé au §3.5 du constat de PAT-7 en partie : U37 (informations) et U38 (conditions), en confort 112,5 %, 28 px.
- Choix du responsable du 2026-11-16 : « 7b et 7c d'abord » (`20261116-0948-d`).
- Le constat proposait pour PAT-7c : « d'abord le seul débordement à 320 px ; ensuite, au choix du responsable, ceux de la convention à 195 px ». Ce lot ne traite que le premier.

## Décisions prises

- Pas de décision neuve, aucun texte neuf.
- La ligne titre + lien de retour passe en `flex-wrap` (écart vertical de 4 px). Le lien garde sa taille ; sa cible (23 px de haut) relève de PAT-7a.
- Les pastilles « Non autorisé » et « Non proposée » de `MesChoix` (61 px à 195 px) restent hors du lot : elles relèvent de la convention à 195 px, non tranchée. Aucun fichier de droits ou de consentement touché.

## Fichiers modifiés

- `web/src/app/portail/[token]/informations/page.tsx`
- `web/src/app/portail/[token]/conditions/page.tsx`
- `changelog.d/2026-11-16-refonte-lien-pat7c-zoom.md`
- Ce handoff.

## Validations exécutées

- **Constat local** : build de production sur `e6412209` + le correctif, fixtures seulement, U37 et U38.
  - Desktop Chromium (sept configurations) et iPhone 13 WebKit (trois) : 4 tests verts, axe 0.
  - 320 px sur WebKit, avec et sans confort : 2 tests verts, **0 px** de débordement (28 px avant).
  - 195 px : 61 px restants (114 avant), dus aux pastilles de « Mes choix ».
  - Un premier passage « 320 px » a rejoué par erreur les configurations ordinaires : la copie du spec de mesure avait perdu sa variante 320. Variante rétablie, puis passage rejoué sur le même build.
- Vitest `conditions` : 6 tests verts. `npm run check` 0.
- **T2** (`npm run test:worktree -- --fast`), lancé au calme sur `a3abf821` + le correctif : code 0 ; Vitest 17 997 verts, Playwright 412 verts. Un premier lancement, en attente du calme sur l'arbre d'avant, a été arrêté avant de démarrer.
- Avance finale par `--ff-only` à `944c49d3` (#2172, #2177, #2179) : aucun fichier du portail patient touché.

## Problèmes ouverts

- La convention à 195 px (D-506) reste à trancher par le responsable : U37 et U38 (pastilles de « Mes choix »), U10, U26, U34, U35.
- PAT-7a, puis PAT-7d, qui attend une décision sur D-488 §7.

## Prochaine action exacte

1. Commit, PR, CI (`wn-attendre-ci.mjs`, en tâche de fond), `wn-revue-pr-agent.mjs` → 0, un verdict par remarque.
2. Déclarer « prête @<sha> », ligne `prete` au registre D-503, suivi patient à jour.
3. Poser au responsable la convention à 195 px, et l'ordre de PAT-7a.

## Interdits encore actifs

- Aucun texte d'interface hors de D-488. Aucun décor avant COM-1. Fichiers COM-0 gelés.
- Rien de clinique. Aucun texte de consentement, de droits ni de sécurité modifié.
- Aucune migration, aucun drapeau. Production en lecture seule ; constat à l'écran en local seulement.
- Patients fictifs seulement : Sophie Nicola, Jennifer Martin, Michel Dogné.
- Jamais de merge par la session. Toute écriture ArtifactData épinglée par `if_version`.
- T2 avant tout commit UI ou API, jamais deux T2 en parallèle sur le Mac.
