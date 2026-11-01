# Handoff — 2026-11-01 — F05, dette 2 : chemins de la release-db (D-416)

## Branche et état Git

`f05-dette-release-db`, partie d'`origin/main` 6b5ea0f3, worktree
`.claude/worktrees/f05-structure`. D-416 réservée (`refs/tags/reserve/D-416`).
La PR de la dette 1 (#1814, `f05-dette-negatifs`) est indépendante. Aucune
migration, aucun `schema.prisma`.

## Objectif

Solder la seconde dette que la revue de #1806 a routée au plan §8 : ni la
structure signée des fiches d'usage ni le contrat positif de fraîcheur ne
déclenchaient la release-db ; la re-signature B9/B12 se serait déployée sans
que le préflight rejoue ses paires contre la production.

## Décisions prises

- D-416 (amende D-044, étend D-389 §5), sur trois arbitrages du responsable
  du 2026-11-01 soir : le fichier et le contrat, pas le dossier ni le négatif ;
  une décision neuve, D-401 intacte ; deux PR, dans la session F05.
- `resolverLibellesV1.ts`, dernière table signée hors de `clinical/`,
  n'épingle aucun claim : hors des chemins (D-416 §3).

## Fichiers modifiés

- `.github/workflows/release-db.yml` : `paths`, résumé pour l'approbateur
  (boucle sur les fichiers signés modifiés), comparaison de la tête
  dépassante.
- `scripts/wn-deploiement-deployer.mjs` (`CHEMINS_RELEASE_DB`) et son banc
  de parité ; `scripts/wn-sonde-release-db.mjs` (commentaire) et son banc ;
  `scripts/release-db-comportement.test.mjs` (refus et résumé pour les deux
  fichiers) ; `scripts/release-db-invariants.test.mjs` (cinq chemins).
- `.claude/rules/pr-revue-et-release-db.md` ; `docs/DECISIONS.md` (D-416) ;
  `docs/claude/PLAN_WELLNEURO.md` (§8 : ligne soldée) ; fragment
  `changelog.d/2026-11-01-d416-release-db-fiches-usage.md` ; ce handoff.

## Validations exécutées

- `node --test` des quatre bancs de la release-db (invariants, comportement,
  déployeur, sonde) : 148 verts, 0 rouge. Le premier T1 a rougi sur deux
  invariants (comparaison de la tête sur une seule ligne, nombre de chemins) :
  corrigés, `scripts/release-db-invariants.test.mjs` compte désormais cinq
  chemins.
- T1 complet vert. Revue : voir la PR.

## Problèmes ouverts

- Le merge de cette PR touche `release-db.yml` et le déployeur : gelé en
  phase 1 (`wn-sonde-release-db.mjs`) si une release attend une approbation.
- Aucune release-db déclenchée par cette PR elle-même (ni migration, ni
  `clinical/`, ni les fichiers qu'elle ajoute aux chemins).

## Prochaine action exacte

PR, CI, revue CodeRabbit sur la tête, « prête @<sha> » avec l'exception :
la PR touche `release-db.yml` et le déployeur, l'intégrateur passe la sonde
avant le merge.

## Interdits encore actifs

- Aucune retouche de la structure signée sans nouvelle signature ; aucun
  texte clinique, valeur ni borne de la main de l'assistant.
- Dépôt public : identifiants et mécanismes seulement.
- Ni migration ni `schema.prisma` ; production en lecture seule par
  conteneur.
