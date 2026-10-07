# Handoff — 2026-10-07 — BIO-PARCOURS BP-10 : constat d'usage et clôture

## Git

Branche `docs/bio-parcours-lot10-cloture`, issue de main 57aebfb2 (#1353).
PR de documentation seule.

## Objectif

Verser le constat d'usage de BP-10 (`D-266` §12) et clore le LOT-10.

## Décisions

- Le constat ne conclut pas à un usage : une occurrence établit le chemin.
- L'effectif de masquage (`D-266` §14) n'est pas chiffré : réserve écrite,
  valeurs publiées parce qu'elles ne portent ni date fine, ni identifiant,
  ni valeur clinique (même régime que la ligne de base du 2026-10-05).

## Fichiers

`CONSTAT_USAGE_BP10_2026-10-07.md`, `CONSTAT_USAGE_BP10.sql`, fiche LOT-10
(statut, étape, Résultats), `CAMPAGNE.md` de BIO-PARCOURS, `.wn/state.json`
(tête de next_action, dernier lot clos), fragment changelog, SESSION_LOG.

## Validations

Relevés `one-off-1330` et `one-off-4233`, lecture seule, `ROLLBACK`. T1.

## Ouvert

- Effectif de masquage à chiffrer par le responsable.
- Révocation d'une lecture : éprouvée en banc seulement.
- Suivi BioFlow (page hors dépôt) mis à jour à cette clôture.

## Prochaine action

BIO-INGEST LOT-04, PR 3 : code sous `WN_BIO_PORTAIL_ENABLED` éteint.

## Interdits actifs

Aucune écriture SQL en production (`D-087`). Aucun nom de patient dans le
dépôt. Aucune extraction au dépôt patient ; aucune valeur montrée au
patient.
