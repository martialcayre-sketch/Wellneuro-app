# Handoff — 2026-08-17 — Dettes M-B, L-A, L-C soldées ; RV-4 fermée pour de vrai

- **État** : implémenté sur `fix/dettes-revue-mb-la-lc` (empilée sur
  `feat/d067-signatures-shaperimetre` — merger dans l'ordre). Revue
  `wn-reviewer` : GO conditionnel, bloquant B1 et recommandations soldés.
- **Contenu** : contrat d'appelant de `deriverStatutsBiologie` documenté dans
  le type (M-B) ; banc-sentinelle des importeurs d'`evaluerAbstention` (L-A,
  `--untracked` pour tenir en local, contre-épreuve du pipeline, auto-exclusion
  vérifiée par `existsSync`) ; `ETAT_LIVRE` gelé (L-C) ; inventaire « déclaratif
  seul » par feuilles avec `every` et contre-épreuve sur un `ou` fabriqué
  (RV-4 — la première rédaction divergeait commentaire/code, finding B1).

## Nuances exigées par la revue — à ne pas perdre

- **M-B est MITIGÉE, pas fermée** : un JSDoc n'est pas une garde. L'option
  forte (hacher la table canonique importée plutôt que l'argument) est écartée
  parce qu'elle casserait l'injectabilité au banc — le sha se recalcule sur la
  fixture. Le contrat documenté dit vrai contre le code (vérifié par la
  revue) ; la garde mécanique reste une option si un appelant réel dérape.
- **L-D est REPORTÉE volontairement** : l'import dynamique de fixture en
  milieu de `chaineC1.test.ts` reste sûr parce que l'`afterEach` restaure
  avant — le gel de L-C ne la couvre pas. À reprendre si la structure du banc
  change.
- **Périmètre du banc L-A : `web/src`**, délibéré et écrit dans le banc — un
  appelant sous `scripts/` ou `e2e/` relèverait de la revue humaine.
- **Dette n° 4 du handoff du 2026-08-16** (`DATE_SIGNATURE_SIMULEE` de
  `priorityRulesV1.test.ts`) : déjà soldée par `D-067` (PR #698) — alignée au
  `2026-08-16T00:00:00.000Z`.

## Reste du programme LOT-06

PR-2 (migration catalogue — transcription COMPLÈTE en scratchpad, textes de
claims relus : ferritine 50-80, vitamine D ≥ 45 sur `0239-004`, IgA omise car
le claim ne dit pas le site de prélèvement) puis PR-3 (règles + signature
biologie + banc d'inertie RV-1 + garde de forme RV-2).
