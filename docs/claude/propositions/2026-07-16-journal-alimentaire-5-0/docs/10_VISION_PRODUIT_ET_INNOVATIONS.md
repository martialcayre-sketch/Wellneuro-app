---
id: wellneuro-ja5-vision-produit-innovations
version: 5.0-exploration
date: 2026-07-16
statut: vision_a_arbitrer
---

# Journal alimentaire 5.0 — vision produit et innovations

## 1. Intention

Cette proposition explore une évolution plus radicale du Journal alimentaire
5.0. Elle ne constitue ni une décision produit, ni une règle clinique, ni une
autorisation d'implémentation.

La vision consiste à ne plus construire un journal centré sur la description
des repas, mais un **atelier d'expériences alimentaires** centré sur la
faisabilité des actions validées avec le praticien.

Le changement de question est structurant :

```text
Journal classique
« Qu'avez-vous mangé aujourd'hui ? »

Journal adaptatif
« Avez-vous réalisé l'action prévue ? »

Vision proposée
« Quand l'occasion s'est présentée, qu'est-ce qui a rendu l'action
facile, difficile ou inutile ? »
```

## 2. Conviction produit

La donnée la plus utile n'est pas nécessairement le contenu exhaustif du repas.
Elle peut être le mécanisme de faisabilité de l'action :

- l'occasion s'est-elle réellement présentée ?
- le patient l'a-t-il reconnue ?
- l'action était-elle disponible et acceptable ?
- une adaptation a-t-elle été nécessaire ?
- quelle friction ou quel facilitateur a compté ?
- quelle version plus simple aurait été praticable ?

Le produit ne cherche donc pas à mesurer la conformité du patient. Il aide le
patient et le praticien à améliorer progressivement la conception du
protocole.

## 3. Proposition de positionnement

### Nom patient exploratoire

**Mes expériences alimentaires**

### Nom praticien exploratoire

**Atelier de faisabilité alimentaire**

### Objet de domaine exploratoire

`DietaryActionExperiment`

### Promesse

> Nous ne cherchons pas à vérifier si vous avez été parfait. Nous cherchons
> ensemble la version de l'action qui fonctionne réellement dans votre vie.

## 4. L'expérience alimentaire comme objet central

Chaque épisode porte une hypothèse limitée, une action validée et plusieurs
versions de cette action.

```text
Hypothèse
Un petit-déjeuner avec une source protéique est praticable
plusieurs jours travaillés par semaine.

Version idéale
Préparer l'option prévue dans le protocole.

Version simple
Ajouter une source disponible au petit-déjeuner habituel.

Version de secours
Utiliser l'option préparée la veille.

Question d'observation
Le principal obstacle est-il le temps, l'appétit,
la disponibilité, l'organisation ou l'acceptabilité ?
```

La fréquence et les contenus de cet exemple sont illustratifs. Ils doivent
toujours provenir d'une action validée, jamais d'une règle inventée par le
journal.

## 5. Innovation principale — cartographie des frictions

Au lieu de produire un score d'observance, le système restitue les conditions
qui facilitent ou empêchent l'action.

### Capture minimale

```text
Cette occasion s'est-elle présentée ?
[Oui] [Non] [Je ne sais pas]

L'action était-elle praticable ?
[Facile] [Avec adaptation] [Pas aujourd'hui]
```

Une seule précision facultative peut suivre :

```text
Qu'est-ce qui a surtout compté ?
[Temps] [Disponibilité] [Appétit]
[Coût] [Contexte social] [Tolérance]
[Oubli] [Autre]
```

### Restitution praticien

```text
Action observée : petit-déjeuner avec l'option prévue

8 occasions reconnues
4 faciles
2 possibles avec adaptation
2 non praticables

Friction dominante : option indisponible au moment utile
Facilitateur dominant : préparation la veille
Limite : contexte de week-end peu documenté
```

Ces constats restent descriptifs. Ils ne prouvent ni efficacité clinique, ni
causalité, ni défaut de motivation.

## 6. Innovation — budget d'attention

Chaque expérience possède un budget de sollicitation explicite, compris et
réglable par le patient dans les limites du protocole.

```text
Budget choisi
• nombre maximal de traces dans la semaine ;
• une question au maximum par occasion ;
• plage sans relance ;
• arrêt des sollicitations lorsque la couverture devient exploitable ;
• pause et reprise possibles.
```

La métrique produit recherchée n'est pas le nombre de jours actifs, mais le
nombre minimal d'interactions ayant permis une décision humaine mieux informée.

## 7. Innovation — droit au silence utile

Le produit doit savoir ne rien demander lorsque la précision supplémentaire ne
change plus la revue.

```text
Nous avons déjà assez de repères pour le prochain point d'étape.
Vous n'avez rien à noter aujourd'hui.
```

Le silence devient un résultat positif : il protège l'attention, évite la
collecte superflue et rend tangible le principe de minimisation.

## 8. Innovation — trois vérités séparées

Chaque expérience distingue sans les fusionner :

1. ce qui était prévu dans l'action validée ;
2. ce qui a été possible dans la vie réelle ;
3. ce que le patient souhaite réellement conserver.

```text
Prévu
L'action définie dans le protocole.

Observé
Les occasions, adaptations et limites effectivement documentées.

Choix du patient
La version qu'il juge acceptable et durable pour la suite.
```

Une action observable comme faisable n'est pas automatiquement souhaitable,
durable ou cliniquement efficace.

## 9. Innovation — delta de décision

La valeur de l'expérience est mesurée par ce qu'elle apporte à la décision,
pas par le volume de traces.

```text
Avant l'expérience
Action initialement validée.

Ce que l'expérience rend visible
Occasions, adaptations, frictions, facilitateurs et limites.

Décision humaine
Maintenir, simplifier, remplacer, suspendre ou arrêter l'action.

Choix confirmé avec le patient
Oui / à rediscuter.
```

La chaîne d'autorité reste explicite :

```text
hypothèse
→ observations
→ limites
→ apprentissage descriptif
→ décision du praticien avec le patient
```

## 10. Innovation — bibliothèque personnelle des solutions

Les signatures de repas deviennent des **solutions qui fonctionnent pour
moi**, liées à un contexte plutôt qu'à une représentation figée d'un repas.

Exemples de contextes :

- départ matinal ;
- faible appétit ;
- déplacement ;
- temps de préparation limité ;
- budget contraint ;
- repas familial ;
- fatigue ;
- absence de cuisine.

Le système restitue les solutions déjà confirmées par le patient dans des
contextes comparables. Il ne transforme pas automatiquement une ancienne
solution en recommandation active.

## 11. Innovation — expérience non concluante utile

Une action peu ou pas réalisée peut produire un apprentissage valable :

- aucune occasion réelle ;
- action trop complexe ;
- contrainte structurelle ;
- mauvais moment ;
- formulation incomprise ;
- priorité non partagée ;
- charge d'observation excessive.

Le comportement non réalisé ne devient pas un échec du patient. Il peut révéler
que l'action ou son contexte doivent être reformulés.

## 12. Expérience patient cible

```text
Aujourd'hui, votre occasion prévue était le petit-déjeuner.

S'est-elle présentée ?
[Oui] [Non]

Votre option était-elle praticable ?
[Oui, facilement]
[Oui, en l'adaptant]
[Non aujourd'hui]

Qu'est-ce qui a surtout compté ?
[Pas disponible] [Pas le temps] [Pas envie] [Autre contexte]

Merci. Ce repère suffit pour aujourd'hui.
```

Lorsqu'une friction devient répétitive, le système peut la restituer ou
préparer une question pour le praticien. Il ne modifie pas seul l'action
validée.

## 13. Vue praticien cible

La première vue répond en moins d'une minute à cinq questions :

1. quelle action était étudiée ?
2. quelles occasions ont réellement existé ?
3. quelles adaptations ont fonctionné ?
4. quelles frictions dominent et quelles sont les limites de mesure ?
5. quelle décision humaine doit maintenant être discutée ?

Les repas détaillés, événements et provenances restent accessibles au second
niveau, uniquement lorsqu'ils sont nécessaires.

## 14. Premier périmètre proposé

### Inclus

- une expérience liée à une action validée ;
- occasion, possibilité, adaptation et friction ;
- capture structurée très courte ;
- budget d'attention ;
- pause et arrêt des sollicitations ;
- restitution descriptive ;
- delta de décision ;
- validation praticien et choix du patient.

### Différé

- photo et scan ;
- météo d'adhésion ;
- description exhaustive des repas ;
- projections automatiques vers les questionnaires ;
- cabinet apprenant ;
- comparaisons nutritionnelles complexes ;
- obligation d'un épisode strictement limité à 21 jours ;
- adaptation autonome de l'action par l'IA.

La voix pourrait être expérimentée ultérieurement pour décrire une friction,
si elle apporte un gain mesurable par rapport aux choix structurés.

## 15. Hypothèses à tester

- une capture centrée sur l'occasion et la friction produit une information
  plus directement actionnable qu'un journal de repas ;
- le budget d'attention améliore l'acceptabilité sans rendre la revue
  inexploitable ;
- le droit au silence renforce la confiance ;
- la bibliothèque personnelle facilite la reprise entre épisodes ;
- le delta de décision rend la valeur du suivi visible au patient ;
- une expérience non concluante permet de corriger le protocole sans
  culpabilisation.

## 16. Critère directeur

> Chaque tour doit améliorer la prochaine décision avec le moins de collecte
> possible, sans dépasser le niveau de preuve disponible et sans retirer au
> patient ou au praticien leur pouvoir de décision.

Cette vision doit être confrontée aux usages réels avant toute compilation en
campagne. Si une implémentation est envisagée, elle devra faire l'objet d'un
plan technique séparé ; toute migration ou activation clinique exigera une
confirmation explicite.
