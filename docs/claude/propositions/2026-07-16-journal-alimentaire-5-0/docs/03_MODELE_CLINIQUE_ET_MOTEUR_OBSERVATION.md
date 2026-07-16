---
id: wellneuro-ja5-modele-clinique
version: 5.0-proposition
---

# Modèle clinique et moteur d’observation

## 1. Question de phase obligatoire

Un épisode actif porte une question bornée, par exemple :

- la qualité du petit-déjeuner est-elle modifiable quatre jours par semaine ?
- le remplacement de l’huile principale est-il réalisable au domicile ?
- les légumineuses peuvent-elles être intégrées deux fois par semaine ?
- les boissons sucrées apparaissent-elles surtout dans un contexte précis ?

Sans question, le système ne doit pas demander un journal complet par défaut.

## 2. Action alimentaire structurée

```text
Comportement précis
+ moment
+ fréquence
+ plan idéal
+ plan minimal
+ plan de secours
+ opportunités observables
+ contraintes
+ critère J21
```

## 3. Les neuf axes d’observation

Ils sont conservés, mais utilisés comme une taxonomie descriptive :

1. densité végétale ;
2. fibres et qualité glucidique ;
3. qualité lipidique ;
4. qualité protéique ;
5. degré de transformation ;
6. boissons et hydratation ;
7. polyphénols et diversité ;
8. rythme alimentaire ;
9. qualité culinaire et contexte.

Ils ne remplacent pas les 12 besoins et ne calculent pas directement sommeil, stress, humeur, cognition ou inflammation.

## 4. Registre des marqueurs

Chaque marqueur doit porter :

- code stable ;
- libellé patient ;
- libellé praticien ;
- famille ;
- unité d’observation ;
- inférabilité depuis photo/voix ;
- besoin de confirmation ;
- correspondances Q_ALI_01/Q_ALI_02 ;
- limites ;
- version ;
- sources publiées.

## 5. Degré de certitude

Chaque information porte un statut :

- `patient_confirmed` ;
- `assistant_proposed` ;
- `derived_deterministic` ;
- `recalled_simplified` ;
- `unknown`.

La restitution ne doit jamais effacer cette provenance.

## 6. Couverture orientée question

La couverture n’est plus seulement un nombre de jours.

Elle combine :

- nombre d’opportunités pertinentes ;
- diversité des contextes ;
- distribution dans la phase ;
- mode de saisie ;
- confirmations ;
- journées atypiques ;
- corrections ;
- données manquantes ;
- stabilité ou variabilité des signatures.

### Exemple

Pour l’action « petit-déjeuner protéiné quatre jours sur sept » :

```text
7 petits-déjeuners observés
5 contiennent une source protéique confirmée
2 jours non observés
1 semaine de déplacement signalée
```

Le moteur peut décrire la réalisation sur les opportunités observées, mais ne doit pas extrapoler silencieusement à l’ensemble des 21 jours.

## 7. Suffisance d’observation

État recommandé :

- `insufficient` ;
- `exploratory` ;
- `sufficient_for_phase_question` ;
- `high_confidence`.

Les règles exactes sont versionnées par type de question. Elles sont des règles d’observabilité, pas des seuils cliniques.

## 8. Projections SIIN

### Q_ALI_01

Le journal peut documenter certains items : légumes, fruits, légumineuses, poisson, viande/charcuterie, matières grasses, noix, œufs, céréales complètes, boissons sucrées, ultra-transformés et structure des repas.

Les compulsions et plusieurs comportements déclaratifs ne sont pas déduits à partir d’un simple journal.

### Q_ALI_02

Le journal peut documenter les occasions compatibles avec le modèle méditerranéen, mais :

- ne reconstitue pas automatiquement le total officiel ;
- garde `non_inferable` les quantités exactes d’huile et les modalités détaillées d’alcool ;
- compare déclaré et observé uniquement si la couverture est suffisante.

## 9. Discordances utiles

Exemples :

- déclaré fréquent, rarement observé ;
- action déclarée facile, opportunités peu réalisées ;
- repas « habituel » très variable ;
- rythme déclaré régulier, horaires observés très dispersés ;
- alimentation perçue comme méditerranéenne, marqueurs clés peu documentés.

Chaque discordance fournit :

- les deux sources ;
- les dates ;
- les versions ;
- les limites ;
- une question d’entretien ;
- ce qui pourrait changer la décision.

## 10. Sortie canonique

Le journal produit un `FoodTrajectorySnapshot` et un `DietaryTrajectoryFinding`.

Ils contiennent :

- couverture ;
- observations ;
- action et opportunités ;
- constats par axes ;
- projections SIIN item par item ;
- discordances ;
- données manquantes ;
- météo d’adhésion praticien ;
- limites ;
- provenance ;
- versions.

Ils ne contiennent pas :

- diagnostic ;
- carence ;
- causalité ;
- prescription autonome ;
- score de mérite ;
- pronostic.
