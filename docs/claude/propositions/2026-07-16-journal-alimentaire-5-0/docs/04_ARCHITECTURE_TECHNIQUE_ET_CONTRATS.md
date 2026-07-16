---
id: wellneuro-ja5-architecture
version: 5.0-proposition
---

# Architecture technique et contrats

## 1. Position dans les campagnes

```text
C1  : ClinicalSnapshot, DecisionCard, ProtocolDraft
C2A : épisodes persistés, protocole actif, check-ins, PhaseReview
JA  : capture et moteur d’observation alimentaire
C5  : taxonomie, profils, actions, Boussole, Nutrition Lab
SP-FIL / SP-MET / C2B : restitution 5.0
TRUST / IDP : choix, identité durable, mémoire multi-épisodes
```

Le journal appartient fonctionnellement à JA/C5, mais son activation nominative durable dépend de C2A et IDP selon le périmètre.

## 2. Architecture en couches

```text
UI patient
→ commandes de capture
→ événements immuables
→ normalisation et validation
→ moteur d’observabilité
→ agrégats de trajectoire
→ ClinicalSnapshot / PhaseReview
→ Fil du jour / fiche-trajectoire / Nutrition Lab
```

## 3. Event sourcing léger

Les entrées originales ne sont pas écrasées.

Une correction crée un événement avec :

- `supersedesEventId` ;
- raison optionnelle ;
- date ;
- auteur ;
- version de schéma.

Les vues courantes sont des projections recalculables.

## 4. Nouvelles entités

### `FoodObservationEpisode`

Tour alimentaire borné et versionné.

### `ObservationPolicy`

Définit :

- mode panoramique/focalisé/hybride ;
- fenêtres ;
- marqueurs nécessaires ;
- règle de suffisance ;
- charge maximale ;
- plan minimal.

### `MealObservationEvent`

Événement de repas ou d’action.

### `MealSignature`

Modèle personnel réutilisable.

### `FoodTrajectorySnapshot`

Projection immuable à une date.

### `AdherenceWeatherFinding`

Signal praticien à trois états avec causes observables.

## 5. Capture assistée

### Voix

```text
Audio transitoire
→ transcription
→ extraction de marqueurs proposée
→ confirmation patient
→ stockage des marqueurs
→ suppression de l’audio et, par défaut, du texte brut
```

### Photo

```text
Photo locale ou upload temporaire
→ proposition de familles
→ confirmation/correction
→ stockage structuré
→ suppression de l’image par défaut
```

Toute conservation optionnelle nécessite un choix explicite et une politique TRUST dédiée.

## 6. Hors ligne

Le journal doit être utilisable hors ligne :

- cache local chiffré autant que possible ;
- file de synchronisation ;
- identifiants idempotents ;
- résolution de conflits ;
- état « enregistré sur cet appareil » puis « synchronisé » ;
- aucune perte silencieuse.

## 7. API cible

```text
GET  /api/portail/alimentation/episode-actif
POST /api/portail/alimentation/events
POST /api/portail/alimentation/events/:id/correct
GET  /api/portail/alimentation/signatures
POST /api/portail/alimentation/signatures
GET  /api/portail/alimentation/reflection
POST /api/portail/alimentation/plan-minimal

GET  /api/praticien/patients/:id/alimentation/trajectory
POST /api/praticien/patients/:id/alimentation/review
POST /api/praticien/patients/:id/alimentation/action-candidate
```

## 8. Arborescence proposée

```text
web/src/lib/food-observation/
  contracts.ts
  markerRegistry.ts
  policies/
  commands/
  events/
  projections/
  coverage/
  questionnaireProjection/
  discordances/
  adherenceWeather/
  tests/

web/src/components/food-observation/patient/
web/src/components/food-observation/practitioner/
web/src/app/portail/[token]/alimentation/
web/src/app/dashboard/patients/[id]/alimentation/
```

## 9. Intelligence artificielle

L’IA peut :

- proposer des marqueurs depuis voix/photo ;
- reformuler une réflexion hebdomadaire ;
- suggérer des questions d’entretien à partir de discordances structurées ;
- composer un brouillon de synthèse.

L’IA ne peut pas :

- ajouter un marqueur non confirmé ;
- calculer un score officiel ;
- choisir une action ;
- conclure à une carence ;
- envoyer une notification ou un document sans règle et validation ;
- interroger une source clinique non publiée.

## 10. Versionnage

Chaque agrégat porte :

```text
schemaVersion
markerRegistryVersion
observationPolicyVersion
coverageEngineVersion
questionnaireProjectionVersion
foodCompassMappingVersion
corpusBuildVersion
```

Deux épisodes ne sont comparés automatiquement que si les instruments, mappings et fenêtres sont compatibles.
