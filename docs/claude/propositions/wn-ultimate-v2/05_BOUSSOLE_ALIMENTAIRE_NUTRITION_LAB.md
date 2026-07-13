---
id: "wellneuro-boussole-alimentaire-nutrition-lab-v2"
version: "2.0"
date_source_declaree: "2026-07-14"
integre_le: "2026-07-13"
statut_integration: "proposition_non_executable_a_valider"
---

# Boussole alimentaire et Nutrition Lab

## 1. Les quatre lectures

```text
Déclaré     = questionnaires
Observé     = journal
Intrinsèque = profil général d’un aliment, produit ou action
Contextuel  = pertinence pour un patient et une phase validée
```

## 2. Séparation obligatoire

Un aliment peut avoir un profil intrinsèque favorable sans être le meilleur choix pour un patient donné.

La lecture contextuelle dépend :

- de la DecisionCard ;
- du protocole actif ;
- des besoins alimentaires concernés ;
- des allergies et préférences ;
- des traitements ;
- de la trajectoire ;
- de la faisabilité ;
- des règles publiées.

## 3. Données

### CIQUAL

- nutriments ;
- aliments génériques ;
- données quantitatives.

### Open Food Facts

- produits ;
- ingrédients ;
- additifs ;
- allergènes ;
- catégories ;
- qualité variable et provenance à afficher.

### Corpus SIIN

- aliments vedettes ;
- modèles alimentaires ;
- chrononutrition ;
- comportements ;
- mappings neuronutritionnels ;
- limites et précautions.

### Règles WellNeuro

- classification des marqueurs ;
- axes V1 ;
- substitutions ;
- actions de phase ;
- filtres de sécurité.

## 4. Objets

```ts
type FoodProfile = {
  foodId: string;
  identity: string;
  sourceRefs: string[];
  nutrients?: Record<string, number>;
  markers: string[];
  intrinsicAxes: Record<string, number | null>;
  limitations: string[];
  version: string;
};

type ContextualFoodReading = {
  foodId: string;
  decisionId: string;
  relevantIntentCodes: string[];
  favorableReasons: string[];
  cautionReasons: string[];
  contraindications: string[];
  practicalUse?: string;
  status: "candidate" | "allowed" | "caution" | "excluded";
};
```

## 5. Action alimentaire de phase

Une action ne doit pas être « manger mieux ».

Elle comporte :

- comportement précis ;
- moment ;
- fréquence ;
- plan minimal ;
- alternatives ;
- critères observables ;
- charge ;
- contraintes ;
- cible journal éventuelle.

## 6. Relation aux 12 besoins

Les observations alimentaires contribuent principalement aux besoins 1 à 3.

Elles peuvent fournir des signaux secondaires aux autres besoins, sans en recalculer directement la note.

## 7. Nutrition Lab praticien

Fonctions V1 :

- explorer les aliments et actions publiés ;
- filtrer par intention ;
- comparer des options ;
- visualiser les sources ;
- insérer une action candidate dans le protocole ;
- vérifier les contraintes patient.

Fonctions ultérieures :

- comparateur repas actuel/optimisé ;
- détecteur de trous alimentaires ;
- simulateur d’action ;
- scan produit ;
- panier ;
- photo de repas assistée.

## 8. Score intrinsèque

Un score intrinsèque éventuel doit :

- être indépendant du patient ;
- être multidimensionnel ;
- afficher ses données manquantes ;
- porter une version ;
- ne pas masquer les nutriments ;
- ne pas devenir une vérité universelle.

## 9. Boussole patient

La vue patient montre :

- une action à la fois ;
- des exemples concrets ;
- substitutions ;
- fréquence ;
- plan minimal ;
- retour factuel.

Elle n’affiche pas une note absolue de « bon » ou « mauvais » aliment.

## 10. Campagne C5

### C5A — fondation data-first

- taxonomie ;
- sources ;
- aliments pilotes ;
- marqueurs ;
- provenance ;
- profils intrinsèques.

### C5B — contexte

- consommation de DecisionCard ;
- filtres patient ;
- actions candidates ;
- journal ;
- restitutions.

## 11. Pilote

Démarrer avec :

- un besoin alimentaire prioritaire ;
- une douzaine d’aliments vedettes ;
- une action de phase ;
- un produit OFF ;
- le journal de 21 jours ;
- un résumé J21.

Ne pas commencer par le scan ou le panier.
