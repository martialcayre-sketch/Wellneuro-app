# LOT-02 — Colonne latérale de travail : Météo, Inbox, Correspondance

Statut : livré (PR de ce lot). Sans migration. L'encart « Principe 5.0 » est
retiré de l'accueil (décision propriétaire 2026-07-23 — l'aside sert le
travail ; le manifeste vit dans la vitrine du design system).

## Livré

- **Météo d'adhésion** (aside + badge inline dans les cartes) :
  - domaine pur `lib/protocol/meteoPatientele.ts` — réutilise strictement
    `deriverMeteoAdhesion` (SP-MET) patient par patient ; aucun nouvel agrégat,
    rien de persisté. Tri interrompue > fragile > régulière, puis alphabétique.
  - route `GET /api/praticien/meteo-adhesion` — 2 requêtes bornées au
    praticien, calcul en mémoire. Invariants SP-MET vérifiés par test : jamais
    un score chiffré, indéterminée ≠ interrompue, jamais côté patient.
  - `components/meteo/BadgeMeteo.tsx` (texte + symbole, jamais couleur seule),
    `components/fil/MeteoAdhesionAside.tsx`, badge « Adhésion : fragile /
    interrompue » inline dans le Fil (fetch parallèle, échec silencieux).
  - garde structurelle `lib/meteo-praticien-seul.guard.test.ts` : aucune
    surface patient/portail n'importe le badge, l'agrégat ou la route.
- **Inbox questionnaires** (remplace les cartes « Reçu » du Fil) :
  - domaine pur `lib/fil/inbox.ts` — une ligne PAR PATIENT (nombre, dernière
    date, ≤ 3 titres). « En attente de consultation » = réponses postérieures
    à la dernière `Consultation.dateValidation` (même ancre que le pré-vol).
  - route `GET /api/praticien/inbox-questionnaires`, composant
    `components/fil/InboxQuestionnaires.tsx`.
  - `reponse_recente` retiré de `TypeCarteFil`, `construireFil`, `TYPES_CARTE`
    (refus) et de la route `fil` ; les refus déjà posés restent inertes.
- **Correspondance récente** :
  - route `GET /api/praticien/correspondance-medecin/recentes` (extrait court,
    jamais le texte intégral) + compteur 7 j pour le badge du rail.
  - `components/fil/CorrespondanceRecente.tsx` ; badge `'correspondance'` sur
    l'entrée de rail (`SidebarRail`) — la donnée existe depuis C3 LOT-06.

## Vérification

- Vitest : domaines (`meteoPatientele`, `inbox`), routes (401, bornage
  praticien, aucun score, extrait court), composants (états, invariants),
  garde structurelle patient. Tests du Fil et du refus adaptés au retrait de
  `reponse_recente` (dont un test qui prouve que l'ancienne clé est désormais
  rejetée). T1 + T2.
