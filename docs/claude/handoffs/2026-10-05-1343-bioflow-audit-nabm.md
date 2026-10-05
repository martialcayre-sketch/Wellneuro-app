# Handoff — 2026-10-05 — BioFlow : l'audit reconnaît NABM et le remboursement

## Branche et état Git

`docs/bioflow-audit-nabm`, partie de `main` (c3067e13). Le changement est
de la documentation seule.

## Objectif

Corriger l'audit du 2026-10-04 (#1323), qui sous-estimait le sous-système
NABM + remboursement. Demande du responsable.

## Décisions prises

- Ajout d'un §3.4 à l'audit. Chaque affirmation est vérifiée dans le dépôt :
  - `web/prisma/nabmImport.ts` : provenance `nabm_smt_ans`, SHA-256,
    couverture, champs repris ;
  - `remboursable.ts` : quatre états et trois conditions ;
  - `biology_analyte_nabm` : nature et `verifie_par` ;
  - `FicheAnalytePanel.tsx` : jamais d'euros.
- Quatre principes :
  - une seule dérivation du remboursement, sans booléen stocké ;
  - l'import ANS reste le référentiel des actes ;
  - aucune correspondance automatisée sans contrôle humain ;
  - LOINC complète la NABM, il ne la remplace pas.
- Retouches de l'audit :
  - le bandeau signale le complément ;
  - le schéma §4 renvoie au §3.4 ;
  - P2 précise le rôle de LOINC ;
  - le §18 gagne un avantage n° 6.
- La roadmap ajoute une branche « Socle terminologique » à son arbre. Elle
  décrit un existant et ne crée aucun lot.
- L'exemple conceptuel n'invente aucun code d'analyte ni aucun code LOINC.

## Fichiers modifiés

- `docs/architecture/bioflow/AUDIT_BIOFLOW_2026-10-04.md`.
- `docs/architecture/bioflow/BIOFLOW_ROADMAP.md`.
- `changelog.d/2026-10-05-bioflow-audit-nabm.md`, ce handoff et l'entrée
  `SESSION_LOG.md`.

## Validations exécutées

`check_no_secrets`, `npm run check`, puis le CI de la PR.

## Problèmes ouverts

Le montant remboursé en euros est hors champ : il exigerait une source
tarifaire officielle, versionnée par date.

## Prochaine action exacte

La décision préalable à LOT-07, sur feu vert du responsable.

## Interdits encore actifs

- Aucun code ni aucune migration du LOT-07 avant la décision préalable
  mergée.
- Pas d'auto-merge sur une PR de lot sans sa clôture.
- Aucun code LOINC deviné.
