# 10 — Spécification : données manquantes et signaux discordants

## Objectif

Aider le praticien à ne pas surinterpréter et à identifier ce qui doit être exploré.

## Données manquantes

Le système doit afficher :

```text
Ce que nous ne savons pas encore.
```

Exemples :

```text
Priorisation inflammatoire fragile : CRPus non disponible.
Axe oméga-3 non documenté : profil acides gras non disponible.
Fatigue persistante : B12 active, ferritine, folates ou TSH non renseignés.
Digestion fortement plainte : calprotectine ou marqueurs intestinaux non documentés.
```

## Signaux discordants

Un signal discordant n’est pas une conclusion. C’est un point à explorer.

Exemples :

```text
Fatigue élevée mais sommeil déclaré correct.
Stress perçu faible mais hyperexcitabilité forte.
Alimentation déclarée satisfaisante mais apports protéiques faibles.
Motivation forte mais adhésion faible.
```

## Statuts de confiance

Éviter les pourcentages.

Utiliser :

```text
solide
probable
fragile
à documenter
```

## UI praticien

```text
Données manquantes
├── critique pour décider
├── utile mais non urgente
└── optionnelle

Signaux discordants
├── signal
├── données concernées
├── question à poser
└── impact possible sur protocole
```

## UI patient

Ne pas afficher les discordances de manière brute.

Préférer :

```text
Certains points seront précisés avec votre praticien.
```

## Critères d’acceptation

- Pas de conclusion automatique.
- Chaque donnée manquante explique pourquoi elle pourrait changer la décision.
- Les signaux discordants sont visibles côté praticien.
- Aucune alerte anxiogène côté patient.
