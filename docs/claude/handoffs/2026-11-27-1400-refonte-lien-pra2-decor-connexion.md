# Handoff — 2026-11-27 — Refonte Lien / Empreinte, PRA-2 décor : fond de la connexion praticien

## Branche et état du dépôt

- Branche `claude/refonte-lien-pra2-decor-connexion-df932b`, sans commit propre avant
  ce lot, avancée par `--ff-only` sur `origin/main` `b544702e` (COM-3 #2388 comprise),
  dans le worktree `.claude/worktrees/refonte-lien-pra6n-titres-4e074e`. Les
  dépendances et le schéma n'ont pas changé depuis le `npm ci` et le
  `npx prisma generate` du début de session (seuls des scripts de `package.json`).
- Une PR. La session ne merge pas : elle déclare « prête @<sha> » à l'intégrateur.

## Objectif

Poser le décor de la connexion praticien selon [[D-481]] §1 bis (Q8 a) : `login-calm`
en périphérie, par `LienDecor`. La carte reste opaque, aucun champ n'est posé sur le
décor, et le décor est absent à l'impression. La marque Empreinte (Q7 a) et le lien
d'évitement T-16 ne changent pas. Aucun texte neuf, aucun changement
d'authentification.

## Décisions prises

- **Prototype** : https://claude.ai/artifact/5MHR6M9gmzfczq1ebbv4kE. Le responsable
  a retenu la variante B le 2026-11-26 (« B, avec COM-3 », liste commune
  `20261126-2302-d`). Le calage portrait est livré par le micro-lot COM-3 (#2388,
  mergée). Ce lot se limite à la pose.
- **Pose** : `<LienDecor emplacement="connexion-praticien" />` est le premier enfant
  du cadre `data-theme="praticien"`, avant le lien d'évitement. Le décor n'est pas
  focalisable, donc le lien reste le premier arrêt. `isolate` borne le `-z-10` du
  fond au cadre.
- Ni DOC-n ni décision neuve. Recouvrement avec PAT-2 décor (#2384) vérifié : il n'y
  a aucun fichier commun.

## Fichiers modifiés

- `web/src/app/login/page.tsx` : import et pose du décor, cadre `relative isolate`,
  commentaire.
- `web/src/app/login/page.test.tsx` : le décor est posé une fois, `aria-hidden`, sans
  pointeur, `print:hidden`, `-z-10`, et le cadre est `isolate`.
- `web/e2e/login-decor.spec.ts` (nouveau) : carte opaque entre le bouton et le décor,
  une seule couche visible, calage `50% 50%` en paysage et `100% 0%` en portrait,
  aucun défilement horizontal, décor absent à l'impression. Le bureau Chromium et
  l'iPhone 13 WebKit sont couverts, sans session ni dossier.
- `changelog.d/2026-11-27-refonte-lien-pra2-decor-connexion.md` et ce handoff.

## Validations exécutées

- Vitest de la connexion et de `LienDecor` : 47 verts. T1 (`check:rapide`) : 0.
- Relecture ui-ux-pro-max, en lecture seule, sans constat bloquant :
  - le décor est `aria-hidden`, ce qui est juste pour un ornement ;
  - le texte reste sur la carte opaque ;
  - le lien d'évitement focalisé est sur `bg-surface` ;
  - le `overflow-hidden` ne rogne que le décor.
- Constat à l'écran en local, sur ce même code, joué pendant COM-3 avec la pose
  appliquée (`next dev`, Chromium, 390 × 844, 768 × 1024, 1024 × 768 et
  1440 × 900) :
  - en portrait, les boucles sont en haut à droite ;
  - en paysage, le rendu est centré ;
  - « Aller au contenu » est le premier arrêt.
- T1 complet et T2 `--fast` : résultats dans la déclaration « prête ».

## Problèmes ouverts

- Non vus : téléphone réel, iPad réel, WebKit à l'écran (seulement par l'E2E).
- **Ornement d'un état vide réel** (plan PRA-2) : signalé au responsable, non pris. Il
  vise les écrans de travail (Patients, Agenda, Fil). Son rangement revient à
  l'orchestration.
- Le rouge préexistant `portail-rail-lateral.spec.ts:212` (registre
  `20261115-1110-a`) est routé à la file A. Il est hors du lot.

## Prochaine action exacte

Après le merge, la refonte Lien côté praticien reprend au lot suivant que désigne
l'orchestration. Il ne reste rien à faire sur la connexion.

## Interdits encore actifs

- Un lot ne pose un décor que par `LienDecor` ([[D-481]] §1 quater, gardé par le banc).
- Un seul COM-n et un seul DOC-n ouverts à la fois. Aucun texte d'interface sans
  acceptation mot pour mot.
- Aucun drapeau. Aucune modification clinique, de route, de garde,
  d'authentification ni de schéma.
- Contrôles à l'écran en local seulement. Aucune identité ni aucun identifiant de
  dossier au dépôt.
