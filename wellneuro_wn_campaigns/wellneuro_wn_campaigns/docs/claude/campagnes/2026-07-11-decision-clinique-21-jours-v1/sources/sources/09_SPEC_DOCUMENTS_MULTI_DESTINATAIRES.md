# 09 — Spécification : documents multi-destinataires

## Objectif

Transformer les données validées en documents adaptés au destinataire.

## Destinataires

### Patient

Document simple, pédagogique, non anxiogène :

```text
Ce que nous avons compris
Votre priorité actuelle
Votre protocole 21 jours
Votre plan minimal
Votre fiche conseil
Quand recontacter le praticien
```

### Médecin

Document argumenté, sobre, factuel :

```text
Contexte
Éléments déclaratifs
Scores principaux
Explorations biologiques à discuter
Justification clinique
Limites
Zone de validation / avis médical
```

### Praticien

Document technique complet :

```text
scores
sous-scores
preuves
signaux convergents
discordances
données manquantes
hypothèses fonctionnelles
protocole
arbitrages
```

## Statuts documentaires

```text
brouillon IA
préparé
relu
validé praticien
envoyé
archivé
```

## V1 recommandée

Commencer par HTML imprimable plutôt que PDF natif.

```text
patient-protocol-printable
médecin-biologie-printable
praticien-technical-summary
```

## Garde-fous IA

- L’IA prépare un brouillon.
- Le praticien valide.
- Le document indique ses limites.
- Aucune information non sourcée dans les données patient ne doit être affirmée.
- Distinguer données déclaratives, calculées, biologiques, hypothèses, validation.

## Critères d’acceptation

- Même source clinique, sorties différentes selon destinataire.
- Textes en français.
- Pas de donnée réelle dans les exemples.
- Validation explicite avant diffusion.
- Export/impression fonctionnel.
