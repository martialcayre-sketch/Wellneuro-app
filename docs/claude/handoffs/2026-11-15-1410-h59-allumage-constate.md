# Handoff — H59 : allumage constaté

## 1. Branche et état Git

Branche `docs/h59-allumage-constat`, worktree `/tmp/wn-h59-allumage`, créée sur `origin/main` `0c574219`. Documentation seule.

## 2. Objectif

Activer `WN_ENABLE_DECLARATION_SUICIDE_CAB` après les prérequis de D-524 §3 et consigner le geste, explicitement délégué par le responsable dans la session.

## 3. Décisions prises

Délégation limitée à cet allumage. La variable, absente auparavant, vaut `true` depuis le 2026-11-15 à 13:03:07 UTC. Redémarrage synchrone réussi ; trois processus recréés à 13:03:10 UTC et constatés `running`. Le détail fait foi dans le journal H59 du même jour, fragment 04.

## 4. Fichiers modifiés

- `docs/FEATURE_FLAGS.md` : état courant et délégation.
- `docs/claude/plan-journal/H59/2026-11-15-04-allumage-constate.md` : preuve et limites.
- `changelog.d/2026-11-15-h59-allumage-constate.md` et ce handoff.

## 5. Validations exécutées

Déploiement `0c574219` en succès, contenant `bc4d03e1`. Signature et recomptage relus dans les sources du lot. `env-set` : code 0 ; `env-get` : `true` ; redémarrage synchrone : code 0 ; `ps` : `web-1`, `web-2`, `worker-1` tous `running`. `/login` et `/portail/connexion` : HTTP 200. Validations documentaires locales et CI : voir la PR de ce constat.

## 6. Problèmes ouverts

Aucun parcours patient ni courriel provoqué pour vérifier l’allumage. La troisième migration de H59 reste à son lot, précédée du constat de #2080 prévu par le handoff du recomptage.

## 7. Prochaine action exacte

Intégrer ce constat documentaire selon le workflow PR habituel, puis reprendre le lot distinct de la troisième migration de H59.

## 8. Interdits encore actifs

Aucune migration ni écriture manuelle en base pour ce geste. Ne pas retoucher les textes ou le mécanisme signés. Les conséquences d’une extinction et la reprise avant rallumage restent celles de `docs/FEATURE_FLAGS.md` et D-522.
