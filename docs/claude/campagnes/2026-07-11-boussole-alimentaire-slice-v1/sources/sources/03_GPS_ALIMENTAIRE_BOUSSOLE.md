# 03 — GPS alimentaire : évolution de la Boussole alimentaire

## Intention

Faire évoluer la Boussole alimentaire vers un **GPS alimentaire personnalisé**, basé sur Ciqual, Open Food Facts en cache, aliments vedettes, mapping propriétaire WellNeuro, objectifs actifs du patient et protocole en cours.

Objectif : guider le patient vers des choix cohérents avec son protocole, sans culpabilisation.

## Niveaux fonctionnels

```text
Niveau 1 : produit
Niveau 2 : panier
Niveau 3 : repas
Niveau 4 : journée
Niveau 5 : semaine
```

## Niveau 1 — Produit

```text
Produit scanné :
Céréales chocolatées

Lecture selon votre objectif actuel :
Ce produit est plutôt à placer le matin.
Le soir, il soutient moins votre objectif d’apaisement.

Alternative :
Flocons d’avoine + noix + yaourt nature.
```

Règle : ne jamais dire “ce produit est mauvais”, mais “ce produit est moins aligné avec votre objectif actuel”.

## Niveau 2 — Panier

```text
Votre panier

Forces :
✓ protéines correctes
✓ légumes présents
✓ bonne base petit-déjeuner

À renforcer :
→ oméga-3
→ fibres fermentescibles
→ magnésium alimentaire
```

## Niveau 3 — Repas

```text
Dîner analysé

Soutient :
- satiété
- fibres
- stabilité glycémique

À ajuster :
- un peu trop stimulant pour l’objectif sommeil
- manque de glucides complexes apaisants
```

## Niveau 4 — Journée

```text
Journée alimentaire

Matin : élan faible
Midi : stabilité correcte
Goûter : transition absente
Soir : dîner tardif
Nuit : jeûne nocturne court
```

## Niveau 5 — Semaine

```text
Tendance 7 jours

Forces :
- protéines régulières ;
- meilleure diversité végétale.

Trous nutritionnels probables :
- oméga-3 ;
- magnésium ;
- fibres fermentescibles.
```

## Objets conceptuels

```text
food_contextual_reading
- food_ref
- patient_id
- active_goals[]
- intrinsic_scores[]
- contextual_score
- message_patient
- message_practitioner
- confidence_level
```

```text
basket_analysis
- patient_id
- items[]
- strengths[]
- gaps[]
- suggested_substitutions[]
- context: courses | repas | semaine
```

```text
food_substitution
- from_food_ref
- to_food_ref
- same_family: true/false
- clinical_gain
- linked_axes[]
- rationale
```

## Gain clinique de substitution

```text
Remplacer :
huile de tournesol

Par :
huile de colza

Gain attendu :
+ oméga-3
+ équilibre lipidique
+ cohérence avec protocole inflammation basse
```

## Aliments vedettes

Chaque aliment vedette doit répondre à :

```text
Pourquoi ?
Pour qui ?
Combien ?
Quand ?
Avec quoi ?
Précautions ?
Alternatives ?
```

## Chronobiologie alimentaire

```text
Matin : élan / protéines / dopamine
Midi : stabilité / satiété
Goûter : transition / sérotonine
Soir : apaisement / sommeil
Nuit : jeûne nocturne
```

Attention : la chronobiologie nécessite une donnée horaire. Sans heure de repas, ne pas calculer le besoin rythme alimentaire.

## UX praticien

```text
Nutrition — Sophie Nicola

Objectif actif :
sommeil + énergie matinale

Observations :
- petit-déjeuner trop glucidique ;
- dîner tardif ;
- oméga-3 insuffisants.

Actions proposées :
[Ajouter aliment vedette]
[Créer assiette sommeil]
[Simuler substitution]
[Envoyer fiche conseil]
```

## UX patient

```text
Votre action alimentaire cette semaine

Ajouter 2 portions d’aliments riches en oméga-3.

Exemples :
- sardines ;
- maquereau ;
- noix ;
- huile de colza.
```

## Innovations

1. Mode courses : scan panier + suggestions en temps réel.
2. Mode frigo : le patient indique ce qu’il a, l’app propose une assiette compatible.
3. Mode restaurant : conseils de choix sans calcul détaillé.
4. Mode famille : adapter les conseils à un repas partagé.
5. Mode “écart utile” : transformer un écart en repas équilibré.

## Critères d’acceptation

- Le patient comprend en une phrase si un aliment va dans son sens.
- La lecture est toujours contextualisée.
- Le praticien peut voir le détail clinique.
- Le moteur ne remplace pas Mon équilibre.
- Le score aliment ne dépend jamais de la biologie patient.
- Pas d’affichage culpabilisant.

## Prompt agent dev

```text
Développe la vision UX et data du GPS alimentaire WellNeuro. Il s’appuie sur la Boussole alimentaire, Ciqual, Open Food Facts en cache, aliments vedettes et protocole patient. Il doit gérer produit, panier, repas, journée et semaine. Le score intrinsèque aliment reste indépendant du patient ; seule la lecture contextuelle dépend des objectifs actifs. Propose composants, objets de données conceptuels, garde-fous de vocabulaire et scénarios UX patient/praticien.
```

## Questions ouvertes

- Faut-il commencer par produit ou par assiettes vedettes ?
- Le mode panier est-il V1 ou V2 ?
- Les substitutions doivent-elles être limitées aux aliments vedettes au départ ?
