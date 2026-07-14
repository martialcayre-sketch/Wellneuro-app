# 05 — Vertical slice 1 : fiche patient cockpit + protocole 21 jours minimal

## Objectif

Créer le premier écran WellNeuro 3.0 qui change réellement la consultation : une fiche patient cockpit qui transforme les données en décision 21 jours.

## Entrées

- patient ;
- anamnèse ;
- questionnaires ;
- scores ;
- mini-synthèses déterministes ;
- synthèse IA globale ;
- Mon équilibre ;
- assignations ;
- demandes de correction.

## Sorties

- résumé décisionnel ;
- priorité actuelle ;
- signaux convergents ;
- signaux discordants ;
- données manquantes ;
- protocole 21 jours minimal ;
- charge thérapeutique ;
- document patient simple ;
- validation praticien.

## UX cible

```text
Fiche patient cockpit
├── En-tête patient
├── Résumé décisionnel
├── Cartographie / Mon équilibre
├── Priorité 21 jours
├── Protocole minimal
├── Charge thérapeutique
├── Données manquantes
├── Documents prêts
└── Historique technique repliable
```

## Résumé décisionnel

Format recommandé :

```text
Où en est ce patient ?
Ce qui converge
Ce qui résiste
Ce qui manque
Décision proposée pour 21 jours
```

## Protocole minimal phase 1

Règle de sobriété :

```text
maximum 3 actions patient
1 fiche prioritaire
1 critère de suivi
aucune diffusion sans validation praticien
```

Types d’actions autorisées en V1 :

```text
alimentation
routine
fiche conseil
suivi/check-in
biologie à discuter
complément uniquement si déjà validé manuellement par praticien
```

## Charge thérapeutique

Calcul simplifié V1 :

```text
1 point par action simple
2 points par action quotidienne contraignante
2 points par complément
2 points si timing strict
1 point si nécessite achat ou préparation
```

Seuils :

```text
0-3 : léger
4-6 : modéré
7-9 : chargé
10+ : excessif, justification requise
```

## Décisions J21

Préparer dès V1 les labels :

```text
continuer
alléger
densifier
pivoter
explorer
stopper
```

## Fichiers probables

À vérifier dans le dépôt avant action :

```text
web/src/components/FichePatientPanel.tsx
web/src/app/dashboard/patients/[idPatient]/page.tsx
web/src/components/ui/*
web/src/lib/scoring/miniSynthese.ts
web/src/lib/equilibre/*
web/src/app/api/praticien/equilibre/route.ts
web/src/app/api/praticien/reponses/route.ts
```

Nouveaux fichiers possibles :

```text
web/src/components/patient-cockpit/PatientCockpit.tsx
web/src/components/patient-cockpit/DecisionSummaryCard.tsx
web/src/components/patient-cockpit/CurrentPriorityCard.tsx
web/src/components/patient-cockpit/TherapeuticLoadBadge.tsx
web/src/components/patient-cockpit/MissingDataPanel.tsx
web/src/components/protocol/ProtocolMiniBuilder.tsx
web/src/lib/protocol/therapeuticLoad.ts
web/src/lib/protocol/types.ts
```

## Hors périmètre V1

- stockage persistant du protocole ;
- migration Prisma ;
- envoi automatique patient ;
- compléments clean label avancés ;
- messagerie ;
- biologie réelle ;
- scanner alimentaire ;
- modification des seuils de scoring.

## Critères d’acceptation

- La fiche patient s’ouvre sans régression.
- Le praticien voit un résumé décisionnel lisible.
- L’historique technique reste accessible mais n’est pas l’entrée principale.
- Le protocole minimal ne dépasse pas 3 actions sans alerte.
- Tous les textes sont en français.
- Aucune donnée patient réelle n’apparaît.
- Aucun changement DB.
- Type-check OK.

## Prompt agent code

```text
Implémente le vertical slice 1 WellNeuro 3.0 : fiche patient cockpit + protocole 21 jours minimal. Ne fais aucune migration. Ne modifie pas les règles de scoring. Découpe FichePatientPanel en composants plus petits si nécessaire. Crée un composant de résumé décisionnel, un bloc priorité 21 jours, un mini protocol builder non persistant, un badge de charge thérapeutique et un panneau données manquantes. Tous les textes UI sont en français. Patients fictifs uniquement dans les exemples. Fournis les critères d’acceptation et les tests.
```
