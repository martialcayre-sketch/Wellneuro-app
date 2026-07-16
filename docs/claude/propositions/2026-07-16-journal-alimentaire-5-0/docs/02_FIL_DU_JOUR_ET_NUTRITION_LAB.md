---
id: wellneuro-ja5-praticien-fil-lab
version: 5.0-proposition
---

# Expérience praticien — Fil du jour, fiche-trajectoire et Nutrition Lab

## 1. Le Fil du jour

Le journal ne crée pas un nouveau tableau de bord isolé. Il alimente le Fil du jour avec des cartes actionnables.

Chaque carte répond à trois questions :

1. Pourquoi maintenant ?
2. Que sait-on réellement ?
3. Quelle action humaine est proposée ?

### Cartes possibles

#### Revue J7/J14/J21

```text
Jennifer Martin · J14
Pourquoi maintenant : point d’étape prévu aujourd’hui.
Observation : 6 opportunités sur 8 documentées.
Action : ouvrir la trajectoire alimentaire.
```

#### Observation devenue suffisante

```text
Sophie Nicola
Pourquoi maintenant : les trois contextes ciblés sont maintenant couverts.
La tendance peut être relue sans demander davantage de saisie.
```

#### Météo d’adhésion fragile

```text
Michel Dogné · fragile
Cause observable : aucune trace depuis 5 jours, plan minimal non activé.
Action proposée : reformuler la charge, pas renforcer les rappels.
```

Cette météo reste exclusivement praticien.

#### Discordance déclaré/observé

```text
Q_ALI_02 : poisson ≥ 3 fois/semaine déclaré à T0.
Journal : 1 occasion observée sur 12 repas documentés.
Limite : couverture partielle du week-end.
Question suggérée : « Les semaines observées étaient-elles représentatives ? »
```

La discordance génère une question, pas une conclusion.

## 2. Fiche-trajectoire

La trajectoire alimentaire est une section de la fiche patient 5.0.

### Bande temporelle

```text
T0 déclaré → panorama → action → consolidation → J21
```

Chaque jalon affiche :

- date ;
- épisode ;
- version ;
- politique d’observation ;
- qualité de couverture ;
- action active ;
- statut de revue.

### Time-travel

Un clic recharge l’état historique en lecture seule. Toute note ajoutée est une `RelectureNote` datée au présent.

## 3. Lecture en deux niveaux

### Niveau 1 — lecture clinique en moins de deux minutes

- question de phase ;
- action ;
- météo ;
- qualité d’observation ;
- trois constats maximum ;
- une discordance importante ;
- limite principale ;
- proposition de décision.

### Niveau 2 — détail

- événements ;
- fréquences ;
- opportunités ;
- journées atypiques ;
- signatures de repas ;
- provenance ;
- règles et versions ;
- projections item par item Q_ALI_01/Q_ALI_02 ;
- données non inférables.

## 4. Nutrition Lab 5.0

Le Nutrition Lab évolue d’une bibliothèque de profils vers un **atelier de simulation contrôlée**.

### A. Repas miroir

Comparer :

- l’empreinte observée ;
- une variante réaliste ;
- les marqueurs modifiés ;
- la charge pratique ;
- les limites.

Le résultat est un delta alimentaire, pas une prédiction de santé.

### B. Simulateur d’action

```text
Action actuelle : ajouter des légumineuses 2 fois/semaine
Scénario : remplacement d’un repas carné du midi

Effets observables projetés :
+ une opportunité légumineuse
+ diversité végétale
+ fibres
Charge estimée : modérée
Contraintes : temps de préparation
```

Le praticien peut insérer le scénario comme candidat dans le ProtocolDraft. Rien n’est envoyé automatiquement.

### C. Trous d’observation

Le système distingue :

- trou alimentaire possible ;
- trou de mesure ;
- donnée non inférable.

Exemple : l’absence de poisson observé sur trois déjeuners n’est pas une faible consommation hebdomadaire établie.

### D. Substitutions contextuelles

Les substitutions tiennent compte :

- objectif de phase ;
- préférences ;
- allergènes ;
- régime ;
- coût ;
- disponibilité ;
- temps ;
- traitements et contraintes publiées ;
- charge du protocole.

## 5. Météo d’adhésion

Trois états :

- régulière ;
- fragile ;
- interrompue.

Elle est produite uniquement à partir de causes observables :

- silence du journal ;
- opportunités non documentées ;
- activation du plan minimal ;
- report explicite ;
- difficulté déclarée lors du check-in C2.

Elle ne prédit ni abandon ni réponse clinique.

## 6. Cabinet apprenant

Après au moins cinq épisodes clos, le praticien peut voir des repères agrégés :

- temps médian de saisie ;
- proportion d’épisodes avec observation suffisante ;
- fréquence d’activation du plan minimal ;
- charge moyenne des actions ;
- causes les plus fréquentes de fragilité.

Toujours afficher `n=`. Jamais de comparaison nominative, de classement ou de prédiction patient.
