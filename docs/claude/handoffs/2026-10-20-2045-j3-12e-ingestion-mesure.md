# Handoff — J3-12e : sources de mesure des besoins 6 à 12, ingérées

## Branche et état Git

`lot/j3-12e-ingestion-mesure` (worktree `j3-12e-ingestion`), à jour d'origin/main (f8541022, avance rapide). Sans migration ni `schema.prisma`. PR du lot à merger dans cette session.

## Objectif

Fiche H15 du plan, décision 6 du 2026-10-18 : recenser les sources de mesure en accès libre des besoins 6 à 12, dire ce qui existe déjà au registre et au corpus, ingérer en base ce qui manque. Chaque envoi doit être approuvé par le responsable, un paquet à la fois.

## Décisions prises

- Recensement : aucune source primaire n'était au corpus de production. Le registre ne portait que `Q_STR_02` et `Q_NEU_11`, sans ligne de mesure. Trois instruments (solitude, sens de la vie, respiration) et un quatrième (conscience corporelle) n'ont pas d'entrée `Q_` : aucune ligne de mesure n'est possible pour eux.
- Six paquets, chacun présenté puis approuvé séparément par le responsable, envoyés en base et constatés par lecture conteneur. Ils portent les lots `LOT_030` à `LOT_035` (2026-10-20) et les notices `WN-SRC-0540` à `0554` : 88 passages et 104 claims, sans clé de lien. Ceux du besoin 9 sont signés par le responsable ; les 85 autres sont en attente.
- Collision d'identifiants avec la session « dossier zinc » (`0519`-`0524`, `LOT_021`) : renumérotation vers `0540`+ approuvée par le responsable. La plage `0519`-`0539` reste à l'autre session.
- Chaque paquet a reçu une contre-revue adverse (wn-reviewer) avant d'être présenté.
- `measurement_evidence.json` reçoit quatre lignes, toutes `inconnu`. Le compte épinglé du banc passe de 3 à 7, et le document de gouvernance suit.

## Fichiers modifiés

`docs/claude/corpus/source_registry.json` (+15 notices), `docs/claude/corpus/measurement_evidence.json` (+4 lignes), `docs/claude/corpus/README.md`, `scripts/lib/verifier_registre_instruments.test.mjs` (compte épinglé), `docs/gouvernance-questionnaires-scoring.md`, `changelog.d/2026-10-20-j3-12e-sources-mesure.md`, `docs/claude/SESSION_LOG.md`, ce handoff.

## Validations exécutées

- T1 rapide et T1 complet verts (519 tests).
- T2 non joué : aucun code UI ni API touché.
- État en base constaté par conteneur après chaque envoi : comptes par lot, statuts, aucune clé `besoins`/`rubrique`.

## Problèmes ouverts

- Deux articles de validation de la version française d'une échelle restent derrière la protection anti-robot de leur éditeur : le responsable doit fournir les PDF.
- Une étude de Rasch de 2019 sur la respiration dysfonctionnelle n'est pas au paquet : le fichier reçu sous ce nom était une revue COSMIN de 2015, ingérée comme telle.
- Message à la session « Dossiers de preuves » sur la plage d'identifiants : retenu, non délivré.
- Droits : onze notices restent `to_verify` (éditeur, CC BY-NC, manuscrit soumis, pages d'auteurs).

## Prochaine action exacte

Après le merge et le déploiement constaté : passer la ligne J3-12e de la page de suivi de la file A à « fait », puis mettre à jour la fiche H15 du plan par une PR de doc. J3-12f (changement de sources) attend `w` signé et des sources fermées.

## Interdits encore actifs

- `NIVEAU_PREUVE_PAR_SOURCE`, `BESOIN_SOURCES`, `evidence.ts`, le snapshot clinique et la version du score sont intouchés : cela relève de J3-12f.
- Aucun envoi au registre ou au corpus sans approbation préalable du paquet.
- Aucune migration ni `schema.prisma`.
- Production lue par conteneur seulement ; forme opaque dans le dépôt public (aucun item, aucun texte clinique).
