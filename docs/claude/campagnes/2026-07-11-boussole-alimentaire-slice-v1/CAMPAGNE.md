---
id: "2026-07-11-boussole-alimentaire-slice-v1"
titre: "C5 — Boussole alimentaire (intrinsèque/contextuel)"
statut: "en_cours — LOT-00 livré (validation praticien via revue de PR)"
créée_le: "2026-07-11"
mise_à_jour: "2026-07-17"
lot_courant: "LOT-01"
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

## Scission actée — réconciliation 3.2

### C5A — Taxonomie et profils intrinsèques

Taxonomie, sources, mapping Ciqual, aliments vedettes et profils intrinsèques
indépendants du patient. C5A est data-first et peut avancer sans donnée
patient ni priorité clinique.

### C5B — Lecture contextuelle et actions alimentaires

Après sélection d'une priorité en C1 et activation du protocole en C2, le
praticien peut préparer une action, trois exemples, deux substitutions, une
fiche « pourquoi », un plan minimal et un critère simple à observer. C5B
porte aussi les assiettes vedettes, préférences, allergies, contraintes,
coût et saisonnalité.

```text
Cette semaine
Ajouter deux sources d'oméga-3.

Options
Sardines · noix · huile de colza

Plan minimal
Une seule portion supplémentaire suffit pour commencer.
```

> Historique : C5A désignait auparavant l'action hebdomadaire et C5B les
> assiettes/substitutions. Ces capacités sont conservées et regroupées dans
> C5B ; C5A désigne désormais exclusivement le socle intrinsèque.

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
- **Contrat neutre C4/C5** : le modèle intrinsèque/contextuel est défini hors
  des deux campagnes. Chacune possède ses données, règles et adaptateurs.
- **Journal alimentaire** : campagne JA autonome. C5 peut consommer ses
  observations publiées mais ne possède ni saisie, ni agrégats, ni
  persistance du journal.

## Frontières

**Possède** : référentiel scoré (intrinsèque), lecture contextuelle
alimentaire, actions hebdomadaires, assiettes et substitutions, fiches
« pourquoi ».
**Consomme** : priorité C1, rendu documentaire C3, charte patient HC-F,
acquis E1.
**Ne possède pas** : décision/protocole (C1/C2), documents (C3), score « Mon
équilibre », journal alimentaire (JA).

## Esquisse de lots (à compiler N+1)

LOT-00 vérification sources/licences et contrat neutre → LOT-01 taxonomie et
mapping intrinsèque pilote → LOT-02 profils intrinsèques C5A → LOT-03 lecture
contextuelle C5B (après priorité C1 validée et protocole actif C2) → LOT-04
actions/assiettes/substitutions → LOT-05 validation.

## Direction UX 5.0 — poste de pilotage & A5-R2 (aligné le 2026-07-18)

> Alignement additif. Voir `docs/claude/propositions/2026-07-18-refonte-ux-5-0/`
> et le registre (A6-R1 poste de pilotage, A5-R2 canvas mid-tone).
> **Aucun contrat clinique figé de cette campagne n'est modifié.**

- **LOT-04 « Observatoire » (praticien)** adopte le poste de pilotage (instrument à tiroir ; chiffres, sources et versions visibles) ; **LOT-05 « Jardin » (patient)** adopte le principe **séquentiel** (restitution qualitative, **aucun score**). Frontières C5A/C5B **inchangées**.
- Canvas mid-tone (ardoise / sable) — différé au lot d'implémentation.
