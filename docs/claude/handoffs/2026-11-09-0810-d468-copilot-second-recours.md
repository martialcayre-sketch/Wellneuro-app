# Handoff — 2026-11-09 — D-468 : Copilot en second recours, entre CodeRabbit et PR-Agent, selon son quota

## Branche et état du dépôt

- Branche `claude/festive-lamport-i5wneb`, avancée par `git merge --ff-only` sur `origin/main` à `f7745b0c` (#1943) ; session cloud, cycle en `git`/`gh` direct (les `/wn-*` n'y tournent pas).
- Lot de gouvernance : une décision neuve (D-468), une ligne datée sous D-393 §1, cinq textes de règle, un lecteur en script et son banc, un fragment H93, un fragment `changelog.d/`, ce handoff. Ni migration, ni `schema.prisma`, ni code applicatif.
- **Pas de release-db attendue** : aucun chemin déclencheur.
- Numéro D-468 **non réservé** : `node scripts/wn-reserver-decision.mjs` a rendu « Write access to this GitHub API path is not permitted through this proxy » (le proxy de la session refuse la création des références `refs/tags/reserve/D-NNN`). Le lot a d'abord pris D-466, sans réservation ; #1946 a mergé sa propre D-466 (séance de questions du guichet) le 2026-11-09, et D-467 est réservée et prise sur une autre branche : renuméroté en D-468 après fusion de `origin/main` (D-370 §4). Une décision sans réservation reste permise : relire `origin/main` juste avant le merge, renuméroter si D-468 y est pris.

## Objectif

Demande du responsable du 2026-11-09 : faire intervenir Copilot entre CodeRabbit et PR-Agent, selon son quota, sans revue systématique, seulement quand CodeRabbit est dépassé, et avant PR-Agent.

## Décisions prises

- Trois arbitrages du responsable du 2026-11-09, sur l'option recommandée : quota présumé disponible tant qu'aucun refus « insufficient remaining quota » n'est vu depuis le 1er du mois (UTC), puis essai ; après un push, redemande sur la nouvelle tête, sinon PR-Agent ; revue automatique de Copilot coupée par le responsable (réglage de son compte GitHub, hors dépôt : aucun ruleset du dépôt ne la porte).
- Délai d'attente de la revue de Copilot après la demande : dix minutes, borne de méthode posée par l'assistant, nommée comme telle dans D-468 §1, révisable par le responsable.
- Lecteur `scripts/wn-revue-copilot.mjs` en lecture seule (GET) : il ne demande pas la revue ; la demande reste un geste de la session (`gh pr edit <N> --add-reviewer @copilot`).
- L'intégrateur ne demande pas Copilot : la file le demande avant de déclarer « prête » (D-468, « Ce qu'elle ne décide pas »).

## Fichiers modifiés

- `docs/decisions/D-468.md` (neuf) ; `docs/decisions/D-393.md` (ligne datée sous §1).
- `CLAUDE.md` (§ PR, CI, merge) ; `docs/claude/REGLES_PR_MERGE.md` ; `docs/claude/POLITIQUE_REVUE.md` ; `.claude/rules/pr-revue-et-release-db.md` (règle 1.6) ; `.claude/skills/wn-merge/SKILL.md` (étape 6).
- `scripts/wn-revue-copilot.mjs` et `scripts/wn-revue-copilot.test.mjs` (neufs) ; `web/package.json` (banc ajouté à `bancs-outillage-check`).
- `docs/claude/plan-journal/H93/2026-11-09-01-copilot-second-recours.md` ; `changelog.d/2026-11-09-d466-copilot-second-recours.md`.

## Validations exécutées

- `node --test scripts/wn-revue-copilot.test.mjs` : 10 tests verts.
- Lecteur joué en réel le 2026-11-09 : `--quota` rend 1 (refus pour quota sur #1943 ce matin) ; `1941` rend 1 (refus sur la tête) ; `1838` rend 1 (revue sur une tête précédente seulement).
- Voir la PR pour T1 complet et le banc des décisions.

## Problèmes ouverts

- La forme `gh pr edit <N> --add-reviewer @copilot` n'est pas encore constatée sur ce dépôt (le `POST` REST sur `requested_reviewers` ne l'enregistrait pas en 2026-09, règle 1.6) : constat au premier usage, au journal de H93.
- Le quota de Copilot est épuisé pour novembre d'après le refus du 2026-11-09 sur #1943 : jusqu'au 2026-12-01, la règle mène directement à PR-Agent.
- La réservation de D-468 n'a pas pu être posée (proxy).

## Prochaine action exacte

Le responsable coupe la revue automatique de Copilot dans les réglages Copilot de son compte GitHub ; puis, au premier PR où CodeRabbit est dépassé après le 2026-12-01, la session joue `node scripts/wn-revue-copilot.mjs --quota`, demande Copilot si `0`, et consigne au journal de H93 si `gh pr edit --add-reviewer @copilot` l'enregistre.

## Interdits encore actifs

- Jamais de demande de Copilot avant que CodeRabbit soit dépassé ; jamais deux demandes sur la même tête.
- Un refus de Copilot ou une revue sur une tête précédente ne vaut jamais revue de la tête.
- `pr_agent.yml` et `.coderabbit.yaml` restent gardés par leur file (D-393 §6, D-373 §3) : ce lot n'y touche pas.
