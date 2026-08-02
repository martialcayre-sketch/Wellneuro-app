---
id: "LOT-01"
titre: "Revue des apports résiduels"
statut: "terminé"
dépend_de: "LOT-00"
---

# LOT-01 — Revue des apports résiduels

## But

Déterminer si 21 branches contiennent encore un apport absent de `main`.

## Périmètre

- les 21 branches de la section « Apport résiduel à vérifier » de
  `CAMPAGNE.md`.

## Étapes

- comparer chaque branche à son merge-base avec `origin/main` ;
- distinguer contenu unique, duplication et suppression parasite ;
- documenter un verdict par branche ;
- extraire uniquement un changement prouvé utile, jamais la branche entière.

## Interdits

- aucune modification de scoring, de seuil ou d'interprétation ;
- aucun merge ou cherry-pick global ;
- aucune suppression de branche.

## Tests

- audit en lecture seule ; si un changement documentaire est retenu, T1 ;
- si un changement clinique apparaît nécessaire, arrêt et plan séparé avec T3.

## Critères de done

- verdict et preuve pour chacune des 21 branches ;
- absence de régression ou de réimport de contenu déjà mergé.

## Résultats

- 21 branches revues individuellement avec preuves Git/PR.
- 20 branches classées `deja-integre` ou `obsolescent-main-en-avance`.
- 1 branche classée `a-integrer` : `feat/mini-synthese-par-rubrique`
  (PR #372 ouverte, arbitrage praticien requis sur l'affichage des rubriques).
- Aucun merge, aucun cherry-pick global, aucune suppression de branche.

### Matrice de verdict par branche

| Branche | Verdict | Preuve compacte | Recommandation |
|---|---|---|---|
| `campagne/conners-enseignant-debaptise` | deja-integre | PR #509 mergée ; titre débaptisé déjà présent sur `main` | archiver |
| `campagne/eortc-manuel` | deja-integre | PR #483 mergée ; contenu repris sur `main` avec réécriture | archiver |
| `campagne/psqi-24-items` | obsolescent-main-en-avance | PR #491 mergée ; `main` a poursuivi l'évolution MMT/MMSE ensuite | archiver |
| `campagne/reactivations` | deja-integre | PR #497 mergée ; commit repris | archiver |
| `corpus/lot4-corrections-scoring` | deja-integre | PR #388 mergée ; corrections IPSS présentes sur `main` | archiver |
| `feat/scoring-lot2-seuils` | obsolescent-main-en-avance | PR #471 mergée ; suspension Q_ALI_03 dépassée par PR #503 | archiver |
| `corpus/lot4-conduites-hors-interpretation` | deja-integre | PR #389 mergée ; corrections scoring présentes | archiver |
| `corpus/lot4-comparateur-et-arbitrages` | obsolescent-main-en-avance | PR #383 mergée ; `main` plus avancé sur le comparateur | archiver |
| `worktree-certification-corpus-lots-0-1-7` | deja-integre | PR #366 mergée ; outillage certif déjà absorbé | archiver |
| `feat/mini-synthese-par-rubrique` | a-integrer | PR #372 ouverte ; rubriques absentes de `main` | garder pour LOT-02 |
| `feat/bibliotheque-consolidation` | deja-integre | PR #325 mergée ; consolidation stress déjà sur `main` | archiver |
| `feat/had-entree-de-rayon` | deja-integre | PR #465 mergée ; patch-id identique sur `main` | archiver |
| `fix/moteur-repli-bande-et-zero` | deja-integre | PR #450 mergée ; correctif miniSynthese présent | archiver |
| `fix/ordre-porteurs-extraire-valeur-brute` | deja-integre | PR #443 mergée ; script certif repris | archiver |
| `chore/droits-42-arbitrage` | deja-integre | PR #468 mergée ; arbitrages présents sur `main` | archiver |
| `chore/licences-tierces-arbitrage` | deja-integre | PR #460 mergée ; docs/licences reprises | archiver |
| `docs/droits-42-instruments` | obsolescent-main-en-avance | PR #462 mergée ; `main` enrichi après fusion | archiver |
| `agent/arbitrages-2026-07-27` | obsolescent-main-en-avance | PR #399 mergée ; points b/c/f/g/h clos après coup | archiver |
| `corpus/banc-certification-bilan` | obsolescent-main-en-avance | PR #373 mergée ; correctif 2026-07-26 déjà sur `main` | archiver |
| `corpus/droits-instruments-tiers` | obsolescent-main-en-avance | PR #386 mergée ; registre/doc plus riches sur `main` | archiver |
| `corpus/instruments-cabinet-notices-droits` | obsolescent-main-en-avance | PR #371 mergée ; `main` inclut la version post-décision | archiver |
