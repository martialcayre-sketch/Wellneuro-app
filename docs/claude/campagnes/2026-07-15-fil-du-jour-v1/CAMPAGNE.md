---
id: "2026-07-15-fil-du-jour-v1"
titre: "SP-FIL — Le Fil du jour v1"
statut: "en cours"
créée_le: "2026-07-15"
mise_à_jour: "2026-07-15"
lot_courant: "LOT-02"
---

# SP-FIL — Le Fil du jour v1

## Objectif

Faire du Fil du jour l'accueil praticien (`/dashboard`) : une colonne de
cartes typées construites depuis les **données existantes**, chacune disant
« pourquoi maintenant » et proposant une **action explicite** — proposition,
jamais capture. Première surface visible de la disposition 5.0 (décision A6).

## Frontières

**Possède** : la page d'accueil `/dashboard` (le Fil), les types de cartes et
leur mapping depuis les APIs existantes, le regroupement du rail de
navigation.

**Consomme** : `GET /api/praticien/metrics` (carte « le cabinet en un coup
d'œil », réutilise `MetricsSection`), `GET /api/praticien/patients` +
assignations (retards, reprises), `GET /api/praticien/reponses` (réponses
reçues), synthèses (`Brouillon_IA` à valider). Tokens et typographies A5-R1
déjà en production.

**Ne possède pas** : épisodes/persistance (C2A), runtime clinique C1
(SP-RUN), météo d'adhésion (SP-MET), agenda/consultations du jour (module
futur — le Fil v1 n'affiche pas de rendez-vous), pack de réévaluation
pré-composé (SP-SPI ; le signal de reprise v1 est purement informatif).

## Décisions actées

- Le Fil **remplace** l'accueil métriques (arbitrage utilisateur 2026-07-15,
  A6) ; les métriques survivent en carte du Fil.
- Chaque carte : type, « pourquoi maintenant », action explicite (lien vers
  la fiche, la synthèse…). Aucun automatisme, rien d'envoyé.
- Aucune migration Prisma, aucun scoring touché, UI en français.
- Cartes v1 (données existantes uniquement) :
  1. réponses de questionnaires reçues récemment ;
  2. assignations en retard (`dateLimite` dépassée) ;
  3. synthèses en brouillon à valider ;
  4. « le cabinet en un coup d'œil » (métriques) ;
  5. signal de reprise (patient sans activité > 6 mois) — sans pack.

## Lots

| Lot | Objet | Gate |
|---|---|---|
| LOT-01 | La page Fil du jour : types de cartes, mapping données existantes, remplacement de l'accueil, tests unitaires du mapping | — |
| LOT-02 | Rail regroupé (« Le Fil », « Patients », « Instruments », « Paramètres ») + `MobileBottomNav` + adaptation `web/e2e/dashboard-praticien.spec.ts` | LOT-01 |

## Définition de done

- Le praticien atterrit sur le Fil ; chaque carte est actionnable et sourcée.
- Aucune régression du parcours praticien (e2e verts en CI).
- Vérifications : type-check, Vitest, lint, build production, anti-secrets.
- Patients fictifs uniquement dans tests et seeds.
