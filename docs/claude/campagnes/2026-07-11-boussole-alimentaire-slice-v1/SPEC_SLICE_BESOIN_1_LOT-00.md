---
id: "spec-slice-besoin-1"
lot: "LOT-00"
statut: "livré — liste d'aliments candidate, validation praticien via revue de PR"
date: "2026-07-17"
---

# Spécification clinique du slice besoin 1 — LOT-00

> Livrable du LOT-00 (cadrage clinique, sources et licences) de la campagne
> C5 Boussole alimentaire. Périmètre : le vertical slice V1 décidé au
> contexte §2.5/§9.5 — un seul axe (besoin 1, équilibre de l'assiette),
> ~12 aliments vedettes, chronobiologie hors slice. La **liste d'aliments est
> candidate** : la validation praticien (revue de cette PR) est requise
> avant de nourrir LOT-01 (mapping) et LOT-02 (données Ciqual).

## 1. Distinction intrinsèque / contextuel (validée)

- **Intrinsèque (C5A)** : le profil d'un aliment, calculé une fois depuis le
  référentiel, **indépendant du patient**. Aucune donnée patient, aucun
  enjeu HDS.
- **Contextuel (C5B)** : la lecture de ce profil dans le cadre d'une
  priorité validée et d'un protocole actif. Hors périmètre du slice data ;
  consommera C1/C2.
- Aucune fusion en un score global unique ; formulation patient « va dans
  le sens de votre objectif », jamais « détermine ».

## 2. Variables besoin 1 retenues (intrinsèques, issues de Ciqual)

Variables observables retenues pour l'axe « équilibre de l'assiette »,
toutes présentes dans la table Ciqual (constituants pour 100 g) :

| Variable | Constituants Ciqual | Ce qu'elle documente |
|---|---|---|
| Qualité glucidique | glucides, sucres, fibres alimentaires | densité en fibres, part des sucres simples |
| Qualité lipidique | AG saturés, AG monoinsaturés, AG polyinsaturés | équilibre des familles lipidiques |
| Oméga-3 | ALA (18:3), EPA (20:5), DHA (22:6) | apport oméga-3 végétal et marin |
| Densité protéique | protéines | contribution protéique de l'aliment |
| Sel | sel/sodium | repère de transformation et d'excès |

Le **degré de transformation** est traité comme un tag qualitatif de la
fiche vedette (les 12 candidats sont des aliments bruts ou peu transformés
par construction) — la classification NOVA automatique via OFF est hors
slice. **Aucun seuil, aucune pondération, aucune formule n'est défini dans
ce lot** : le mapping variables → score intrinsèque appartient à LOT-01,
versionné et validé séparément.

## 3. Liste candidate des 12 aliments vedettes

Critères de sélection : couverture des variables du §2, cohérence avec le
modèle méditerranéen du besoin 1, accessibilité (coût, disponibilité en
France), diversité des familles, et **compatibilité A7-12** (ces 12 vedettes
doivent être un sous-ensemble des marqueurs du journal alimentaire, audit
JA-00).

| # | Aliment (libellé de travail) | Famille | Intérêt principal besoin 1 |
|---|---|---|---|
| 1 | Sardine (en conserve, égouttée) | Poisson gras | EPA + DHA, coût modéré |
| 2 | Maquereau | Poisson gras | EPA + DHA |
| 3 | Huile d'olive vierge extra | Matière grasse | AG monoinsaturés |
| 4 | Huile de colza | Matière grasse | ALA, complément végétal des oméga-3 |
| 5 | Lentilles (cuites) | Légumineuse | fibres, protéines végétales |
| 6 | Pois chiches (cuits) | Légumineuse | fibres, protéines végétales |
| 7 | Noix | Fruit à coque | ALA |
| 8 | Flocons d'avoine | Céréale complète | fibres solubles |
| 9 | Pain complet | Céréale complète | qualité glucidique du quotidien |
| 10 | Brocoli (cuit) | Légume | densité végétale, fibres |
| 11 | Épinards (cuits) | Légume feuille | densité végétale |
| 12 | Myrtille | Fruit | fruit peu sucré du modèle |

- Les **codes Ciqual exacts et les valeurs** seront résolus au LOT-02 depuis
  la table officielle téléchargée — **aucun code ni valeur n'est inventé
  ici** ; les libellés ci-dessus sont des libellés de travail à apparier.
- Alternatives envisagées et écartées à ce stade (substituables par le
  praticien à la validation) : saumon (coût, substituable à 1–2), quinoa
  (substituable à 8–9), œuf (pertinent mais moins spécifique du besoin 1),
  amandes (substituables à 7).

## 4. Libellés patient (vocabulaire non absolu)

- Jamais « bon/mauvais aliment », jamais « interdit », jamais de note.
- Formulations types : « soutient l'équilibre de votre assiette »,
  « trouve mieux sa place [moment/contexte] pour votre objectif »,
  « une alternative est proposée » (toute réserve est accompagnée d'une
  alternative).
- Le nom patient des fiches reste à trancher au lot UX (hors slice data).

## 5. Sources et licences (documentées)

| Source | Licence | Usage dans le slice | Obligations |
|---|---|---|---|
| **Ciqual 2025** (Anses, table de composition nutritionnelle) | **Licence Ouverte Etalab 2.0** | Référentiel read-only : valeurs des 12 vedettes (LOT-02) | **Attribution** : « Source : Anses, table Ciqual 2025 » + version/date d'extraction tracées dans le dataset ; réutilisation libre, y compris commerciale |
| **Open Food Facts** | **ODbL 1.0** | **Différé hors slice data** — le « 1 produit scanné » du slice sera instruit au lot UX ; si retenu : cache local, attribution obligatoire, partage à l'identique sur la base dérivée (le mapping propriétaire par-dessus n'est pas contaminé) | à documenter au moment de l'activation |
| Fiches vedettes SIIN + mapping WellNeuro | propriétaire | cœur différenciant, versionné | niveau de preuve **B** par défaut pour toute donnée nutritionnelle ; jamais A ni C |

## 6. Raccordements

- **A7-12 (registre)** : les 12 vedettes validées seront reprises comme
  sous-ensemble du registre de marqueurs du journal alimentaire (audit
  JA-00). Toute substitution décidée à la validation doit être répercutée
  des deux côtés.
- **LOT-01 (suivant)** : mapping et normalisation — définition versionnée
  du calcul intrinsèque besoin 1 à partir des variables du §2.
- **LOT-02** : extraction des valeurs Ciqual des 12 vedettes (dataset
  statique V1, reproductible, avec attribution, code qualité/source/version).

## 7. Hors périmètre (rappel)

Aucun code, aucun import en base, aucune migration, aucun axe hors
besoin 1, chronobiologie différée (`meal_entry.heure`), scan produit
différé, aucun seuil ni règle clinique.
