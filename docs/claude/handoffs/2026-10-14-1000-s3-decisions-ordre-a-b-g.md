# Handoff — S-3 : décisions d'ordre a, b, g (D-287, D-288, D-289)

## Branche et état Git

- Branche `docs/s3-decisions-ordre-a-b-g`, partie d'`origin/main` a6b4153c
  (merge de #1429). PR S-3 #1430.

## Objectif

Écrire les lettres a, b, g du plan unique (fiches F01, H05, F04, rang 0) dans
une seule PR S-3 ; elles lèvent la porte 2 une fois acceptées et mergées.

## Décisions prises

- Trois décisions distinctes, une par lettre (comme ci = D-286) : D-287 (a),
  D-288 (b), D-289 (g) : rédigées sur les arbitrages acquis (séances des 2026-10-11, 12, 13, 14), acceptées telles quelles par le
  responsable le 2026-10-14 (statut « accepté »).
- a : les textes que cite F01 sont déjà réalignés par #1420 ; aucune ligne de
  l'état du cycle ni des campagnes n'est touchée.
- b : terme du second compte daté au 2027-10-11 (un an après la séance).
- g : procédure acceptée (base temporaire HDS, jamais production ni poste,
  contrôles en agrégats, suppression le jour même) ; commandes au RUNBOOK au
  lot G-7.
- Plan non retouché (patron de D-286) : porte 2 et registre des lettres à
  mettre à jour à la prochaine version du plan.

## Fichiers modifiés

- `docs/DECISIONS.md`, `changelog.d/2026-10-14-s3-decisions-ordre-a-b-g.md`,
  `docs/claude/SESSION_LOG.md`, ce fragment.

## Validations exécutées

- T1 rapide vert (après `prisma generate` : client local antérieur à #1426).
- T1 complet avant commit (voir PR).

## Problèmes ouverts

- Aucun : textes acceptés tels quels, terme 2027-10-11 et procédure de g
  compris.

## Prochaine action exacte

PR sortie du brouillon : CI code 0, commentaires en ligne
lus, merge squash, déploiement constaté ; puis BP-07 (file B).

## Interdits encore actifs

- Jamais d'auto-merge ; un merge à la fois ; release-db humaine.
- Aucune activation patient, aucun second compte, aucune migration ici.
- Aucune identité ni mesure de dossier au dépôt (dépôt public).
