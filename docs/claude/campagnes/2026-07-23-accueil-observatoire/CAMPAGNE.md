---
id: "2026-07-23-accueil-observatoire"
titre: "Accueil Observatoire — alignement maquette + enrichissement du Fil"
statut: "en cours"
créée_le: "2026-07-23"
mise_à_jour: "2026-07-23"
lot_courant: "LOT-01"
---

# Accueil Observatoire — alignement maquette + enrichissement du Fil

## Objectif

Aligner la page d'accueil praticien (`/dashboard`, « Le Fil du jour ») sur la
maquette de référence « WellNeuro 5.0 — La Spirale » (section `p-fil`), et
l'enrichir de sources réelles : timeline horodatée, hiérarchie de la carte
imminente, colonne latérale de travail (Météo d'adhésion, inbox
questionnaires par patient, correspondance consignée), cartes jalon J21, puis
rendez-vous réels.

Constat propriétaire (2026-07-23) : en production, le Fil est une pile plate
de cartes qui ne montre en pratique que questionnaires reçus et synthèses en
attente ; ni timeline, ni rappel de RDV, ni rappel de momentum ; l'encart
« Principe 5.0 » occupe l'aside sans servir le travail ; le bandeau d'onglets
de la maquette manque.

## Frontières

**Possède** : la présentation du Fil (timeline, imminence, résumé qualitatif),
la composition de l'aside de l'accueil, les nouveaux types de cartes (jalon
J21, consultation prévue), le bandeau « Vues rapides », le modèle
`RendezVous` (LOT-04 seulement).

**Consomme** — réutilise, ne réinvente pas : `construireFil`/`cleCarte`
(SP-FIL), `deriverMeteoAdhesion` (SP-MET), `resumeJ21`/`trajectoire`
(momentum), la consignation `correspondance-medecin` (C3 LOT-06), le pré-vol
(SP-COP).

**Ne possède pas** : la dérivation de la Météo (SP-MET), le pré-vol (SP-COP),
la messagerie patient (différée, HDS), les notifications et récurrences de
rendez-vous.

## Décisions actées (propriétaire, 2026-07-23)

- L'inbox questionnaires **remplace** les cartes « Reçu » du fil (vue par
  patient, jamais une ligne par questionnaire).
- Les momentums remontent comme **cartes jalon** dans le fil, refusables.
- La fenêtre messagerie affiche la **correspondance consignée** réelle ;
  badge compteur sur l'entrée de rail.
- L'encart « Principe 5.0 » est **supprimé** de l'accueil.
- L'agenda est **activé** (dé-différé) au LOT-04 : modèle minimal, migration
  additive, process complet (T3 + revue adversariale + vérif prod).
- Rien d'inventé, jamais : chaque affichage provient d'une ligne réelle datée.

## Lots

| Lot | Objet | Statut | Dépend de |
|---|---|---|---|
| LOT-01 | Timeline horodatée, carte imminente, résumé qualitatif, agrégat relectures par patient, bandeau « Vues rapides » — sans migration | livré | — |
| LOT-02 | Aside de travail : Météo d'adhésion, inbox questionnaires par patient (remplace les cartes « Reçu »), correspondance récente + badge rail — sans migration | livré | LOT-01 |
| LOT-03 | Cartes jalon J21 / momentum — sans migration | livré | LOT-01 |
| LOT-04 | Agenda : modèle `RendezVous`, CRUD minimal, cartes « Pré-vol prêt » horodatées — **migration**, gaté par confirmation explicite + mise à jour du registre des différés | livré (gate confirmé 2026-07-23) | LOT-01 |

## Définition de done

- L'accueil correspond à la maquette (timeline, imminence, aside de travail,
  bandeau) sans afficher une seule donnée inventée.
- Chaque nouveau panneau a ses états chargement / indisponible / vide.
- Les invariants SP-MET et G1 (refus persisté) restent vérifiés par test.
- Vérifications : T1 par édition, T2 par lot, T3 sur le lot migration.
