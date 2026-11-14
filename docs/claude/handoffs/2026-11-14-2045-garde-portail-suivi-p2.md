# Handoff — 2026-11-14 — Suivi de #2125 : les trois P2 de wn-reviewer (commentaire de la garde, chronologie des validations)

## Branche et état du dépôt

- Branche `docs/garde-portail-suivi-p2`, créée depuis `origin/main@cc25fdcf` (merge de #2125), dans le worktree `.claude/worktrees/orch-ci` (session Orchestration, file D).
- PR de suivi de #2125, avec un commentaire de code et ce handoff. Aucun comportement ne change.

## Objectif

Corriger les trois P2 de `wn-reviewer` sur la tête `db8faa5b` de #2125, qui n'ont pas pu partir dans cette PR : `main` avait avancé après son commit, et D-518 interdit d'avancer seul une branche qui porte un commit.

## Décisions prises

- P2 n° 1 : le commentaire de `refusAutreDossier` (`web/src/lib/trust/portailAuth.ts`) disait que la garde passait « avant toute lecture du corps ». C'est inexact pour `trust/choix` et `trust/signalement`, qui lisent leur JSON avant l'authentification, comme avant #2125, sans rien écrire. Le commentaire dit désormais ce que fait le code.
- P2 n° 2 et n° 3 : le handoff de #2125 (`2026-11-14-2007-garde-portail-dossier-session.md`) n'est pas réécrit, puisqu'un handoff passé ne se réinterprète pas. Les précisions se lisent ici, et dans le commentaire de verdicts posé sur #2125.
  - Les bancs de route et le banc du layout ont été écrits avant le code, rouges puis verts.
  - Les cinq bancs de composant ont été écrits après le code : SignalerProbleme et DepotDocuments d'abord ; MesChoix, DeclarationsPatient et TransmissionCompteRendu ensuite.
  - La seconde passe complète de T3 a démarré après l'ajout de ces cinq bancs : elle couvre tout le code de #2125.
  - `/security-review` a tourné sur le diff indexé, avant l'ajout des trois derniers bancs, qui ne sont que des tests. Résultat : aucune vulnérabilité candidate.

## Fichiers modifiés

- `web/src/lib/trust/portailAuth.ts` (commentaire seul).
- Ce handoff.

## Validations exécutées

- T1 rapide (`npm run check:rapide`) : 16 étapes vertes, 3 sautées (commentaire seul, aucun comportement).
- `check_no_secrets.sh --staged` : 0.

## Problèmes ouverts

- Constat du déploiement de #2125 (`cc25fdcf`) : suivi par la file, chemin d'authentification au sens de D-373.
- Liste commune `20261114-1951-d` (ouverte) : étendre la garde aux autres routes d'écriture du portail.
- Question du responsable, en cours : une autorisation permanente d'écrire SQL et Prisma sans approbation (version bornée proposée).

## Prochaine action exacte

1. CI à 0, puis la revue de la tête (PR-Agent, ou `wn-reviewer` en repli). Cette PR est ordinaire : « prête @<sha> » pour l'intégrateur.
2. Constater le déploiement de `cc25fdcf` : version servie par Scalingo.
3. Puis le carnet de la file D : `licence-mention-droits` (ordre 80).

## Interdits encore actifs

- Aucun texte patient hors de D-488 ; aucun comportement modifié par cette PR.
- Aucune migration, aucun drapeau ; production en lecture seule.
- Toute écriture ArtifactData épinglée par `if_version`.
