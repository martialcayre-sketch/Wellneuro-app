# Handoff — AGENDA-SOMMEIL : clôture de rattrapage des LOT-06 à LOT-09

## Branche et état Git

`docs/agenda-sommeil-cloture-lots-07-09`, partie de `main` e78a9c6d. Uniquement de la documentation et de l'état : 7 fichiers et ce fragment. PR de doc
séparée : la fenêtre de clôture était fermée, les lots ayant été mergés depuis une session distante
sans handoff ni état.

## Objectif

Mettre les fiches, `CAMPAGNE.md` et `.wn/state.json` en accord avec ce qui
est mergé et observé, pour la campagne `2026-10-07-agenda-sommeil-adhesion`.

## Décisions prises

- LOT-07 (#1376) terminé, **observé en production** le 2026-10-10 par le
  responsable sur un dossier de test (point 1 de la recette).
- LOT-08 (#1379) terminé. CI WebKit verte 9/9 ; trou nommé : aucun test ne relie la clôture
  au rendu PDF pour `AGD_LAT_MED`.
- LOT-09 (#1381) terminé ; arbitrage « Couché d'abord », précision datée à D-272.
- LOT-06 (#1372) passé à « terminé » : sa fiche était restée `en_cours` alors que
  le lot est mergé ; son effet se lit avec le LOT-02.
- Lot courant : LOT-02, en attente de lecture. Campagne inscrite à la main en
  `parallel_campaigns`, car `wn-cycle --appliquer` n'inscrit aucune campagne.
- Le lien de la liste de recette (artefact claude.ai) reste hors dépôt.

## Fichiers modifiés

`.wn/state.json`, `docs/claude/campagnes/ACTIVE_CAMPAIGN.md` (généré),
`…/2026-10-07-agenda-sommeil-adhesion/CAMPAGNE.md`, fiches LOT-06, 07, 08, 09.

## Validations exécutées

- `npm run check:rapide` vert.
- `wn-campaign-audit.mjs` avec les codes bloquants du CI : code 0.
- `wn-cycle --appliquer` : la vue est resynchronisée.

## Problèmes ouverts

- Recette sur appareil : Android points 2 à 5, simulateur iOS points 6 à 9
  (liste hors dépôt).
- Agendas de test commencés, à relever pour le 2026-10-29.
- Trou E2E clôture → PDF (`AGD_LAT_MED`), sans lot d'accueil.

## Prochaine action exacte

Le 2026-10-29 (rappel programmé), lecture du LOT-02 avec `REMESURE_ADHESION.sql`, au conteneur, en agrégats. Compter les
deux textes du refus d'ordre (« doit suivre la mise au lit » / « l'heure du
coucher »). Seconde lecture le 2026-11-12.

## Interdits encore actifs

- Aucun seuil, barème ni contrat de l'agenda modifié sans `D-xxx`. Un ordre
  « coucher seul » exigerait D-xxx et un contrat v5.
- Dossiers réels : lecture par identifiant seulement, jamais de nom, jamais de
  métrique accolée dans un fichier durable ; aucun seed ni E2E sur eux.
- Pas d'auto-merge sur une PR de lot.
