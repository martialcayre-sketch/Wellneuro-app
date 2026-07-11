# Draft de campagne — Boussole alimentaire — vertical slice V1

## Objectif général

Livrer une preuve de valeur limitée : sélectionner un aliment vedette, calculer/charger son profil intrinsèque et afficher une lecture contextualisée par l’objectif actif.

## Séquence recommandée

## LOT-00 — Cadrage clinique, sources et licences

**Objectif :** Valider besoin 1, aliments, variables, sources et vocabulaire.

**Résultat :** Spécification clinique du slice et liste de 12 aliments maximum.

**Dépend de :** aucun

---

## LOT-01 — Mapping et normalisation versionnés

**Objectif :** Définir le moteur déterministe minimal.

**Résultat :** Mapping besoin 1, bornes et versionScore/versionMapping documentés et testables.

**Dépend de :** LOT-00

---

## LOT-02 — Jeu de données Ciqual du slice

**Objectif :** Fournir les valeurs nécessaires aux 12 aliments avec traçabilité.

**Résultat :** Dataset minimal read-only validé.

**Dépend de :** LOT-01

---

## LOT-03 — Lecture contextuelle par objectif

**Objectif :** Pondérer le profil intrinsèque selon objectifs actifs du protocole.

**Résultat :** Fonction pure produisant statut va dans votre sens/neutre/moins aligné et raisons.

**Dépend de :** LOT-02

---

## LOT-04 — UX praticien et patient

**Objectif :** Afficher fiche, source, confiance et explication.

**Résultat :** Carte aliment contextualisée dans protocole/cockpit et vue patient simple.

**Dépend de :** LOT-03

---

## LOT-05 — Substitutions et fiches aliments

**Objectif :** Proposer trois substitutions simples dans des familles comparables.

**Résultat :** Comparateur actuel/alternative avec gain explicable, sans injonction.

**Dépend de :** LOT-04

---

## LOT-06 — Tests, validation clinique et handoff

**Objectif :** Valider le moteur, les sources et la valeur produit avant extension.

**Résultat :** Rapport clinique/technique et go/no-go vers OFF ou élargissement.

**Dépend de :** LOT-05
