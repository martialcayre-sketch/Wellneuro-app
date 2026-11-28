# Handoff — 2026-11-26 — Refonte Lien / Empreinte, COM-3 : fond de la connexion praticien calé en portrait

## Branche et état du dépôt

- Branche `claude/refonte-lien-com3-fond-portrait`, créée sur `origin/main` `32380ddf`,
  fraîchement fetché, dans le worktree de la session PRA-2 décor
  (`.claude/worktrees/refonte-lien-pra6n-titres-4e074e`). `npm ci` et `npx prisma generate`
  ont été joués avant tout test.
- Une PR. La session ne merge pas : elle déclare « prête @<sha> » à l'intégrateur.
- Le lot PRA-2 décor (branche `claude/refonte-lien-pra2-decor-connexion-df932b`) attend le
  merge de COM-3 pour poser le fond.

## Objectif

Micro-lot commun issu du prototype PRA-2 décor ([[D-481]] §4) : faire voir le décor
`login-calm` de la connexion praticien en orientation portrait, où le recadrage centré
l'effaçait. `LienDecor` est un fichier commun, d'où un COM-n distinct de la pose.

## Décisions prises

- **Prototype PRA-2 décor** : https://claude.ai/artifact/5MHR6M9gmzfczq1ebbv4kE. Il montre
  les captures de la vraie page, rendue en local, à quatre tailles.
  - A : la primitive telle quelle ; le décor est invisible au téléphone et à la tablette
    portrait.
  - B : en portrait, le fond est calé en haut à droite.
- **Réponse écrite du responsable, 2026-11-26** : « B, avec COM-3 ». Elle est inscrite dans
  la liste commune, ligne `20261126-2302-d`, au statut `repondue`.
- **Ni DOC-n ni décision neuve.** La règle du §1 bis, « en périphérie », tient, et aucun
  élément neuf n'entre. Le choix est consigné dans l'en-tête de `LienDecor`, comme ceux de
  COM-1.
- **Mise en œuvre** :
  - champ `portrait` optionnel d'un fond dans `LIEN_DECOR`, et table `CALAGE_PORTRAIT` aux
    classes écrites en entier (Tailwind les produit) ;
  - la connexion praticien reçoit `haut-droite`, soit `portrait:bg-right-top` ;
  - `bg-center` reste la règle en paysage.
- **Entrée patient** : aucun calage. Ses fonds ont déjà un fichier par largeur, et PAT-2
  décor (#2384) les pose sans toucher à la primitive.

## Fichiers modifiés

- `web/src/components/ui/LienDecor.tsx` : calage portrait d'un fond ; en-tête.
- `web/src/components/ui/LienDecor.test.tsx` : calage sur la connexion, absent de l'entrée
  patient ; catalogue.
- `changelog.d/2026-11-26-refonte-lien-com3-fond-portrait.md` et ce handoff.

## Validations exécutées

- Vitest `LienDecor` (banc et garde) : 45 tests verts. T1 (`check:rapide`) : 0.
- Constat local avec la pose de PRA-2 appliquée temporairement, non commitée (`next dev`,
  Chromium) :
  - à 390 × 844 et 768 × 1024 (portrait), les boucles sont en haut à droite, au-dessus de
    la carte ;
  - à 1024 × 768 et 1440 × 900 (paysage), le rendu est inchangé ;
  - le décor reste `aria-hidden`, sans pointeur, à `z-index -10`, et `display: none` à
    l'impression ;
  - « Aller au contenu » reste le premier arrêt de tabulation.
- T1 complet et T2 `--fast` : résultats dans la déclaration « prête ».

## Problèmes ouverts

- Non vus : téléphone réel, iPad réel, WebKit à l'écran (seulement par T2).
- Le plan PRA-2 prévoit aussi un « petit ornement sur un état vide réel ». Il est signalé au
  responsable et n'est pas pris : il vise les écrans de travail (Patients, Agenda, Fil), pas
  la connexion. Son rangement revient à l'orchestration.

## Prochaine action exacte

Après le merge de COM-3, la branche PRA-2 décor avance par `--ff-only` sur `origin/main`,
puis pose `<LienDecor emplacement="connexion-praticien" />` dans `web/src/app/login/page.tsx`
(conteneur `relative isolate`). Le lot vérifie aussi si `visual.spec.ts` capture `/login`.

## Interdits encore actifs

- Un lot ne pose un décor que par `LienDecor` ([[D-481]] §1 quater, gardé par le banc).
- Un seul COM-n ouvert à la fois ; aucun texte d'interface sans acceptation mot pour mot.
- Aucun drapeau, aucune modification clinique, de route, de garde, d'authentification ni de
  schéma.
- Contrôles à l'écran en local seulement. Aucune identité ni aucun identifiant de dossier au
  dépôt.
