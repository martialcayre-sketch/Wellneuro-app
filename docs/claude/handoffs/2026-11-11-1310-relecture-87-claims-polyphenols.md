# Handoff — 2026-11-11 — relecture des 87 claims en attente du dossier polyphénols et antioxydants (H15)

## Branche et état Git

`docs/besoin2-relecture-87-claims` est une session concurrente, dans le worktree `.claude/worktrees/b-fiche-usage-iode-selenium`. Elle part de `origin/main` `dc0cbed14`. C'est une PR de documentation seule, sans migration ni release-db : elle se déclare « prête @<sha> » et l'intégrateur la merge.

## Objectif

Restes du besoin 2, étape suivante dans l'ordre arbitré : relire les claims en attente, en croisant avec le contrat de fraîcheur des tables signées.

## Décisions prises

- **Arbitrages du responsable** (questions à options, 2026-11-11) :
  - une proposition motivée par claim, dans le dossier privé, avec contre-revue Codex avant l'arbitrage ;
  - des paquets alignés sur les positions P1 à P8 ;
  - un claim qui ne se tranche pas reste en attente ;
  - le responsable signe, l'assistant exécute les rejets.
- **Contre-revue Codex** : GO avec corrections, onze constats retenus après vérification sur pièces.
- **Arbitrage final** : propositions approuvées, avec deux écarts à Codex :
  - 0189-136 à 0189-140 sont signés au besoin 2, en Précautions ;
  - 0057-015 est signé hors parcours.
- **Bilan** : 45 rejets, 8 signatures, 34 claims maintenus en attente.
- Ni migration, ni release-db, ni décision `D-xxx` : aucun des 87 claims n'est épinglé ni consommé.

## Fichiers modifiés

- `docs/claude/plan-journal/H15/2026-11-11-02-relecture-87-claims-polyphenols.md`, en forme opaque. Il consigne aussi un écart : le handoff 0915 ne cite pas `docs/FEATURE_FLAGS.md`.
- `changelog.d/2026-11-11-relecture-87-claims-polyphenols.md`.
- Ce handoff.

## Validations exécutées

- **Production**, conteneurs détachés, lecture seule :
  - inventaire et croisement avec le contrat de fraîcheur et les consommateurs : 0 épinglé, 0 consommé ;
  - relecture des passages complets des deux sources tronquées dans les pièces ;
  - constat après les rejets (one-off-396) : 45 rejetés et 45 actes au journal ;
  - constat après les signatures (one-off-4658) : 8 signés et étiquetés comme arbitré ; la base compte 8 594 claims validés, 34 en attente et 92 rejetés ; le besoin 2 en compte 887.
  - Les deux constats ont rejoué le contrat de fraîcheur (vert) et le contrôle des liens d'axe (17 conformes).
- **Rejets** exécutés depuis l'atelier par un script de clics. Un garde n'agit que si la recherche montre le seul claim visé, et il a bloqué un premier essai sur une liste non filtrée.
- **T1 complet** : voir la PR.

## Problèmes ouverts

- 0189-136 à 0189-140 sont signés malgré la note d'unité de 2006 de leur source (arbitrage du responsable contre Codex). Une nouvelle version, ingérée depuis l'avis de 2024, lèverait l'écart.
- 34 claims restent en attente, avec leurs motifs dans le dossier privé. Parmi eux, 0044-020 laisse la fiche de lecture de la vitamine E sans analyte (`D-473` §6 (2)), et 0043-005 et 0377-016 attendent la réserve de `D-465` §3.

## Prochaine action exacte

1. CI et revue sur la tête : CodeRabbit, sinon Copilot (`D-468`), sinon PR-Agent prouvé, sinon `wn-reviewer`. Donner un verdict à chaque remarque.
2. Déclarer la PR « prête @<sha> » pour l'intégrateur.
3. Puis, dans l'ordre arbitré :
   - une source externe pour 0292-003 ;
   - la lecture de l'IOM 2000 pour 0649-005 ;
   - la réserve de `D-465` §3 ;
   - la déclaration « besoin 2 achevé ».

## Interdits encore actifs

- Production en lecture seule, par conteneur `scalingo run -d`.
- Aucun texte clinique, libellé de claim ou valeur dans le dépôt public (`D-251` §4).
- Pas de pull, merge ni rebase sans arbitrage du responsable.
- Validation d'un claim et toute signature : gestes du responsable.
- Avant le push d'une re-signature, jouer la suite entière (`npm run test:siin57`).
