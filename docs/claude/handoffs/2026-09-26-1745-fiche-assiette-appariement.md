# Handoff — 2026-09-26 — Fiche d'assiette, lot 2 : appariement et contrôles

## 1. Branche et état Git

`wn-fiche-assiette-appariement`, worktree
`.claude/worktrees/deploy-anti-recul-lot1`, partie de `origin/main` à
`e58efa00` (#1231, D-251).

## 2. Objectif

Lot 2 sur 11 de `D-251` : les modules purs sur lesquels reposeront l'ingestion,
la validation et le service des fiches. Aucun écran, aucune route, aucune
migration.

## 3. Décisions prises

- Appariement écrit en clair, paire par paire (`FICHE_MY_PAR_ASSIETTE`), plutôt
  que calculé (`sourceProtocole + 12`) : une renumérotation du registre doit
  rougir au banc, pas se suivre en silence. Hors catalogue, patron
  `replisAssietteV1` : `plates.ts` inchangé.
- Contrôles (`controlerFiche`) : nombre + ce qu'il compte, provenance de chaque
  bloc, verbatim retrouvé dans la source, claims de la fiche seuls dans les
  blocs (`D-216`), précautions couvrant les `claimsSecurite` des lignes publiées
  (`D-251` §6), lexique proscrit d'une surface patient.
- Nommé dans le module : ce que les contrôles ne voient pas (nombre en lettres,
  déplacement de sens, population élargie). La relecture intégrale le garde.

## 4. Fichiers modifiés

`web/src/lib/fiches-assiette/` : `appariement.ts`, `types.ts`,
`invariants.ts`, `securite.ts` (serveur seulement), `appariement.guard.test.ts`,
`invariants.test.ts` · `changelog.d/2026-09-26-fiche-assiette-appariement.md` ·
`docs/claude/SESSION_LOG.md` · ce handoff.

## 5. Validations exécutées

- Bancs du lot : 20/20. Deux mutations jouées : l'unité ignorée fait rougir 2
  cas, la garde des claims de la fiche retirée en fait rougir 1.
- Espaces invisibles littéraux dans une regex remplacés par leurs échappements.
- Premier T2 rouge sur le banc de doctrine des seuils littéraux (`D-105`) :
  `propre.length > 3` dans la normalisation des pluriels. C'est un chiffre
  technique, désormais nommé (`LONGUEUR_MIN_MOT_AU_PLURIEL`, `DC-20`), et non
  une exemption.
- T1 vert ; T2 vert (600 fichiers Vitest, 10 067 tests ; 213 E2E).

## 6. Problèmes ouverts

- À proposer au responsable (fichier `.claude`, sa demande explicite requise) :
  ranger `invariants.ts` parmi les chemins cliniques du crochet d'écriture.
- Le contrôle des nombres ne lit pas les nombres écrits en lettres.

## 7. Prochaine action exacte

Lot 3 : migration M1 (`fiches_assiette_versions`, `fiches_assiette_actes`),
seule dans sa PR, puis T3, release-db approuvée par le responsable et constat
par conteneur.

## 8. Interdits encore actifs

- Aucun texte de Fiche MY ni brouillon au dépôt, dans une PR ou un log.
- « Un merge à la fois » (D-248).
