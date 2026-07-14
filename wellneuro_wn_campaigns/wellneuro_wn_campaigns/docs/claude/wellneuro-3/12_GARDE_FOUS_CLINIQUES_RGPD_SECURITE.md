# 12 — Garde-fous cliniques, RGPD et sécurité

## Invariants cliniques

- WellNeuro ne diagnostique pas.
- WellNeuro ne prescrit pas automatiquement.
- WellNeuro prépare des recommandations structurées.
- Le praticien valide avant diffusion.
- Les hypothèses doivent rester des hypothèses.
- Les scores ne suffisent jamais à eux seuls.

## Données patient

Dans le dépôt, les exemples et seeds, seuls ces patients fictifs peuvent apparaître :

```text
Sophie Nicola
Jennifer Martin
Michel Dogné
```

Ne jamais inventer ou afficher de données patient réelles.

## Biologie

Avant cadre HDS confirmé :

```text
autorisé : catalogue marqueurs, packs proposés, documents à discuter médecin
interdit : stockage de résultats biologiques réels patient
```

## IA

L’IA peut :

```text
résumer
hiérarchiser
reformuler
préparer un brouillon
expliquer les limites
```

L’IA ne doit pas :

```text
diagnostiquer
prescrire
envoyer seule au patient
inventer des données
masquer les incertitudes
```

## Sécurité code

- Pas de secret en dur.
- Variables sensibles uniquement en environnement.
- Pas de modification OAuth sans analyse.
- Pas de migration DB sans confirmation.
- Exécuter `scripts/check_no_secrets.sh` si disponible.
- Exécuter type-check.

## UX patient

Ne jamais culpabiliser.

Préférer :

```text
On simplifie.
Une étape suffit aujourd’hui.
À renforcer.
À stabiliser.
Votre praticien ajustera si besoin.
```

Éviter :

```text
échec
mauvaise observance
non conforme
risque élevé
score mauvais
```

## Validation praticien

Un bouton “Valider” ne suffit pas pour les contenus sensibles. Prévoir une validation explicite :

```text
J’ai relu les données utilisées.
J’ai modifié si nécessaire.
Je valide la diffusion au patient.
Ce document ne remplace pas un avis médical.
```
