# Draft de campagne — Décision clinique 21 jours V1 — cockpit et protocole minimal

## Objectif général

Livrer un vertical slice complet permettant au praticien de passer de la fiche patient existante à un protocole phase 1 de 21 jours en moins de 10 minutes, sans migration.

## Séquence recommandée

## LOT-00 — Audit de la fiche patient et des données disponibles

**Objectif :** Cartographier la fiche actuelle, ses appels de données et les composants réutilisables, sans modification.

**Résultat :** Carte des flux et liste exacte des données utilisables sans nouvelle API.

**Dépend de :** aucun

---

## LOT-01 — Contrat UX, états et parcours E2E

**Objectif :** Fixer le comportement observable avant d’implémenter.

**Résultat :** Wireframe textuel, hiérarchie des blocs, microcopy, états et checklist E2E validés.

**Dépend de :** LOT-00

---

## LOT-02 — Découpage du cockpit sans régression

**Objectif :** Extraire des sous-composants de présentation sans changer les appels API ni la logique clinique.

**Résultat :** Fiche patient structurée en sections réutilisables, comportement existant préservé.

**Dépend de :** LOT-01

---

## LOT-03 — Résumé décisionnel, données manquantes et discordances

**Objectif :** Afficher une lecture prudente fondée uniquement sur les données existantes.

**Résultat :** DecisionSummaryCard, MissingDataPanel et signaux discordants visibles côté praticien.

**Dépend de :** LOT-02

---

## LOT-04 — Protocole 21 jours statique

**Objectif :** Permettre de préparer un protocole phase 1 non persistant.

**Résultat :** Builder local avec raison d’être, priorité, 3 actions max, fiche et critère de suivi.

**Dépend de :** LOT-03

---

## LOT-05 — Charge thérapeutique, validation et document patient

**Objectif :** Rendre le protocole explicable, validable et imprimable.

**Résultat :** Calcul déterministe de charge, justification si excessif, validation explicite et HTML imprimable patient.

**Dépend de :** LOT-04

---

## LOT-06 — Accessibilité, mobile et compatibilité legacy

**Objectif :** Durcir le vertical slice sans élargir le périmètre.

**Résultat :** Cockpit utilisable souris/tactile, contrasté et compatible avec les flux existants.

**Dépend de :** LOT-05

---

## LOT-07 — Tests, documentation et go/no-go

**Objectif :** Valider le vertical slice et décider de la persistance.

**Résultat :** Rapport E2E, captures fictives, documentation et décision go/no-go pour la campagne suivante.

**Dépend de :** LOT-06
