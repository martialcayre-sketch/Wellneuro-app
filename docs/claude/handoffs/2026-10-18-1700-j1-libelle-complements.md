# Handoff — J1-base : « Compléments alimentaires » entier au menu

## Branche et état Git

- Branche `j1-libelle-complements`, partie de `origin/main` 6486f337 (après
  #1550). Worktree `d281-lot3-portail`. Un commit, PR à ouvrir.

## Objectif

Premier reste de J1-base (H43, ligne r2_01 de la page de la file A) : le
libellé « Compléments alimentaires » du rail déplié s'affichait
« Compléments aliment… ».

## Décisions prises

- Le libellé est celui de D-324 §4 : il ne se raccourcit pas. Le rail garde
  ses 252 px (l'élargir déplaçait toutes les pages). Les libellés du rail
  passent à la ligne (`break-words leading-snug`) au lieu d'être coupés
  (`truncate`) ; seule l'entrée trop longue change de hauteur.
- La feuille « Plus » du téléphone n'est pas touchée : elle occupe toute la
  largeur et ne coupe pas ce libellé.
- Ligne du plan `MESSAGE_ORIENTATION_INACTIVE` (§ dettes, « avec J1-base ») :
  soldée, le message est corrigé depuis 33f44689 (D-076, 2026-08-19).

## Fichiers modifiés

- `web/src/components/ui/SidebarRail.tsx` : classe du libellé, commentaire.
- `web/src/components/ui/SidebarRail.test.tsx` : un cas (pas de `truncate`,
  `break-words` présent) — rouge sur l'ancien code.
- `docs/claude/PLAN_WELLNEURO.md` (H43, ligne de dette soldée), changelog,
  SESSION_LOG.

## Validations exécutées

- Vitest `SidebarRail.test.tsx` : 15/15.
- T1 rapide vert ; T1 complet et T2 : voir la PR.
- Bases d'images : les trois bases Desktop de la fiche capturent le rail ; à
  régénérer par le workflow `visual-baselines` si le CI les refuse.

## Problèmes ouverts

- Restes de J1-base définis nulle part dans le dépôt : les « 8 gestes
  cosmétiques », les jetons, K-10, NF-6, NU-2a (seule trace : le plan).
  À demander au responsable.
- Restes définis : libellé de priorité de la minute d'après
  (`ClotureMinuteApresPanel.tsx` affiche l'identifiant brut) ; repli
  `localhost` (`lib/consultation/email.ts`, `lib/securite/alerteSecuritePraticien.ts`).

## Prochaine action exacte

PR, CI, bases Desktop si refusées, revue CodeRabbit sur le sha de tête, merge
avec `--match-head-commit`, constat du déploiement. Puis la minute d'après.

## Interdits encore actifs

- Aucune migration ni modification de `schema.prisma` sans accord explicite.
- Aucune décision clinique sans D-xxx et fragment `changelog.d/`.
- Aucune identité réelle dans le dépôt ; production en lecture seule par
  conteneur.
- Un commit de bases d'images ne contient que les bases refusées par le CI.
