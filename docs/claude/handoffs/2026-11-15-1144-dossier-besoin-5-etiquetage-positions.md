# Handoff — 2026-11-15 — dossier de preuve du besoin 5, étape 4 : étiquetage et positions v0.1 (D-312, H15), lot de la file B

## Branche et état Git

- Branche `docs/besoin5-dossier-etape4`, tirée d'`origin/main` 23c05dcb (#2139), puis avancée sans commit propre
  par `--ff-only` sur c6ad7303 (#2147, étape 3, mergée pendant le lot). Worktree `.claude/worktrees/b-besoin5-etape4`,
  créé pour ce lot : l'ancien worktree `b-bp17-cadre` restait sur la branche de #2147.
- Session concurrente (file B) : `git` et `gh` en direct, pas de `/wn-*`.

## Objectif

Lot `besoin5-dossier-etape4` du carnet (file B, ordre 69), inscrit puis pris sur consigne du responsable, faute de lot
`pret`. Étiqueter au besoin 5 les claims `VALIDE` seulement, par délégation (`D-325` §5), rédiger les positions v0.1 au
dossier privé, au gabarit du besoin 4, et lister à signer les 37 claims externes en attente. Documentation seule, sans
code.

## Décisions prises

- Boîte B (`D-503`) relue : aucun message non lu. Carnet : aucune ligne `bloque` en file B.
- Lot 1 d'étiquetage **sélectif**, au gabarit du besoin 4 (E1 = A, `20261114-2206-b`) : seuls les claims cités par les
  positions sont retenus, soit 41 claims de cours `VALIDE`. Aucun rejet. Le seul claim qui avait déjà des clés (besoin 1)
  les garde : l'atelier remplace les clés, il reçoit donc les deux besoins et garde sa rubrique.
- Les 37 claims externes (`LOT_063` à `LOT_066`) ne sont pas étiquetés : ils ne sont pas `VALIDE`. Ils sont cités
  « att. » dans les positions, qui ne se cochent qu'après leur signature (`DC-16`, non déléguée).
- Positions v0.1, P1 à P25, plus une liste « Non retenu », dans l'onglet « Positions v0.1 » du dossier privé. Aucune
  n'est signée.
- Rang du journal H15 : `02`, après `2026-11-15-01` sur `main`. Aucune PR ouverte ne touche le journal H15 ni le plan au
  moment de l'écriture. Le lot `besoin4-decision-guide` (autre session B) n'a encore ni branche distante ni PR : si sa PR
  prend le même rang, la seconde à merger renumérote.

## Fichiers modifiés

- `docs/claude/plan-journal/H15/2026-11-15-02-dossier-besoin-5-etiquetage-positions.md` (nouveau).
- `docs/claude/PLAN_WELLNEURO.md` : ligne « dossiers des autres besoins », dernière colonne.
- `changelog.d/2026-11-15-dossier-besoin-5-etiquetage-positions.md` (nouveau) ; ce handoff.
- Hors dépôt :
  - le dossier privé du besoin 5 : section « Étape 4 » du premier onglet (constats, tableau des rubriques, liste collée,
    37 claims à signer) et onglet « Positions v0.1 » ;
  - le carnet (page de la file D) ;
  - le bloc-notes de la session, `b5e4/` : requêtes, inventaire (`out1.tsv`), choix, liste, constats.

## Validations exécutées

- Lectures en production, toujours en lecture seule et dans une transaction annulée, après un essai à blanc sur la base
  locale :
  - one-off-1281, avant le geste : 37 claims en attente, aucun au besoin 5, inventaire des claims `VALIDE` sur huit axes ;
  - one-off-3813, après le geste : 41 claims au besoin 5, tous `VALIDE`, répartition par rubrique conforme ; le claim
    déjà au besoin 1 porte les deux besoins ; 41 actes `etiquetage` au journal ; 37 claims externes toujours en attente.
- Liste relue par `lireListeEtiquetage` (tsx, worktree) : 41 lignes, aucune erreur. Aperçu de l'atelier : « 41 claims
  lus ». Retour de l'atelier : « 41 claims étiquetés ».
- Anti-secrets et T1 complet : résultats donnés dans la PR. Pas de T2 : documentation seule.

## Problèmes ouverts

- Signature des 37 claims externes par le responsable dans l'atelier (`WN-CL-0666-001` à `0671-007`) ; puis lot 2
  d'étiquetage de ces claims, avec leurs rubriques.
- Contre-revue des positions v0.1 : déposer les pièces au dépôt privé des revues (`besoin5-mouvement-repos/`) ; leur
  lancement est un geste du responsable (`D-505` refuse le privé). Puis verdicts, v0.2, signature case par case.
- Points en attente des pièces du responsable, chaque ingestion sur son accord explicite :
  - PDF de `0575` : passage sur l'hygiène du sommeil et tableau du PSQI ;
  - textes intégraux du PSQI et de l'Epworth.
- `0575` laisse non évaluée la branche « hygiène du sommeil au socle » de la règle du guide. Mobilité : « non évaluée »
  (licence MSK-HQ, statut de la version française).
- Carnet : `pris_le` est réglé à 10:33Z, l'heure constatée de la prise.

## Prochaine action exacte

1. CI de la tête (`wn-attendre-ci.mjs`, seul `0` vaut). Revue PR-Agent prouvée, sinon `wn-reviewer` (`D-448`) ; un
   verdict par remarque. Relire la boîte B, puis déclarer « prête @<sha> » sur la PR et au registre.
2. Au merge : passer le lot du carnet à `fait`.
3. Suite du besoin 5 : signature des 37 claims, lot 2, contre-revue des positions v0.1.

## Interdits encore actifs

- Aucun texte de claim, aucune valeur, aucune borne, aucun seuil, aucun nom de rubrique au dépôt, ni dans les tests,
  ni dans les messages de commit (`D-251` §4, `D-325` §5).
- Aucune règle, aucun seuil ni aucun poids inventés ; aucun seuil tiré de la mémoire de l'assistant.
- Aucun code clinique : `BESOIN_SOURCES`, convergence, grilles servies et nouvel instrument relèvent de décisions
  distinctes, appliquées par J3-12f.
- Étiquetage délégué sur les claims `VALIDE` seulement ; la signature ne se délègue pas (`DC-16`).
- Aucune ingestion sans accord pour chaque envoi. Aucune pièce privée dans un paquet de `wn-codex-avis.mjs`.
- Production lue seulement par `scalingo run -d`. L'URL du dossier privé reste hors dépôt. PRIO-MOB reste écartée ;
  la mobilité reste « non évaluée ».
