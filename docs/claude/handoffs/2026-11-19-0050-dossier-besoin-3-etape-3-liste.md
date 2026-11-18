# Handoff — 2026-11-19 — dossier du besoin 3, étape 3 : liste des cibles de recherche (D-312, H15), lot de la file B

## Branche et état Git

- Branche `docs/besoin3-etape3-liste`, créée sur `origin/main` 4e90a1f98. Worktree `.claude/worktrees/agent-a81c34a8d1130b0ce`.
- Session concurrente (file B), mission « 12 besoins, séquentiel ». `git` et `gh` en direct.

## Objectif

Consigner les réponses du responsable à M1 à M5 du besoin 3 et ouvrir l'étape 3 par sa première livraison : la liste des pièces et des publications à chercher, au dossier privé, soumise au responsable. Documentation seule.

## Décisions prises

- Réponses : M1, M2, M3 en A ; M4 en A contre l'avis de Codex ; M5 en A contre l'avis de Codex. Exécuté sans re-question.
- La première livraison de l'étape 3 est une liste. Les références ont été vérifiées par recherche sur le web (existence, titre, identifiant) mais pas lues ; leur choix vient de la mémoire de l'assistant et le dit. Aucune ingestion sans accord pour chaque envoi.
- Rang du journal H15 : `2026-11-19-01`. Aucun nom de source dans le dépôt (forme opaque).

## Fichiers modifiés

- `docs/claude/plan-journal/H15/2026-11-19-01-dossier-besoin-3-etape-3-liste.md` (nouveau) ; `changelog.d/2026-11-19-dossier-besoin-3-etape-3-liste.md` ; ce handoff.
- Hors dépôt : dossier privé du besoin 3 (réponses et liste), lot du registre, bloc-notes de la session (`b3/`).

## Validations exécutées

- Recherche web de neuf références (existence et identifiants vérifiés sur les résultats ; contenu non lu).
- Contrôles du dépôt de la PR : résultats donnés dans la PR ; pas de T2 (documentation seule).

## Problèmes ouverts

- Le responsable doit dire, pour chaque ligne de la liste, ce qui est à chercher, à remplacer ou à abandonner, puis fournir les textes un envoi à la fois.
- Besoin 9 : la PR de la décision `D-541` est en brouillon ; ses corrections d'acceptation sont préparées mais non appliquées (la branche, non fusionnée avec `origin/main`, est bloquée par le garde de fraîcheur, `D-518`) : arbitrage demandé.

## Prochaine action exacte

1. CI (`wn-attendre-ci.mjs`, seul `0` vaut), revue sur le sha de tête, boîte B relue, « prête @<sha> ».
2. S'arrêter à l'accord du responsable sur la liste.

## Interdits encore actifs

- Aucun texte de claim, aucune valeur, aucune borne, aucun seuil, aucun nom de rubrique ni de source au dépôt (`D-251` §4, `D-325` §5).
- Aucune règle, aucun seuil, aucune dose ni aucun poids inventés. Aucun code clinique avant signature et décision.
- Aucune ingestion sans accord pour chaque envoi ; la signature ne se délègue pas.
- Aucune migration ; pas de `prisma format`. Production lue seulement par `scalingo run -d`. L'URL des dossiers privés reste hors dépôt.
