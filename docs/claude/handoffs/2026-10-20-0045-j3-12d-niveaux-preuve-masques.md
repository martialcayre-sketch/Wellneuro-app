# Handoff — J3-12d : niveaux de preuve masqués au cockpit (D-332)

## Branche et état du dépôt

- Branche `j3-12d-badges-preuve-masques`, worktree `d281-lot3-portail`,
  partie de `origin/main` (fde0f807). Nuit en autonomie file A du 2026-10-19.

## Objectif

Premier des lots de mesure des 12 besoins (H15) : masquer les badges de niveau
de preuve sur les deux écrans praticien, table intacte.

## Décisions prises

- D-332 consigne l'arbitrage du responsable du 2026-10-19 (plan, mise à jour
  du 2026-10-20, point 1). Non clinique : aucun grade ni seuil ne change.
- `niveauPreuve` reste servi par les routes, et `EvidenceBadge` reste en
  place sans appelant : le badge revient avec la table révisée signée (J3-12f).

## Fichiers modifiés

- `web/src/components/FichePatientPanel.tsx` (colonne et légende repliée
  retirées) + test (un cas).
- `web/src/components/DetailBesoinsPanel.tsx` (colonne et légende retirées ;
  fichier en CRLF, conservé).
- `docs/DECISIONS.md` (D-332), plan (ligne J3-12d), changelog, SESSION_LOG.
- Bases visuelles `fiche-tiroir-besoins` régénérées si le CI les refuse.

## Validations exécutées

- `FichePatientPanel.test.tsx` vert (121) ; T1 et T2 : voir la PR.

## Problèmes ouverts

- Aucun.

## Prochaine action exacte

PR, bases visuelles, CI, CodeRabbit, merge ; J3-12d → fait sur la page de
suivi de la file A.

## Interdits encore actifs

- Aucune modification de la table `NIVEAU_PREUVE_PAR_SOURCE` sans la
  signature de la table révisée ; rien de clinique sans D-xxx.
