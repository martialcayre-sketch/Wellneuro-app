# Handoff — 2026-10-03 — BIO-INGEST LOT-06, catalogue étendu et resolver re-signé (D-261, D-262)

## Branche et état Git

- `feat/bio-ingest-lot06-resolver`, partie de `origin/main` à `46493e9d`. PR à ouvrir.
- Campagne `2026-09-30-bio-ingest`, lot actif **LOT-06**, en cours.
- La migration est déjà livrée : #1296 (`034ee352`), mergée.

## Objectif

Rattacher à un analyte les mesures courantes d'un compte rendu : NFS détaillée, ionogramme,
créatinine et DFG, transaminases et GGT, lipides, transferrine, B12, CRP.

## Décisions prises

- **[[D-261]]** :
  - 36 analytes au catalogue, une unité SI chacun ;
  - « mL/min/1,73 m² » ajoutée aux quatre CHECK ;
  - les quatre composites restent, pour les panels ;
  - paires de notation G/L, T/L, U/L et fl.
- **[[D-262]]** :
  - resolver re-signé `be9a463c…8fc3` (145 entrées, 79 analytes) ;
  - un libellé lu doit être au moins aussi précis que celui du catalogue (« Fer » et « Sodium »
    seuls sont refusés) ;
  - l'unité lue départage un libellé ambigu (`resoudreLigne`) ;
  - paire « 1.73 » ≡ « 1,73 » ;
  - erratum de D-261 §1.
- Ces arbitrages viennent du responsable (2026-10-03) : unités SI, les 4 paires, départage par
  l'unité, libellés sans matrice sous garde de l'unité, DFG avec un point.

## Fichiers modifiés (cette PR)

- `resolverLibellesV1.ts` (+ test et banc des 58 lignes réelles, sans valeur) ;
- `valeurLue.ts` (+ test) ;
- `lancerExtraction.ts` (+ test) : lit les unités du catalogue dans la transaction ;
- `DECISIONS.md` (D-262), deux fragments `changelog.d/`, fiche du LOT-06, `CAMPAGNE.md`,
  `.wn/state.json`.

## Validations exécutées

- **#1296** :
  - T1 vert, T3 vert (11 444 Vitest, 1 623 tests d'intégration, 225 E2E) ;
  - `wn-reviewer` OK ;
  - CI vert ;
  - `release-db` run 37148574277 approuvé, sentinelle liée au run ;
  - constat par conteneur : migration appliquée, 85 analytes, CHECK identiques, pas de recul.
- **Cette PR** :
  - tests de la bibliothèque biologie et des composants verts (3 208) ;
  - T1 et T2 rapide lancés avant la PR.

## Problèmes ouverts

- Le critère de done n'est pas encore constaté en production.
- Restent refusées, car ce sont des conversions : l'hémoglobine et la CCMH en g/dL, les folates
  en ng/mL.
- Le calibrage de longueur de `courrier.test.ts` est à revoir si un panel cite les nouveaux
  analytes.

## Prochaine action exacte

1. PR, CI en fond, lecture des commentaires en ligne, merge.
2. Une fois le déploiement constaté, le praticien relance l'extraction du compte rendu de `PAT030`.
   Il est toujours présent, ses 58 lignes sont en `proposee`.
3. Constater par conteneur, par identifiant, que les lignes courantes sont `resolu`.
4. Clore le LOT-06 par une PR de doc : statut, Résultats, `SESSION_LOG`.

## Interdits encore actifs

- Aucune conversion d'unité. Une notation équivalente demande un arbitrage par paire.
- Le resolver ne se retouche jamais sans re-signature `D-xxx`, et le SHA reste un littéral.
- Aucune plage ni indication au catalogue (D-059). `release-db` reste un geste humain.
- Les dossiers réels se désignent uniquement par leur identifiant.
