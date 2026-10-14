# Handoff — G-7 : essai de restauration joué, porte 8 levée

## Branche et état Git

- Branche `ops/g7-essai-restauration`, partie de `origin/main` 90417d6e (#1455), rejouée sur 77abc00b (#1460 ; conflit sur l'ordre des release-db du §5, résolu en gardant les deux ajouts). Worktree `.claude/worktrees/g7-restauration`. PR #1462.
- En parallèle : #1461 (D-298, F25), branche `docs/f25-effectif-masquage`, worktree `.claude/worktrees/f25-effectif`. D-298 est acceptée par le responsable ; la PR attend la revue CodeRabbit. Le RUNBOOK de cette PR cite D-298 : merger #1461 d'abord.
- La copie principale portait `docs/plan-ai-code-rang-4` (#1460, autre session, mergée depuis) : ni écriture ni checkout dessus.

## Objectif

Lot G-7 (fiche F04) : écrire les commandes exactes de D-289 §2, jouer l'essai de restauration après approbation, le consigner, lever la porte 8.

## Décisions prises

- Approbation du responsable du 2026-10-14 : essai en deux mains.
  - L'assistant crée puis détruit l'application temporaire.
  - Le responsable joue le conteneur interactif, dont le téléchargement authentifié par un jeton API temporaire saisi masqué.
  - L'assistant ne manipule aucun jeton.
- Archive téléchargée dans un one-off de `wellneuro`, jamais sur le poste. Cible : `wellneuro-g7-essai`, PostgreSQL Starter 1G, osc-fr1.
- Critère du RUNBOOK précisé après coup : une table absente se justifie si une migration finie après la sauvegarde la crée.

## Fichiers modifiés

- `docs/RUNBOOK.md` : section « Essai de restauration (G-7) ».
- `scripts/wn-g7-restauration.sh` : script de contrôle.
  - Gardes : la cible n'est pas la production, la cible est vide.
  - La production n'est lue qu'en lecture seule.
  - Les erreurs s'affichent sans DETAIL ni CONTEXT.
- `docs/claude/PLAN_WELLNEURO.md` :
  - porte 8 levée, F04, rang 1, D.1, ordre des release-db ;
  - D.2 : migration de #1426 finie à 07:30 UTC.
- `changelog.d/2026-10-14-g7-essai-restauration.md` ; ce handoff.

## Validations exécutées

- `npm run check:rapide` et `npm run check` verts sur le premier commit ; `bash -n` vert.
- Essai du 2026-10-14, sur la sauvegarde du jour à 00:00 UTC :
  - `pg_restore` : code 0, 12 s, 0 erreur ;
  - dernière migration de la copie égale à celle de la production à l'heure de la sauvegarde ;
  - 107 tables sur 109. Les deux tables absentes sont créées par les deux seules migrations finies après la sauvegarde (lecture par conteneur : D-284 lot j à 07:30 UTC, BP-09 à 18:15 UTC) ;
  - 79 tables à comptes égaux, 28 en écart, tous positifs (écritures postérieures à la sauvegarde).
- Application temporaire détruite le jour même ; `scalingo apps` ne la liste plus.

## Problèmes ouverts

- Révocation du jeton API `g7-essai-2026-10-14` : geste du responsable, non constaté.
- Release-db de #1426 (porte 9, lot j de D-284) : la migration est appliquée (07:30 UTC). La sentinelle et le constat restent à consigner.

## Prochaine action exacte

1. Revue CodeRabbit de #1461, merge, déploiement constaté.
2. Revue de #1462, merge, déploiement constaté.
3. Puis K-05a et D4 (F46).

## Interdits encore actifs

- Un merge à la fois, déploiement constaté avant le suivant (D-248).
- Release-db humaine, une à une ; merger une migration ne l'applique pas (D-087).
- Aucune restauration sur place ni sur le poste (D-289 §2).
- Constats en agrégats ; sous cinq dossiers, la répartition est masquée (D-298).
