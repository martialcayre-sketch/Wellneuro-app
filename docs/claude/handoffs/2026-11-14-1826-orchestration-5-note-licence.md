# Handoff — 2026-11-14 — Licence du dépôt : note d'options (orchestration-5)

## Branche et état Git

- La branche `docs/orchestration-5-licence` part de `origin/main` à af70261c (merge de #2119), dans le worktree
  `.claude/worktrees/orch-ci`. Elle a avancé une fois par `--ff-only`, jusqu'à c5755cd9 (#2120), avant le
  commit et sans fichier du lot.
- Le lot reste indexé, sans commit, jusqu'au push (D-518 §1).
- C'est une session concurrente « Orchestration », file D, qui travaille en `git` et `gh` direct. La PR est
  documentaire : elle se déclare « prête », et l'intégrateur la merge.

## Objectif

Lot `orchestration-5` du carnet (ordre 44, fiche : réponse `20261113-2205-d`) : écrire une note d'options de
licence pour le dépôt public, en vue d'une offre future. La décision revient au responsable, l'avis juridique
se prend hors session, et aucun fichier `LICENSE` n'est posé sans réponse.

## Décisions prises

- Aucune décision de licence n'est prise : la question est inscrite dans la liste commune.
- La note examine cinq options : aucune licence, AGPL-3.0, BSL 1.1 ou FSL, PolyForm Noncommercial et double
  licence. La question de la liste en garde quatre, parce que le format en admet quatre au plus : la double
  licence y est fondue avec l'AGPL.
- La question est de nature `ordinaire`, mais elle ne relève pas de D-505 §6 : une licence n'est pas une
  technique réversible, et Codex déclare des faits manquants. La réponse revient donc au responsable.
- Ménage du carnet, sur consigne du responsable : la ligne `orchestration-6` est passée à `fait`, avec le
  motif « caduc : remplacé par D-520 (#2115) », un `pr` vide et `fait_le` à 2026-11-14T17:20:47Z.
  Citation de D-520 vérifiée (`docs/decisions/D-520.md:28`).
- La question `20261112-1703-g` est au statut `repondue`, pas ouverte : elle n'est pas signalée.

## Fichiers modifiés

- `docs/claude/propositions/2026-11-14-orchestration-5-licence/note-options-licence.md` (nouveau).
- `changelog.d/2026-11-14-orchestration-5-note-licence.md` (nouveau).
- Ce handoff.
- Hors dépôt :
  - le message `merge_fait` de #2119 est passé à `traite`, et `release-db-sans-approbation-2` est constaté à
    `fait` ;
  - la ligne `orchestration-6` est passée à `fait` (caduc) ;
  - la ligne `orchestration-5` est passée à `pris`, avec la question `20261114-1825-d` ;
  - la question `20261114-1825-d` a été créée, au statut `ouverte`, avec l'avis Codex.

## Validations exécutées

- État du dépôt relevé :
  - `gh repo view` donne `PUBLIC` et `licenseInfo: null` ;
  - aucun fichier de licence à la racine, et aucun champ `license` dans les `package.json` ;
  - les seules licences versionnées sont trois `LICENSE.txt` de skills tiers.
- Recensement des licences, par un script du bloc-notes, sur `web/package.json` et `package-lock.json`
  (953 paquets) :
  - aucune licence GPL ou AGPL ;
  - quelques licences atypiques, nommées dans la note : LGPL (libvips), FSL (`@sentry/cli`), EPL (`elkjs`),
    MPL (outils de développement), et `seq-queue`, sans licence déclarée mais MIT dans son fichier.
- Des textes d'instruments tiers sont constatés sous `web/src/lib/questionnaires/` (par exemple `Q_CAN_01`
  QLQ-C30, `Q_SOM_01` PSQI).
- Avis Codex à l'aveugle (`wn-codex-avis.mjs --mode question`) : code 0, état conforme. Il retient « Aucune
  licence, rendue explicite », avec une confiance forte. Deux de ses réserves sont intégrées à la note : le
  bundle navigateur, et la cession de droits comme alternative à la CLA.
- T1 rapide : code 0, 16 étapes vertes. T1 complet : à jouer avant le commit.

## Problèmes ouverts

- La réponse du responsable à `20261114-1825-d` est attendue (date utile : 2026-11-30). Ensuite, un lot de
  pose posera le fichier retenu, avec une section « Contenus tiers », le champ `license` (en gardant
  `private: true`), et la CLA ou la cession si l'option l'exige. Il examinera aussi les mentions à conserver
  dans le bundle.
- Question à porter à l'avocat, hors de ce lot : la publication actuelle des textes d'instruments tiers
  est-elle autorisée par leurs ayants droit ? Huit instruments sont déjà classés « sous licence tierce » au
  dossier de certification.
- Restent en attente, hors de ce lot :
  - le geste du §6 de D-520 (retirer `required_reviewers`), sur accord daté du responsable. L'intégrateur l'a
    demandé et a constaté l'environnement à 16:57 : relecteur toujours présent ;
  - l'amorçage de `WN_CONSTAT_RELEASE_DB` sur #2080, à faire par la file A avant la prochaine migration.

## Prochaine action exacte

1. T1 complet, commit, push, puis PR avec `--body-file`. Lancer `node scripts/wn-attendre-ci.mjs <N>` en
   fond, puis `node scripts/wn-revue-pr-agent.mjs <N>`.
2. Poser `pr` sur la ligne du carnet et relire la boîte D. Déclarer ensuite « prête @<sha> » : une ligne
   `prete` à l'intégrateur et un commentaire de PR.

## Interdits encore actifs

- Aucun fichier `LICENSE`, aucune mention de droits et aucun champ `license` avant la réponse du responsable.
- Ne pas merger depuis la session : l'intégrateur merge (D-373, D-454).
- Ne pas passer `20261114-1825-d` à `repondue` par accord avec Codex : la réponse revient au responsable.
- Si un commit propre est dépassé par `main`, l'arbitrage revient au responsable (D-518 §2).
