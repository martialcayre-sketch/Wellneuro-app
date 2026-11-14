# Handoff — 2026-11-14 — Orchestration (4) : L2, instantané GitHub, superviseur rejoué et manifeste d'export

## Branche et état Git

- Branche `chore/orchestration-l2-superviseur-2`, refaite sur `origin/main` dans le worktree `.claude/worktrees/orch-ci`
  sur arbitrage du responsable (question `20261114-1012-d`, option A). La première branche,
  `chore/orchestration-l2-superviseur`, portait un commit local non poussé (dd30a970) dépassé par `main` pendant la
  relecture. Elle a été abandonnée sans push, après un cherry-pick sans conflit.
- Le lot est resté en modifications indexées jusqu'au commit de push, pour que `main` puisse continuer à avancer par
  `--ff-only` (D-518 §1). Quatre avances pendant le lot.
- Session concurrente « Orchestration », file D : `git` et `gh` en direct. La PR se déclare « prête » ; l'intégrateur
  merge.

## Objectif

Lot `orchestration-4` du carnet (L2 du plan du super-orchestrateur, lot 2 de l'audit externe) : un instantané GitHub en
lecture seule, un superviseur qui le croise avec l'export des registres, et un manifeste d'export. Les actions dues sont
confrontées à l'état réel avant tout usage. Rien n'est écrit, aucun agent n'est lancé.

## Décisions prises

- Aucune D-xxx. Arbitrage du responsable dans la session : branche refaite (`20261114-1012-d`, répondue).
- Le superviseur reprend les actions de `wn-registres` et ajoute ce que GitHub établit : `merge_fait_manquant`,
  `prete_perimee`, `merge_a_examiner`, `prete_en_attente`, `declaration_sans_message`, `lot_a_passer_fait`,
  `lot_pr_fermee`, `question_a_clore`, `chevauchement_signale`. Chaque action porte `observe` et `a_confronter`.
- Examinable seulement si toutes ces conditions sont vues : une déclaration sur la tête, par un auteur OWNER, MEMBER
  ou COLLABORATOR ; une tête dans le dépôt ; la base `main` ; pas de brouillon ; aucun check en échec ni en cours, et
  `verify` (repli de `wn-attendre-ci`) conclu `success` ; les deux gardes à 0 ; une ligne émise avant l'instantané.
- Mode dégradé, jamais à 0 : instantané absent, hors contrat, périmé, partiel ou sans sondes ; export sans manifeste
  ou périmé.
- Manifeste (`manifeste.json`) : lignes et curseur épuisé par collection, et `exporte_le` avec un fuseau explicite.
  Un écart donne le code 2 ; un manifeste absent est seulement dit. La ligne machine `REGISTRES` reste inchangée sans
  manifeste.
- Ajouté au carnet par le message `20261114-0849-d` (accusé, traité) : `orchestration-6` reprend en entier
  `autonomie-release-db`, verrous de 1703-g compris.

## Fichiers modifiés

- `scripts/lib/superviseur.mjs`, `scripts/wn-superviseur.mjs`, `scripts/wn-superviseur.test.mjs` (neufs).
- `scripts/wn-instantane-github.mjs`, `scripts/wn-instantane-github.test.mjs` (neufs).
- `scripts/wn-registres.mjs` : manifeste, âge de l'export.
- `web/package.json` (`bancs-outillage-check`) et `.github/workflows/ci.yml` (étape « Gardes de merge et contrôle des
  registres ») : les deux bancs.
- `docs/ROLES_MACHINES.md` : manifeste, section « Le superviseur rejoué ».
- `changelog.d/2026-11-14-orchestration-superviseur-rejoue.md` ; ce handoff.
- Hors dépôt : carnet (`orchestration-4` pris), question `20261114-1012-d`, message `20261114-0849-d` accusé.

## Validations exécutées

- Les bancs : superviseur 28, instantané 15, registres 19, soit 61 tests et code 0. La parité CI et les invariants
  passent aussi.
- T1 complet (`npm run check`) avant la relecture : code 0. Relancé avant le push : voir la PR.
- Relecture adverse `wn-reviewer` sur dd30a970, avant le push : GO conditionnel, aucun bloquant, douze constats.
  Corrigés :
  - 1, CI partiel : `verify` exigé, dernière exécution par nom ;
  - 2, état de PR inconnu : anomalie ;
  - 3, déclaration d'un tiers : écartée ;
  - 4, instantané vide à code 0 : le croisement porte sur l'instantané utilisable ;
  - 5, `erreurs` requis, sondes absentes = dégradé ;
  - 6, ligne traitée puis déclaration neuve ;
  - 7, ligne émise après l'instantané ;
  - 8, base `main` ;
  - 9, refus de sortie dans tout arbre Git, liens résolus ;
  - 10, masquage et motif d'erreur normalisé ;
  - 11, fuseau exigé ;
  - 12, absentes corrigées seulement si le curseur est épuisé.

  Un banc par cas a à d, plus ceux des mutations que la relecture a trouvées sans test.
- Essais réels sur un export complet (26 lots, 133 messages, 268 questions, avec manifeste) et deux instantanés : 89 s
  pour six PR ouvertes.
  - Premier essai : #2090 déclarée en gras (`**Prête @sha**`), d'où un motif élargi ; #2085 sans commentaire de
    déclaration ; sonde release-db à 1 pendant l'attente de la migration D-515.
  - Second essai : trois `merge_fait` manquants (#2085, #2088, #2090) et trois lots à passer `fait`, sur un export
    signalé périmé (32 min).
- T2 non joué : ni UI ni API touchées.

## Problèmes ouverts

- Identité : les sessions écrivent sous le compte du responsable. L'auteur et la vérification du commit de tête sont
  collectés, mais pas jugés.
- La sortie du superviseur est longue sur les registres réels : 29 anomalies de règle d'avant L2, et 57 actions de
  questions. Le tri par boîte et par âge relève de L5a (cockpit).
- Les contextes requis de la protection de branche ne sont pas lus : seul le repli `verify` l'est. Les conflits de
  fusion non plus. `a_confronter` renvoie à `wn-attendre-ci` et à l'étape 7 bis.
- Questions 2355-d (forme du cockpit) et 2356-d (routine cloud après L2) toujours en attente du responsable.

## Prochaine action exacte

1. `npm run check`, commit, push, PR (`--body-file`), puis `node scripts/wn-attendre-ci.mjs <N>` en fond et
   `node scripts/wn-revue-pr-agent.mjs <N>`. Verdict écrit pour chaque remarque.
2. Relire la boîte `orchestration` et la ligne `orchestration-4`, poser `pr`, puis déclarer « prête @<sha> » (ligne
   `prete` à l'intégrateur et commentaire de PR).
3. Lot suivant de la file D au carnet. L0 suit L2 dans le plan, et la routine dépend de 2356-d.

## Interdits encore actifs

- Ne pas merger depuis la session : l'intégrateur merge (D-373, D-454).
- Ni approbation ni déclenchement de release-db.
- Aucune adresse de page de suivi ni texte de registre dans le dépôt ; export et instantané restent dans le bloc-notes.
- Branche avec un commit propre dépassée par `main` : arbitrage du responsable (D-518 §2), jamais de fusion ni de
  rebase d'office.
