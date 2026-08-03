# Campagne WellNeuro - Clôture certification questionnaires et intégration WellNeuro

_Draft rédigé le 2026-08-03._

## Titre

Clôture certification questionnaires et intégration WellNeuro.

## Objectif général

Clore proprement la trajectoire laissée à `62/64` en transformant les deux cas restants en décisions exécutables, puis faire refléter cet état dans WellNeuro sans rouvrir de dette clinique ni exposer par erreur des instruments non administrables.

## Contraintes globales

- Aucun secret en dur.
- Aucune donnée patient réelle.
- Aucune migration Prisma/SQL ni écriture Supabase sans confirmation distincte.
- Aucun changement de scoring, seuil, interprétation ou logique clinique sans arbitrage explicite.
- Changements minimaux.
- Intégration fail-closed par défaut.

## Décisions de départ

- La campagne vise `64/64 clôturé`, pas `64/64 ouvert` par principe.
- Les deux dossiers restants sont `Q_PED_03` et `Q_GEO_04`.
- Le runtime doit consommer les statuts exacts et empêcher toute ouverture implicite d'un instrument bloqué.
- L'intégration aval doit progresser du plus déterministe au plus exposé : filtre et garde d'abord, UI/IA ensuite.

## Questions ouvertes

- `Q_GEO_04` peut-il être rouvert sans inventer une source absente ?
- `Q_PED_03` a-t-il un besoin production assez fort pour justifier sa reconstruction ?
- Jusqu'où aller dans l'intégration Mon Équilibre et orientation dans cette même campagne ?

## Dépendances

- Registre instruments.
- Matrice Drive.
- Catalogue runtime `questions.ts`.
- Travaux de cadrage orientation/Mon Équilibre déjà versionnés.

---

## Séquence recommandée

1. Geler le périmètre et produire une table unique `64/64`.
2. Régler `Q_GEO_04` sans toucher au reste du catalogue.
3. Régler `Q_PED_03` sans forcer sa réouverture.
4. Brancher les statuts dans WellNeuro côté filtrage et garde.
5. Étendre ce branchement aux usages aval qui dépendent déjà du catalogue certifié.
6. Valider l'ensemble et documenter la politique finale.

---

## Lots atomiques

### LOT-00 - Audit de clôture 62/64

- Objet : établir la source de vérité unique des 64 questionnaires, l'état exact des 2 restants et les surfaces runtime touchées.
- Résultat attendu : une table de pilotage qui supprime toute ambiguïté avant code.

### LOT-01 - Arbitrage final Q_GEO_04

- Objet : sortir `Q_GEO_04` de l'état intermédiaire en décidant clairement réouverture, verrou durable ou autre statut borné.
- Résultat attendu : le runtime et la documentation racontent la même chose.

### LOT-02 - Arbitrage final Q_PED_03

- Objet : décider s'il reste suspendu hors usage ou s'il reçoit un scoring dimensionnel suffisant pour une réintégration bornée.
- Résultat attendu : aucune ambiguïté entre catalogue, registre et surfaces d'usage.

### LOT-03 - Branchement runtime des statuts de certification

- Objet : faire respecter les statuts de certification dans les points d'entrée WellNeuro pertinents.
- Résultat attendu : aucun questionnaire bloqué n'est assignable ou suggéré par erreur.

### LOT-04 - Intégration WellNeuro aval

- Objet : brancher le socle de certification dans les mécanismes aval déjà cadrés : Mon Équilibre, orientation, synthèse.
- Résultat attendu : seuls les instruments admissibles alimentent ces mécanismes, avec traçabilité et garde fail-closed.

### LOT-05 - Validation et handoff

- Objet : exécuter les validations adaptées, consigner les limites et clore la campagne.
- Résultat attendu : campagne exécutable, relisible et transmissible sans hypothèse cachée.

## Consigne finale

Passer en mode Plan avant toute modification de code.
