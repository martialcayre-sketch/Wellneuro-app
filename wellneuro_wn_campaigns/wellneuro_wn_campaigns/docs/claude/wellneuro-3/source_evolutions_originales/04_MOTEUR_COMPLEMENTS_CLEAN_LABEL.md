# 04 — Moteur compléments clean label

## Intention

Créer une bibliothèque de compléments alimentaires utilisable comme support de recommandation praticien, avec qualité de formulation, clean label, formes biodisponibles, contraintes patient, cohérence de protocole, traçabilité et alternatives.

L’objectif n’est pas de vendre, mais d’aider le praticien à choisir des produits cohérents, propres et adaptés.

## Vocabulaire

Utiliser : complément, produit retenu, recommandation, proposition praticien, fiche qualité, protocole personnalisé.

Éviter : prescription automatique, produit miracle, traitement, garantie d’efficacité.

## Fiche complément

```text
Nom :
Magnésium bisglycinate

Catégorie :
Minéral

Forme :
Bisglycinate

Dosage :
100 mg magnésium élément / unité

Qualité :
Clean label
Sans additif controversé identifié
Tolérance digestive favorable

Contraintes :
Vegan : oui/non
Lactose : oui/non
Gluten : oui/non
Grossesse : à valider
```

## Objets conceptuels

```text
supplement_product
- id
- brand
- name
- category
- ingredients[]
- active_compounds[]
- excipients[]
- dosage_form
- labels[]
- status: candidat | retenu | exclu | à vérifier
```

```text
supplement_quality_profile
- product_id
- clean_label_score
- bioavailable_form_score
- additive_risk_flags[]
- dose_coherence_flags[]
- tolerance_flags[]
- evidence_notes
- reviewer_status
```

```text
supplement_protocol_item
- care_plan_id
- product_id
- intention
- dose_text
- timing
- duration_days
- warnings[]
- practitioner_validation_status
```

## Badges qualité

```text
[Clean label]
[Forme biodisponible]
[Sans additif controversé identifié]
[Compatible vegan]
[Sans lactose]
[Sans gluten]
[Budget modéré]
[Tolérance digestive favorable]
[À valider grossesse]
[À surveiller interaction]
```

## Moteur de cohérence

Détecter :

- doublon vitamine B6 ;
- dose cumulée élevée ;
- zinc sans cuivre sur durée longue ;
- magnésium forme laxative chez patient sensible ;
- oméga-3 sans prise repas ;
- produit avec additif controversé ;
- produit incompatible avec contrainte patient ;
- protocole trop chargé.

Afficher :

```text
Point de vigilance :
Deux produits apportent de la vitamine B6.
Vérifiez la dose cumulée avant validation.
```

## Complément Match

Le praticien sélectionne un objectif : sommeil, stress, fatigue, digestion, inflammation basse, cognition, sport, grossesse à valider, vegan, clean label strict.

Le moteur propose :

```text
1. Produit A — très adapté
2. Produit B — adapté avec vigilance
3. Produit C — non retenu : forme moins pertinente
```

## Filtres avancés

- sans dioxyde de titane ;
- sans colorant controversé ;
- sans édulcorant ;
- sans arôme ;
- sans nanoparticules déclarées ;
- vegan ;
- gélule végétale ;
- sans lactose ;
- sans gluten ;
- sans soja ;
- sans iode ;
- sans fer ;
- sans mélatonine ;
- dosage bas / moyen / élevé ;
- forme poudre / gélule / liquide.

## UX praticien

```text
Compléments — Michel Dogné

Objectif actif :
stabilité glycémique + stress

Produits proposés :
[Berbérine complexe]
[Magnésium bisglycinate]
[Oméga-3 EPA/DHA]

Cohérence protocole :
Bonne

Vigilances :
- vérifier traitement médicamenteux ;
- éviter surcharge du protocole.
```

## UX patient

```text
Votre complément du soir

Pourquoi ?
Il soutient l’objectif d’apaisement travaillé dans votre protocole.

Comment ?
Après le repas du soir.

À signaler :
inconfort digestif, somnolence inhabituelle, doute sur la prise.
```

## Innovations

1. Alternative clean : version clean label stricte, budget, vegan, digestion sensible, sans gélule.
2. Score de cohérence protocole.
3. Historique de tolérance.
4. Arrêt prévu / réévaluation à J21.

## Critères d’acceptation

- Chaque produit retenu a une fiche qualité.
- Chaque complément intégré au protocole a une durée, un moment et une justification.
- Les doublons et vigilances sont visibles avant validation.
- Le patient reçoit une explication simple.
- Aucun produit n’est présenté comme obligatoire.

## Prompt agent dev

```text
Conçois le module “Bibliothèque compléments clean label” pour WellNeuro. Il doit aider le praticien à sélectionner des compléments selon objectifs, formes biodisponibles, additifs, contraintes patient et cohérence globale du protocole. L’app ne prescrit pas automatiquement. Propose la structure de fiches, filtres, badges, moteur de vigilance, UX praticien/patient et critères d’acceptation. Utilise uniquement les patients fictifs Sophie Nicola, Jennifer Martin et Michel Dogné.
```
