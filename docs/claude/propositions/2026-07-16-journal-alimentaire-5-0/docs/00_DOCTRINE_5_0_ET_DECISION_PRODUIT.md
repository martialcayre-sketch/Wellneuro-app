---
id: wellneuro-ja5-doctrine-produit
version: 5.0-proposition
statut: a_arbitrer
---

# Journal alimentaire 5.0 — doctrine et décision produit

## 1. Ce que la doctrine 5.0 impose

La doctrine « la Spirale » n’abandonne pas le cycle clinique 3.x. Elle change la manière dont l’application mémorise et restitue ce que les phases successives ont appris.

Le journal alimentaire doit donc devenir :

- un **objet longitudinal** attaché à un épisode ;
- une mémoire des essais alimentaires réellement tentés ;
- un instrument de comparaison entre tours compatibles ;
- une source d’observations pour le ClinicalSnapshot suivant ;
- un support de reprise en douceur ;
- un producteur de signaux explicables dans le Fil du jour.

Il ne devient jamais :

- un graphe en spirale ;
- un score quotidien ;
- un outil de contrôle calorique ;
- un assistant qui choisit seul ce que le patient doit manger ;
- une preuve causale entre alimentation et symptômes.

## 2. Changement de paradigme

### Ancien modèle

```text
21 jours
→ saisir le plus de repas possible
→ agréger les fréquences
→ produire une synthèse
```

### Modèle 5.0

```text
Une question clinique alimentaire précise
→ une action validée
→ une politique d’observation proportionnée
→ des traces à forte valeur informationnelle
→ une lecture de trajectoire
→ une décision de tour suivant
```

La réussite n’est plus « 21 journées parfaitement remplies ». La réussite devient :

> disposer d’observations suffisamment distribuées et fiables pour répondre à la question de la phase, sans imposer une charge excessive.

## 3. Le nouvel objet central : l’épisode d’observation alimentaire

Un `FoodObservationEpisode` correspond à un tour borné de la Spirale.

Il porte :

- la question alimentaire de phase ;
- l’action validée ;
- le mode d’observation choisi ;
- les fenêtres d’observation ;
- les traces recueillies ;
- la couverture et ses limites ;
- les écarts déclaré ↔ observé ;
- la faisabilité ;
- la conclusion descriptive J21 ;
- les versions de règles et de référentiels.

## 4. Trois politiques d’observation

### A. Panoramique

Pour comprendre un schéma alimentaire peu documenté.

- trois journées représentatives ;
- au moins une journée de week-end lorsque pertinent ;
- deux à trois prises alimentaires par journée ;
- détails limités aux marqueurs structurants.

### B. Focalisée

Pour suivre une action précise.

Exemples :

- légumineuses deux fois par semaine ;
- huile colza/olive à la place du tournesol ;
- petit-déjeuner protéiné ;
- diminution des boissons sucrées.

Le patient ne renseigne que les **opportunités liées à l’action**. Le dénominateur est le nombre d’opportunités observables, pas le nombre total de repas.

### C. Hybride 21 jours — mode par défaut

```text
J1–J3    panorama léger
J4–J14   observation focalisée sur l’action
J15–J20  consolidation et mode minimal si besoin
J21      clôture, réflexion et comparaison
```

Cette politique est plus moderne que la saisie exhaustive : elle concentre l’attention sur ce qui peut réellement changer la décision.

## 5. Les quatre lectures restent séparées

```text
Déclaré     = Q_ALI_01 / Q_ALI_02
Observé     = événements du carnet
Intrinsèque = profil d’un aliment ou d’une action
Contextuel  = pertinence dans la phase validée
```

Aucune fusion en un score unique n’est autorisée.

## 6. Intégration à la Spirale

Chaque tour alimentaire produit une vignette temporelle :

```text
T0 : habitudes déclarées
S1 : premiers repères observés
S2 : mise en œuvre de l’action
J21 : trajectoire et faisabilité
```

La Spirale sert d’index. Les données restent affichées en lignes, barres, tableaux, bandes temporelles et comparateurs lisibles.

Le time-travel recharge l’épisode passé en lecture seule. Une note de relecture peut être ajoutée, mais elle est datée au présent et séparée du snapshot historique.

## 7. Nouvelles promesses

### Patient

> Gardez seulement les traces qui aideront votre praticien à comprendre ce qui est réellement faisable pour vous.

### Praticien

> Voir en moins de deux minutes ce qui a été tenté, à quelles occasions, avec quelle régularité et avec quelles limites de mesure.

## 8. Nom et langage

### Interface patient

- « Ma spirale alimentaire »
- « Une trace utile »
- « Mon repère du jour »
- « Mon plan minimal »
- « Ce que cette phase nous apprend »

### Interface praticien

- « Trajectoire alimentaire »
- « Qualité d’observation »
- « Opportunités observées »
- « Discordance déclaré/observé »
- « Météo d’adhésion »

Éviter :

- bon/mauvais ;
- réussi/échoué ;
- faute/écart ;
- score d’observance ;
- patient compliant/non compliant.
