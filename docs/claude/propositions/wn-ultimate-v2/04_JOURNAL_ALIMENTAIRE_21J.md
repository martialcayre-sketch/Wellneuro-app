---
id: "wellneuro-journal-alimentaire-21j-v2"
version: "2.0"
date_source_declaree: "2026-07-14"
integre_le: "2026-07-13"
statut_integration: "proposition_non_executable_a_valider"
statut: "specification_canonique"
---

# Journal alimentaire de 21 jours

## 1. Promesse

Recueillir en moins d’une minute par jour une trajectoire alimentaire utile au protocole, sans imposer calories, pesées ni perfection.

## 2. Position

Le journal est :

- un programme borné ;
- une source d’observation ;
- un support d’adhésion ;
- un matériau de réévaluation.

Il n’est pas :

- un questionnaire psychométrique ;
- un compteur de calories ;
- un outil de diagnostic ;
- une surveillance permanente ;
- un remplacement de l’enquête alimentaire SIIN.

## 3. Parcours

```text
Aujourd’hui
→ choisir repas
→ capture rapide / copie / favori
→ marqueurs et portions ordinales
→ confirmer
→ clôture quotidienne en quelques clics
```

Quatre prises principales sont proposées : petit-déjeuner, déjeuner, dîner, collation. Le patient peut indiquer un autre moment.

## 4. Capture

Modes :

- rapide ;
- favori ;
- copie ;
- dictée confirmée ;
- photo confirmée ;
- rappel simplifié.

La dictée et la photo n’entrent jamais directement dans le moteur sans confirmation structurée.

## 5. Marqueurs

Le registre V1 contient **25 codes**. La documentation et le code doivent être alignés avant fusion.

Chaque marqueur possède :

- code stable ;
- famille ;
- libellé patient ;
- libellé praticien ;
- portions autorisées ;
- axes contributifs ;
- limites ;
- version.

## 6. Neuf axes V1

1. densité végétale ;
2. qualité glucidique ;
3. qualité lipidique ;
4. qualité protéique ;
5. transformation ;
6. rythme des repas ;
7. qualité culinaire ;
8. hydratation ;
9. contexte de prise alimentaire.

La diversité polyphénolique, la saisonnalité et la qualité des achats peuvent être ajoutées comme métriques secondaires après validation.

## 7. Couverture et fiabilité

Deux objets séparés :

### Couverture

- jours attendus ;
- jours avec données ;
- jours clôturés ;
- jours représentatifs ;
- jours partiels ;
- jours rappelés ;
- jours manquants.

### Fiabilité

- ratio de rappels ;
- ratio de jours atypiques ;
- ratio de jours partiels ;
- cohérence ;
- motifs de prudence.

Une bonne couverture n’implique pas automatiquement une bonne fiabilité.

## 8. Analyses

Produire deux lectures :

```text
allDaysAnalysis
representativeDaysAnalysis
```

Les jours partiels, atypiques et rappelés doivent rester identifiables.

## 9. Actions alimentaires

Chaque action possède :

- cible ;
- fréquence ;
- repas concernés ;
- jours concernés ;
- méthode d’évaluation ;
- seuil de réussite ;
- limites.

Les objectifs maximums et présences par repas sont évalués sur des opportunités calendaires, pas seulement sur les repas déjà saisis.

## 10. Projections questionnaires

Le journal peut estimer des tendances vers `Q_ALI_01` ou `Q_ALI_02`, avec quatre statuts :

- `estimable` ;
- `proxy_only` ;
- `not_inferable` ;
- `insufficient_data`.

Il ne calcule jamais le score officiel.

## 11. Discordances alimentaires

Exemples :

- déclaratif favorable / observation défavorable ;
- observation favorable / questionnaire défavorable ;
- couverture élevée mais fiabilité faible ;
- action déclarée facile mais rarement réalisée ;
- progrès limité à des jours atypiques ;
- trajectoire non compatible avec les dates du questionnaire.

Chaque discordance devient une question d’entretien.

## 12. API

Principes :

- idempotence via `clientMutationId` ;
- contrôle optimiste via `serverVersion` ;
- dates client et serveur séparées ;
- schémas validés ;
- correction et suppression ;
- réponse explicite en cas de conflit ;
- lecture patient strictement scopée.

Routes cibles indicatives :

```text
GET    /api/patient/food-diary/program
POST   /api/patient/food-diary/entries
PATCH  /api/patient/food-diary/entries/:id
DELETE /api/patient/food-diary/entries/:id
POST   /api/patient/food-diary/closeouts
GET    /api/patient/food-diary/summary
GET    /api/practitioner/food-diary/:programId
POST   /api/practitioner/food-diary/:programId/analyze
```

## 13. Persistance

Modèles cibles :

- `FoodDiaryProgram` ;
- `FoodDiaryEntry` ;
- `FoodDiaryDailyCloseout` ;
- `DietaryActionTarget` ;
- `FoodDiaryAnalysis`.

Le programme référence `protocolDraftId` et les actions concernées. Il ne devient pas une assignation de questionnaire.

Toute migration reste soumise au gate C2A.

## 14. Sécurité locale

Le prototype local est un matériau UX, pas une implémentation de production.

À imposer :

- feature flags désactivés par défaut ;
- validation après lecture de `localStorage` ;
- TTL ;
- version de schéma ;
- purge après synchronisation et déconnexion ;
- aucune photo brute conservée sans finalité et consentement ;
- aucune donnée sensible dans les logs.

## 15. Corrections requises sur le code prototype

1. exclure ou distinguer les journées partielles dans les dénominateurs ;
2. appliquer réellement la politique de fiabilité des rappels ;
3. corriger l’évaluation `max_events_per_day` ;
4. calculer les opportunités de repas depuis le calendrier ;
5. créer `discordances.ts` ;
6. désactiver voix, photo et offline par défaut ;
7. supprimer l’ID local de programme codé en dur ;
8. brancher la session portail ;
9. enregistrer versions et `inputHash` ;
10. tester les conflits de synchronisation.

## 16. Restitution

### Patient

- progression factuelle ;
- réussites ;
- une piste simple ;
- absence de note culpabilisante ;
- aucune pseudo-précision.

### Praticien

- couverture ;
- fiabilité ;
- trajectoire ;
- axes ;
- marqueurs ;
- action outcomes ;
- discordances ;
- projections ;
- versions ;
- données brutes accessibles en second niveau.

## 17. Intégration J21

Le journal produit `DietaryTrajectoryFinding`, intégré au nouveau snapshot puis au `PhaseReview`.

Il ne modifie pas rétroactivement les questionnaires.

## 18. Lots

- JA-00 : audit du prototype et alignement des contrats ;
- JA-01 : domaine TypeScript pur corrigé ;
- JA-02 : composants patients avec données simulées ;
- JA-03 : contrats API ;
- JA-04 : gate migration et persistance ;
- JA-05 : intégration portail ;
- JA-06 : vue praticien et analyse ;
- JA-07 : J21, Boussole et tests E2E.
