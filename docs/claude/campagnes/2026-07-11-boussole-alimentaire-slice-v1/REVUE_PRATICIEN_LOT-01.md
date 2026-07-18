---
id: "c5-lot-01-revue-praticien"
lot: "LOT-01"
statut: "validé — seconde_passe_documentaire_en_revue"
date_préparation: "2026-07-18"
date_avis: "2026-07-18"
valideur: "Martial CAYRE"
role_valideur: "praticien valideur responsable de la gouvernance clinique WellNeuro"
validation_ref: "C5-LOT01-VALIDATION-MC-2026-07-18-v1"
preuve_git: "20c4119be10cc67c9be875746647b9a4bfe54004"
clarification_git: "471f71461f74e9eabdedabc02f9e6e35d529d138"
vecteurs_ref: "C5-LOT01-VECTEURS-2026-07-18-v1"
avis_gate_clinique: "VALIDÉ"
avis_vecteurs_pondérés: "À SIGNER"
preuve_git_vecteurs: "fb138bd784431713c26d0e4d93053189c3359d99"
---

# C5 LOT-01 — revue praticien du mapping clinique

## Objet du gate

Cette revue autorise uniquement la fixation documentaire du mapping du besoin 1.
Elle n'autorise pas le code, la migration, l'import Ciqual, l'activation C5 ou
la diffusion patient.

Documents à relire ensemble :

1. DOSSIER_MAPPING_CLINIQUE_LOT-01.md ;
2. VECTEURS_12_VEDETTES_LOT-01.md ;
3. SPEC_SLICE_BESOIN_1_LOT-00.md ;
4. GUIDE_12_BESOINS_NEURONUTRITION.md, besoin 1.

## Contrôles préalables

- [x] Dataset officiel Ciqual 2025 V1 identifié.
- [x] Empreintes des fichiers source vérifiées.
- [x] Distribution complète de 3 484 aliments utilisée.
- [x] Teneurs absentes, traces et sous limite exclues sans imputation.
- [x] Aucun poids numérique déduit par l'agent ; la pondération ci-dessous
      provient de la décision explicite de gouvernance clinique.
- [x] Aucun score patient ni classement produit ; les agrégats pondérés de la
      seconde passe sont uniquement des fixtures praticien soumises à signature.
- [x] Aucun code, schéma, SQL, import ou activation modifié.

## Remarques consignées pendant la revue praticien

### Portée des 12 vedettes

Le praticien estime qu'un catalogue limité à 12 aliments vedettes est trop
restreint au regard du corpus SIIN disponible. Les 12 références examinées dans
LOT-01 doivent donc être comprises comme une **cohorte pilote de validation du
moteur**, et non comme une limite fonctionnelle ou clinique du catalogue C5.

Corrections intégrées avant l'avis final **VALIDÉ** :

- [x] conserver les 12 références comme manifeste pilote de LOT-01 ;
- [x] maintenir le catalogue clinique C5 extensible après audit,
      validation, sourçage et versionnement de chaque nouvelle fiche ;
- [x] organiser les fiches éditoriales par familles alimentaires tout en
      conservant une référence Ciqual exacte pour chaque profil calculé ;
- [x] limiter la restitution patient aux aliments explicitement intégrés dans
      un protocole validé, sans limiter le catalogue praticien à ces 12 entrées.

L'audit préparatoire du dossier SIIN partagé a identifié 40 PDF, dont un
doublon, soit 39 documents uniques. Ce corpus reste un matériau historique :
son inventaire ne vaut ni validation clinique des affirmations, ni autorisation
d'exposition patient.

### Place de l'indice PRAL

Décision d'orientation explicitement formulée par le praticien :

- [x] l'indice PRAL n'est **pas un aliment** ;
- [x] il ne doit jamais être ajouté au manifeste des vedettes ni recevoir un
      code aliment Ciqual ;
- [x] il doit être étudié comme **marqueur dérivé supplémentaire** dans le
      calcul de l'axe `equilibre_assiette`.

Décisions de calcul consignées le 2026-07-18 :

- [x] formule PRAL de Remer–Manz retenue et source scientifique identifiée ;
- [x] intrants exacts fixés : protéines en g/100 g, phosphore, potassium,
      magnésium et calcium en mg/100 g ;
- [x] calcul C5A par 100 g puis agrégation C5B selon les portions validées ;
- [x] direction limitante, normalisation p5/p95 inversée, caractère facultatif
      et poids effectif plafonné à 10 % validés ;
- [x] double comptage des protéines borné par une architecture 90 % profil
      nutritionnel / 10 % PRAL ;
- [x] formule versionnée sous **c5a-pral-remer-manz-v1**.

La formule et sa gouvernance sont détaillées dans
DOSSIER_MAPPING_CLINIQUE_LOT-01.md. Cette validation documentaire n'active pas
le marqueur et n'autorise encore aucun vecteur pondéré final.

## Décision sur les références des 12 vedettes

Pour chaque ligne, le praticien doit cocher une décision. Tout remplacement doit
indiquer un code Ciqual 2025 exact et une justification.

| Vedette | Code candidat | Accepter | Remplacer | Refuser | Code de remplacement et justification |
|---|---:|:---:|:---:|:---:|---|
| Sardine en conserve, égouttée | 26034 | [x] | [ ] | [ ] | référence acceptée |
| Maquereau | 26051 | [x] | [ ] | [ ] | référence acceptée ; 26019 et 26123 non retenus |
| Huile d'olive vierge extra | 17270 | [x] | [ ] | [ ] | référence acceptée |
| Huile de colza | 17130 | [x] | [ ] | [ ] | référence acceptée |
| Lentilles cuites, aliment moyen | 20360 | [x] | [ ] | [ ] | référence acceptée |
| Pois chiches cuits | 20507 | [x] | [ ] | [ ] | référence acceptée |
| Noix | 15005 | [x] | [ ] | [ ] | référence acceptée |
| Flocons d'avoine | 32140 | [x] | [ ] | [ ] | référence acceptée |
| Pain complet | 7110 | [x] | [ ] | [ ] | référence acceptée |
| Brocoli cuit, aliment moyen | 20351 | [x] | [ ] | [ ] | référence acceptée |
| Épinards cuits | 20027 | [x] | [ ] | [ ] | référence acceptée ; 20336 non retenu |
| Myrtille crue | 13028 | [x] | [ ] | [ ] | référence acceptée |

Décision du 2026-07-18 : les 12 références candidates sont acceptées sans
exception. Elles restent une cohorte pilote et ne bornent pas le futur
catalogue C5.

## Décision sur les constituants

Chaque constituant retenu doit avoir une direction, un statut
obligatoire/facultatif et un poids numérique validés. Un constituant exclu ne
reçoit aucun poids.

| Code | Constituant | Direction décidée | Inclure | Exclure | Obligatoire | Facultatif | Poids validé | Commentaire/source clinique |
|---|---|---|:---:|:---:|:---:|:---:|---|---|
| 25000 | Protéines | favorable — validée | [x] | [ ] | [x] | [ ] | 18 % | noyau obligatoire validé |
| 31000 | Glucides | descriptif, sans direction de score | [ ] | [x] | [ ] | [ ] | — | conservé comme donnée descriptive uniquement |
| 32000 | Sucres | limitant — validée | [x] | [ ] | [ ] | [x] | 9 % | facultatif, pondéré si exact |
| 34100 | Fibres | favorable — validée | [x] | [ ] | [x] | [ ] | 13,5 % | noyau obligatoire validé |
| 40302 | AG saturés | limitant — validée | [x] | [ ] | [x] | [ ] | 9 % | noyau obligatoire validé |
| 40303 | AG monoinsaturés | favorable — validée | [x] | [ ] | [x] | [ ] | 4,5 % | noyau obligatoire validé |
| 40304 | AG polyinsaturés | favorable — validée | [x] | [ ] | [x] | [ ] | 4,5 % | noyau obligatoire validé |
| 41833 | ALA | favorable — validée | [x] | [ ] | [ ] | [x] | 6,3 % | facultatif, pondéré si exact ; couverture numérique 54,3 % |
| 42053 | EPA | favorable — validée | [x] | [ ] | [ ] | [x] | 5,4 % | facultatif, pondéré si exact ; couverture numérique 47,0 % |
| 42263 | DHA | favorable — validée | [x] | [ ] | [ ] | [x] | 6,3 % | facultatif, pondéré si exact ; couverture numérique 44,8 % |
| 10004 | Sel | limitant — validée | [x] | [ ] | [ ] | [x] | 13,5 % | repère retenu ; facultatif, pondéré si exact |
| 10110 | Sodium | descriptif, sans direction de score | [ ] | [x] | [ ] | [ ] | — | exclu au profit du sel 10004 |
| dérivé | PRAL Remer–Manz | limitant — validée | [x] | [ ] | [ ] | [x] | 10 % | marqueur facultatif, jamais un aliment |

Décision du 2026-07-18 : pondération 90/10 et poids individuels validés. Les
poids effectifs totalisent 100 %. Avant application du ratio 90/10, le
sous-profil nutritionnel totalise 100 % avec les poids internes suivants :
protéines 20 %, sucres 10 %, fibres 15 %, AG saturés 10 %, AG
monoinsaturés 5 %, AG polyinsaturés 5 %, ALA 7 %, EPA 6 %, DHA 7 % et sel
15 %. Les glucides et le sodium ne reçoivent aucun poids.

Le statut obligatoire/facultatif décrit la disponibilité minimale nécessaire
au calcul, et non l'importance clinique du constituant. Sur Ciqual 2025 V1, le
noyau obligatoire retenu couvre 2 385 aliments sur 3 484 et les 12 vedettes ;
rendre les dix constituants nutritionnels obligatoires limiterait la couverture
à 629 aliments et 2 vedettes.

Règles de cohérence du gate :

- exactement un choix inclure/exclure par ligne ;
- exactement un choix obligatoire/facultatif pour toute ligne incluse ;
- aucune obligation ni poids pour une ligne exclue ;
- un poids fini et strictement positif pour chaque ligne incluse, sous réserve
  de la règle facultative explicitement fixée pour le PRAL ;
- exactement un constituant retenu entre sel 10004 et sodium 10110 ;
- direction explicitement fixée pour glucides 31000 s'il est retenu ;
- règle de somme des poids documentée et vérifiable.

## Décision sur la normalisation

- [x] Valider le calcul séparé des p5/p95 par constituant sur la table complète.
- [x] Valider l'interpolation linéaire au rang (n − 1) × p.
- [x] Valider le clamp entre 0 et 1.
- [x] Valider l'inversion 1 − n pour une direction limitante.
- [x] Valider l'exclusion des valeurs absentes, traces et sous limite.
- [x] Valider l'absence de toute imputation.

Décision du 2026-07-18 : **normalisation validée sans correction**.

## Décision sur les données insuffisantes

Règle spécifique PRAL validée le 2026-07-18 : si un seul intrant exact manque,
aucune valeur n'est imputée et `pralStatus = insufficient_data`. Une assiette
contenant un aliment ou une portion PRAL non résolue ne produit ni PRAL total
ni PRAL partiel. `pralStatus` décrit le marqueur ; le statut du profil suit
alors la priorité suivante :

1. si une composante obligatoire manque, `profileStatus = insufficient_data`
   et aucun score agrégé n'est produit ;
2. si le PRAL est la seule composante indisponible, le profil nutritionnel de
   90 % est renormalisé à 100 %, `profileStatus = partial_data` et la
   complétude vaut 90 % ;
3. si le PRAL et une autre composante facultative manquent, le profil est
   `partial_data`, les poids disponibles sont renormalisés et la complétude est
   la somme de leurs poids effectifs originaux, donc strictement inférieure à
   90 %.

- [x] Une composante obligatoire non numérique produit insufficient_data.
- [x] Une composante exclue ne participe jamais au calcul.
- [x] Une borne p95 égale à p5 bloque la version.
- [x] Une nouvelle version de dataset, de mapping ou de formule invalide les
      profils et diffusions antérieurs.

Une composante facultative non numérique produit `partial_data`, sans
imputation. Les poids disponibles sont renormalisés, la complétude pondérée et
les composantes absentes sont exposées. Aucun classement n'est autorisé entre
profils calculés avec des ensembles de composantes différents et aucun profil
partiel n'est diffusé automatiquement au patient.

La complétude est la somme des poids effectifs originaux des composantes
disponibles, exprimée sur 100 avant toute renormalisation.

Décision du 2026-07-18 : **politique globale validée sans correction**.

## Décision sur les versions et la persistance future

- [x] Valider axisCode **equilibre_assiette**.
- [x] Valider datasetVersion **ciqual-2025-v1**.
- [x] Valider mappingVersion **c5a-b1-mapping-v1**.
- [x] Valider scoreVersion **c5a-b1-score-v1**.
- [x] Valider pralFormulaVersion **c5a-pral-remer-manz-v1**.
- [x] Valider l'identité append-only **axisCode + mappingVersion**.
- [x] Demander à LOT-02 de soumettre l'évolution composite du schéma Prisma à
      son gate migration distinct.

Toute évolution rend les profils antérieurs `stale` sans les supprimer et
impose une nouvelle validation avant diffusion.

Décision du 2026-07-18 : **versions et persistance future validées**.

Ces identifiants sont figés pour la seconde passe mais restent non publiables
et non activés tant que les p5/p95 PRAL réels et les vecteurs pondérés signés
ne sont pas rattachés au contrat.

## Avis final

Choisir exactement un avis :

- [x] **VALIDÉ** — toutes les décisions sont complètes et autorisent la seconde
      passe documentaire de LOT-01.
- [ ] **À CORRIGER** — le dossier doit être amendé puis représenté.
- [ ] **REFUSÉ** — aucune poursuite C5A n'est autorisée.

Identité du valideur : **Martial CAYRE**

Rôle du valideur : **praticien valideur responsable de la gouvernance clinique
WellNeuro**

Date de l'avis : **2026-07-18**

Référence de la preuve de validation :
**C5-LOT01-VALIDATION-MC-2026-07-18-v1**

La preuve Git rattachée à cette référence comprend le commit documentaire de
validation et son commit de clarification, dont les hash complets figurent
dans le frontmatter.

## Statut actuel

**Avis du gate clinique VALIDÉ. Seconde passe documentaire produite et soumise
à une signature distincte des vecteurs pondérés.**

## Seconde passe documentaire soumise à signature

Référence exacte à relire : **C5-LOT01-VECTEURS-2026-07-18-v1**.

- [x] XML `compo_2025_11_03.xml` vérifié par MD5.
- [x] PRAL exact calculé pour 2 347/3 484 aliments.
- [x] Bornes PRAL : p5 = -8,70089 et p95 = 14,69258 mEq/100 g.
- [x] 12/12 noyaux obligatoires complets.
- [x] Deux profils complets et dix profils `partial_data`.
- [x] Sources et limites rattachées à chaque liaison au niveau WellNeuro B.
- [x] Aucune imputation, valeur sous limite convertie ou diffusion patient.

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

Le tableau conserve l'ordre canonique et ne constitue pas un classement. Les
profils basés sur des ensembles de composantes différents ne sont pas
comparables entre eux.

### Avis distinct sur les vecteurs pondérés

Choisir exactement un avis après relecture du document détaillé :

- [ ] **VALIDÉ** — les 12 vecteurs attendus peuvent être rattachés au contrat.
- [ ] **À CORRIGER** — indiquer les lignes et corrections demandées.
- [ ] **REFUSÉ** — ne pas poursuivre la clôture de LOT-01.

Avis actuel : **À SIGNER**.

La signature ultérieure doit citer la référence
`C5-LOT01-VECTEURS-2026-07-18-v1` et le hash `preuve_git_vecteurs`. Toute
modification des valeurs après signature imposera une nouvelle référence.

La preuve Git est bornée aux six livrables autorisés de cette passe et au
commit distinct qui rattache son hash. Elle n'atteste pas un snapshot autonome
de l'ensemble de C5 : les autres travaux de recadrage déjà présents dans
l'arbre restent hors périmètre et ne sont ni indexés ni modifiés ici.

LOT-01 n'est pas terminé par le présent avis. C5 reste inactive à 1/8.
