# 02 — Protocole adaptatif 21 jours

## Intention

Transformer le protocole 21 jours en **plan vivant**, ajustable aux jalons J7, J14, J21, J42 et J90.

L’application ne “prescrit” pas. Elle prépare des **recommandations structurées**, validées par le praticien.

## Structure cible

```text
Protocole personnalisé
├── Phase 1 : J1-J21 — stabiliser
├── Phase 2 : J22-J42 — densifier
├── Phase 3 : J43-J90 — personnaliser
└── Phase 4 : autonomie / prévention rechute
```

## Phases types

### Phase 1 — Stabiliser

Objectif : réduire la charge, sécuriser l’adhésion, poser les fondations.

Blocs fréquents :

- sommeil ;
- rythme alimentaire ;
- magnésium / soutien apaisement ;
- hydratation ;
- respiration ;
- repas simples ;
- premiers aliments vedettes.

### Phase 2 — Densifier

Objectif : augmenter la densité nutritionnelle et micronutritionnelle.

Blocs fréquents :

- protéines matinales ;
- oméga-3 ;
- fibres ;
- polyphénols ;
- micronutriments ciblés ;
- activité douce.

### Phase 3 — Personnaliser

Objectif : ajuster selon biologie, tolérance et momentum.

Blocs fréquents :

- compléments spécifiques ;
- ajustements digestifs ;
- chronobiologie ;
- bilan biologique ciblé ;
- protocole alimentaire avancé.

### Phase 4 — Autonomiser

Objectif : maintien, prévention rechute, simplification.

Blocs fréquents :

- routine minimale ;
- fiches conseil ;
- signaux d’alerte personnels ;
- plan “écart utile”.

## Objet `care_plan`

```text
care_plan
- id
- patient_id
- title
- status: brouillon | validé | envoyé | archivé
- current_phase
- primary_goals[]
- total_load_score
- practitioner_note
- validated_at
```

## Objet `care_action`

```text
care_action
- id
- care_plan_id
- type: alimentation | complément | routine | biologie | fiche | suivi
- title
- rationale
- linked_needs[]
- timing
- duration_days
- load_score
- evidence_level
- status: proposé | validé | suspendu | terminé
```

## Charge thérapeutique

Le protocole doit mesurer sa propre complexité.

```text
Charge protocole
Alimentation : 3
Compléments : 4
Routines : 2
Biologie : 1
Suivi : 1
Total : 11 / 12
```

### Règle

Si la charge est élevée :

```text
Ce protocole est déjà dense. Ajouter une nouvelle action peut réduire l’adhésion.
```

## Adaptation aux jalons

### J7

Objectif : tolérance et adhésion.

```text
Questions :
- Le patient comprend-il le protocole ?
- Effets indésirables ?
- Adhésion suffisante ?
- Faut-il alléger ?
```

### J14

Objectif : dynamique.

```text
Questions :
- Quel signal s’améliore ?
- Quel signal résiste ?
- Y a-t-il un risque de décrochage ?
```

### J21

Objectif : décision.

```text
Options :
- poursuivre phase 1 ;
- passer phase 2 ;
- alléger ;
- renforcer ;
- demander biologie ;
- réorienter vers praticien/médecin si nécessaire.
```

## UX praticien

```text
Protocole — Jennifer Martin

Phase actuelle : J8 / J21
Objectif : sommeil + stress

Actions validées :
✓ magnésium soir
✓ routine lumière matin
✓ dîner apaisant
✓ check-in sommeil

Ajustement proposé :
Le sommeil progresse mais l’adhésion routine est faible.
→ simplifier la routine du soir.
```

## UX patient

```text
Votre protocole — semaine 2

Aujourd’hui :
1. Action du matin
2. Action repas
3. Action du soir
4. Check-in 15 secondes

Message :
“On cherche la régularité, pas la perfection.”
```

## Innovations

### 1. Protocole versionné

Chaque ajustement crée une version :

```text
v1 — J0
v2 — J7, magnésium fractionné
v3 — J21, ajout alimentation oméga-3
```

### 2. Protocole minimal viable

Option pour patients surchargés :

```text
1 complément
1 routine
1 action alimentaire
1 check-in
```

### 3. Protocole “écart utile”

Prévoir les situations réelles :

- week-end ;
- repas de famille ;
- déplacement ;
- fatigue ;
- oubli.

## Critères d’acceptation

- Le praticien peut créer un protocole en moins de 5 minutes.
- Chaque action a une justification.
- Le patient voit seulement les actions concrètes.
- La charge du protocole est visible.
- Toute diffusion patient nécessite validation.

## Prompt agent dev

```text
Conçois le Protocole Builder 21 jours de WellNeuro. Il doit assembler des recommandations alimentaires, compléments, routines, explorations biologiques et fiches conseils. Respecter le vocabulaire : protocole personnalisé, recommandations, explorations à discuter ; éviter diagnostic/prescription/ordonnance. Propose une UX praticien dense et une UX patient simplifiée. Intègre charge thérapeutique, jalons J7/J14/J21, validation praticien et versionnage du protocole.
```

## Questions ouvertes

- Quels blocs sont inclus dans la V1 ?
- La charge thérapeutique est-elle calculée manuellement ou par type d’action ?
- Le protocole doit-il être exportable en PDF dès V1 ?
