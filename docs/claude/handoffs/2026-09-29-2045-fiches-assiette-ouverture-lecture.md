# Handoff — 2026-09-29 — Fiches d'assiette : l'espace de lecture ouvert en production

## 1. Branche et état Git

`docs/fiches-assiette-ouverture-lecture`, worktree
`.claude/worktrees/deploy-anti-recul-lot1`, partie de `origin/main` à
`712a62bc` (#1249, lot 11). Documentation seule. Un merge à la fois.

## 2. Objectif

Consigner la pose de `WN_FICHES_ASSIETTE_LECTURE` en production, ordonnée par
le responsable le 2026-09-29.

## 3. Décisions prises

Amendement de `D-251` du 2026-09-29 (soir) : ouverture AVANT trois des quatre
conditions du §10 (constat de l'espace, document TRUST sur l'IA, contre-revue
adverse), qui restent à tenir après. Seule condition acquise : les sept fiches
validées. Le code des lots 9 à 11 en service est un préalable, pas une
condition (revue Copilot de #1250).

## 4. Fichiers modifiés

- `docs/FEATURE_FLAGS.md` : la ligne du drapeau de lecture, POSÉ, ordre de
  pose et constat.
- `docs/DECISIONS.md` : l'amendement.
- `web/src/lib/fiches-assiette/drapeau.ts` : commentaire seul.
- Changelog, ce handoff, SESSION_LOG.

## 5. Validations exécutées

- Code en service vérifié avant la pose : `712a62bc`, déploiement `success`.
- `env-get` : variable absente, puis `true` après l'`env-set` (20:40:15 UTC).
- `env-set` n'a pas recréé les conteneurs : `scalingo restart web`, nouveaux
  conteneurs à 20:40:21 UTC, `running`.
- Constat par le comportement : `GET /api/portail/fiches-assiette` anonyme
  rend 401 « unauthenticated » (503 quand fermé).
- Par conteneur, lecture seule : 7 fiches validées sur 7, 0 remise.
- T1 : voir la PR.

## 6. Problèmes ouverts

- **Le constat de l'espace** (liste, page d'une fiche, tâche au fil, accusé,
  e-mail reçu) reste à faire sur `PAT032`, après son prochain clic.
- **Document TRUST sur l'IA** : à rédiger (Claude), valider (responsable),
  verser au dépôt.
- **Contre-revue adverse** : affirmations à préparer (Claude), Codex à lancer
  (responsable).
- **La phase « Actions »** : chantier cadré, à ouvrir après les fiches.

## 7. Prochaine action exacte

Le responsable reclique « Valider pour diffusion » sur `PAT032` ; Claude
constate la remise et la trace de l'e-mail par conteneur, puis le responsable
ouvre le portail du dossier de test pour constater l'espace.

## 8. Interdits encore actifs

- « Un merge à la fois » (D-248).
- Aucun texte de Fiche MY au dépôt, en PR ou au journal.
- Les dossiers de test se lisent par identifiant, jamais par nom.
- Coupe-circuit : retrait d'une fiche par version, ou drapeau refermé
  (`env-unset` puis `restart web`).
