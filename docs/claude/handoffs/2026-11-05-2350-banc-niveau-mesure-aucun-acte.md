# Handoff — 2026-11-05 — F05 : banc « aucun acte NABM ⇒ pas de mesure standard », garde des paires de fraîcheur constaté

## Branche et état du dépôt

- Branche `b-banc-niveau-mesure-aucun-acte`, depuis `origin/main` 9bd5439b (#1885).
- Worktree `.claude/worktrees/b-fiche-usage-iode-selenium` : session concurrente de la file B, cycle en `git`/`gh` direct.
- Un banc de test seul. Pas de migration. `ficheUsageBesoin2V1.ts` et son empreinte ne sont pas touchés.
- **Pas de release-db attendue** : D-416 §1 retient des fichiers, pas des dossiers. Le fichier de test n'est pas un chemin déclencheur.
- Essai `D-373` : la PR est déclarée « prête @<sha> », l'intégrateur la merge.

## Objectif

Point 3 des suites de D-446 : deux bancs relevés par `wn-reviewer` sur #1879.

## Décisions prises

- Aucune décision nouvelle, aucune logique clinique : le banc garde une règle déjà signée (D-434 §3, précisée par D-446 §3).
- **3a** : un cas dans `ficheUsageBesoin2V1.test.ts`. Une fiche dont un analyte est en `aucun_acte` (`CANDIDATS_NABM`) ne porte pas `niveauMesure: 'mesure_standard'`. Le cas vérifie qu'il ne passe pas à vide (au moins huit fiches concernées) et rougit sur une mutation.
- **3b** : constaté, rien d'ajouté. `claimsEpinglesFraicheur.guard.test.ts` balaie `web/src/lib/fiches-usage/` et projette les `claimsSource` sur `fiches_usage`. Il exige que le bloc du contrat SQL soit exactement cette liste, et compare les fixtures du négatif au contrat.
- Pas de fragment `changelog.d/` : banc seul, sans changement de comportement.

## Fichiers modifiés

- `web/src/lib/fiches-usage/ficheUsageBesoin2V1.test.ts` : un cas, un import.
- Ce handoff.

## Validations exécutées

- Fichier de test : 29 passés.
- T1 complet (`npm run check`) : vert.
- T2 (`npm run test:worktree -- --fast`) : séquence rapide verte en 8 min 6 s.

## Problèmes ouverts

- La branche « acte de groupe ⇒ exploration fonctionnelle » n'est pas gardée : le catalogue des candidats ne tranche pas seul le cas `a_juger`. Le banc garde la seule branche qui ne demande pas de jugement.

## Prochaine action exacte

1. CI (`node scripts/wn-attendre-ci.mjs <N>`, code 0), revue sur la tête, « prête @<sha> ».
2. Suite du dossier F05 selon la file B.

## Interdits encore actifs

- Pas de merge par cette session (essai D-373). Pas de pull, merge ou rebase sans arbitrage.
- Production en lecture seule par conteneur. Aucun texte clinique, libellé ou valeur au dépôt public (D-251 §4).
