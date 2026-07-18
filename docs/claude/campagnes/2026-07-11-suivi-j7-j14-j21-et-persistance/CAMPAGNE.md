---
id: "2026-07-11-suivi-j7-j14-j21-et-persistance"
titre: "C2 — Points d'étape et persistance (C2A/C2B)"
statut: "en_cours — compilée, gate migration à confirmer avant LOT-02"
créée_le: "2026-07-11"
mise_à_jour: "2026-07-18"
lot_courant: "LOT-07"
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

## Compilation (2026-07-16) — volet C2A

Les lots détaillés sont compilés dans `lots/` depuis les brouillons
`sources/lots/` (les squelettes auto-générés LOT-00-cadrage…LOT-04-validation
sont remplacés) :

| Lot | Objet | Statut |
|---|---|---|
| LOT-00 | Audit des flux et besoins de persistance | **terminé** (2026-07-17) |
| LOT-01 | Spécification du modèle et gate migration | **terminé** (2026-07-17) |
| LOT-02 | Migration Prisma et API minimale | **terminé** (2026-07-17, gate levé) |
| LOT-03 | Versionnement et validation du protocole | **livré** (2026-07-17, PR #103 Part A + #107 Part B ; CI PR à confirmer) |
| LOT-04 | Check-ins et décision J21 | **livré** (2026-07-18, sans migration ; branche `feat/c2a-lot-04-checkins`) |
| LOT-05 | Compagnon patient minimal | **livré** (2026-07-18, borné R8-lite ; sans migration) |
| LOT-06 | Tests, rétrocompatibilité et handoff | **livré** (2026-07-18 ; PR C2A LOT-04→06 à ouvrir, E2E autorité CI) |

Décisions de compilation :

- **V1 avec persistance** (la question ouverte du cadrage est tranchée),
  l'exécution restant suspendue au gate migration : sans confirmation
  humaine explicite et distincte, la campagne s'arrête à la spec LOT-01 sans
  toucher `schema.prisma`.
- **Nommage registre 5.0** (ADR) : `AssessmentEpisode`, `ProtocolDraft`,
  `ProtocolCheckin`, `RelectureNote` (A6-1) — voir
  `SPEC_LOT-01_MODELE_PERSISTANCE.md` (proposition document-only rédigée à
  la compilation, à valider en LOT-00/LOT-01 ; contient la checklist de
  confirmation du gate, section 6).

## Compilation (2026-07-18) — volet C2B

Arbitrage C2B tranché (revue utilisateur du 2026-07-18) et acté au registre sous
**A8** ; détail dans
`docs/claude/propositions/2026-07-18-c2b-trajectoire-spirale/` (`BRAINSTORM_C2B.md`,
`NOTE_TECHNIQUE_MOMENTUM.md`, `ARBITRAGES_C2B.md`). Les lots C2B sont compilés dans
`lots/` (documentaire, **aucun code, aucune migration**) :

| Lot | Objet | Statut |
|---|---|---|
| LOT-07 | Score du résumé J21 — branchement momentum (lève dette LOT-04) | **compilé** (2026-07-18, migration-free) |
| LOT-08 | Ancrage T0 par épisode (prérequis comparateur) | **compilé** (2026-07-18, migration-free) |
| LOT-09 | Comparateur multi-épisodes (Spirale-index praticien) | **compilé** (2026-07-18, migration-free) |

Décisions de compilation (registre A8) :

- **A8-1** T0 **par épisode** côté praticien, T0 global conservé pour « Mon
  équilibre ».
- **A8-2** Jalon sans couverture → « jalon non mesuré » explicite, jamais un 0.
- **A8-3** Garde `versionScore` : bloc « non comparable (score recalibré le …) »,
  jamais de delta inter-version.
- **A8-4** C2B = constats déterministes directs seulement ; l'agrégat 3 états reste
  SP-MET.
- **A8-5** Activation en deux temps : score J21 dès 1 cycle réel (LOT-07) ;
  comparateur dès ≥ 2 épisodes comparables (LOT-09). Distinct du seuil cohorte
  `n ≥ 5` (SP-CAB, hors C2B).

Aucune des questions techniques n'exige un nouveau moteur ni une migration — le moteur
(`momentum.ts` + `depuisPrisma.ts`) est déjà branché sur `api/praticien/equilibre`.
Exécution des lots : au fil de l'eau, un lot = une PR (règle N+1), après données
réelles selon A8-5.
