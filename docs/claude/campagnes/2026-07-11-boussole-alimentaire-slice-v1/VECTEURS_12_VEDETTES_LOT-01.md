---
id: "c5-lot-01-vecteurs-12-vedettes"
lot: "LOT-01"
statut: "seconde_passe_documentaire_en_revue — à signer"
date: "2026-07-18"
dataset: "ciqual-2025-v1"
mapping_version: "c5a-b1-mapping-v1"
score_version: "c5a-b1-score-v1"
pral_formula_version: "c5a-pral-remer-manz-v1"
review_ref: "C5-LOT01-VECTEURS-2026-07-18-v1"
---

# C5 LOT-01 — vecteurs pondérés attendus des 12 aliments vedettes

## Statut et limite d'usage

Ce document constitue la seconde passe documentaire autorisée par le gate
clinique `C5-LOT01-VALIDATION-MC-2026-07-18-v1`. Il présente des fixtures
praticien déterministes soumises à une signature distincte de Martial CAYRE.

Ces valeurs ne sont ni activées, ni importables dans le runtime, ni affichables
au patient. L'agrégat attendu n'est pas un classement alimentaire. Deux profils
reposant sur des ensembles de composantes différents ne doivent jamais être
comparés ou classés entre eux.

## Source et reproductibilité

- Source : [Anses. 2025. Table de composition nutritionnelle des aliments
  Ciqual](https://entrepot.recherche.data.gouv.fr/dataset.xhtml?persistentId=doi:10.57745/RDMHWY),
  version V1.
- Fichier temporaire : `compo_2025_11_03.xml`, jamais committé.
- MD5 vérifié : `2da725585946434df320d8041631998b`.
- Population : 3 484 aliments et 74 constituants.
- PRAL exact : 2 347/3 484 aliments, soit 67,4 %.
- Bornes PRAL : p5 = -8,70089 ; p95 = 14,69258 mEq/100 g.
- Quantile : interpolation linéaire au rang `(n - 1) x p`.
- Valeurs admises : teneurs numériques exactes, zéro compris.
- Valeurs exclues : absence, `traces` et `< x`, sans imputation.

La formule PRAL est celle de Remer–Manz :

`0,49 x protéines(g) + 0,037 x phosphore(mg) - 0,021 x potassium(mg) - 0,026 x magnésium(mg) - 0,013 x calcium(mg)`

Les codes Ciqual utilisés sont protéines 25000, magnésium 10120, phosphore
10150, potassium 10190 et calcium 10200. Pour le PRAL, les confiances sont
affichées dans cet ordre : `[protéines/magnésium/phosphore/potassium/calcium]`.

## Références Ciqual acceptées

Les 12 références ont été acceptées par le praticien comme cohorte pilote.
Elles ne limitent pas le futur catalogue C5.

| # | Vedette | Code | Libellé Ciqual 2025 | Référence |
|---:|---|---:|---|---|
| 1 | Sardine en conserve, égouttée | 26034 | Sardine, à l'huile, appertisée, égouttée | acceptée |
| 2 | Maquereau | 26051 | Maquereau, cru | acceptée ; 26019 et 26123 non retenus |
| 3 | Huile d'olive vierge extra | 17270 | Huile d'olive vierge extra | acceptée |
| 4 | Huile de colza | 17130 | Huile de colza | acceptée |
| 5 | Lentilles cuites | 20360 | Lentille, bouillie/cuite à l'eau (aliment moyen) | acceptée |
| 6 | Pois chiches cuits | 20507 | Pois chiche, bouilli/cuit à l'eau | acceptée |
| 7 | Noix | 15005 | Noix, cerneau, séchée | acceptée |
| 8 | Flocons d'avoine | 32140 | Flocons d'avoine | acceptée |
| 9 | Pain complet | 7110 | Pain complet ou intégral à la farine T150 | acceptée |
| 10 | Brocoli cuit | 20351 | Brocoli, cuit (aliment moyen) | acceptée |
| 11 | Épinards cuits | 20027 | Épinard, cuit | acceptée ; 20336 non retenu |
| 12 | Myrtille | 13028 | Myrtille, crue | acceptée |

## Contrat de calcul appliqué

Pour chaque composante exacte, l'alignement est normalisé entre p5 et p95,
clampé entre 0 et 1, puis inversé pour les sucres, les AG saturés, le sel et le
PRAL. Les poids effectifs originaux sont : protéines 18 %, sucres 9 %, fibres
13,5 %, AG saturés 9 %, AG monoinsaturés 4,5 %, AG polyinsaturés 4,5 %, ALA
6,3 %, EPA 5,4 %, DHA 6,3 %, sel 13,5 % et PRAL 10 %.

Pour un noyau obligatoire complet :

- si le PRAL est exact, les nutriments disponibles sont renormalisés dans leur
  enveloppe de 90 % et le PRAL conserve exactement 10 % ;
- `nutrientWeight_i = originalWeight_i / availableNutrientWeight x 90` ;
- `expectedAggregate = somme(alignment_i x nutrientWeight_i) + pralAlignment x 10` ;
- si le PRAL est indisponible, les nutriments disponibles sont renormalisés sur
  100 % ;
- la complétude reste la somme des poids originaux disponibles avant toute
  renormalisation.

Une composante facultative indisponible donne `partial_data`, sans imputation.
Les six décimales publiées sont arrondies uniquement après le calcul complet.

## Synthèse des résultats attendus

| Vedette | Statut | Complétude | PRAL mEq/100 g | Agrégat attendu |
|---|---|---:|---:|---:|
| Sardine 26034 | complet | 100 % | 9,68100 | 61,734453 |
| Maquereau 26051 | partiel | 91,0 % | 7,95664 | 57,667221 |
| Huile d'olive 17270 | partiel | 64,8 % | indisponible | 39,252210 |
| Huile de colza 17130 | partiel | 76,5 % | indisponible | 38,757805 |
| Lentilles 20360 | partiel | 88,3 % | 4,92470 | 63,335628 |
| Pois chiches 20507 | partiel | 88,3 % | 3,60190 | 63,627915 |
| Noix 15005 | partiel | 74,8 % | 6,19200 | 70,715749 |
| Flocons d'avoine 32140 | complet | 100 % | 8,72000 | 57,685279 |
| Pain complet 7110 | partiel | 88,3 % | 2,75360 | 53,284213 |
| Brocoli 20351 | partiel | 88,3 % | -1,89590 | 51,135050 |
| Épinards 20027 | partiel | 84,7 % | -8,50240 | 44,158973 |
| Myrtille 13028 | partiel | 93,7 % | -0,98070 | 42,643487 |

## Vecteurs détaillés et contributions

La colonne « valeur » conserve la teneur Ciqual en g/100 g, sauf les cinq
minéraux PRAL en mg/100 g. La lettre entre crochets est le `code_confiance`
Ciqual. La contribution est exprimée en points sur l'agrégat attendu.

### 1. Sardine 26034 — complet, complétude 100 %

| Composante | Valeur [confiance] | Alignement | Poids initial | Poids renormalisé | Contribution |
|---|---:|---:|---:|---:|---:|
| Protéines `25000` | 23,3 [A] | 0,896154 | 18 % | 18,0000 % | 16,130767 |
| Sucres `32000` | 0 [C] | 1,000000 | 9 % | 9,0000 % | 9,000000 |
| Fibres `34100` | 0 [C] | 0,000000 | 13,5 % | 13,5000 % | 0,000000 |
| AG saturés `40302` | 3,06 [A] | 0,829050 | 9 % | 9,0000 % | 7,461453 |
| AG monoinsaturés `40303` | 5,31 [A] | 0,351656 | 4,5 % | 4,5000 % | 1,582450 |
| AG polyinsaturés `40304` | 5,1 [A] | 0,814631 | 4,5 % | 4,5000 % | 3,665841 |
| ALA `41833` | 0,18 [A] | 0,259553 | 6,3 % | 6,3000 % | 1,635184 |
| EPA `42053` | 0,67 [A] | 1,000000 | 5,4 % | 5,4000 % | 5,400000 |
| DHA `42263` | 1 [A] | 1,000000 | 6,3 % | 6,3000 % | 6,300000 |
| Sel `10004` | 0,88 [A] | 0,623441 | 13,5 % | 13,5000 % | 8,416459 |
| PRAL | 9,68100 [A/A/A/A/A] | 0,214230 | 10 % | 10,0000 % | 2,142299 |

Agrégat attendu non arrondi intermédiaire : **61,734453**.

### 2. Maquereau 26051 — partiel, complétude 91,0 %

| Composante | Valeur [confiance] | Alignement | Poids initial | Poids renormalisé | Contribution |
|---|---:|---:|---:|---:|---:|
| Protéines `25000` | 18,1 [A] | 0,696154 | 18 % | 20,0000 % | 13,923071 |
| Sucres `32000` | traces [D] | — | 9 % | — | — |
| Fibres `34100` | 0 [D] | 0,000000 | 13,5 % | 15,0000 % | 0,000000 |
| AG saturés `40302` | 3,22 [A] | 0,820112 | 9 % | 10,0000 % | 8,201117 |
| AG monoinsaturés `40303` | 4,03 [A] | 0,266887 | 4,5 % | 5,0000 % | 1,334437 |
| AG polyinsaturés `40304` | 3,91 [A] | 0,624551 | 4,5 % | 5,0000 % | 3,122754 |
| ALA `41833` | 0,12 [A] | 0,173035 | 6,3 % | 7,0000 % | 1,211247 |
| EPA `42053` | 0,91 [A] | 1,000000 | 5,4 % | 6,0000 % | 6,000000 |
| DHA `42263` | 1,56 [A] | 1,000000 | 6,3 % | 7,0000 % | 7,000000 |
| Sel `10004` | 0,16 [A] | 0,933012 | 13,5 % | 15,0000 % | 13,995184 |
| PRAL | 7,95664 [A/A/A/A/A] | 0,287941 | 10 % | 10,0000 % | 2,879410 |

Composante absente : sucres `32000`, teneur `traces`. Agrégat attendu :
**57,667221**.

### 3. Huile d'olive 17270 — partiel, complétude 64,8 %

| Composante | Valeur [confiance] | Alignement | Poids initial | Poids renormalisé | Contribution |
|---|---:|---:|---:|---:|---:|
| Protéines `25000` | 0,25 [A] | 0,009614 | 18 % | 27,7778 % | 0,267068 |
| Sucres `32000` | 0 [C] | 1,000000 | 9 % | 13,8889 % | 13,888889 |
| Fibres `34100` | 0 [C] | 0,000000 | 13,5 % | 20,8333 % | 0,000000 |
| AG saturés `40302` | 15,2 [A] | 0,150838 | 9 % | 13,8889 % | 2,094972 |
| AG monoinsaturés `40303` | 73,1 [A] | 1,000000 | 4,5 % | 6,9444 % | 6,944444 |
| AG polyinsaturés `40304` | 7,17 [A] | 1,000000 | 4,5 % | 6,9444 % | 6,944444 |
| ALA `41833` | 0,65 [A] | 0,937275 | 6,3 % | 9,7222 % | 9,112393 |
| EPA `42053` | < 0,01 [A] | — | 5,4 % | — | — |
| DHA `42263` | < 0,01 [A] | — | 6,3 % | — | — |
| Sel `10004` | < 0,013 [A] | — | 13,5 % | — | — |
| PRAL | indisponible | — | 10 % | — | — |

PRAL indisponible : magnésium `< 0,05`, phosphore `< 0,3`, potassium
`< 0,3` et calcium `< 0,2`, tous de confiance A. Agrégat attendu :
**39,252210**.

### 4. Huile de colza 17130 — partiel, complétude 76,5 %

| Composante | Valeur [confiance] | Alignement | Poids initial | Poids renormalisé | Contribution |
|---|---:|---:|---:|---:|---:|
| Protéines `25000` | 0 [B] | 0,000000 | 18 % | 23,5294 % | 0,000000 |
| Sucres `32000` | 0 [C] | 1,000000 | 9 % | 11,7647 % | 11,764706 |
| Fibres `34100` | 0 [C] | 0,000000 | 13,5 % | 17,6471 % | 0,000000 |
| AG saturés `40302` | 7,26 [A] | 0,594413 | 9 % | 11,7647 % | 6,993099 |
| AG monoinsaturés `40303` | 59,7 [A] | 1,000000 | 4,5 % | 5,8824 % | 5,882353 |
| AG polyinsaturés `40304` | 26,9 [A] | 1,000000 | 4,5 % | 5,8824 % | 5,882353 |
| ALA `41833` | 7,83 [A] | 1,000000 | 6,3 % | 8,2353 % | 8,235294 |
| EPA `42053` | 0 [A] | 0,000000 | 5,4 % | 7,0588 % | 0,000000 |
| DHA `42263` | 0 [C] | 0,000000 | 6,3 % | 8,2353 % | 0,000000 |
| Sel `10004` | < 0,0028 [A] | — | 13,5 % | — | — |
| PRAL | indisponible | — | 10 % | — | — |

PRAL indisponible : magnésium `< 0,58`, potassium `< 0,81` et calcium
`< 2,57`, de confiance A ; le phosphore exact vaut 0 [C]. Agrégat attendu :
**38,757805**.

### 5. Lentilles 20360 — partiel, complétude 88,3 %

| Composante | Valeur [confiance] | Alignement | Poids initial | Poids renormalisé | Contribution |
|---|---:|---:|---:|---:|---:|
| Protéines `25000` | 10,1 [D] | 0,388461 | 18 % | 20,6897 % | 8,037123 |
| Sucres `32000` | 0,2 [D] | 0,994684 | 9 % | 10,3448 % | 10,289838 |
| Fibres `34100` | 8,45 [D] | 0,938889 | 13,5 % | 15,5172 % | 14,568966 |
| AG saturés `40302` | 0,092 [D] | 0,994860 | 9 % | 10,3448 % | 10,291659 |
| AG monoinsaturés `40303` | 0,13 [D] | 0,008609 | 4,5 % | 5,1724 % | 0,044531 |
| AG polyinsaturés `40304` | 0,18 [D] | 0,028752 | 4,5 % | 5,1724 % | 0,148716 |
| ALA `41833` | 0,032 [D] | 0,046143 | 6,3 % | 7,2414 % | 0,334137 |
| EPA `42053` | < 0,01 [D] | — | 5,4 % | — | — |
| DHA `42263` | < 0,01 [D] | — | 6,3 % | — | — |
| Sel `10004` | 0,015 [D] | 0,995356 | 13,5 % | 15,5172 % | 15,445186 |
| PRAL | 4,92470 [D/D/D/D/D] | 0,417547 | 10 % | 10,0000 % | 4,175473 |

Composantes absentes : EPA et DHA sous limite. Agrégat attendu :
**63,335628**.

### 6. Pois chiches 20507 — partiel, complétude 88,3 %

| Composante | Valeur [confiance] | Alignement | Poids initial | Poids renormalisé | Contribution |
|---|---:|---:|---:|---:|---:|
| Protéines `25000` | 8,31 [A] | 0,319615 | 18 % | 20,6897 % | 6,612719 |
| Sucres `32000` | 0,3 [A] | 0,992027 | 9 % | 10,3448 % | 10,262344 |
| Fibres `34100` | 8,2 [A] | 0,911111 | 13,5 % | 15,5172 % | 14,137931 |
| AG saturés `40302` | 0,46 [A] | 0,974302 | 9 % | 10,3448 % | 10,078983 |
| AG monoinsaturés `40303` | 0,82 [A] | 0,054305 | 4,5 % | 5,1724 % | 0,280886 |
| AG polyinsaturés `40304` | 1,59 [A] | 0,253973 | 4,5 % | 5,1724 % | 1,313655 |
| ALA `41833` | 0,08 [A] | 0,115357 | 6,3 % | 7,2414 % | 0,835343 |
| EPA `42053` | < 0,01 [A] | — | 5,4 % | — | — |
| DHA `42263` | < 0,01 [A] | — | 6,3 % | — | — |
| Sel `10004` | 0,027 [A] | 0,990197 | 13,5 % | 15,5172 % | 15,365125 |
| PRAL | 3,60190 [A/A/A/A/A] | 0,474093 | 10 % | 10,0000 % | 4,740930 |

Composantes absentes : EPA et DHA sous limite. Agrégat attendu :
**63,627915**.

### 7. Noix 15005 — partiel, complétude 74,8 %

| Composante | Valeur [confiance] | Alignement | Poids initial | Poids renormalisé | Contribution |
|---|---:|---:|---:|---:|---:|
| Protéines `25000` | 13,3 [A] | 0,511538 | 18 % | 25,0000 % | 12,788450 |
| Sucres `32000` | 3 [A] | 0,920266 | 9 % | 12,5000 % | 11,503322 |
| Fibres `34100` | 6,7 [A] | 0,744444 | 13,5 % | 18,7500 % | 13,958333 |
| AG saturés `40302` | 6,45 [A] | 0,639665 | 9 % | 12,5000 % | 7,995810 |
| AG monoinsaturés `40303` | 14,1 [A] | 0,933775 | 4,5 % | 6,2500 % | 5,836093 |
| AG polyinsaturés `40304` | 43,6 [A] | 1,000000 | 4,5 % | 6,2500 % | 6,250000 |
| ALA `41833` | 7,5 [A] | 1,000000 | 6,3 % | 8,7500 % | 8,750000 |
| EPA `42053` | < 0,01 [A] | — | 5,4 % | — | — |
| DHA `42263` | < 0,01 [A] | — | 6,3 % | — | — |
| Sel `10004` | < 0,13 [A] | — | 13,5 % | — | — |
| PRAL | 6,19200 [A/A/A/A/A] | 0,363374 | 10 % | 10,0000 % | 3,633741 |

Composantes absentes : EPA, DHA et sel sous limite. Agrégat attendu :
**70,715749**.

### 8. Flocons d'avoine 32140 — complet, complétude 100 %

| Composante | Valeur [confiance] | Alignement | Poids initial | Poids renormalisé | Contribution |
|---|---:|---:|---:|---:|---:|
| Protéines `25000` | 10,6 [A] | 0,407692 | 18 % | 18,0000 % | 7,338451 |
| Sucres `32000` | 1,04 [D] | 0,972359 | 9 % | 9,0000 % | 8,751229 |
| Fibres `34100` | 11,2 [A] | 1,000000 | 13,5 % | 13,5000 % | 13,500000 |
| AG saturés `40302` | 1,37 [D] | 0,923464 | 9 % | 9,0000 % | 8,311173 |
| AG monoinsaturés `40303` | 3,46 [D] | 0,229139 | 4,5 % | 4,5000 % | 1,031126 |
| AG polyinsaturés `40304` | 2,99 [D] | 0,477598 | 4,5 % | 4,5000 % | 2,149189 |
| ALA `41833` | 0,065 [D] | 0,093727 | 6,3 % | 6,3000 % | 0,590483 |
| EPA `42053` | 0 [C] | 0,000000 | 5,4 % | 5,4000 % | 0,000000 |
| DHA `42263` | 0 [C] | 0,000000 | 6,3 % | 6,3000 % | 0,000000 |
| Sel `10004` | 0,011 [A] | 0,997076 | 13,5 % | 13,5000 % | 13,460530 |
| PRAL | 8,72000 [A/A/A/B/C] | 0,255310 | 10 % | 10,0000 % | 2,553097 |

Agrégat attendu non arrondi intermédiaire : **57,685279**.

### 9. Pain complet 7110 — partiel, complétude 88,3 %

| Composante | Valeur [confiance] | Alignement | Poids initial | Poids renormalisé | Contribution |
|---|---:|---:|---:|---:|---:|
| Protéines `25000` | 8,66 [A] | 0,333076 | 18 % | 20,6897 % | 6,891233 |
| Sucres `32000` | 2,41 [A] | 0,935947 | 9 % | 10,3448 % | 9,682209 |
| Fibres `34100` | 7,3 [A] | 0,811111 | 13,5 % | 15,5172 % | 12,586207 |
| AG saturés `40302` | 0,56 [A] | 0,968715 | 9 % | 10,3448 % | 10,021191 |
| AG monoinsaturés `40303` | 0,31 [A] | 0,020530 | 4,5 % | 5,1724 % | 0,106189 |
| AG polyinsaturés `40304` | 0,74 [A] | 0,118201 | 4,5 % | 5,1724 % | 0,611387 |
| ALA `41833` | 0,052 [A] | 0,074982 | 6,3 % | 7,2414 % | 0,542973 |
| EPA `42053` | < 0,002 [A] | — | 5,4 % | — | — |
| DHA `42263` | < 0,002 [A] | — | 6,3 % | — | — |
| Sel `10004` | 1,17 [A] | 0,498753 | 13,5 % | 15,5172 % | 7,739273 |
| PRAL | 2,75360 [A/A/A/A/A] | 0,510355 | 10 % | 10,0000 % | 5,103552 |

Composantes absentes : EPA et DHA sous limite. Agrégat attendu :
**53,284213**.

### 10. Brocoli 20351 — partiel, complétude 88,3 %

| Composante | Valeur [confiance] | Alignement | Poids initial | Poids renormalisé | Contribution |
|---|---:|---:|---:|---:|---:|
| Protéines `25000` | 3,17 [D] | 0,121922 | 18 % | 20,6897 % | 2,522529 |
| Sucres `32000` | 1,06 [D] | 0,971827 | 9 % | 10,3448 % | 10,053385 |
| Fibres `34100` | 2,59 [D] | 0,287778 | 13,5 % | 15,5172 % | 4,465517 |
| AG saturés `40302` | 0,2 [D] | 0,988827 | 9 % | 10,3448 % | 10,229243 |
| AG monoinsaturés `40303` | 0,17 [D] | 0,011258 | 4,5 % | 5,1724 % | 0,058232 |
| AG polyinsaturés `40304` | 0,19 [D] | 0,030349 | 4,5 % | 5,1724 % | 0,156978 |
| ALA `41833` | 0,12 [D] | 0,173035 | 6,3 % | 7,2414 % | 1,253014 |
| EPA `42053` | < 0,01 [D] | — | 5,4 % | — | — |
| DHA `42263` | < 0,01 [D] | — | 6,3 % | — | — |
| Sel `10004` | 0,036 [D] | 0,986327 | 13,5 % | 15,5172 % | 15,305079 |
| PRAL | -1,89590 [D/D/D/D/D] | 0,709107 | 10 % | 10,0000 % | 7,091073 |

Composantes absentes : EPA et DHA sous limite. Agrégat attendu :
**51,135050**.

### 11. Épinards 20027 — partiel, complétude 84,7 %

| Composante | Valeur [confiance] | Alignement | Poids initial | Poids renormalisé | Contribution |
|---|---:|---:|---:|---:|---:|
| Protéines `25000` | 3,2 [A] | 0,123076 | 18 % | 21,6867 % | 2,669120 |
| Sucres `32000` | traces [A] | — | 9 % | — | — |
| Fibres `34100` | 2,7 [A] | 0,300000 | 13,5 % | 16,2651 % | 4,879518 |
| AG saturés `40302` | 0,054 [D] | 0,996983 | 9 % | 10,8434 % | 10,810662 |
| AG monoinsaturés `40303` | 0,0045 [D] | 0,000298 | 4,5 % | 5,4217 % | 0,001616 |
| AG polyinsaturés `40304` | 0,082 [D] | 0,013098 | 4,5 % | 5,4217 % | 0,071013 |
| ALA `41833` | absent | — | 6,3 % | — | — |
| EPA `42053` | 0 [C] | 0,000000 | 5,4 % | 6,5060 % | 0,000000 |
| DHA `42263` | 0 [C] | 0,000000 | 6,3 % | 7,5904 % | 0,000000 |
| Sel `10004` | 0,069 [A] | 0,972139 | 13,5 % | 16,2651 % | 15,811893 |
| PRAL | -8,50240 [A/A/A/A/A] | 0,991515 | 10 % | 10,0000 % | 9,915152 |

Composantes absentes : sucres en traces et ALA absent. Agrégat attendu :
**44,158973**.

### 12. Myrtille 13028 — partiel, complétude 93,7 %

| Composante | Valeur [confiance] | Alignement | Poids initial | Poids renormalisé | Contribution |
|---|---:|---:|---:|---:|---:|
| Protéines `25000` | 0,87 [B] | 0,033461 | 18 % | 19,3548 % | 0,647625 |
| Sucres `32000` | 9,96 [B] | 0,735282 | 9 % | 9,6774 % | 7,115636 |
| Fibres `34100` | 2,4 [B] | 0,266667 | 13,5 % | 14,5161 % | 3,870968 |
| AG saturés `40302` | 0,028 [C] | 0,998436 | 9 % | 9,6774 % | 9,662281 |
| AG monoinsaturés `40303` | 0,047 [C] | 0,003113 | 4,5 % | 4,8387 % | 0,015061 |
| AG polyinsaturés `40304` | 0,15 [C] | 0,023960 | 4,5 % | 4,8387 % | 0,115934 |
| ALA `41833` | absent | — | 6,3 % | — | — |
| EPA `42053` | 0 [C] | 0,000000 | 5,4 % | 5,8065 % | 0,000000 |
| DHA `42263` | 0 [C] | 0,000000 | 6,3 % | 6,7742 % | 0,000000 |
| Sel `10004` | 0,0025 [B] | 1,000000 | 13,5 % | 14,5161 % | 14,516129 |
| PRAL | -0,98070 [B/B/B/B/B] | 0,669985 | 10 % | 10,0000 % | 6,699853 |

Composante absente : ALA. Agrégat attendu : **42,643487**.

## Contrôles de cohérence

- Poids effectifs originaux : 100 %, dont nutrition 90 % et PRAL 10 %.
- Noyau obligatoire exact : 12/12 vedettes.
- Profils complets : 2/12 ; profils partiels : 10/12 ; profils insuffisants : 0.
- Alignements et agrégats : bornés entre 0 et 1, puis 0 et 100.
- Aucune valeur absente, trace ou sous limite convertie en zéro.
- Aucun PRAL produit pour les huiles d'olive et de colza dont au moins un
  intrant est non exact.
- Glucides 31000 et sodium 10110 demeurent descriptifs, sans poids ni
  contribution.

## Gate de signature restant

Avis sur les vecteurs pondérés : **À SIGNER**.

Le praticien doit valider, corriger ou refuser la référence
`C5-LOT01-VECTEURS-2026-07-18-v1` en citant également son hash
`preuve_git_vecteurs` inscrit dans `REVUE_PRATICIEN_LOT-01.md`. Cette signature
seule permettra de proposer la clôture de LOT-01. C5 reste inactive à 1/8.
