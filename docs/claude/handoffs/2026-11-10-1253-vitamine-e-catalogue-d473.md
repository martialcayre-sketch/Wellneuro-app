# Handoff — 2026-11-10 — la vitamine E sanguine entre au catalogue (D-473)

## Branche et état Git

`b-vitamine-e-catalogue`, session concurrente dans le worktree `.claude/worktrees/b-fiche-usage-iode-selenium`, partie de `origin/main` `fb01e813f`. PR de migration : elle reste à sa file jusqu'au constat (D-373 §2, D-393 §6), sans passer par l'intégrateur.

## Objectif

Premier des restes du besoin 2 dans l'ordre arbitré par le responsable le 2026-11-10 (« vitamine E d'abord ») : faire entrer la vitamine E sanguine au catalogue de biologie, sans contenu clinique.

## Décisions prises

- D-473, réservée par `wn-reserver-decision` ; arbitrages du responsable du 2026-11-10 sur questions à options :
  - ordre : vitamine E d'abord, contre la recommandation (claims épinglés d'abord) ;
  - périmètre : une fiche et un candidat NABM `7302` à signer ; aucun panel, plage, lien ni composition ;
  - unité `µmol/L` ; libellé « Vitamine E (alpha-tocophérol) », choix du responsable contre la recommandation (nom courant seul) ;
  - suite : résolveur au second lot, après l'application constatée ; fiche d'usage inchangée jusqu'à la relecture des claims qui la fondent.
- L'unité ne repose que sur le claim d'une source au corpus, dont la relecture reste due : limite écrite en D-473 §2.
- Le contrat du catalogue ne compte pas les correspondances NABM pour cette fiche : la signature attendue du candidat ne doit pas le rougir.

## Fichiers modifiés

- `web/prisma/migrations/20261110120000_catalogue_biologie_vitamine_e/migration.sql` (neuf).
- `web/prisma/checks/cb_catalogue_niveau_1_donnees.sql` : 117 analytes ; la fiche ligne par ligne ; aucune plage, lien, composition ni item de panel sur elle.
- `web/src/lib/biology-library/candidatsNabm.ts` et son banc : candidat `7302`, 117 analytes, 36 en libellé explicite.
- `web/src/lib/biology-library/import/resolverLibellesV1.test.ts` : 117 unités lues.
- `docs/decisions/D-473.md`, `changelog.d/2026-11-10-d473-vitamine-e-catalogue.md`, `docs/claude/plan-journal/H15/2026-11-10-01-restes-besoin-2-vitamine-e-d473.md`, ce handoff.

## Validations exécutées

- Lecture de la production, conteneurs détachés, en lecture seule et en agrégats : état des restes du besoin 2, acte `7302` actif, aucune ligne importée de vitamine E, 116 analytes.
- Bancs de la bibliothèque biologie : 958 tests verts. T1 complet : vert.
- Base locale migrée : contrats `cb_catalogue_niveau_1_donnees`, `cb_biologie_catalogue_v1` et son négatif, `biology_liens_axe_v1` verts ; trois mutations en transaction annulée — unité changée et item de panel ajouté rougissent, correspondance `7302` signée reste verte.
- Revue `wn-reviewer` sur `cd81c7907` : GO, aucun P0 ni P1 ; deux P2 (renvoi de section dans la migration et un banc, handoff absent), corrigés dans ce lot.
- T3 complet sur `cd81c7907` : vert — 16 634 tests Vitest, 357 E2E, dérive schéma ↔ migrations nulle. Le correctif suivant ne touche que deux commentaires (migration et banc) ; T1 rejoué après lui.

## Problèmes ouverts

- Restes du besoin 2 non traités ici : relecture des claims en attente (lot dédié, croisée avec le contrat de fraîcheur) ; source externe d'un claim épinglé ; lecture de la source primaire d'un autre ; réserve de D-465 §3 ; déclaration « besoin 2 achevé ».
- « Un seul acte V105 nomme la vitamine E » repose sur la lecture de production, pas sur le dépôt.

## Prochaine action exacte

1. CI et revue sur la tête : CodeRabbit, sinon Copilot (D-468), sinon PR-Agent prouvé par `wn-revue-pr-agent.mjs` = 0, sinon `wn-reviewer` (D-448) ; verdict de chaque remarque.
2. Déclarer la PR « prête @<sha> » ; le merge revient à sa file, sur arbitrage du responsable (sonde release-db = 0).
3. Après le merge : release-db approuvée par le responsable ; constat par conteneur — 117 analytes `saisie_praticien`, la fiche conforme, aucun item de panel ni lien sur elle, contrat du catalogue vert.
4. Puis le second lot : libellés du résolveur, soumis au responsable, avec la re-signature du résolveur.

## Interdits encore actifs

- Production en lecture seule, par conteneur `scalingo run -d` ; écriture par la seule release-db approuvée.
- Aucun texte clinique, libellé de claim ou valeur dans le dépôt public (D-251 §4).
- Pas de pull, merge ni rebase sans arbitrage du responsable.
- Pas de code consommateur de la fiche (résolveur) avant l'application constatée.
- Signature d'un contenu clinique et du candidat NABM : gestes du responsable.
