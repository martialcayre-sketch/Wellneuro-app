# Handoff — 2026-11-03 — File D, séance de gestes n° 6 : d57 (D-431)

## Branche et état Git

`docs/file-d-d57-percentile-mfi20`, worktree `.claude/worktrees/file-d1-suite`,
créée depuis `origin/main` (8ae6c496). Première PR de la journée pour la
file D. Aucune autre PR de la file D n'est ouverte.

## Objectif

Corriger le « 25e percentile » du MFI-20, qui est en réalité le 75e, et
consigner la voie transitoire de son entrée dans l'orientation (d57).

## Décisions prises

- Six arbitrages du responsable du 2026-11-03, pris sur des options
  préparées par un assistant externe. Cet assistant n'est source d'aucune
  valeur ; ses citations ont été recoupées avec le dépôt à fbd74707.
  - d57 : correction maintenant ; MFI-20 en lecture du praticien, à titre
    transitoire → D-431 (cette PR).
  - d59 : le déclencheur reprend la fenêtre que D-430 donne à son
    instrument ; un signal expiré est « non évalué » → D-xxx à écrire.
  - d60 : consigne de la HAD alignée sur la semaine écoulée, historique
    gardé → D-xxx à écrire.
  - d58 : DC-29 compte des familles de mesure, 1 / 2 / 3 / ≥ 4 → D-xxx à
    écrire ; le registre des familles est à rédiger pour validation.
  - d56 : besoin 5, groupe `repos`, Epworth et MFI-20 GEN, poids 1 chacun,
    niveau A, normalisation (20 − GEN) / 16 → D-xxx à écrire.
- Notes déjà stockées : la migration a d'abord été choisie, puis abandonnée
  au vu de deux faits : une seule passation concernée, et l'interdit LOT-00.

## Fichiers modifiés

- `docs/DECISIONS.md` : D-431, réservée par `wn-reserver-decision.mjs`.
- `web/src/lib/questionnaires/sommeil.ts` : note du scoring de `Q_SOM_07`.
- `web/src/lib/doctrine/seuilsCatalogue.instantane.json` : nouvelle étape de
  `Q_SOM_07` (D-431).
- `docs/claude/corpus/source_registry.json` : `WN-SRC-0625` à `0627` ;
  `README.md` du corpus (602 notices, 95 externes).
- Neufs : `changelog.d/2026-11-03-d431-mfi20-percentile.md` ; ce handoff.

## Validations exécutées

- Singer 2011, texte intégral lu (Europe PMC, XML) : table 1, note de table,
  discussion. Schwarz 2003 : résumé PubMed seul. Westenberger 2022 : texte
  intégral, supplément non lu.
- Code lu en principal :
  - `orientationService.ts:531` (âge transmis, sexe absent) ;
  - `seuilsCatalogue.guard.test.ts:171` (seul `scoring` est haché) ;
  - `FichePatientPanel.tsx:1603` (affiche la note stockée) ;
  - `schema.prisma` l. 380 (LOT-00).
- Production, lecture seule par conteneur (one-off-2356) : un compte
  agrégé des passations du MFI-20 et de celles qui portent l'ancienne note.
- Aucune PR ouverte ne touchait le registre avant la prise de `0625`.
- T1 (`check:rapide`) et `npm run check` verts.

## Problèmes ouverts

- Une passation de production garde la note « 25e percentile » (D-431 §4).
- d57 reste ouverte pour D-425 §4 b : il manque un claim de cible, un seuil
  validé et le sexe au contrat de l'orientation.
- d56, d58, d59, d60 : arbitrés, décisions à rédiger. d58 demande un
  registre des familles, à faire valider. d60 demande le libellé français
  exact.

## Prochaine action exacte

PR de cette branche, CI en fond, revue prouvée sur la tête, puis « prête
@<sha> ». Ensuite, d59 ou d60 (décisions courtes), sur une branche neuve
depuis origin/main.

## Interdits encore actifs

- Aucune modification sous `web/src/lib/clinical/` ni de
  `indicationsBiologieV1.ts` ; ni migration, ni `schema.prisma` ; aucune
  écriture en production.
- Aucune valeur, aucun seuil, aucune source proposés par la session (DC-20).
- Aucune D-xxx sans arbitrage du responsable.
- Un assistant externe n'est jamais source d'une valeur.
- Aucun UPDATE du contenu d'une passation (LOT-00).
