---
id: "c5-lot-01-dossier-mapping-clinique"
lot: "LOT-01"
statut: "validé — seconde_passe_documentaire_en_revue"
date: "2026-07-18"
---

# C5 LOT-01 — dossier de mapping clinique validé

## Statut et portée

Ce dossier fixe le mapping intrinsèque validé du seul besoin de niveau 1
« équilibre de l'assiette ». Sa validation autorise uniquement la seconde passe
documentaire de LOT-01 ; elle n'autorise ni code, ni seed, ni migration, ni
import, ni calcul patient.

- axisCode validé : **equilibre_assiette**
- datasetVersion validée : **ciqual-2025-v1**
- mappingVersion validée : **c5a-b1-mapping-v1**
- scoreVersion validée : **c5a-b1-score-v1**
- pralFormulaVersion validée : **c5a-pral-remer-manz-v1**
- niveau de preuve WellNeuro validé : **B**
- statut de ces identifiants : validés, non activés

Les codes de confiance A à D fournis par Ciqual qualifient la fiabilité d'une
teneur nutritionnelle. Ils sont distincts du niveau de preuve clinique
WellNeuro et ne doivent jamais être fusionnés.

## Sources officielles vérifiées

| Source | Version | Fichier utilisé | Empreinte MD5 vérifiée |
|---|---|---|---|
| [Table Ciqual 2025](https://entrepot.recherche.data.gouv.fr/dataset.xhtml?persistentId=doi:10.57745/RDMHWY) | V1, publiée le 2025-11-19 | const_2025_11_03.xml | d8f2f25fdacb887bc993a6eeaf80f203 |
| même dataset | V1 | alim_2025_11_03.xml | 8e1171d63cee4b6010cfce25dd29243d |
| même dataset | V1 | compo_2025_11_03.xml | 2da725585946434df320d8041631998b |
| [Table des aliments moyens Ciqual 2025](https://entrepot.recherche.data.gouv.fr/dataset.xhtml?persistentId=doi:10.57745/XOJCLN) | V1, publiée le 2025-11-19 | fichier XLSX original | fd6ce9246cd93594ef9004337111fafb |

La table principale contient 3 484 aliments et 74 constituants. Les fichiers
ont été téléchargés dans un dossier temporaire uniquement ; aucune donnée brute
Ciqual n'est ajoutée au dépôt. Attribution à conserver : « Anses. 2025. Table
de composition nutritionnelle des aliments Ciqual ».

## Matrice de justification clinique des liaisons

Le niveau **B** ci-dessous est un niveau de preuve WellNeuro attaché à la
liaison clinique. Il ne remplace pas le `code_confiance` A à D de chaque teneur
Ciqual. Les directions et les poids restent des décisions de gouvernance
WellNeuro : aucune source externe citée ne prescrit ces coefficients.

| Liaison | Direction validée | Source primaire | Preuve WN | Limite d'interprétation |
|---|---|---|:---:|---|
| Protéines 25000 | favorable | [Anses — rôle et apports recommandés](https://www.anses.fr/fr/content/proteines-role-sources-et-apports-recommandes) | B | La référence d'apport ne prescrit ni une relation alimentaire monotone ni le poids WellNeuro de 18 %. |
| Sucres 32000 | limitante | [Anses — sucres dans l'alimentation](https://www.anses.fr/fr/content/sucres-dans-lalimentation) | B | Le constituant Ciqual est un proxy intrinsèque WellNeuro ; il ne doit pas être présenté comme une mesure des seuls sucres libres. |
| Fibres 34100 | favorable | [Anses — références nutritionnelles, rapport fibres](https://anses.fr/fr/system/files/NUT2012SA0103Ra-2.pdf) | B | L'apport satisfaisant de 30 g/j soutient la direction, pas un objectif par aliment ni le poids de 13,5 %. |
| AG saturés 40302 | limitante | [Anses — lipides](https://www.anses.fr/fr/content/les-lipides) | B | Les AG saturés n'ont pas tous les mêmes effets ; C5 utilise le total Ciqual comme marqueur de modèle. |
| AG monoinsaturés 40303 | favorable | [Anses — lipides](https://www.anses.fr/fr/content/les-lipides) | B | La référence Anses porte notamment sur l'acide oléique ; le total AGMI n'est pas une prescription monotone. |
| AG polyinsaturés 40304 | favorable | [Anses — lipides](https://www.anses.fr/fr/content/les-lipides) | B | Le total AGPI agrège plusieurs acides gras ; la direction est une convention clinique WellNeuro bornée par le clamp. |
| ALA 41833 | favorable | [Anses — lipides](https://www.anses.fr/fr/content/les-lipides) | B | La référence d'apport adulte ne prescrit pas le poids WellNeuro de 6,3 %. |
| EPA 42053 | favorable | [Anses — lipides](https://www.anses.fr/fr/content/les-lipides) | B | La référence d'apport adulte ne prescrit pas le poids WellNeuro de 5,4 %. |
| DHA 42263 | favorable | [Anses — lipides](https://www.anses.fr/fr/content/les-lipides) | B | La référence d'apport adulte ne prescrit pas le poids WellNeuro de 6,3 %. |
| Sel 10004 | limitante | [Anses — références nutritionnelles du sodium](https://www.anses.fr/fr/content/les-references-nutritionnelles-en-vitamines-et-mineraux) | B | Le sel 10004 est le repère exclusif décidé par le gate ; le sodium 10110 reste descriptif et n'est pas réintroduit dans le score. |
| PRAL dérivé | limitante | [Remer–Manz, 1995](https://pubmed.ncbi.nlm.nih.gov/7797810/) | B | Marqueur dérivé facultatif, jamais un aliment, une recommandation autonome ou une mesure clinique patient. |

Ces liaisons servent uniquement au profil intrinsèque `equilibre_assiette`.
Elles ne remplacent ni l'analyse de la ration quotidienne, ni le contexte C5B,
ni la décision du praticien.

## Inventaire des constituants et décisions validées

| Code | Libellé Ciqual et unité | INFOODS | Direction décidée | Inclusion/obligation | Poids effectif | Justification issue du LOT-00 |
|---|---|---|---|---|---|---|
| 25000 | Protéines, N × facteur de Jones (g/100 g) | PROCNT | favorable | incluse ; obligatoire | 18 % | densité protéique |
| 31000 | Glucides (g/100 g) | CHOAVL | descriptive, sans direction de score | exclue du score | — | variable descriptive de qualité glucidique |
| 32000 | Sucres (g/100 g) | SUGAR | limitant | inclus ; facultatif | 9 % | part des sucres simples |
| 34100 | Fibres alimentaires (g/100 g) | FIB- | favorable | incluses ; obligatoires | 13,5 % | densité en fibres |
| 40302 | AG saturés (g/100 g) | FASAT | limitant | inclus ; obligatoires | 9 % | qualité lipidique |
| 40303 | AG monoinsaturés (g/100 g) | FAMS | favorable | inclus ; obligatoires | 4,5 % | qualité lipidique |
| 40304 | AG polyinsaturés (g/100 g) | FAPU | favorable | inclus ; obligatoires | 4,5 % | qualité lipidique |
| 41833 | AG 18:3 n-3 alpha-linolénique, ALA (g/100 g) | F18D3N3 | favorable | inclus ; facultatif | 6,3 % | oméga-3 végétal |
| 42053 | AG 20:5 n-3, EPA (g/100 g) | F20D5N3 | favorable | inclus ; facultatif | 5,4 % | oméga-3 marin |
| 42263 | AG 22:6 n-3, DHA (g/100 g) | F22D6N3 | favorable | inclus ; facultatif | 6,3 % | oméga-3 marin |
| 10004 | Sel chlorure de sodium (g/100 g) | aucun | limitant | inclus ; facultatif | 13,5 % | repère sel retenu |
| 10110 | Sodium (mg/100 g) | NA | descriptif, sans direction de score | exclu du score | — | exclu au profit du sel 10004 |

Les directions, poids et statuts obligatoire/facultatif sont des décisions de
gouvernance clinique WellNeuro validées le 2026-07-18 ; ils ne sont pas des
coefficients prescrits par l'Anses. Le statut obligatoire/facultatif décrit la
disponibilité minimale du calcul et non l'importance clinique. Les glucides
31000 et le sodium 10110 sont exclus du score et conservés comme données
descriptives seulement.

## Couverture du noyau obligatoire

Le calcul a été reproduit sur `compo_2025_11_03.xml`, MD5
`2da725585946434df320d8041631998b`. Une valeur est dite exacte uniquement si
`teneur` est numérique ; les absences, traces et valeurs sous limite restent
non numériques.

| Configuration | Constituants obligatoires | Aliments couverts | Vedettes couvertes |
|---|---|---:|---:|
| Tous les constituants nutritionnels pondérés | 25000, 32000, 34100, 40302, 40303, 40304, 41833, 42053, 42263, 10004 | 629/3 484 — 18,1 % | 2/12 |
| Noyau obligatoire validé | 25000, 34100, 40302, 40303, 40304 | 2 385/3 484 — 68,5 % | 12/12 |

Les sucres, ALA, EPA, DHA et le sel restent pondérés lorsqu'ils sont exacts,
mais leur absence ne rend pas le noyau intrinsèque indisponible. Le PRAL reste
facultatif selon sa politique spécifique.

## Pondération validée pour `equilibre_assiette`

Le contrat de score est composé de 90 % de profil nutritionnel et de 10 % de
PRAL. Le sous-profil nutritionnel est d'abord calculé sur une base interne de
100 %, puis multiplié par 0,90.

| Composante | Poids interne du profil nutritionnel | Poids effectif final |
|---|---:|---:|
| Protéines 25000 | 20 % | 18 % |
| Sucres 32000 | 10 % | 9 % |
| Fibres 34100 | 15 % | 13,5 % |
| AG saturés 40302 | 10 % | 9 % |
| AG monoinsaturés 40303 | 5 % | 4,5 % |
| AG polyinsaturés 40304 | 5 % | 4,5 % |
| ALA 41833 | 7 % | 6,3 % |
| EPA 42053 | 6 % | 5,4 % |
| DHA 42263 | 7 % | 6,3 % |
| Sel 10004 | 15 % | 13,5 % |
| **Sous-total nutritionnel** | **100 %** | **90 %** |
| PRAL Remer–Manz, dérivé | hors sous-profil | 10 % |
| **Total effectif** | — | **100 %** |

Glucides 31000 et sodium 10110 : poids absent, contribution au score nulle.
Le PRAL est facultatif et plafonné à 10 % afin de borner le double comptage de
la protéine, qui intervient également dans sa formule.

## Marqueur PRAL Remer–Manz

Source scientifique retenue : Remer T, Manz F. *Potential renal acid load of
foods and its influence on urine pH*, 1995
([PubMed](https://pubmed.ncbi.nlm.nih.gov/7797810/)). Pour des teneurs exactes
rapportées à 100 g, la formule documentée est :

`pral100g = 0,49 × protéines(g) + 0,037 × phosphore(mg) − 0,021 × potassium(mg) − 0,026 × magnésium(mg) − 0,013 × calcium(mg)`

Les codes et unités ont été résolus sans approximation dans le référentiel
officiel `const_2025_11_03.xml`, dont l'empreinte figure plus haut :

| Intrant PRAL | Code Ciqual 2025 | Unité exacte |
|---|---:|---|
| Protéines | 25000 | g/100 g |
| Magnésium | 10120 | mg/100 g |
| Phosphore | 10150 | mg/100 g |
| Potassium | 10190 | mg/100 g |
| Calcium | 10200 | mg/100 g |

Pour C5A, `pral100g` est exprimé en mEq/100 g. La seconde passe a calculé la
distribution PRAL sur la table complète Ciqual 2025 V1, uniquement pour les
aliments dont les cinq intrants sont des valeurs numériques exactes :

- PRAL calculable : **2 347/3 484 aliments**, soit **67,4 %** ;
- PRAL indisponible : **1 137/3 484 aliments**, sans imputation ;
- `p5Pral = -8,70089 mEq/100 g` ;
- `p95Pral = 14,69258 mEq/100 g` ;
- quantiles par interpolation linéaire au rang `(n - 1) x p` ;
- valeurs absentes, `traces` et `< x` exclues, jamais converties en zéro.

La normalisation est
`nPral = clamp((pral100g − p5Pral) / (p95Pral − p5Pral), 0, 1)` puis la
contribution alignée est inversée : `pralAlignment = 1 − nPral`. Une valeur
PRAL plus basse est donc plus favorable dans ce seul axe.

Lorsque le PRAL est disponible :

`foodAlignment = 0,90 × nutrientProfile + 0,10 × pralAlignment`

Pour une assiette C5B composée d'aliments j et de portions validées en grammes :

- `pralTotalMeq = Σ(pral100g_j × grammes_j / 100)` ;
- `pralDensityMeqPer100g = pralTotalMeq / grammesTotaux × 100`.

Les deux valeurs sont conservées : le total est un fait d'assiette et la
densité, pondérée par les masses, est utilisée pour l'alignement normalisé avec
les mêmes bornes p5/p95 PRAL issues de la distribution Ciqual. Le calcul exige
un `grammesTotaux` fini et strictement positif. Si un aliment ne possède pas
les cinq intrants PRAL exacts ou si sa portion n'est pas valide, aucun PRAL
partiel d'assiette n'est produit.

Dans ce cas, `pralStatus = insufficient_data`, sans conversion en zéro ni
imputation. Si le PRAL est la seule composante indisponible, le sous-profil
nutritionnel de 90 % est renormalisé à 100 %, le profil global prend le statut
`partial_data` et la complétude vaut 90 %. Si une autre composante facultative
manque également, la complétude est la somme des poids effectifs originaux
réellement disponibles, donc inférieure à 90 %, puis ces poids sont
renormalisés. Si une composante obligatoire manque, le profil global est
`insufficient_data` et aucun score agrégé n'est produit, quel que soit le
statut PRAL.

La formule PRAL est versionnée sous **c5a-pral-remer-manz-v1**. Elle n'est pas
activée par ce document.

## Fixtures documentaires de calcul

Ces fixtures synthétiques vérifient uniquement la mécanique ; elles ne
représentent ni un aliment Ciqual, ni un patient, ni un seuil clinique.

1. **Formule PRAL** — protéines 10 g, phosphore 200 mg, potassium 400 mg,
   magnésium 50 mg, calcium 100 mg donnent
   `4,9 + 7,4 − 8,4 − 1,3 − 1,3 = 1,3 mEq/100 g`.
2. **Inversion** — avec des bornes synthétiques p5 = −5 et p95 = 10,
   `nPral = 0,42` et `pralAlignment = 0,58` pour un PRAL de 1,3.
3. **Ratio 90/10** — un sous-profil nutritionnel de 0,70 et un alignement PRAL
   de 0,58 donnent `0,90 × 0,70 + 0,10 × 0,58 = 0,688`.
4. **Assiette** — 150 g à 1,3 mEq/100 g et 100 g à −2 mEq/100 g donnent
   `pralTotalMeq = −0,05 mEq` et
   `pralDensityMeqPer100g = −0,02 mEq/100 g` pour 250 g.
5. **Intrant manquant** — un intrant PRAL absent, en trace ou sous limite donne
   `insufficient_data` ; aucun total ni densité partiels ne sont exposés. Un
   sous-profil nutritionnel de 0,70 reste 0,70 après renormalisation
   (`0,90 × 0,70 / 0,90`) et la complétude vaut 90 %.

## Population et percentiles

Pour chaque constituant, les percentiles sont calculés séparément sur les
3 484 aliments de la table complète Ciqual 2025 V1.

- Seules les teneurs numériques exactes sont retenues, y compris zéro.
- « - » ou valeur absente devient **missing**.
- « traces » devient **trace**.
- « < x » devient **below_limit**.
- trace et below_limit ne sont jamais remplacés par zéro, x ou x/2.
- Quantile déterministe par interpolation linéaire au rang (n − 1) × p.
- Arrondi documentaire à six décimales au maximum ; le calcul source conserve
  la précision numérique complète.

| Code | Constituant | Numériques | Absentes | Traces | < limite | Couverture | p5 | p95 |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| 25000 | Protéines | 3 451 | 29 | 4 | 0 | 99,1 % | 0,000025 | 26 |
| 31000 | Glucides | 3 272 | 70 | 134 | 8 | 93,9 % | 0 | 69,645 |
| 32000 | Sucres | 2 996 | 223 | 205 | 60 | 86,0 % | 0 | 37,625 |
| 34100 | Fibres | 3 239 | 70 | 45 | 130 | 93,0 % | 0 | 9 |
| 40302 | AG saturés | 3 093 | 248 | 8 | 135 | 88,8 % | 0 | 17,9 |
| 40303 | AG monoinsaturés | 2 567 | 764 | 9 | 144 | 73,7 % | 0 | 15,1 |
| 40304 | AG polyinsaturés | 2 554 | 774 | 9 | 147 | 73,3 % | 0 | 6,2605 |
| 41833 | ALA | 1 892 | 1 377 | 3 | 212 | 54,3 % | 0 | 0,6935 |
| 42053 | EPA | 1 636 | 936 | 2 | 910 | 47,0 % | 0 | 0,29 |
| 42263 | DHA | 1 560 | 959 | 10 | 955 | 44,8 % | 0 | 0,48 |
| 10004 | Sel | 3 141 | 190 | 2 | 151 | 90,2 % | 0,0042 | 2,33 |
| 10110 | Sodium | 2 929 | 402 | 4 | 149 | 84,1 % | 1,74 | 945,6 |

Les couvertures faibles d'ALA, EPA et DHA justifient leur statut facultatif de
disponibilité. Elles ne diminuent ni leur poids validé lorsqu'une valeur exacte
est disponible, ni leur importance clinique.

## Formule appliquée dans la seconde passe

Pour une teneur numérique exacte x du constituant i :

1. normalisation : nᵢ = clamp((xᵢ − p5ᵢ) / (p95ᵢ − p5ᵢ), 0, 1) ;
2. direction favorable : aᵢ = nᵢ ;
3. direction limitante : aᵢ = 1 − nᵢ ;
4. direction non validée : conserver nᵢ sans produire aᵢ ;
5. donnée non numérique : composante indisponible, jamais imputée.

La normalisation est faite avant pondération afin de rendre comparables les
grammes et milligrammes. Pour un profil dont le noyau obligatoire est complet :

1. `availableWeight = somme(w_i)` pour les seules composantes exactes ;
2. `renormalizedWeight_i = w_i / availableWeight x 100` ;
3. `weightedContribution_i = a_i x renormalizedWeight_i` ;
4. `expectedAggregate = somme(weightedContribution_i)`.

Les agrégats à six décimales et les contributions attendues sont consignés
dans `VECTEURS_12_VEDETTES_LOT-01.md`. Ce sont des fixtures praticien soumises
à signature, jamais des scores patient ni un classement alimentaire.

## Politique validée de données manquantes

- Toute composante obligatoire non numérique rend le profil
  **insufficient_data** et interdit le score agrégé.
- Une composante facultative non numérique produit **partial_data** : aucune
  imputation, renormalisation sur les poids disponibles, complétude pondérée et
  liste explicite des composantes absentes.
- `completenessPct` est la somme des poids effectifs originaux des composantes
  disponibles sur 100, calculée avant toute renormalisation.
- Une composante exclue ne participe ni au numérateur ni au dénominateur.
- p95 = p5 rend le constituant non normalisable et bloque la version.
- Aucun classement n'est autorisé entre profils calculés avec des ensembles de
  composantes différents.
- Aucun profil partiel n'est diffusé automatiquement au patient.
- La règle PRAL spécifique reste prioritaire lorsque seul le PRAL manque :
  profil nutritionnel renormalisé et complétude fixée à 90 %.

## Versionnement append-only validé à transmettre à LOT-02

L'identité clinique est le couple **axisCode + mappingVersion**. Le
schéma actuel rend axisCode unique et ne peut donc pas conserver plusieurs
versions append-only du même axe. LOT-01 ne modifie pas le schéma.

LOT-02 devra présenter, dans son gate migration, une évolution Prisma qui :

- conserve axisCode stable ;
- rend l'identité de NeuroAxis composite avec mappingVersion ;
- rattache chaque NutrientAxisWeight à la même version composite ;
- interdit deux lignes d'un même nutrientCode pour un axe et une version ;
- ne réécrit ni ne supprime une version publiée.

Toute évolution de `datasetVersion`, `mappingVersion`, `scoreVersion` ou
`pralFormulaVersion` rend les profils et diffusions antérieurs `stale` sans les
supprimer et impose une nouvelle validation avant diffusion.

Les identifiants validés sont figés. Ils ne deviennent ni publiables ni
activables avant la signature des vecteurs pondérés rattachés à la référence
`C5-LOT01-VECTEURS-2026-07-18-v1`.

## Gate clinique acquis

Martial CAYRE, praticien valideur responsable de la gouvernance clinique
WellNeuro, a validé le présent contrat le 2026-07-18 sous la référence
**C5-LOT01-VALIDATION-MC-2026-07-18-v1**.

La seconde passe a calculé les p5/p95 PRAL réels, produit les vecteurs pondérés
attendus des 12 vedettes, rattaché les sources et niveaux de preuve et consigné
le changement clinique documentaire dans `CHANGELOG.md`. Les vecteurs restent
**à signer** par Martial CAYRE sous la référence
`C5-LOT01-VECTEURS-2026-07-18-v1`. LOT-01 n'est pas terminé et C5 reste
inactive à 1/8.
