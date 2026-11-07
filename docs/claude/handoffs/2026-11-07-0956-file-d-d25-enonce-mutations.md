# Handoff — 2026-11-07 — File D, d25 : énoncé de la reprise des mutations M1 à M11 et M15 (BIO-INGEST), passe Codex attendue

## Branche et état du dépôt

- Branche `docs/file-d-d25-mutations`, créée depuis `origin/main` à `4ecad8e1` (#1901).
- Worktree `.claude/worktrees/file-d1-suite` : session concurrente, cycle en `git`/`gh` direct. La branche `fix/file-d-purges-independantes` de ce worktree est close (#1897 mergée).
- PR de documentation seule : un énoncé neuf, une ligne du plan et ce handoff. Ni code, ni `schema.prisma`, ni D-xxx, ni fragment `changelog.d/` (la levée de D/25 n'a pas changé).
- **Pas de release-db attendue** : aucun chemin déclencheur touché.
- Essai `D-373` : la PR est déclarée « prête @<sha> » et c'est l'intégrateur qui la merge.

## Objectif

Remettre au responsable, prêt à coller dans Codex, l'énoncé de la passe des mutations jamais jouées (M1 à M11 et M15), requalifiées sur le code actuel. Levée de D/25 : « passe Codex manuelle du responsable, résultats versés ».

## Décisions prises

- Requalification en lecture seule sur `4ecad8e1` : deux agents `Explore`, puis vérification en principal des points clés (versions en vigueur des triggers, appelants de la relance, constantes de la file, lignes citées). Aucune mutation n'a été jouée.
  - **Inchangées** : M1, M2, M4, M6.
  - **Cible inchangée, bancs ajoutés depuis** : M9 (commentaires du laboratoire), M10 (`portail/documents`, `enregistrerMasquage`), M15 (trigger de ligne en vigueur).
  - **Déplacées** :
    - M3 : le trigger de ligne est réécrit en dernier par `20261010220000_bio_ingest_commentaires_laboratoire_v1` ;
    - M8 : D-451 et les triggers du masquage ;
    - M11 : la relance passe par la file (`demanderExtraction`, puis la réclamation du worker), et `lancerExtraction()` n'a plus d'appelant de production.
  - **Cas propres** : M5 (concordance assouplie par D-356 §3-§4) et M7 (la file réserve un travail 6 min, contre 5 min de péremption).
- Arbitrages du responsable du 2026-11-07, sur questions à options :
  - Q1 : la passe est jouée par Codex, lancée par le responsable, comme le prévoit la levée écrite. Pas de D-xxx.
  - Q2a : M3, M8 et M11 sont reformulées sur le code actuel. M9, M10 et M15 reçoivent leurs bancs neufs.
  - Q2b : M5 est reformulée selon D-356.
  - Q2c : M7 garde son invariant d'origine. La réservation de 6 min est signalée comme un « fait complémentaire à examiner », sans relation normative (texte du responsable, repris dans l'énoncé).
  - Q3 : cible épinglée `4ecad8e10cd8c744fbc6cdfa6a1de6c040bd9a01`.

## Fichiers modifiés

- `docs/claude/campagnes/2026-09-30-bio-ingest/PROMPT_CONTRE_REVUE_CODEX_MUTATIONS_2026-11-07.md` (neuf).
- `docs/claude/PLAN_WELLNEURO.md` : ligne D/25 (§ D.4), qui passe à « énoncé prêt, passe attendue ».
- Ce handoff.
- Hors dépôt : ligne d25 de la page « Suivi de la file D », passée à « énoncé prêt, passe attendue ».

## Validations exécutées

- `npm --prefix web run check` (T1 complet) : code 0, 824 tests passés, 0 en échec, anti-secrets OK.
- Les `fichier:ligne` cités par l'énoncé ont été relus sur `4ecad8e1` (grep ou lecture ciblée) : `decisions.ts`, `valeurLue.ts`, les deux routes de résultats, `extraction.ts`, `verrou.ts`, `fileExtraction.ts`, `purge.ts`, `ecart.ts`, `lancerExtraction.ts`, `depot.ts`, ainsi que les définitions de triggers dans les migrations.
- CI et revue : voir la PR.

## Problèmes ouverts

- La passe elle-même : geste du responsable (Codex). d25 ne se ferme qu'une fois les résultats versés.
- Les numéros de ligne valent pour `4ecad8e1` seulement : une passe jouée plus tard reste épinglée sur ce commit.
- Le fait de M7 (réservation de 6 min contre péremption de 5 min) n'est pas jugé. En faire un invariant demanderait une décision.

## Prochaine action exacte

1. CI : `node scripts/wn-attendre-ci.mjs <N>` (code 0 seul). Revue : CodeRabbit, sinon PR-Agent (`node scripts/wn-revue-pr-agent.mjs <N>`), sinon `wn-reviewer` (D-448). Un verdict par remarque, puis « prête @<sha> ».
2. Le responsable colle l'énoncé dans Codex. Son verdict se verse comme une suite datée de `REVUE_CODEX_MUTATIONS_2026-10-10.md` (sans réécrire le §1), ou dans un fichier neuf à côté. Chaque `SURVIT` devient un lot de banc, proposé sans être écrit. d25 se ferme quand les résultats sont versés.

## Interdits encore actifs

- Aucune mutation dans le worktree du lot. Codex n'est jamais invoqué par l'assistant.
- Rien sous `web/src/lib/clinical/` ni dans `indicationsBiologieV1.ts`. Ni migration, ni `schema.prisma`. Aucune écriture en production.
- Aucune valeur, aucun seuil, aucun délai proposés par la session. Aucune D-xxx sans arbitrage du responsable.
- Pas de merge par cette session (essai D-373). Pas de pull, de merge ni de rebase sans arbitrage.
- Ne reposer ni Q1 à Q3 de d25, ni les arbitrages déjà rendus sur d37, d58 et d61.
