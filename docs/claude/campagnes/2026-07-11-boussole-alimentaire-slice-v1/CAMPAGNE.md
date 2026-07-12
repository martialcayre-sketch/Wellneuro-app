---
id: "2026-07-11-boussole-alimentaire-slice-v1"
titre: "C5 — Boussole alimentaire (C5A/C5B)"
statut: "cadrée — lots à compiler N+1"
créée_le: "2026-07-11"
mise_à_jour: "2026-07-12"
lot_courant: "aucun"
---

# C5 — Boussole alimentaire

> Cadrage réel du 2026-07-12 (remplace le squelette). S'appuie sur les acquis
> E1 (tables `neuro_axis`, `nutrient_axis_weight`, migration appliquée) et
> les décisions Boussole déjà tranchées (§9 du contexte, 2026-07-06) :
> vertical slice besoin 1 (~12 aliments vedettes), pondération clinique du
> besoin 2 (fer/B9/B12 prioritaires), 3 axes Niveau 2 nommés (Calme/stress,
> Microbiote/digestif, Clarté cognitive), signaux Niveau 2 visibles patient
> dès V1, chronobiologie différée.

## Objectif

Traduire la priorité clinique en action alimentaire concrète, dans un langage
non culpabilisant, avec distinction stricte entre l'aliment (score
intrinsèque, indépendant du patient) et son usage dans le contexte (lecture
contextuelle au protocole).

## Scission actée

### C5A — Action alimentaire de la semaine

Le praticien sélectionne une priorité (issue de C1). Le patient reçoit : une
action, trois exemples, deux substitutions, une fiche « pourquoi », un plan
minimal, un critère simple à observer.

```text
Cette semaine
Ajouter deux sources d'oméga-3.

Options
Sardines · noix · huile de colza

Plan minimal
Une seule portion supplémentaire suffit pour commencer.
```

**Data-first** : le référentiel (Ciqual, mapping, aliments vedettes, fiches)
ne dépend pas de C1 et peut avancer en parallèle ; seule la *sélection* de la
priorité en dépend. C5A-socle est donc parallélisable ; C5A-flux attend C1.

### C5B — Assiettes et substitutions

Assiettes vedettes, substitutions par famille, préférences, allergies et
contraintes, coût, disponibilité saisonnière.

## Décisions actées

- Frontière de calcul inchangée : la Boussole calcule directement les seuls
  besoins 1-3 (Classe 1) ; les besoins 4/5/9/10 sont croisés en signal
  secondaire de niveau de preuve D, jamais calculés ici.
- **Chronobiologie** : aucune lecture de rythme sans heure de repas connue —
  pas de fausse précision. Différée après le MVP des besoins 1/2.
- **Différés fermes** : scan produit, panier temps réel, mode frigo, mode
  restaurant, analyse de journée et de semaine, recommandations automatiques
  complexes. Le scanner n'est lancé qu'après stabilisation de Ciqual, du
  mapping propriétaire et d'un cache OpenFoodFacts fiable (OFF = résolveur de
  scan uniquement, avec mode dégradé).
- Langage non culpabilisant, jamais de score alimentaire anxiogène affiché
  seul ; toujours l'alternative concrète avec le constat.
- **Primitive commune C4/C5** : cf. fiche C4 — modèle intrinsèque/contextuel
  conçu une seule fois.

## Frontières

**Possède** : référentiel scoré (intrinsèque), lecture contextuelle
alimentaire, actions hebdomadaires, assiettes et substitutions, fiches
« pourquoi ».
**Consomme** : priorité C1, rendu documentaire C3, charte patient HC-F,
acquis E1.
**Ne possède pas** : protocole (C1), documents (C3), score « Mon équilibre ».

## Esquisse de lots (à compiler N+1)

LOT-00 vérification des acquis E1 + arbitrage pondération interne besoin 2
(équi vs clinique — pré-tranché clinique fer/B9/B12, à confirmer) →
LOT-01 seed mapping besoin 1 (vertical slice 12 aliments) → LOT-02 fiches et
actions hebdomadaires (socle data) → LOT-03 flux praticien→patient (après
C1) → LOT-04 C5B assiettes/substitutions → LOT-05 validation.
