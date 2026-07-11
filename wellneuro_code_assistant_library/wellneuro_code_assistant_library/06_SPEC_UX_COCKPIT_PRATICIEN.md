# 06 — Spécification UX : cockpit praticien

## Objectif

Passer d’un dashboard classique à une interface de décision clinique.

## Navigation cible

```text
Accueil
Patients
À valider
Questionnaires
Protocoles
Documents
Boussole alimentaire
Compléments
Paramètres
```

## Accueil praticien

Blocs prioritaires :

```text
Patients à traiter
Protocoles à valider
Questionnaires transmis récemment
Demandes de correction
Jalons J21/J42/J90
Documents à relire
```

## File de validation

Idée structurante : le praticien ne doit pas chercher patient par patient ce qui demande son attention.

```text
À valider
├── synthèses IA
├── protocoles 21 jours
├── documents patient
├── courriers médecin
├── demandes de modification
├── alertes de tolérance
└── décisions J21
```

## Fiche patient cockpit

Découpage recommandé :

```text
PatientHeader
DecisionSummaryCard
FunctionalProfilePanel
EquilibreOverview
Priorites21JoursPanel
ProtocolMiniBuilder
TherapeuticLoadPanel
MissingDataPanel
CorrectionRequestsPanel
QuestionnaireHistoryPanel
DocumentBundlePanel
```

## Design

Respecter le design system :

- thème praticien sombre ;
- deep teal + champagne gold ;
- mobile/tablette first ;
- tokens CSS existants ;
- ne pas utiliser `text-primary` comme texte sur fond sombre ;
- ne jamais signaler un état clinique par la couleur seule.

## Microcopy

À privilégier :

```text
À traiter
À valider
À documenter
Signal à explorer
Priorité actuelle
Prochaine décision
Charge modérée
Données manquantes
```

À éviter :

```text
diagnostic
risque patient
mauvais résultat
échec observance
prescription automatique
```

## États vides

Tout panneau doit avoir un état vide utile :

```text
Aucun protocole préparé pour ce patient.
Aucune donnée manquante critique identifiée à ce stade.
Aucun document en attente de validation.
```

## Risques

- afficher trop d’informations ;
- masquer les détails techniques nécessaires ;
- casser l’accès aux réponses ;
- perdre la traçabilité ;
- trop dépendre de l’IA pour le résumé.

## Critère clé

Le praticien doit voir d’abord **ce qu’il doit décider**, puis seulement ensuite les détails.
