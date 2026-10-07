# Handoff — 2026-10-07 — Seconde unité d'une même mesure (D-270)

## Git

Branche `feat/bio-ingest-seconde-unite`, issue de main 2f1384b2 (merge de
#1352, migration du LOT-04). Lot de campagne : BIO-INGEST LOT-04 reste
courant ; ce changement d'écran est hors lot.

## Objectif

Ne plus faire décider une à une les mesures que le laboratoire imprime deux
fois, dans l'unité du catalogue et dans une seconde unité.

## Décisions

- `D-270` (précise `D-260` §3), arbitrage du responsable du 2026-10-07.
- Jumelle : même import, même analyte proposé, même `preleveLeLu`, et
  « Valider » d'office. Sans jumelle, la ligne reste à trancher.
- Garde-fou à l'envoi : jumelle non validée ⇒ refus local, rien ne part,
  liste dépliée. Toucher la ligne efface la dépendance (`jumelles`).
- Écarté : unités ou analytes ajoutés au catalogue.

## Fichiers

`web/src/components/patient-cockpit/ImportCompteRenduPanel.tsx` et son
test (5 tests neufs, 43 au total), `docs/DECISIONS.md` (D-270), fragment
`changelog.d/2026-10-07-bio-ingest-seconde-unite.md`, SESSION_LOG.

## Validations

Vitest du panneau 43/43 ; mutation du garde-fou : le test « jumelle
décochée » rougit. T1 rapide vert. T2 `--fast` : voir la PR.

## Ouvert

- `release-db` de #1352 à approuver par le responsable, puis constat par
  conteneur. Ce merge-ci attend ce constat.
- Constat d'usage BP-10 relevé (`one-off-1330`) : note à verser avec la
  clôture du LOT-10, en PR de doc.
- Seuil de masquage de `D-266` §14 non chiffré.

## Prochaine action

PR, CI, commentaires ; merge après le constat de la migration.

## Interdits actifs

Aucune écriture SQL en production (`D-087`). Aucune conversion d'unité
(`D-157`). Aucun nom de patient dans le dépôt. Pas de code consommateur du
LOT-04 avant le constat de la migration.
