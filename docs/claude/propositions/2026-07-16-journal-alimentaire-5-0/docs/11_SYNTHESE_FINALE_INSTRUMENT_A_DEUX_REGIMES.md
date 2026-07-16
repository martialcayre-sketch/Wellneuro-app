---
id: wellneuro-ja5-synthese-finale-deux-regimes
version: 5.0-proposition
date: 2026-07-16
statut: synthese_a_arbitrer
---

# Journal alimentaire 5.0 — synthèse finale d'un instrument à deux régimes

## 1. Décision conceptuelle proposée

Le Journal alimentaire 5.0 ne doit être réduit ni à un relevé exhaustif des
repas, ni à un simple outil de suivi d'observance.

Il doit devenir un **instrument longitudinal à deux régimes** :

1. un régime d'évaluation avant protocole, destiné à construire un profil
   alimentaire observationnel ;
2. un régime d'expérimentation après protocole, destiné à documenter la
   faisabilité d'une action validée.

Ces deux régimes partagent une infrastructure de capture, de provenance, de
couverture et de correction. Ils ne partagent pas automatiquement les mêmes
questions, métriques ou règles d'interprétation.

## 2. Pourquoi deux régimes sont nécessaires

Le questionnaire, le journal et l'entretien ne produisent pas la même forme de
connaissance.

```text
Questionnaire
→ perception rétrospective et habitudes déclarées

Journal d'évaluation
→ échantillon alimentaire observé dans des situations réelles

Entretien
→ contexte, sens, préférences et éléments non observables

Praticien
→ interprétation et décision
```

Après validation du protocole, la finalité change :

```text
Journal d'expérimentation
→ occasions, tentatives, adaptations, frictions et facilitateurs

PhaseReview
→ maintien, simplification, remplacement, suspension ou arrêt
```

Un seul régime ne peut pas répondre correctement aux deux besoins. Une
observation focalisée sur une action ne permet pas de décrire l'alimentation
initiale ; une collecte panoramique permanente impose une charge excessive
pendant le suivi.

## 3. Régime A — évaluation alimentaire observationnelle

### Finalité

Construire, avant le protocole, un profil descriptif suffisamment couvert pour
éclairer le `ClinicalSnapshot` et la `DecisionCard`, sans produire seul une
conclusion clinique.

### Questions principales

- quelle structure alimentaire apparaît dans la fenêtre observée ?
- quels marqueurs sont présents, absents ou non documentés ?
- quelle variabilité existe entre moments, jours et contextes ?
- quelles contraintes et préférences sont visibles ou déclarées ?
- quelles observations concordent ou non avec Q_ALI_01 et Q_ALI_02 ?
- quelles limites empêchent une interprétation plus large ?

### Dimensions descriptives possibles

- structure et rythme des prises lorsque les horaires sont connus ;
- densité végétale observée ;
- diversité des sources ;
- qualité glucidique observable ;
- qualité lipidique documentée ;
- sources protéiques ;
- degré de transformation ;
- boissons et hydratation ;
- contexte culinaire, social et pratique.

Ces dimensions restent séparées. Elles ne sont ni fusionnées en un score
global, ni activées sans taxonomie, règles et sources gouvernées.

### Sortie canonique proposée

`DietaryObservationProfile`

```text
DietaryObservationProfile
├── fenêtre et politique d'observation
├── qualité de couverture
├── structure des prises
├── marqueurs observés
├── variabilité temporelle et contextuelle
├── dimensions descriptives
├── contraintes et facilitateurs déclarés
├── correspondances avec les questionnaires
├── discordances
├── données non inférables
├── limites
├── provenance
└── versions des instruments
```

## 4. Régime B — expérimentation d'une action alimentaire

### Finalité

Comprendre si une action validée est réellement praticable dans la vie du
patient et quelle version peut être maintenue, adaptée ou abandonnée.

### Objet central proposé

`DietaryActionExperiment`

### Données principales

- occasion attendue ou réellement rencontrée ;
- action facile, adaptée, reportée ou non praticable ;
- friction dominante ;
- facilitateur observable ;
- version idéale, simple ou de secours lorsqu'elles ont été validées ;
- choix du patient sur ce qu'il souhaite conserver ;
- limites de la période observée.

### Innovation principale

Le système ne produit pas un score d'observance. Il construit une
**cartographie des frictions et des facilitateurs** afin d'améliorer la qualité
du protocole.

Une action peu réalisée peut être un résultat utile si elle révèle une absence
d'occasion, une complexité excessive, un mauvais contexte, une priorité non
partagée ou une charge disproportionnée.

## 5. Intégration dans la Spirale WellNeuro 5.0

```text
Q_ALI_01 / Q_ALI_02
Déclaré rétrospectif
        ↓
DietaryAssessmentEpisode
Observation alimentaire initiale
        ↓
DietaryObservationProfile
Profil observé, couverture et limites
        ↓
Entretien + validation praticien
        ↓
ClinicalSnapshot
        ↓
DecisionCard
        ↓
ProtocolDraft validé
        ↓
DietaryActionExperiment
Faisabilité, adaptations et frictions
        ↓
PhaseReview
        ↓
Nouveau tour compatible de la Spirale
```

Cette architecture matérialise la continuité 5.0 :

```text
déclaré
→ observé
→ interprété
→ expérimenté
→ réévalué
```

La Spirale reste un objet de navigation et de mémoire, jamais un graphe qui
prétendrait représenter une causalité clinique.

## 6. Innovation de la double perspective

Le Journal alimentaire 5.0 peut devenir distinctif en maintenant quatre
lectures séparées :

1. **déclaré** — ce que les questionnaires décrivent ;
2. **observé** — ce que la fenêtre du journal rend visible ;
3. **vécu** — ce que le patient explique, préfère et accepte ;
4. **interprété** — ce que le praticien valide comme pertinent.

Une discordance entre ces lectures ne produit jamais automatiquement une
anomalie. Elle génère une question d'entretien avec ses sources et ses limites.

## 7. Système de mesure recommandé

### Mesurer les observations

Pour chaque marqueur ou dimension :

- occasions pertinentes ;
- occasions documentées ;
- présence confirmée ;
- distribution temporelle ;
- distribution contextuelle ;
- stabilité ou variabilité ;
- mode de capture et de confirmation ;
- données manquantes et non inférables.

### Mesurer la mesure

Le système doit également décrire sa propre qualité :

- moments et contextes couverts ;
- semaine, week-end et journées atypiques lorsque pertinents ;
- saisies immédiates ou rappelées ;
- traces confirmées, simplifiées ou proposées par un assistant ;
- corrections ;
- trous de mesure ;
- limites d'extrapolation.

```text
profil observé
≠
qualité de couverture
```

Une absence de donnée n'est jamais convertie en absence de comportement ou en
zéro.

## 8. Innovations transversales à conserver

### Budget d'attention

Chaque politique fixe une charge maximale compréhensible : nombre de traces,
questions par occasion, plages de silence, pause et reprise.

### Droit au silence utile

Le système cesse de solliciter lorsque des observations supplémentaires ne
changeraient plus la prochaine revue, selon des règles d'observabilité
versionnées et validées.

### Bibliothèque personnelle de solutions

Les signatures évoluent vers des solutions confirmées dans des contextes réels
— départ matinal, déplacement, faible appétit, fatigue ou contrainte pratique —
sans devenir automatiquement des recommandations actives.

### Delta de décision

Chaque tour indique ce que les nouvelles observations ont apporté à la décision
humaine : maintien, adaptation, remplacement ou absence de conclusion.

### Expérience non concluante utile

L'impossibilité de conclure est une sortie légitime. Elle doit être distinguée
d'une conclusion négative et accompagnée de la raison : couverture, contexte,
instrument ou question mal adaptés.

## 9. Gouvernance comparable à celle d'un questionnaire

Parce que le journal participe à l'évaluation, il doit être gouverné comme un
instrument de mesure :

- objectif et contexte d'utilisation explicites ;
- protocole d'administration ;
- registre versionné des marqueurs ;
- unités d'observation ;
- règles déterministes de projection ;
- gestion documentée des données manquantes ;
- règles de couverture et limites d'interprétation ;
- versions du moteur et des mappings ;
- fixtures de certification ;
- tests de reproductibilité ;
- sources documentaires publiées ;
- séparation entre métriques validées et hypothèses exploratoires.

Toute modification d'une règle de projection ou d'interprétation doit suivre la
gouvernance clinique et documentaire du dépôt. Aucun seuil ou score ne peut
être inventé à partir de cette synthèse.

## 10. Principes non négociables

- aucun score global de mérite ou de qualité du patient ;
- aucune recommandation ou activation autonome ;
- questionnaire et journal restent des instruments distincts ;
- score officiel jamais recalculé silencieusement depuis le journal ;
- aucune causalité tirée d'une association temporelle ;
- profil observé toujours accompagné de sa couverture ;
- provenance et version visibles ;
- correction, retrait et droits RGPD prévus avant persistance ;
- collecte limitée à ce qui peut changer une décision ;
- validation praticien et participation du patient conservées à chaque tour.

## 11. Périmètre de première validation

La première expérimentation devrait tester séparément les deux régimes.

### Bilan observationnel

- capture manuelle structurée ;
- registre minimal de marqueurs déjà gouvernés ;
- profil descriptif sans score global ;
- couverture et limites visibles ;
- comparaison item par item avec les questionnaires, sans recalcul de score ;
- restitution praticien courte.

### Suivi d'action

- une action validée ;
- occasions, adaptations, frictions et facilitateurs ;
- budget d'attention ;
- arrêt ou suspension explicites ;
- delta de décision à la revue.

### Différé

- photo et scan ;
- recommandations autonomes ;
- cabinet apprenant ;
- comparaison automatique d'épisodes incompatibles ;
- score global ;
- inférences nutritionnelles non confirmées ;
- migration ou activation en production.

## 12. Arbitrages avant campagne

1. Valider formellement l'architecture à deux régimes.
2. Définir les questions auxquelles le bilan observationnel doit répondre.
3. Sélectionner les marqueurs déjà suffisamment gouvernés pour un pilote.
4. Définir une couverture exploitable sans créer de seuil clinique implicite.
5. Déterminer la place exacte du profil dans le `ClinicalSnapshot`.
6. Définir la comparaison autorisée avec Q_ALI_01 et Q_ALI_02.
7. Trancher les noms patient, praticien et techniques.
8. Définir les conditions de prudence, suspension et retrait.
9. Séparer explicitement le lot documentaire, le prototype, la certification,
   la persistance et l'activation clinique.

## 13. Formulation finale proposée

> Le Journal alimentaire 5.0 est un instrument longitudinal qui confronte le
> déclaré, l'observé et le vécu. Avant le protocole, il construit un profil
> alimentaire observationnel accompagné de sa couverture et de ses limites.
> Après validation du protocole, il documente la faisabilité des actions, leurs
> adaptations et leurs frictions. Le praticien reste responsable de
> l'interprétation et de la décision ; le patient conserve le contrôle de la
> saisie, de la contextualisation et de ce qu'il souhaite maintenir.

Cette synthèse conclut le brainstorming documentaire. Elle ne vaut pas
validation clinique, compilation de campagne, migration ou autorisation
d'implémentation. Toute suite doit commencer par un plan en lecture seule et
des arbitrages explicites.
