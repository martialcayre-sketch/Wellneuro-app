# 08 — Spécification : compagnon patient minimal

## Objectif

Créer une expérience patient calme, mobile-first, centrée sur l’action utile du moment.

## Principe

Le patient ne voit pas toute la cartographie clinique. Il voit :

```text
priorité actuelle
action du jour
fiche utile
check-in court
message praticien si nécessaire
```

## Écran d’accueil patient

```text
Bonjour Sophie

Votre priorité actuelle
Cette semaine, nous travaillons surtout sur votre énergie du matin.

Votre action aujourd’hui
Petit-déjeuner protéiné simple.

Check-in rapide
Comment était votre énergie ce matin ?

Fiche utile
3 idées simples de petit-déjeuner protéiné.
```

## Microcopy

À privilégier :

```text
On simplifie.
Une étape suffit aujourd’hui.
Vous pouvez reprendre doucement.
Ce point est à renforcer.
Votre praticien ajustera si besoin.
```

À éviter :

```text
vous n’avez pas respecté
échec
mauvaise observance
score faible
risque élevé
décrochage
```

## Modes utiles

```text
jour difficile
je n’ai pas suivi
victoire
reprendre doucement
```

## Check-in V1

Check-in 15 secondes :

```text
énergie
sommeil
digestion
stress
adhésion à l’action principale
```

## Persistance

V1 peut être sans persistance ou avec stockage différé selon arbitrage. Ne pas créer de migration sans confirmation.

## Critères d’acceptation

- Interface lisible sur mobile.
- Une seule action principale visible.
- Pas de score anxiogène.
- Texte rassurant.
- Le patient sait quoi faire aujourd’hui.
- Le praticien reste responsable de l’ajustement.
