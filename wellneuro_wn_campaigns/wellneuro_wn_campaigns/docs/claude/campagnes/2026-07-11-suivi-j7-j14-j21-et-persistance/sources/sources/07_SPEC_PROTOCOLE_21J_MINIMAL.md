# 07 — Spécification : protocole 21 jours minimal

## Objectif

Créer un protocole phase 1 sobre, utile, validable.

## Structure

```text
Protocole 21 jours
├── raison d’être
├── priorité principale
├── 3 actions maximum
├── fiche prioritaire
├── critère de suivi
├── charge thérapeutique
└── validation praticien
```

## Raison d’être

Chaque protocole doit répondre :

```text
Pourquoi cette phase ?
Pourquoi maintenant ?
Pourquoi pas plus ?
Qu’observe-t-on à J21 ?
```

## Types d’actions V1

```text
alimentation
rythme / chronobiologie
routine apaisement
activité douce
hydratation
fiche conseil
exploration biologique à discuter
complément validé manuellement
```

## Charge thérapeutique

Statuts :

```text
léger
modéré
chargé
excessif
```

Règle : un protocole excessif ne doit pas être envoyé sans justification.

## Plan B

Chaque protocole devrait pouvoir contenir :

```text
plan idéal
plan minimal
plan de secours
```

Exemple :

```text
Idéal : petit-déjeuner protéiné complet.
Minimal : skyr ou deux œufs + fruit.
Secours : shake protéiné simple.
```

## J7 / J14 / J21

Prévoir la logique sans forcément tout persister en V1 :

```text
J7 : tolérance et adhésion
J14 : ajustement léger
J21 : décision structurée
```

Décisions J21 :

```text
continuer
alléger
densifier
pivoter
explorer
stopper
```

## Garde-fous

- Pas de prescription automatique.
- Pas d’envoi sans validation.
- Pas de posologie sensible sans cadre validé.
- Pas de protocole surchargé par défaut.
- Toujours distinguer recommandation et exploration médicale.

## Critères d’acceptation

- Le protocole peut être préparé sans être envoyé.
- Le praticien peut modifier chaque action.
- La charge est visible.
- La raison d’être est affichée.
- Un document patient simple peut être généré.
- Aucun changement DB obligatoire en première itération.
