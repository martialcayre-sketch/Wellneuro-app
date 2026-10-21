# Handoff — t30 : résolveur des libellés, six des sept fiches de D-323 §6

## Branche et état du dépôt

- Branche `lot/t30-alias-sept-fiches`, worktree `d281-lot3-portail`, partie
  de `origin/main` (33fe270f). Sans migration, sans drapeau nouveau ; le
  résolveur reste sous le drapeau de l'import biologique.

## Objectif

Dette t30 (file A) : la T4 libre, la T3 libre, les bicarbonates, les protides
totaux, la bilirubine totale et les phosphatases alcalines, fiches signées par
D-323 §6, ne se rattachaient pas à l'import d'un compte rendu (saisie à la
main).

## Décisions prises

- Arbitrages du responsable, 2026-10-21 : table de 22 libellés validée ;
  bilirubine rattachée « totale » seule (conjuguée, directe et libre
  partagent l'unité) ; l'ionogramme complet, panel sans unité, reste sans
  libellé ; signature du résolveur par le responsable.
- `D-336` (numéro libre sur main au 33fe270f) : re-signature du résolveur,
  167 entrées, 85 analytes, `shaPerimetre` recalculé, date de validation
  `2026-10-21T11:13:04.000Z` reportée à `docs/FEATURE_FLAGS.md`.
- Les autres libellés inconnus vus en production : lot séparé, inscrit au
  plan après t30.

## Fichiers modifiés

- `web/src/lib/biology-library/import/resolverLibellesV1.ts` (+ test).
- `docs/DECISIONS.md` (D-336), `docs/FEATURE_FLAGS.md`,
  `docs/claude/PLAN_WELLNEURO.md` (t30 soldée, ligne neuve).
- `changelog.d/2026-10-21-t30-resolveur-sept-fiches.md`, SESSION_LOG.

## Validations exécutées

- T1 rapide vert ; première T2 `--fast` rouge sur
  `verrousSignatureDocumentes` (date de signature non reportée), corrigée ;
  T2 `--fast` rejouée avant la PR (résultat dans la PR).

## Problèmes ouverts

- Libellés inconnus restants en production : lot séparé (plan, file A).

## Prochaine action exacte

CI, CodeRabbit sur la tête, merge, déploiement constaté ; t30 → « fait » au
suivi ; puis la PR de doc E67 (passe d'accessibilité, file D).

## Interdits encore actifs

- Un merge à la fois ; aucune image antérieure à 257807e3 redéployée ; rien
  de clinique sans D-xxx ; revérifier D-336 libre sur main au merge.
