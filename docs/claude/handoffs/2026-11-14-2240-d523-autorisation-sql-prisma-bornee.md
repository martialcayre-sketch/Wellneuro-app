# Handoff — 2026-11-14 — D-523 : autorisation permanente bornée d'écrire le schéma et les migrations non destructives sans approbation

## Branche et état du dépôt

- Branche `chore/autorisation-sql-prisma-bornee`, dans le worktree `.claude/worktrees/orch-ci` (session Orchestration, file D). Elle a été avancée par `--ff-only` sur `origin/main` à chaque mouvement de `main`, sans fichier commun.
- Un seul commit, posé juste avant le push (D-518). PR ordinaire, qui touche les crochets : « prête @<sha> » pour l'intégrateur, qui joue T1 avant d'avancer la copie principale.

## Objectif

Le responsable demande une autorisation permanente, pour toutes les sessions, d'écrire les instructions SQL et Prisma sans son approbation manuelle. L'assistant recommande une version bornée, et le responsable répond : « je suis tes recommandations ». Ce lot écrit D-523 et la met en œuvre dans les crochets.

## Décisions prises

- D-523, acceptée :
  - en silence : `schema.prisma`, et une migration non destructive écrite par Edit ou Write ; `prisma migrate status|diff` purs ; la base locale par `bash scripts/wn-dev-db.sh --migrate`, lancé seul ;
  - en demande : une migration destructive, une migration écrite par Bash, les autres commandes Prisma qui touchent une base ou écrivent un fichier ;
  - en refus, comme avant : le SQL destructif exécuté en Bash ;
  - le chemin vers la production ne change pas (D-087, D-520).
- Principe de l'analyseur SQL, fixé après quatre passes de Codex et de `wn-reviewer` : **ce que le crochet ne lit pas avec certitude demande.**
  - Le SQL est lexé comme PostgreSQL le lit.
  - Les corps de fonction et de `DO` sont relus récursivement ; toute écriture ou tout EXECUTE y demande.
  - U&, UESCAPE, un E encodé et toute construction non fermée demandent.
  - Contrepartie : un mot destructif cité en commentaire ou en chaîne ne demande plus. Sur les 147 migrations du dépôt, 106 passent en silence, contre 56 avec la première version.
- Le texte de D-523 et la règle `db-prisma.md` citaient `scripts/wn-local-migrate.sh`, retiré le 2026-09-01. La voie locale réelle est `scripts/wn-dev-db.sh`, qui se construit lui-même une URL sur 127.0.0.1. L'enveloppe du garde de commandes la remplace, et elle ne dispense plus que lancée seule.
- Les cas d'élargissement de la détection (P2 des relecteurs) sont tranchés dans le sens prudent, sans solliciter le responsable : plus de demandes, jamais moins.

## Fichiers modifiés

- `.claude/hooks/protect-wellneuro-files.mjs` : `juger` reçoit l'origine (outil ou Bash), et l'analyseur `motifDestructif`, `jugerLexe`, `lexer`, `whereBorne`, `conditionTautologique` est neuf.
- `.claude/hooks/block-risky-commands.mjs` : enveloppes sûres, motif Prisma, motifs de tube et de substitution.
- `.claude/hooks/guard-prisma-mcp.mjs` : message seul.
- Bancs : `protect-wellneuro-files.test.mjs`, `protect-wellneuro-files-bash.test.mjs`, `block-risky-commands.test.mjs`.
- Texte : `docs/decisions/D-523.md` (neuf, numéro réservé par `refs/tags/reserve/D-523`), `CLAUDE.md`, `AGENTS.md` (interdit n° 3), `.github/copilot-instructions.md`, `.github/instructions/prisma.instructions.md`, `.claude/rules/db-prisma.md`, `.claude/rules/hooks-garde-fous.md`, `changelog.d/2026-11-14-d523-autorisation-sql-prisma-bornee.md`.

## Validations exécutées

- `node --test .claude/hooks/*.test.mjs` : 570 tests, 570 verts.
- Le corpus : les 147 `migration.sql` du dépôt passés au vrai crochet. 106 en silence ; les autres portent un DROP (24), du SQL dynamique dans un corps (11), une écriture dans un corps (4), un RENAME (1) ou `session_replication_role` (1). Aucune migration laissée en silence n'est destructive.
- T1 complet (`npm run check`) : vert sur la version de la troisième passe. Sur la quatrième, un seul échec : `scripts/wn-codex-avis.test.mjs`, « bout en bout », dû à la passe Codex qui tournait en même temps (dossiers temporaires). Rejoué seul, il est vert, 30 sur 30.
- Contre-revue Codex P0 (D-505), quatre passes. Elles relèvent 1, puis 11, puis 5, puis 2 P1. Tous sont fermés et posés au banc. Les avis sont déposés sur la PR.
- `wn-reviewer` : quatre NO-GO, tous corrigés et posés au banc. La cinquième passe, ciblée, rend **GO avec réserves**. Sa seule réserve est un P2 : une substitution entre guillemets doubles est masquée, trou antérieur au lot. Elle est déclarée dans les Limites de D-523 plutôt qu'élargie, parce que le juger ferait demander chaque message de commit qui cite Prisma. Le banc des commandes ordinaires (commit avec heredoc, `gh pr create --body-file`, `npm run`) reste en silence.

## Problèmes ouverts

- Les Limites de D-523, déclarées et non outillées :
  - une fonction déjà en base, appelée par la migration ;
  - un `CREATE OR REPLACE FUNCTION` qui vide une garde ;
  - les tautologies non évidentes (`WHERE id IS NOT NULL`, `t.id = t.id`) ;
  - `CREATE/ALTER POLICY … USING (true)` ;
  - une migration déjà appliquée, réécrite.
- Trous antérieurs à ce lot, non aggravés : `npx "prisma"` cité, un `prisma \` suivi d'un retour à la ligne, `prisma db seed` non gardé, `psql` jamais gardé, une substitution entre guillemets doubles, une sortie Prisma écrite dans un fichier puis passée à `psql -f`.
- Carnet : `garde-portail-routes-restantes` (ordre 53) est inscrite ; `licence-mention-droits` (80) et `cockpit-seconde-page` (81) suivent.

## Prochaine action exacte

1. CI à 0 (`wn-attendre-ci.mjs`, en tâche de fond), puis la revue de la tête par PR-Agent (`wn-revue-pr-agent.mjs` → 0), ou `wn-reviewer` en repli. Lire les trois sorties de commentaires et donner un verdict à chacun.
2. Déclarer « prête @<sha> » pour l'intégrateur, puis écrire le carnet et le registre des messages.
3. Après le merge : prendre au carnet `licence-mention-droits` (ordre 80).

## Interdits encore actifs

- Aucune écriture en production hors `release-db` ; lecture seulement depuis un conteneur `scalingo run -d`.
- SQL destructif en Bash : toujours refusé.
- Aucune identité réelle dans le dépôt ; seed et E2E sur les seules fixtures.
- Ne jamais lancer `npx prisma format`.
- D-518 : aucun pull, merge ou rebase pour avancer une branche qui porte un commit.
