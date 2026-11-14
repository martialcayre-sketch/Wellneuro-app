# Handoff — 2026-11-14 — Autonomie des sessions, pièges restants (1) : les P2 de la revue de #2074

## Branche et état Git

- Branche `chore/autonomie-pieges-p2` dans le worktree `.claude/worktrees/file-d-artefacts`, créée sur `origin/main`
  (d227c885).
- Lot du carnet `autonomie-pieges-restes` (D-510), ordre 35, pris par File D le 2026-11-14 après `autonomie-frictions`
  (`fait`, #2091). Cette PR est la partie 1 du lot.

## Objectif

Lever les P2 que `wn-reviewer` et Codex avaient relevés sur les contrôles de #2074, et qui avaient été routés à ce
lot. Les quatre contrôles tenaient sur toutes les formes présentes dans le dépôt, mais chacun avait une porte ouverte.

## Décisions prises

- Aucune D-xxx : on resserre des contrôles existants, sans élargir leur portée de refus au-delà du geste visé.
- Le contrôle des doublons Prisma sort dans un script, `wn-doublons-prisma.sh`, pour qu'un banc le couvre. Le remède
  donné supprime désormais tout le répertoire régénérable, puisqu'un répertoire « * 2 » ne se supprime pas avec
  `-delete`.
- Chaînes `$tag$` : le banc les lit de deux façons et retient le compte le plus haut, pour ne jamais voir moins que
  la lecture d'avant. La première est la lecture par contexte (du SQL après `AS`, `DO [LANGUAGE x]` ou `EXECUTE`, un
  littéral ailleurs). La seconde est la lecture d'avant, gardée à l'identique : la promesse « jamais moins » tient
  donc par construction. Une première version avait une exception `IS`, que la revue de l'écart a mise en défaut
  (une balise fermante précédée de `IS` faisait perdre un appel). Elle est retirée, et le cas est testé.
  - C'est la réponse aux trois P2 de la contre-revue Codex sur 4aa1aeb8, trois affaiblissements réels :
    `EXECUTE format($q$…)`, `DO LANGUAGE "plpgsql"` et l'identifiant `é$q$`.
  - Le prix est un refus prudent sur deux formes absentes des migrations.

## Fichiers modifiés

- `scripts/migrations-btrim.test.mjs` (famille trim, chaînes dollar, 9 tests)
- `.claude/hooks/block-risky-commands.mjs`, `.claude/hooks/block-risky-commands.test.mjs`
- `scripts/wn-doublons-prisma.sh`, `scripts/wn-doublons-prisma.test.mjs` (neufs) ; `scripts/wn-test-worktree.sh`
- `scripts/check_no_secrets.sh`
- `web/package.json` (`bancs-outillage-check`), `.github/workflows/ci.yml` (une étape)
- `changelog.d/2026-11-14-autonomie-pieges-restes-p2.md` ; ce handoff.

## Validations exécutées

- `migrations-btrim.test.mjs` : 9/9. Les comptes réels des migrations restent égaux au gel, et aucun `trim`, `ltrim`
  ni `rtrim` n'apparaît.
- `block-risky-commands.test.mjs` : 58/58.
- `check_no_secrets.test.mjs` : 28/28 (7 « todo » déjà présents), dont `TRACE.ZIP`.
- `wn-doublons-prisma.test.mjs` : 8/8. Le script rend 0 sur le vrai client du worktree.
- T1 complet (`npm run check`) : vert. `main` a avancé pendant le lot, et la branche, sans commit propre, a été
  avancée par `--ff-only`, sous D-518 et sur la consigne même du garde.
- `wn-reviewer` sur le diff non commité : NO-GO pour un P1.
  - P1 : une espace manquait dans `bancs-outillage-check`, ce qui rendait T1 rouge (banc de parité). Corrigé.
  - P2 corrigés :
    - un littéral dollar reste visible comme argument (`trim($$ $$ from t)` ne compte plus) ;
    - un `$` collé à un identifiant (`a$b$c`) n'ouvre plus de littéral, ce qui aurait effacé la suite du fichier ;
    - `EXECUTE $q$…$q$` (du SQL exécuté) et `DO LANGUAGE x $$…$$` sont lus.
  - Une note sans action : `--check-foo` excuse aussi le refus, ce qui est négligeable puisque Prisma refuserait
    l'option.
- `wn-reviewer` sur l'écart : GO, bancs rejoués à 146/146. Ses trois P2 de texte sont corrigés : ce handoff, la
  docstring, la limite `EXECUTE format(…)`.
- Contre-revue Codex (P0, diff poussé 4aa1aeb8) : avis conforme. Trois P2 corrigés par la double lecture, avec des
  tests pour chacun (9/9). Les autres contrôles (crochet, doublons, anti-secrets) n'ont reçu aucun constat.
- `wn-reviewer` sur l'écart 4aa1aeb8..9863d45d : GO sous réserve d'un P2, le contre-exemple de l'exception `IS`.
  - Corrigé : la lecture d'avant est maintenant reprise à l'identique, et le cas est testé.
  - Le P3 du commentaire est corrigé.
  - Les autres P3 sont sans action : la garde d'identifiant ne retire que des faux positifs, et le maximum par
    fichier ne joue que sur des dossiers gelés.

## Problèmes ouverts

Restent au lot `autonomie-pieges-restes`, pour les parties suivantes :
- `now()` nu dans les triggers ;
- `prisma generate` à la création d'un worktree ;
- les quatre pièges E2E ;
- un lot d'ingestion de plus de 10 claims ;
- `node:*` sous `use client` ;
- les listes jumelles ;
- release-db sur 504 ;
- un one-off Scalingo recyclé ;
- le flux du SDK sans borne ;
- la réservation WN-SRC ;
- les focus areas de PR-Agent ;
- le SESSION_LOG réordonné ;
- les sessions concurrentes sur la copie principale ;
- les crochets de la copie principale en retard ;
- `echo code=$?` en fond ;
- l'opacité Tailwind ;
- `wn-attendre-ci` (tête périmée, e2e lent) ;
- la refspec zsh ;
- le statut « transféré » (décision requise) ;
- la règle de lint « objet d'erreur brut ».

## Prochaine action exacte

1. Revue, CI, PR-Agent, « prête @<sha> », ligne `prete` au registre.
2. Partie 2 du lot : les pièges suivants, un contrôle par piège.

## Interdits encore actifs

- Ni migration, ni schéma, ni clinique, ni donnée patient.
- Un refus de crochet ne s'élargit pas à de la prose : les motifs lisent la commande masquée.
