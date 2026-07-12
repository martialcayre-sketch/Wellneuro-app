---
id: "LOT-00-audit-arbitrages"
titre: "Audit réel, classification et arbitrages"
statut: "à_faire"
dépend_de: []
---

# LOT-00 — Audit réel, classification et arbitrages

## But

Établir la source de vérité avant tout code : écrans, composants, tokens, incohérences d'alignement, profils de questionnaires, contraintes psychométriques et faisabilité des innovations de vague 2.

## Périmètre

- shell praticien ;
- dashboard, patients, fiche patient, synthèse ;
- portail patient : gate, consentement, fiche, anamnèse, hub, saisie, lecture seule, correction ;
- catalogue de questionnaires et types ;
- tests Playwright/Vitest existants ;
- design system D1 et tokens historiques ;
- données et composants disponibles pour le mode consultation, la timeline, les cartes de décision, le comparateur et la prévisualisation patient ;
- états de sauvegarde, réseau, brouillon, validation et envoi ;
- lexique actuel praticien/patient.

## Fichiers probables

- `web/src/components/NavBar.tsx`
- `web/src/components/ui/SidebarRail.tsx`
- `web/src/components/ui/MobileBottomNav.tsx`
- `web/src/app/globals.css`
- `web/tailwind.config.ts`
- `web/src/app/dashboard/**`
- `web/src/app/portail/[token]/**`
- `web/src/components/patient/**`
- `web/src/lib/questionnaire-types.ts`
- `web/src/lib/questions.ts`
- `web/e2e/**`
- `docs/design-system-d1.md`
- documents C1 relatifs à la décision clinique 21 jours, en lecture seule documentaire.

## Interdits

- aucun code applicatif ;
- aucune dépendance ;
- aucune migration ;
- aucune modification de questionnaire ;
- aucune activation automatique de campagne ;
- aucun événement clinique inventé pour remplir une timeline ;
- aucune décision sur la base de maquettes seules sans audit du modèle réel.

## Étapes

1. Lire la dernière entrée de `docs/claude/SESSION_LOG.md`.
2. Vérifier l'état réel de `ACTIVE_CAMPAIGN.md` et signaler toute désynchronisation sans la corriger hors instruction.
3. Cartographier routes, composants et responsabilités.
4. Mesurer la géométrie réelle du shell : largeur du rail, padding, dimensions d'icônes, lignes et breakpoints.
5. Recenser les couleurs directes et tokens historiques encore consommés.
6. Classifier les pages praticien par priorité de migration.
7. Construire l'inventaire des questionnaires : longueur, sections, types de réponses, caractère validé/interne, sensibilité, risque de fatigue.
8. Affecter provisoirement une politique psychométrique, avec `strict` par défaut en cas d'incertitude.
9. Choisir trois questionnaires pilotes : court, long répétitif, interne flexible.
10. Cartographier les données déjà disponibles pour la timeline et distinguer événement, décision et résultat.
11. Auditer les contrats C1 existants pour éviter un modèle parallèle de carte de décision ou protocole 21 jours.
12. Définir le périmètre minimal du mode consultation sans duplication de la fiche patient.
13. Identifier les mesures réellement comparables pour un pilote avant/maintenant.
14. Auditer les frontières de données entre vue praticien et vue patient.
15. Recenser les termes techniques ou ambigus à intégrer au futur lexique UX.
16. Classer chaque innovation de vague 2 : `livrable`, `prototype`, `spécification` ou `différée`.
17. Trancher les questions ouvertes de `CAMPAGNE.md`.
18. Produire wireframes, prototypes ciblés et matrices de migration validables.

## Arbitrages obligatoires

- pages de première vague ;
- emplacement du contrôle Auto/Jour/Nuit ;
- périmètre et déclenchement du mode consultation ;
- structure minimale de la timeline ;
- contrat de carte de décision et articulation avec C1 ;
- règles de comparabilité avant/maintenant ;
- stratégie de prévisualisation patient ;
- palette de commandes : livrée ou différée ;
- constructeur 21 jours : LOT-03 ou campagne dédiée ;
- capacités P3 explicitement différées.

## Livrables

- `AUDIT_UI_REEL.md` ;
- `MATRICE_ECRANS_MIGRATION.md` ;
- `INVENTAIRE_QUESTIONNAIRES_UX.md` ;
- `MATRICE_INNOVATIONS_VAGUE_2.md` ;
- `CONTRATS_UX_P1.md` ;
- `ARBITRAGES_LOT_00.md` ;
- captures de référence avant changement.

## Tests / validations

- aucune donnée réelle détectée ;
- routes et composants confirmés contre le dépôt ;
- mesures d'alignement documentées ;
- chaque questionnaire pilote possède un niveau de liberté ;
- chaque innovation P1 possède un statut, un bénéfice, un risque et des prérequis ;
- aucune donnée nécessaire à un prototype n'est inventée ;
- validation utilisateur des arbitrages avant LOT-01.

## Done

- [ ] Audit approuvé.
- [ ] Écrans pilotes sélectionnés.
- [ ] Questionnaires pilotes sélectionnés.
- [ ] Politiques psychométriques provisoires documentées.
- [ ] Innovations P1 arbitrées.
- [ ] Articulation avec C1 documentée.
- [ ] Capacités différées identifiées.
- [ ] Aucun code modifié.
- [ ] LOT-01 autorisé explicitement.
