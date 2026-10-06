# Handoff — 2026-10-06 — BIO-INGEST : NUL retiré dans `texteBorne`, procédé v3

## Branche et état Git

`fix/bio-ingest-nul-texte-borne`, depuis `main` c1b4dd65 (LOT-09, #1335).
PR #1336. Aucune migration.

## Objectif

Solder la dette routée depuis la revue Copilot de #1333 : un U+0000 dans le
libellé, la valeur, l'unité ou le laboratoire lus faisait échouer tout l'import.

## Décisions prises

- Le NUL se retire avant le rognage dans `texteBorne`, comme dans
  `lireFaitLaboratoire`. Un libellé fait seulement de NUL est invalide, comme
  un libellé blanc.
- `VERSION_PROCEDE_EXTRACTION` passe à `bio-extraction-v3` (revue Copilot) :
  règle de lecture nouvelle, prompt et schéma de la v2 inchangés. Aucune
  extraction v2 n'avait eu lieu en production (constat par conteneur : un seul
  import, en v1).

## Fichiers modifiés

`extraction.ts`, `extraction.test.ts`, `FILE_ATTENTE.md` (dette soldée),
changelog, SESSION_LOG, ce handoff.

## Validations exécutées

- `extraction.test.ts` vert ; sans le correctif, les deux nouveaux cas
  rougissent. T1 complet vert. `/code-review medium` : aucun constat.

## Prochaine action exacte

1. CI, merge, constat du déploiement.
2. Constater par conteneur la première extraction réelle :
   `version_prompt = 'bio-extraction-v3'`, faits relevés.
3. BIO-PARCOURS BP-23 : cadrage posé, en attente de trois arbitrages du
   responsable (PR de doc séparée).

## Interdits encore actifs

- Rien sur `ResultatBiologique` ; aucune ligne dans `resultats_biologiques`
  sans validation humaine.
