# Handoff — 2026-11-02 — F05, Q2 : le rappel Codex P0 reconnaît toute table signée

## Branche et état Git

Branche `f05-crochets-fiches-usage`, avancée en `--ff-only` sur `origin/main`
b610be45, dans le worktree `.claude/worktrees/f05-structure`. La PR #1820
(D-419) est ouverte en parallèle et ne dépend pas de celle-ci. Aucune
migration, aucun `schema.prisma`.

## Objectif

Traiter la question Q2 de la revue `wn-reviewer` de #1816 : la structure
signée des fiches d'usage était absente des listes des crochets.

## Décisions prises

- Vérification faite avant d'écrire : `protect-wellneuro-files.mjs` demande
  déjà sur `ficheUsageBesoin2V1.ts`, par son marqueur de signature (D-266).
  Le trou n'était que dans `gate-codex-p0.mjs`, dont la liste figée de six
  tables ignore une dizaine d'autres tables signées.
- Arbitrage du responsable du 2026-11-01 : le marqueur générique, plutôt que
  le seul fichier de la structure. Le critère est celui du crochet
  d'édition :
  - le marqueur doit être hors commentaire ;
  - les compagnons de test sont exclus ;
  - la structure des fiches d'usage compte même verrou éteint.
  Le fichier est lu sur disque, à la base de comparaison et à `HEAD`, pour
  qu'une table supprimée, ou privée de son marqueur sur disque sans commit
  (revue Copilot de #1821), compte aussi. La logique est recopiée à dessein,
  comme la liste.

## Fichiers modifiés

- `.claude/hooks/gate-codex-p0.mjs` et son banc `gate-codex-p0.test.mjs`
  (huit cas : cinq demandes, trois silences).
- Fragment `changelog.d/2026-11-01-gate-codex-tables-signees.md`, ce handoff.

## Validations exécutées

- `node --test .claude/hooks/gate-codex-p0.test.mjs` : 17 verts.
- Sonde du crochet d'édition sur la structure signée : « demande », par le
  marqueur.
- T1 complet et revue : voir la PR.

## Problèmes ouverts

- Le lot touche les crochets : l'intégrateur lance T1 avant l'avance
  `--ff-only` de la copie principale.
- #1820 (D-419) : après son merge, sa release-db doit être suivie jusqu'au
  constat.

## Prochaine action exacte

Ouvrir la PR, attendre le CI et la revue sur la tête, puis déclarer
« prête @<sha> » avec l'exception des crochets.

## Interdits encore actifs

- Aucune retouche d'une table signée sans nouvelle signature, ni de texte
  clinique, de valeur ou de borne de la main de l'assistant.
- Dépôt public : identifiants et mécanismes seulement.
- Ni migration ni `schema.prisma`. Production en lecture seule, par
  conteneur.
