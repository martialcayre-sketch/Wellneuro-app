---
id: "LOT-00-audit-arbitrages"
titre: "Audit réel, classification et arbitrages"
statut: "terminé"
dépend_de: []
---

# LOT-00 — Audit réel, classification et arbitrages

## But

Établir la source de vérité avant tout code : écrans, composants, tokens, incohérences d'alignement et faisabilité des mécanismes transverses HC-F (mode consultation, double niveau de lecture, prévisualisation patient). Le catalogue de questionnaires, la timeline, la carte de décision, le comparateur avant/maintenant et le constructeur 21 jours sont hors périmètre HC-F (→ QX et C1/C2, cf. `CAMPAGNE.md`).

## Périmètre

- shell praticien ;
- dashboard, patients, fiche patient, synthèse ;
- portail patient : gate, consentement, fiche, anamnèse, hub, saisie, lecture seule, correction ;
- tests Playwright/Vitest existants ;
- design system D1 et tokens historiques ;
- données et composants disponibles pour le mode consultation et la prévisualisation patient ;
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
7. Auditer les contrats C1 existants pour éviter un modèle parallèle de carte de décision ou protocole 21 jours.
8. Définir le périmètre minimal du mode consultation sans duplication de la fiche patient.
9. Auditer les frontières de données entre vue praticien et vue patient.
10. Recenser les termes techniques ou ambigus à intégrer au futur lexique UX.
11. Trancher les questions ouvertes de `CAMPAGNE.md`.
12. Rédiger `lots/LOT-03-*.md` (surfaces praticien génériques + contrats d'instanciation des 3 mécanismes) à partir des arbitrages de ce lot — ce fichier n'existe pas encore, à valider explicitement par l'utilisateur avant LOT-02.
13. Produire wireframes, prototypes ciblés et matrices de migration validables.

## Arbitrages obligatoires

- pages de première vague ;
- périmètre et déclenchement du mode consultation ;
- stratégie de prévisualisation patient ;
- palette de commandes : livrée ou différée ;
- capacités P3 explicitement différées.

## Livrables

- `AUDIT_UI_REEL.md` ;
- `MATRICE_ECRANS_MIGRATION.md` ;
- `CONTRATS_UX_P1.md` ;
- `ARBITRAGES_LOT_00.md` ;
- `lots/LOT-03-*.md` (rédigé, en attente de validation utilisateur) ;
- captures de référence avant changement.

## Tests / validations

- aucune donnée réelle détectée ;
- routes et composants confirmés contre le dépôt ;
- mesures d'alignement documentées ;
- chaque mécanisme (mode consultation, double niveau de lecture, prévisualisation patient) possède un contrat d'instanciation ;
- aucune donnée nécessaire à un prototype n'est inventée ;
- validation utilisateur des arbitrages avant LOT-01.

## Done

- [x] Audit approuvé (arbitrages validés par l'utilisateur, cf. `ARBITRAGES_LOT_00.md`).
- [x] Écrans pilotes sélectionnés (vague 1, cf. `MATRICE_ECRANS_MIGRATION.md`).
- [x] Contrats d'instanciation des 3 mécanismes arbitrés (cf. `CONTRATS_UX_P1.md`).
- [x] Articulation avec C1 documentée (`AUDIT_UI_REEL.md` §5).
- [x] Capacités différées identifiées (`ARBITRAGES_LOT_00.md` §5).
- [x] `lots/LOT-03-*.md` rédigé et validé par l'utilisateur.
- [x] Aucun code modifié par ce lot (le correctif `api/patient/reponses` est un correctif de sécurité séparé, hors HC-F, validé explicitement par l'utilisateur).
- [ ] LOT-01 autorisé explicitement — en attente d'instruction séparée.

## Note

Captures de référence avant changement non produites (pas d'outil de
capture navigateur dans cette session) — à produire si jugées nécessaires
avant LOT-02, cf. `ARBITRAGES_LOT_00.md`.
