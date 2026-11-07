# Handoff — 2026-11-07 — File C, place 9 (H81) : relevé de déblocage de H74 et retrait de CF-0a

## Branche et état du dépôt

- Branche `docs/c-place9-deblocage`, créée depuis `origin/main` à `b5b4c040` (#1919), puis avancée en `--ff-only` sur `10287a48` (#1921, seconde lecture du LOT-02 : un fait nouveau pour la porte 16, sans chevauchement de fichiers).
- Worktree `.claude/worktrees/c-place9-deblocage` : session concurrente, cycle en `git`/`gh` direct.
- PR de documentation seule : un fragment de journal du plan (H74) et ce handoff. Ni code, ni `schema.prisma`, ni D-xxx, ni fragment `changelog.d/`.
- **Pas de release-db attendue** : aucun chemin déclencheur n'est touché.
- D-454 : la PR est déclarée « prête @<sha> » ; l'intégrateur la merge, puis passe la question `20261107-1829-c` à `close` (`pr`, `merge_le`).

## Objectif

Retirer CF-0a des préalables de H74, puis relever l'état des autres préalables. Le relevé est avancé au 2026-11-07, sur décision du responsable : attendre le 2026-11-12 n'apportait rien.

## Décisions prises

- CF-0a est retiré de H74 par le fragment de correction. C'est une coquille, selon l'arbitrage du responsable du 2026-11-07 (liste commune `20261107-1829-c`, « Coquille à retirer »). La fiche elle-même n'est pas touchée.
- Relevé en lecture seule sur `origin/main` (`10287a48`) :
  - H61 : la porte 16 est fermée. La seconde lecture du LOT-02 du sommeil a été avancée au 2026-11-07 et jouée (#1921), mais le LOT-02 reste `en_cours` : sa clôture est posée au responsable, et c'est elle seule qui lève la porte. Même levée, la porte 16 laisserait H74 tenue par la porte 24 et par c.
  - H67 et H59 : la porte 24 est fermée, le palier 1 n'est pas sorti (ligne 24 du §1).
  - c (F59) : aucun fragment neuf depuis le 2026-11-01. Les lots de l'audit des instruments ne sont pas soldés.
  - Aucune PR ouverte ne porte H74 ou H81.
- Des préalables restent fermés : aucun texte d'ouverture du lot H74 n'est préparé pour la file A. Les portes toujours fermées ne reçoivent pas d'autre fragment.

## Fichiers modifiés

- `docs/claude/plan-journal/H74/2026-11-07-02-retrait-cf-0a.md` (neuf).
- Ce handoff.
- Hors dépôt : ligne q16 de la page « Suivi de la file C ».

## Validations exécutées

- `node scripts/wn-plan-journal-garde.mjs` : code 0. `scripts/lib/plan-journal.test.mjs` : 27 tests sur 27.
- T1 complet (`npm --prefix web run check`), après `npm ci` et `prisma:generate` dans le worktree neuf : voir la PR.
- CI et revue : voir la PR.

## Problèmes ouverts

- Porte 16 : les deux lectures sont jouées, la clôture du LOT-02 est au responsable (H27, #1921).
- La porte 24 attend le palier 1 de J2-base (H59).
- c (F59) attend les lots de l'audit des instruments.
- Sont repris du cadrage, sans valeur proposée ici : le numérateur de H74 (`nbRenseignees` ou `nbJourneesAgenda`), et, au lot H81, la vérification du premier jour noté de `Q_ALI_09`.

## Prochaine action exacte

1. CI : `node scripts/wn-attendre-ci.mjs <N>` (seul le code 0 compte). Revue : CodeRabbit, sinon `node scripts/wn-revue-pr-agent.mjs <N>`, sinon `wn-reviewer`. Un verdict par remarque, puis « prête @<sha> ».
2. Après la clôture du LOT-02 (porte 16) et la sortie du palier 1 (porte 24), refaire le relevé des préalables restants de H74 : H61, H67, H59 et c. S'ils sont tous levés, préparer pour la file A le texte d'ouverture du lot H74. Il porte le dénominateur et le banc du compte `Q_ALI_09`, et renvoie la question du numérateur au responsable, posée par une question à options.

## Interdits encore actifs

- Aucun code applicatif. Rien sous `web/src/lib/clinical/`. Ni migration ni `schema.prisma`.
- Production en lecture seule, par conteneur, en agrégats. Aucune identité réelle, aucun nom ni e-mail de dossier dans le dépôt.
- Aucune valeur, aucun seuil ni aucun délai proposés par la session. Aucune D-xxx sans arbitrage du responsable. Le texte du geste et sa fenêtre ne se modifient pas.
- Pas de merge par cette session (D-454). Pas de pull, de merge ni de rebase sans arbitrage.
- Ne pas reposer les arbitrages déjà rendus : D-353, D-357, D-437, Q1 à Q3 et CF-0a du 2026-11-07. Ne retirer aucun autre préalable sans fait nouveau et sans question au responsable.
