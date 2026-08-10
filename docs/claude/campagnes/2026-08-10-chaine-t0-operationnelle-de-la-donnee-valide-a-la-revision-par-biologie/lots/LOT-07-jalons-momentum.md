---
id: "LOT-07"
titre: "Suivi longitudinal — UI jalons J21/J42/J90, re-passation ciblée, momentum par domaine"
statut: "à_faire"
dépend_de: "LOT-05"
---

# LOT-07 — Suivi longitudinal : jalons et momentum par domaine

## But

Rendre les jalons J21/J42/J90 atteignables depuis l'interface et donner au
praticien un momentum par domaine (digestif, alimentaire, mouvement, sommeil,
adaptation) au lieu du seul delta d'un scalaire agrégé.

## Résultat observable

La carte de Fil `jalon_j21` devient soluble depuis l'UI (confirmation d'un
épisode J21) ; au jalon, une re-passation ciblée est proposée (instruments visés
par le protocole, pas le pack entier) ; un J21 avec re-passation TFD seule
produit un momentum digestif sans prétendre mesurer le reste ; les deltas sous
la bande de bruit s'affichent « stable » ; le scalaire global reste en repère ;
les check-ins restent juxtaposés, jamais fusionnés.

## Périmètre

- UI de confirmation des jalons non-T0 : le back accepte déjà tout jalon
  (`runtimeFromPrisma.ts:13,60-62`) — paramétrer le jalon dans
  `ClinicalRuntimeSection` (aujourd'hui `T0` codé en dur) + panneau de
  confirmation par fenêtre ±8 j existante.
- Re-passation ciblée : proposition au jalon dérivée des `mesures[]` du
  protocole (LOT-05), via la file d'envoi existante — geste praticien, aucun
  envoi automatique.
- Momentum par domaine : lectures par besoin/source (digestif Q_GAS_01,
  alimentaire Q_ALI_01, mouvement sous-score Q_MOD_01, sommeil PSQI/indice
  agenda, adaptation Q_MOD_01) entre jalons du même cycle, avec bande de bruit
  par variable (seuils = question ouverte de campagne, arbitrage praticien) ;
  le scalaire `scoreGlobal` conservé comme repère.
- Restitution : fiche-trajectoire praticien + carte `jalon_j21` enrichie.

## Hors périmètre

- Multi-cycle T1/T2 (backlog nommé).
- Poids/tour de taille déclaratifs (backlog — exige une saisie nouvelle).
- Fusion des check-ins dans le momentum (doctrine conservée).
- Tout changement de `versionScore` ou des grilles.

## Fichiers probables

`web/src/components/patient-cockpit/ClinicalRuntimeSection.tsx:198,234`,
`web/src/components/patient-cockpit/EpisodeConfirmationPanel.tsx`,
`web/src/app/api/praticien/cockpit/route.ts`,
`web/src/lib/equilibre/momentum.ts`, `depuisPrisma.ts`,
`web/src/lib/protocol/trajectoire.ts`, `resumeJ21.ts`,
`web/src/lib/fil/momentumJ21.ts`, `cartes.ts:273-302`,
`web/src/app/api/praticien/file-envoi/route.ts` (réutilisée).

## Interdits

- Aucun momentum entre cycles ou entre `versionScore` différents (gardes
  existantes préservées).
- Aucune interprétation clinique automatique d'un delta (pas de « amélioration
  significative » — tendance factuelle seulement).
- Pas de planification automatique d'assignations au jalon : proposition, geste
  praticien.

## Dépendances

LOT-05 (les `mesures[]` du protocole ciblent la re-passation). LOT-02
souhaitable (préconditions homogènes T0/J21). Parallélisable avec LOT-06.

## Étapes

1. Paramétrage du jalon dans le cockpit + UI de confirmation J21/J42/J90.
2. Re-passation ciblée branchée sur la file d'envoi.
3. Momentum par domaine (module pur + bandes de bruit) + tests.
4. Restitution trajectoire + carte de Fil.

## Tests

- La carte `jalon_j21` se résout par le parcours UI complet (fixture).
- Momentum digestif seul quand seule la re-passation TFD existe ; « stable »
  sous la bande de bruit ; aucun momentum si `versionScore` diffère.
- Non-régression : momentum scalaire existant inchangé pour les consommateurs
  actuels.
- T2 avant commit ; rejeu E2E des parcours praticien touchés.

## Done

- Critères du Lot H de `sources/02-spec-lots-parcours-t0.md` (périmètre réduit
  acté : poids déclaratif en backlog).
- Fragment `changelog.d/`.
