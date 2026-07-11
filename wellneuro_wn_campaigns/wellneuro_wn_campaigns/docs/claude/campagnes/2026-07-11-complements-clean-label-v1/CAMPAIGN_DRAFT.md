# Draft de campagne — Bibliothèque compléments clean label V1

## Objectif général

Livrer le vertical slice d’une bibliothèque clean label : quelques produits qualifiés, filtres essentiels, vigilance de doublons et intégration manuelle au protocole.

## Séquence recommandée

## LOT-00 — Cadrage des sources et du périmètre

**Objectif :** Définir catégories, sources, licences et processus de validation V1.

**Résultat :** Périmètre court et matrice source/fiabilité/maintenance.

**Dépend de :** aucun

---

## LOT-01 — Modèle de qualification et règles déterministes

**Objectif :** Formaliser fiches, statuts, badges et vigilances.

**Résultat :** Schéma de données/TypeScript et règles versionnées, sans migration par défaut.

**Dépend de :** LOT-00

---

## LOT-02 — Catalogue V1 qualifié

**Objectif :** Constituer un petit catalogue validé.

**Résultat :** Produits/catégories V1 avec sources, statut et date de revue.

**Dépend de :** LOT-01

---

## LOT-03 — UX praticien : filtres et comparaison

**Objectif :** Permettre une exploration rapide et explicable.

**Résultat :** Catalogue, filtres essentiels, détail qualité et comparaison limitée.

**Dépend de :** LOT-02

---

## LOT-04 — Cohérence protocole et fiche patient

**Objectif :** Intégrer une sélection manuelle avec vigilances simples.

**Résultat :** Ajout au protocole, doublons signalés, fiche patient validable.

**Dépend de :** LOT-03

---

## LOT-05 — Validation, maintenance et handoff

**Objectif :** Tester et formaliser la gouvernance du catalogue.

**Résultat :** Guide de revue, tests et décision sur persistance/import futur.

**Dépend de :** LOT-04
