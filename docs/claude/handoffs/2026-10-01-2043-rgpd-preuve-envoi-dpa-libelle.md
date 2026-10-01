# Handoff — RGPD : libellé de la preuve d'envoi du DPA (reliquat de #1278)

## Branche et état Git

- Branche `docs/rgpd-preuve-envoi-dpa-libelle`, PR #1279 ouverte, CI vert
  avant les corrections de revue.
- La clôture (SESSION_LOG et ce fragment) et la correction du §6 sont poussées
  sur la branche.

## Objectif

Corriger la nature de la preuve d'envoi de la demande de DPA à Anthropic. La
preuve est une **capture** du message envoyé, montrant en-têtes et corps, pas
une lecture directe du fil. La trace se reporte aux rubriques 6, 7 et 14 du
dossier RGPD.

## Décisions

- Est admise comme preuve d'une date d'envoi une trace du fil : sa lecture
  directe, ou à défaut une capture qui montre en-têtes et corps (§2 ter
  condition 3, pièce DPA « Trace à tenir »).
- Revue Copilot :
  - la rubrique 6, omise de la consigne de report, est **corrigée** (le
    récapitulatif route encore vers les rubriques 6 et 7) ;
  - la clôture manquante est **corrigée** par ce fragment et l'entrée
    SESSION_LOG.

## Fichiers modifiés

`docs/DOSSIER_RGPD.md` (§2 ter), `docs/rgpd/DEMANDE_DPA_ANTHROPIC.md`,
`docs/claude/SESSION_LOG.md`, ce fragment.

## Validations

Documentation seule. Le CI de la PR est rejoué sur le nouveau commit.

## Problèmes ouverts

- Réponse d'Anthropic sur le fond du DPA, puis signature et archivage
  (rubriques 6 et 7, échéance 2026-10-21).

## Prochaine action exacte

1. Merger #1279 une fois le CI vert.
2. BIO-INGEST LOT-02, PR 1 : migration seule du staging, sur une branche créée
   depuis `origin/main`. Le plan est approuvé (trois tables : comptes rendus,
   imports et lignes candidates ; contrat négatif ; RLS ; effacement ;
   rubrique 5).

## Interdits actifs

- Aucun masquage d'identité promis ni écrit (arbitrage du 2026-10-01).
- La migration reste seule dans sa PR (D-087). Le code consommateur n'arrive
  qu'après le `release-db` approuvé et le constat par conteneur.
- Aucune donnée patient réelle dans le dépôt.
