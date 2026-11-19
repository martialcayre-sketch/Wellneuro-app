# Handoff — 2026-11-19 — neuf notices seules du besoin 10, lot de la file B

## Branche et état Git

- Branche `docs/besoin-10-neuf-notices`, créée sur `origin/main` 25350346 (D-518 : la branche précédente avait été squashée par #2270). Worktree `.claude/worktrees/agent-a81c34a8d1130b0ce`.
- Session concurrente (file B), mission « 12 besoins, séquentiel ». `git` et `gh` en direct. PR ouvertes relevées au moment d'écrire : #2272, #2269, #2178 ; aucune ne touche le registre des sources ni le journal H15.

## Objectif

Inscrire au registre des sources, en notice bibliographique seule, les neuf envois du besoin 10 dont la licence n'admet pas le texte, sur l'arbitrage du responsable du 2026-11-19, et en laisser la trace au dépôt : registre, compteurs du `README` du corpus, journal H15, changelog. Aucune ingestion, aucun étiquetage.

## Décisions prises

- Neuf envois en notice seule, `WN-SRC-0721` à `0729` : cinq textes CC BY-NC-ND, trois copies libres sans licence déclarée, une recommandation dont les conditions d'usage soumettent l'IA à accord et redevance. Même forme que `WN-SRC-0720` : aucun passage, aucun claim.
- Références vérifiées avant d'être écrites : identifiants résolus par PubMed et Crossref, titre, auteurs, année et revue concordants ; page des conditions d'usage de la recommandation relue. Un titre plus complet que le rapport a été corrigé sur PubMed (jamais complété de mémoire).
- Rang du journal H15 : `11` (`10` est le plus grand sur `origin/main`). Rang `WN-SRC` : `0721` à `0729` (le plus grand au registre et sur les PR ouvertes était `0720`).
- Hors dépôt : section « Étape 4 » du dossier privé du besoin 10 mise à jour, avec la liste des huit textes non libres que le responsable récupère à la main.

## Fichiers modifiés

- `docs/claude/corpus/source_registry.json` (neuf notices, 701 au total) et `docs/claude/corpus/README.md` (compteurs et plage) ; `docs/claude/plan-journal/H15/2026-11-19-11-notices-seules-besoin-10.md` ; `changelog.d/2026-11-19-besoin-10-neuf-notices-seules.md` ; ce handoff.

## Validations exécutées

- Registre : relu avant et après (aller-retour du JSON identique, 692 puis 701 entrées, identifiants consécutifs, seuls neuf objets ajoutés).
- Documentation seule : anti-secrets et contrôles du plan-journal (résultats dans la PR). Vitest non joué (worktree sans `npm ci`). Pas de T2.

## Problèmes ouverts

- Huit textes non libres du besoin 10 : le responsable récupère les PDF à la main ; chacun entrera ensuite comme source avec sa licence relue.
- Besoin 12 : rapport de recherche approfondie vérifié au dossier privé, envois à accorder un à un ; aucune ingestion sans accord.
- Claims du besoin 10 déjà ingérés à valider par le responsable, puis étiquetage selon `D-325`.

## Prochaine action exacte

1. CI de la tête (`node scripts/wn-attendre-ci.mjs <N>`, seul `0` vaut), revue de PR-Agent sur le sha de tête (`node scripts/wn-revue-pr-agent.mjs <N>`), boîte B relue, « prête @<sha> ».
2. Attendre l'accord du responsable pour les envois du besoin 12 et les PDF du besoin 10.

## Interdits encore actifs

- Aucun texte de claim, aucune valeur, aucune borne, aucun seuil, aucun nom de rubrique au dépôt (`D-251` §4, `D-325` §5).
- Aucune règle, aucun seuil, aucune dose ni aucun poids inventés ; aucun code clinique avant signature et décision (J3-12f).
- Aucune ingestion hors de l'accord donné ; aucun étiquetage dans ce lot ; la signature ne se délègue jamais.
- Aucune migration dans ce lot ; production lue seulement par `scalingo run -d`, écrite seulement par la route d'ingestion accordée. L'URL des dossiers privés reste hors dépôt.
