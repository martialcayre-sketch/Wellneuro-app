# Handoff — t38 : contrat du lien besoin → leviers (H84, D-338 §1)

## Branche et état du dépôt

- Branche `lot/t38-h84-contrat-leviers`, worktree `d281-lot3-portail`,
  partie de `origin/main` (2b9c9faa, #1636). Sans migration, sans drapeau,
  sans re-signature, sans D-xxx.

## Objectif

Rang 1 de H84 : un module pur qui fixe la forme du lien entre un levier
(règle, action, analyte, axe, fiche) et les besoins qu'il sert, avant toute
clé posée (D-338 §1, §2).

## Décisions prises

- Quatre arbitrages du responsable du 2026-10-22 (questions à options,
  recommandations suivies) : module hors des chemins cliniques
  (`web/src/lib/besoins/`) ; trois modes — `cle_signee`,
  `deduit_amont_signe` (amont nommé, `BESOIN_SOURCES` seul), `sans_objet`
  (motif) ; motif en texte libre non vide ; état de mesure d'un besoin hors
  contrat.
- `BESOINS` réutilisé de `fiches-usage/vocabulaire.ts` (une seule source).
- Constat préalable t18 : #1635 n'a levé que le préalable (D/41) ; le crochet
  d'écriture reste armé sur `Edit|Write` seul. Ligne t18 du suivi repassée
  « à faire », reste écrit au détail.

## Fichiers modifiés

- `web/src/lib/besoins/lienLeviers.ts`, `lienLeviers.test.ts` (neufs).
- `scripts/specs-drapeau-ali01.test.mjs` (allowlist motivée : le banc ne lit
  que les clés de `BESOIN_SOURCES`).
- `docs/claude/PLAN_WELLNEURO.md` (H84 : mise à jour, ligne « contrat du
  lien » faite), `changelog.d/2026-10-22-t38-h84-contrat-lien-leviers.md`,
  SESSION_LOG.

## Validations exécutées

- T1 rapide et T1 complet verts ; T2 (`--fast`) vert en 6 min 31 s ; après
  les retouches de revue, Vitest ciblé (15 tests) et type-check verts.
- `/code-review medium` : six constats ; trois corrigés (message « pas une
  liste », identifiant à espaces de bordure refusé, motif rogné et assertions
  `as` retirées du motif et de l'amont) ; trois écartés avec motif (ordre des
  clés entières garanti par la spécification ; un `needIds: []` doit rougir,
  ce serait un « sans objet » sans motif ; l'allowlist motivée est le
  mécanisme du banc).
- CodeRabbit (1c75dcc2) : deux remarques corrigées (tableau clairsemé refusé,
  ce bilan rectifié) ; Vitest ciblé vert après correction.

## Problèmes ouverts

- Aucun producteur du contrat aujourd'hui : t39 et t40 (migrations H84,
  rang 9) le consommeront ; aucune table existante n'est retypée (D-338 §2).

## Prochaine action exacte

CI, CodeRabbit sur la tête, merge, déploiement constaté ; t38 → « fait » au
suivi de la file A.

## Interdits encore actifs

- Un merge à la fois ; aucun auto-merge ; aucune image antérieure à 257807e3
  redéployée ; rien de clinique sans D-xxx ; aucune table signée ni version
  du score touchée avant J3-12f (D-338 §2) ; #1636 et suivantes appartiennent
  à d'autres sessions ; t39, t40 ne s'ouvrent pas dans cette session.
