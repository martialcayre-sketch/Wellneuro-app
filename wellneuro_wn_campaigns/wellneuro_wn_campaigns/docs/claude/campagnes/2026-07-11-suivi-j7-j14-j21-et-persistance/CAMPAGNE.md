---
id: "2026-07-11-suivi-j7-j14-j21-et-persistance"
titre: "C2 — Points d'étape et persistance (C2A/C2B)"
statut: "cadrée — lots à compiler N+1"
créée_le: "2026-07-11"
mise_à_jour: "2026-07-13"
lot_courant: "aucun"
---

# C2 — Points d'étape et persistance

> Cadrage réel du 2026-07-12 (remplace le squelette). Conformément au
> registre A3, les lots détaillés seront compilés quand C2A deviendra la
> campagne N+1. Ce document fige les frontières et décisions ; les sources
> (`07_SPEC_PROTOCOLE_21J…`, `08_MOMENTUM_DECROCHAGE.md`,
> `08_SPEC_COMPAGNON_PATIENT…`) restent le matériau, à lire à travers les
> décisions ci-dessous.

## Objectif

Donner au protocole 21 jours son suivi : check-ins patient très courts aux
**points d'étape** J7/J14/J21, distinction effet ressenti / tolérance /
adhésion / régularité, décisions structurées aux points d'étape, et résumé
J21 préparé pour la réévaluation.

## Arbitrage fondateur (registre A1) — non renégociable en compilation

- Les points d'étape J7/J14/J21 sont un instrument de **pilotage** du
  protocole. Ils ne produisent jamais de score, n'alimentent jamais
  « Mon équilibre », et ne sont pas des jalons de mesure.
- Les **jalons de mesure** T0/J21/J42/J90 restent la propriété exclusive de
  `web/src/lib/equilibre/momentum.ts` — jamais réimplémentés ici.
- **J21 = point de jonction.** Le « résumé J21 » est le seul objet croisant
  les deux lectures (le score a-t-il bougé ? l'action a-t-elle été tenue ?
  était-elle tolérée ?), via les contrats publics des deux côtés.
- Vocabulaire verrouillé : « point d'étape » (praticien) / « rendez-vous de
  suivi » (patient). « Jalon de mesure » est banni de ce contexte.

## Scission actée

### C2A — Check-ins et persistance minimale

- Persistance des `AssessmentEpisode` confirmés par le praticien, des
  protocoles validés devenus actifs et de leurs révisions. C1 ne crée que des
  objets purs et des brouillons.
- Check-in de 2 à 4 questions maximum : tolérance, ressenti, adhésion à
  l'action principale.
- Sauvegarde et synchronisation **explicites** (états HC-F).
- Identité : l'assignation R8-lite existante suffit pour un suivi scopé à un
  protocole. Le besoin d'identité **inter-assignations** déclenche la
  campagne auth différée — pas l'inverse.
- **Gate migration** : la persistance des check-ins exige un lot
  `bloqué_confirmation` (migration Prisma soumise à confirmation explicite).
  Trancher en compilation la question « V1 avec ou sans persistance » — une
  campagne intitulée « persistance » ne peut pas rester ambiguë sur ce point.
- Timeline factuelle uniquement : événements réels (assignation, réponse,
  validation, envoi, check-in) — aucun événement inventé.

### C2B — Trajectoire et aide à l'ajustement (après données réelles)

- Momentum clinique **explicable** : consomme `momentum.ts` et le delta entre
  jalons de mesure ; affichage praticien chiffré, patient en tendance +
  phrase (décisions E2 existantes).
- Comparateur avant/maintenant : jalons de mesure uniquement, comparabilité
  `versionScore`, dates et limites explicites. (Spec issue de HC, propriété
  C2B, composant visuel fourni par HC-F.)
- Distinction effet / adhésion / tolérance ; suggestions d'allègement ;
  alertes **déterministes et explicables** uniquement.

## Différés (décisions fermes)

- Analyse émotionnelle libre des messages patients.
- Score automatique de risque de décrochage.
- Notifications proactives autonomes.
- Affichage d'un pourcentage d'observance au patient. Formulation factuelle
  positive obligatoire : « Vous avez pu réaliser cette action trois jours
  cette semaine », jamais « Adhésion : 43 % ».

## Frontières

**Possède** : journal de suivi, check-ins, lectures adhésion/tolérance/effet,
résumé J21, décisions de point d'étape, timeline factuelle. Ici, « journal de
suivi » désigne le journal d'événements du protocole, jamais le journal
alimentaire JA.
**Consomme** : protocole brouillon validé de C1, `momentum.ts` (API publique), identité
R8-lite, primitives HC-F, rendu documentaire C3 (pour le résumé J21 envoyé).
**Ne possède pas** : score, jalons de mesure, contenu du protocole,
documents, saisie ou agrégats du journal alimentaire JA.

## Esquisse de lots (à compiler N+1)

LOT-00 audit persistance + arbitrage V1 avec/sans migration →
LOT-01 contrat check-in + timeline factuelle → LOT-02 check-in patient +
états de sauvegarde → LOT-03 vue praticien points d'étape + résumé J21 →
LOT-04 validation. C2B : compilation séparée après données réelles.
