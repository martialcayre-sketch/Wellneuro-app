# 08 — Momentum et prévention du décrochage

## Intention

Faire du suivi longitudinal un moteur de décision et de motivation.

Le momentum n’est pas seulement la différence entre deux scores. C’est une lecture de trajectoire :

```text
symptômes + adhésion + régularité + messages + tolérance + ressenti
```

## Jalons

```text
T0 : état initial
J7 : tolérance
J14 : dynamique
J21 : décision phase suivante
J42 : consolidation
J90 : bilan longitudinal
```

## Objets conceptuels

```text
momentum_snapshot
- patient_id
- date
- milestone: T0 | J7 | J14 | J21 | J42 | J90
- balance_score
- need_scores[]
- symptom_deltas[]
- adherence_summary
- checkin_regularity
- risk_flags[]
- practitioner_summary
```

```text
dropout_risk_signal
- patient_id
- signal_type
- severity
- detected_from
- explanation
- suggested_action
```

## Momentum clinique

```text
Sommeil : +12
Énergie : +4
Stress : stable
Digestion : -3
```

## Momentum d’adhésion

```text
Compléments : 82 %
Routines : 54 %
Alimentation : 61 %
Check-ins : 90 %
```

## Momentum émotionnel

Détecter :

- messages plus anxieux ;
- baisse de motivation ;
- réponses plus négatives ;
- formulations de découragement.

Attention : jamais de diagnostic psychologique automatique.

## Risque de décrochage

Signaux faibles :

```text
- check-ins absents ;
- protocole non coché ;
- message de découragement ;
- symptômes qui remontent ;
- action quotidienne trop souvent ignorée ;
- charge protocole élevée.
```

Affichage praticien :

```text
Risque de décrochage — modéré

Pourquoi :
- 4 jours sans check-in ;
- routine sommeil suivie à 28 % ;
- message patient : “je n’y arrive pas”.

Action proposée :
envoyer un message court de soutien ou alléger le protocole.
```

## UX praticien

```text
Momentum — Michel Dogne

Progression :
Sommeil +8
Énergie +5
Stress stable

Adhésion :
bonne sur compléments
faible sur routines

Décision J21 :
ne pas ajouter de nouvelles actions ;
renforcer routine minimale.
```

## UX patient

```text
Votre progression

Vous avez été régulier 5 jours cette semaine.
Votre sommeil montre une tendance positive.
On garde le cap avec une action simple.
```

## Innovations

### 1. Courbe de momentum par besoin

Ne pas seulement montrer un score global.

### 2. Momentum de charge

Comparer charge proposée et charge réellement suivie.

### 3. Message proactif

```text
“Souhaitez-vous que l’on simplifie votre protocole cette semaine ?”
```

Validé ou déclenché par le praticien.

### 4. Bilan J21 automatique préparé

```text
Ce qui a changé
Ce qui reste fragile
Ce qui a été suivi
Ce qui doit être ajusté
```

## Critères d’acceptation

- Le momentum est visible côté praticien.
- Le patient voit une version positive et simple.
- Les signaux faibles ne sont pas anxiogènes.
- Le praticien peut agir depuis le signal.
- Le système distingue échec protocole et faible adhésion.

## Prompt agent dev

```text
Conçois le module Momentum WellNeuro. Il doit suivre T0/J7/J14/J21/J42/J90, distinguer momentum clinique, adhésion, check-ins et risque de décrochage. L’objectif est d’aider le praticien à ajuster le protocole et de motiver le patient sans culpabilisation. Propose objets conceptuels, UX praticien/patient, signaux faibles, règles de sécurité et critères d’acceptation.
```

## Questions ouvertes

- Quels signaux sont suffisants en V1 ?
- Le risque de décrochage doit-il être calculé ou simplement tagué ?
- Le patient doit-il voir son taux d’adhésion ?
