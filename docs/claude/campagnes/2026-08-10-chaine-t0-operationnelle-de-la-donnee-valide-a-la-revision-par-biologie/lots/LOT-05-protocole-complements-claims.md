---
id: "LOT-05"
titre: "Protocole structuré — phases, statuts d'intervention, compléments sur claims avant biologie"
statut: "à_faire"
dépend_de: "LOT-04"
---

# LOT-05 — Protocole structuré et compléments sur claims avant biologie

## But

Représenter le protocole réel (phases, observation, interventions
conditionnelles) et permettre la prescription-conseil de compléments **fondée
sur claims valides sans attendre la biologie**, marquée comme provisoire et
résolue plus tard par l'arbitrage biologique (LOT-06).

## Résultat observable

Sur la fixture : un protocole en deux phases porte des actions `observation`
(agendas) et une intention de complément sourcée C4 au statut
`conditionnelle_biologie` avec `waitFor` ; le patient la voit comme « en
attente de confirmation par votre bilan » ; tyrosine/mélatonine sont
improposables depuis les scores DNST (test négatif) ; une intention sans
`ruleId`/`ruleVersion`/justification est rejetée.

## Périmètre

- Extension du contrat d'action (`clinical-engine/types.ts:284-292`) :
  - nouveaux types `observation` et `medical_referral` ;
  - statut d'intervention : `active` | `conditionnelle_biologie` | `differee` |
    `contre_indiquee` | `non_indiquee_actuellement` ;
  - `waitFor?: { type: 'biologie', cible, echeance? }`.
- Phases V1 : `ProtocolPhase { duree, objectifs[], actions[], mesures[],
  prerequis[], reviewAt }` — deux phases suffisent (observation/mise en
  mouvement ; ajustement post-biologie).
- **Règle de décision compléments avant biologie** (les quatre conditions
  cumulatives, cf. spec Lot E) : règle C4 validée (`validePar`/`valideLe`) avec
  `gradePreuveScientifique` et claims valides ; aucune `SupplementSafetyAlert`
  active, contre-indications et seuils fonctionnels respectés ; déclencheur =
  tableau clinique (jamais un score DNST seul — garde testée) ; naissance en
  `active` ou `conditionnelle_biologie` selon `conditionSupplementaire` de la
  règle.
- Rendu patient d'une intention conditionnelle : formulation non anxiogène
  validée (question ouverte de campagne).
- Garde de restitution étendue : le LLM ne peut nommer un complément absent des
  intentions déterministes (patron `verifierRestitutionOrientation`).
- **Rattaché ici (renvoyé du LOT-01, 2026-08-12)** : l'injection des
  **vigilances** de synthèse — la moitié non livrée de l'étape 5 du LOT-01 (le
  câblage cockpit des contradictions, lui, est fait, `D-050`). Même garde LLM,
  même interdit : une vigilance déterministe n'est pas censurable par une
  sortie de modèle. Le LOT-08 étend le même fichier avant ce lot.

## Hors périmètre

- Dosages libres (interdits par le contrat existant) ; produits/formes en texte
  libre.
- L'arbitrage biologique et la révision (LOT-06).
- Création de règles C4 : le lot consomme l'atelier règles existant.

## Fichiers probables

`web/src/lib/clinical-engine/types.ts:284-370`, `protocolDraft.ts`,
`patientProtocolView.ts`, `web/src/lib/protocol/versioning.ts`,
`web/src/components/patient-cockpit/ProtocolMiniBuilder.tsx`,
`web/src/lib/supplement-library/resolution.ts`, `sentinelle.ts`,
`web/src/app/api/portail/protocole/route.ts`,
`web/src/lib/protocol/portailProtocol.ts`.

## Interdits

- Aucune intention de complément déclenchée par un score fonctionnel seul.
- Champs libres produit/dose interdits (garde `FORBIDDEN_SUPPLEMENT_FIELDS`
  préservée et étendue aux nouveaux statuts).
- Une intention `conditionnelle_biologie` n'apparaît jamais comme
  recommandation ferme, ni praticien ni patient.
- Pas de migration : le payload protocole est JSON versionné (bump
  `contractVersion` si nécessaire).

## Dépendances

LOT-04 (candidats + carte de décision vivante). Ouvre LOT-06 et LOT-07.

## Étapes

1. Contrat étendu (types + validations `buildProtocolDraft`) + bump de version
   de contrat.
2. Phases dans le builder + rendu praticien.
3. Règle de décision compléments (module pur + branchement sentinelle C4).
4. Rendu patient conditionnel + garde de restitution.

## Tests

- Cas de référence rejouable : phase 1 sans complément ou avec intention
  `conditionnelle_biologie` sourcée ; test négatif DNST dédié.
- Intention sans référence catalogue ⇒ rejet.
- Vue patient : statut conditionnel visible, formulation non anxiogène,
  approbation de diffusion toujours requise.
- T2 avant commit.

## Done

- Critères 1-4 du Lot E de `sources/02-spec-lots-parcours-t0.md`.
- Fragment `changelog.d/`.

## Doctrine à porter — `DC-39` (véhicule V4 de l'audit)

**Une modification à la fois lorsque l'interprétation l'exige.** Une phase qui
lance simultanément une action `observation`, une intention de complément et un
changement d'hygiène de vie rend inattribuables l'amélioration comme
l'intolérance : au jalon suivant (LOT-07), personne ne saura à quoi créditer
l'effet.

Le contrat d'action doit donc distinguer les interventions **compatibles
simultanément** de celles **à tester séquentiellement**, et le builder de
phases refuser — ou signaler — une phase qui empile plusieurs interventions
séquentielles. Ce qui relève de l'une ou l'autre catégorie est un arbitrage
clinique par type d'intervention, à instruire dans le dossier de règles du lot,
jamais à déduire.

Non couvert par le périmètre ci-dessus : la doctrine y a été inscrite après la
rédaction de la fiche (`docs/claude/doctrine/AUDIT_DOCTRINE_CHAINE_T0.md`,
section « Refermer les 18 »). Aucun objet nouveau — un champ sur le type
d'action existant suffit.
