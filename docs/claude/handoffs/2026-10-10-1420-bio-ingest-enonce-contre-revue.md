# Handoff — BIO-INGEST : énoncés de la contre-revue adverse de campagne

## Branche et état Git

`docs/bio-ingest-contre-revue-codex`, worktree `../Wellneuro-app-wt-bio-contre-revue`,
partie de `origin/main` (`b88719ff`). Doc seule. Une session concurrente
avait basculé la copie principale sur `main` en cours de travail : les fichiers
ont été déplacés ici, et la copie principale rendue propre.

## Objectif

Verser AVANT le lot de clôture, et avant d'être jouée, la contre-revue adverse
de campagne : affirmations à réfuter + mutations des bancs.

## Décisions prises

- Deux énoncés, deux passes indépendantes (leçon D-251 : la passe sur lecture
  n'avait joué aucune mutation). 21 affirmations (A trois écrivains de
  `resultats_biologiques`, B document, C portail, D données/droit) ; 18 lignes de mutations.
- Cible `main` ≥ `e78a9c6d` ; code de campagne inchangé depuis `2eb11f82`.
- Trois lignes signalées d'avance comme probablement sans banc qui morde :
  M16 (journaux hors `import/` : `journaux.guard` ne couvre ni la route portail, ni le cron, ni le bilan),
  M17 (`effacement.test.ts` ne nomme aucune table d'import), M18 (route des
  décisions sans `route.test.ts`).
- Piste adverse C2 : le dossier clos n'est jugé qu'avant le verrou du dépôt
  (`transmission.ts`) — non re-jugé sous lui.
- Pas d'entrée SESSION_LOG (conflit avec #1382 ; sur demande seulement).

## Fichiers modifiés

- `docs/claude/campagnes/2026-09-30-bio-ingest/PROMPT_CONTRE_REVUE_CODEX_2026-10-10.md` (neuf)
- `docs/claude/campagnes/2026-09-30-bio-ingest/PROMPT_CONTRE_REVUE_CODEX_MUTATIONS_2026-10-10.md` (neuf)
- `docs/claude/campagnes/2026-09-30-bio-ingest/CAMPAGNE.md` (pointeur)
- `changelog.d/2026-10-10-bio-ingest-enonce-contre-revue.md`

## Validations exécutées

- `npm run check:rapide` vert ; `check_no_secrets.sh --staged` vert.
- Chemins, migrations et contrats SQL cités vérifiés par script.
- Drapeaux `WN_BIO_*_ENABLED` constatés à `true` en production (`scalingo env`).

## Problèmes ouverts

- Écarts fiche/code relevés : `bio-extraction-v2` (fiche LOT-07) vs `v3`
  (code) ; décompte du résolveur (98 / 101 entrées) — à solder au lot de clôture.
- Constat d'usage par conteneur (Done de campagne) non fait.

## Prochaine action exacte

La passe sur lecture est jouée et traitée (`REVUE_CODEX_ADVERSE_2026-10-10.md` :
C2 confirmée, B2 et C3 écartées avec motif). Ensuite : le correctif C2 en PR
séparée (relecture `FOR SHARE` du dossier sous le verrou du dépôt, avec un
banc qui rougit sans elle). Puis le responsable lance la passe des mutations
(`REVUE_CODEX_MUTATIONS_2026-10-10.md`), et vient le lot de clôture.

## Interdits encore actifs

- Ne jamais lancer Codex soi-même.
- Pas de clôture de campagne avant le correctif C2 et la passe des mutations.
- Pas de clôture de campagne tant que la contre-revue n'est pas traitée.
