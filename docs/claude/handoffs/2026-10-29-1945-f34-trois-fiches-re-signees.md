# Handoff — 2026-10-29 — F34 étape 2 : F11, E1 et E2 signées à nouveau après contre-revue

## Branche et état du dépôt

- Branche `f34-signatures`, worktree `.claude/worktrees/f34-signatures`,
  PR #1775. La déclaration « prête @5e7e1312 » a été retirée par un
  commentaire sur la PR, le temps des nouvelles signatures.
- `origin/main` (b2b45a9a) fusionné dans la branche par arbitrage du
  responsable (fusion choisie plutôt qu'un rebase : pas de push forcé) ;
  la branche avait 3 commits d'avance et 4 de retard, la fusion n'a eu
  aucun conflit.
- PR de doc seule : ni code, ni schéma, ni migration, ni décision neuve.

## Objectif

Traiter le retour de la contre-revue adverse des quinze fiches et des
réserves R1 à R5 : revérifier chaque réfutation dans le dépôt, corriger et
faire signer à nouveau les fiches dont le texte est fautif, puis remettre
le registre à jour avant le merge.

## Décisions prises

- Aucune décision `D-xxx` neuve. Arbitrages du responsable du 2026-10-29 :
  F11 et E1 corrigées et signées à nouveau ; E2 complétée de même ; R2 et
  R5 maintenues, leur question de fond portée à la liste commune ; PR
  suspendue jusqu'aux nouvelles signatures.
- Réfutations revérifiées : F11 (valeurs dites hors de la fiche alors que
  ses claims cités les portent) et E1 (écart d'apostrophe non nommé)
  confirmées ; E2 conforme à la lettre de D-389, mais ses écarts n'étaient
  pas nommés un par un. R2 : D-068 ne nomme bien que trois résolutions, mais
  la ligne B12 vient de la proposition validée ligne à ligne et de la table
  signée. R5 : aucun claim ne relie le tableau métabolique au bilan. Dans
  les deux cas, c'est la règle qui est visée, et une fiche ne la change pas
  (D-382 §6).
- F03 n'est pas visée : elle dit ce que fonde le claim chiffré qu'elle
  cite.

## Fichiers modifiés

- `docs/architecture/bioflow/FAMILLES_BILAN_SIGNATURES.md` : lignes F11, E1
  et E2 (révision 64, nouvelles empreintes) ; forme canonique, point 1.
- `docs/claude/plan-journal/F34/2026-10-29-02-trois-fiches-re-signees.md`
  (créé ; rang `02`, après le `01` de cette PR, aucun fragment du
  2026-10-29 sur `origin/main`).
- `changelog.d/2026-10-29-f34-familles-signees.md` (une puce ajoutée).
- `docs/claude/handoffs/2026-10-29-1945-f34-trois-fiches-re-signees.md`
  (créé).

## Validations exécutées

- Comparaison caractère par caractère, motif contre claim, pour E1 et E2 :
  l'écart d'E1 se limite à l'apostrophe ; les écarts d'E2 sont ceux
  désormais nommés.
- Réexport du dossier privé à la révision 64 : les douze fiches non visées
  sont identiques à l'octet à leur version signée ; F11, E1 et E2 ne
  diffèrent que par les passages validés. Le serveur du dossier a rendu la
  même empreinte au dépôt des trois nouveaux fichiers canoniques.
- Aucune lecture de production pour ce tour.
- T1 et CI : voir la PR.

## Problèmes ouverts

- Question de la liste commune `20261029-1938-c` (clinique, ouverte) :
  re-signer BIO-MET-01, BIO-MET-02 et la ligne B12 de BIO-MEM-01 telles
  quelles, suspendre les règles métaboliques, ou chercher une source
  d'abord. Elle se tranche avant l'étape 3.
- Ceux du handoff précédent de la branche restent valables (étiquettes de
  section des chunks non toutes relues ; PR-Agent sur une PR de doc).

## Prochaine action exacte

T1, commit, push ; `wn-attendre-ci` à `0` sur la tête ; revue de CodeRabbit
sur la tête, ou PR-Agent prouvé selon D-393 §2 ; un verdict par remarque ;
puis déclarer de nouveau la PR « prête @<sha> » à l'intégrateur, avec le
chemin de ce handoff.

## Interdits encore actifs

- Dépôt public : aucun texte de fiche, aucun lien d'artefact, aucune
  identité réelle au dépôt.
- Ne toucher ni à `indicationsBiologieV1.ts` ni à son empreinte, ni à aucun
  code ou schéma, avant le lot de l'étape 3.
- Une fiche signée ne se retouche pas : toute modification de son texte
  rompt son empreinte et appelle une nouvelle signature.
- Aucun pull, merge ni rebase sans arbitrage du responsable.
- Hors lot : F53, la lettre cr, ax, la proposition de bilan du cockpit.
