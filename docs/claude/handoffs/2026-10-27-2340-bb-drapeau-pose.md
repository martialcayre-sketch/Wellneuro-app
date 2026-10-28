# Handoff — 2026-10-27 — File C : bb, drapeau `WN_PORTAIL_TROIS_PLANS` posé (D-386, H49)

## Branche et état du dépôt

- Branche `bb-activation-constat`, partie de `origin/main` (a2043078, #1747) ;
  worktree `act5-mineurs`, session concurrente, cycle en `git`/`gh` direct.
- PR de documentation seule : ni code, ni migration, ni release-db attendue.

## Objectif

Le « lot 3 » demandé (aperçu praticien, « .. », bh) était déjà livré par #1745.
Restaient le constat d'absence de recul, la pose du drapeau (porte 18) et son
écriture au registre.

## Décisions prises

- Absence de recul constatée (D-386 §2) : 39131a45 a fini sa bascule le
  2026-10-26 à 23:55:49 UTC ; les seize déploiements suivants (fb7d61b2 à
  adab6625) descendent tous de lui, dans l'ordre de `main`.
- Drapeau posé par le responsable (le mode auto refuse l'`env-set` à
  l'assistant) : valeur relue `true`, `web-1` et `web-2` recréés à 22:28:34 UTC.

## Fichiers modifiés

- `docs/FEATURE_FLAGS.md` (ligne `WN_PORTAIL_TROIS_PLANS`) ;
  `docs/claude/PLAN_WELLNEURO.md` (H49) ;
  `changelog.d/2026-10-27-bb-drapeau-pose.md` ; ce handoff.

## Validations exécutées

- Lecture agrégée par conteneur (transaction en lecture seule) : aucune version
  de protocole n'a de `created_at` postérieure à `2026-10-27T00:00:00Z`.
  Le drapeau n'a donc encore aucun effet visible.
- `check:rapide` vert, puis T1 complet (`cd web && npm run check`) vert.

## Problèmes ouverts

- Constat sur un vrai dossier impossible tant qu'aucune version n'est
  enregistrée puis diffusée après l'instant : il faut un geste du praticien
  (nouvelle version sur un dossier de test, puis « Valider pour diffusion »).
  Ensuite, constater par identifiant que les plans apparaissent au portail ET
  dans l'aperçu « Diffusion ».

## Prochaine action exacte

PR, CI (`wn-attendre-ci`), revue CodeRabbit de la tête, sonde des runs
`release-db` non conclus, merge `--match-head-commit`. Puis, à la première
version postérieure à l'instant : le constat.

## Interdits encore actifs

- Aucune migration ; aucun texte patient inventé.
- Production lue en lecture seule, par identifiant, depuis un conteneur ;
  dans le dépôt, « un dossier de test ».
- Places 8 à 11 bloquées ; place 7 et réapprobation hors de ce lot.
