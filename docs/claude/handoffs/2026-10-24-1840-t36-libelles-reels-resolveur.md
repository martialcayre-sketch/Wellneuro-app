# Handoff — t36 : libellés réels restés « inconnu », résolveur re-signé (D-356)

## Branche et état du dépôt

- Branche `lot/t36-libelles-inconnus`, worktree `d281-lot3-portail`, partie
  de `origin/main` (290c2dcf). Sans migration, sans drapeau nouveau ; le
  résolveur reste sous le drapeau de l'import biologique.

## Objectif

Dette t36 (file A, D-336 §5) : rattacher aux analytes déjà au catalogue les
libellés lus en production et restés « inconnu ».

## Décisions prises

- Constat par conteneur du 2026-10-24 (lecture seule, agrégats) : 53 lignes
  « inconnu » sur 8 imports, 92 résolues, aucune « ambigu ».
- Arbitrages du responsable (questions à options) consignés dans `D-356` :
  huit libellés ; la CRP imprimée « PROTEINE C REACTIVE (CRP) » va à la CRP
  ultrasensible, « CRP (Protéine C Réactive) » (D-263) reste standard ;
  antériorités jamais rattachées ; « mL/min » ≡ « mL/min/1,73 m² » (contre
  l'avis de l'assistant) ; unité absente ≡ « ratio ». Signature transcrite le
  2026-10-24 (`2026-10-24T18:34:46.000Z`), SHA `ebe7179e…`, 175 entrées,
  85 analytes.
- Pas de migration de données : les lignes déjà lues restent « inconnu » et
  se rattachent à la main.

## Fichiers modifiés

- `web/src/lib/biology-library/import/resolverLibellesV1.ts` (+ test),
  `valeurLue.ts` (+ test).
- `docs/DECISIONS.md` (D-356), `docs/FEATURE_FLAGS.md`,
  `docs/claude/PLAN_WELLNEURO.md` (t36 soldée, deux lignes de fiches).
- `changelog.d/2026-10-24-t36-libelles-reels-resolveur.md`, SESSION_LOG.

## Validations exécutées

- Vitest ciblé (import biologique) vert, T1 rapide vert, T3 complet vert
  (9 min 48 s : 14 846 unitaires, 296 E2E).
- `/code-review medium` : six remarques — deux corrigées (changelog de
  l'anisocytose, doc des notations), quatre écartées avec motif (paire
  mL/min et règle ratio arbitrées ; le CHECK du catalogue réserve
  « mL/min/1,73 m² » au DFG ; apostrophe couverte par la normalisation ;
  SHA gardé par les tests).

## Problèmes ouverts

- Fiches absentes du catalogue : TP/INR/temps de Quick, acides gras un à un
  et rapports oméga 6/3 et LA/DGLA — deux lignes au plan (file A).

## Prochaine action exacte

CI, CodeRabbit sur la tête, merge, déploiement observé ; t36 → « fait » au
suivi de la file A.

## Interdits encore actifs

- Un merge à la fois, aucun auto-merge ; aucune image antérieure à 257807e3 ;
  revérifier D-356 libre sur main au merge ; hors périmètre : m38,
  WN_CONSTAT_BESOIN.
