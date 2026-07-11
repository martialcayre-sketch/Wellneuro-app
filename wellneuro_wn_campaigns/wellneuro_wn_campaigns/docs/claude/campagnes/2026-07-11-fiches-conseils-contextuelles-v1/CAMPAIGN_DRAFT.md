# Draft de campagne — Fiches conseils contextuelles V1

## Objectif général

Livrer un catalogue réduit de fiches validées, sélectionnables dans le protocole et lisibles côté patient.

## Séquence recommandée

## LOT-00 — Audit du corpus et sélection V1

**Objectif :** Identifier 8 à 12 fiches prioritaires et leurs sources.

**Résultat :** Liste validée de fiches, formats et lacunes.

**Dépend de :** aucun

---

## LOT-01 — Format canonique et catalogue statique

**Objectif :** Définir et implémenter un format simple versionné.

**Résultat :** Catalogue typé/Markdown parsable avec métadonnées obligatoires.

**Dépend de :** LOT-00

---

## LOT-02 — Sélection dans le protocole

**Objectif :** Permettre au praticien d’associer une fiche prioritaire.

**Résultat :** Recherche/sélection d’une fiche validée dans le builder.

**Dépend de :** LOT-01

---

## LOT-03 — Affichage patient et impression

**Objectif :** Afficher la fiche de façon calme et imprimable.

**Résultat :** Page/carte patient et intégration document protocole.

**Dépend de :** LOT-02

---

## LOT-04 — Tests, documentation et handoff

**Objectif :** Valider le catalogue et préparer l’enrichissement futur.

**Résultat :** Tests, guide auteur et backlog priorisé.

**Dépend de :** LOT-03
