# Handoff — 2026-11-13 — besoin 1 : décision clinique du guide (D-516, H15), lot de la file B

## Branche et état Git

- La branche `docs/besoin1-decision-guide` vit dans le worktree `.claude/worktrees/b-bp17-cadre`. Elle part de `origin/main` à 1e80d135 (#2073), sans fusion ni rebase.
- La PR précédente du dossier, #2075, est mergée (146a3561).
- Session concurrente de la file B : `git` et `gh` en direct, sans `/wn-*`.

## Objectif

Rédiger la décision clinique qui porte la section du besoin 1 du guide (`D-312` §3), sur les positions signées, et fixer ce que J3-12f appliquera au besoin 1.

## Décisions prises

- **`D-516` acceptée** : numéro réservé à la rédaction, texte rédigé par l'assistant, validé tel quel par le responsable. Le texte complet est dans un onglet du dossier privé du besoin 1 ; au dépôt, la forme opaque.
- **Le guide se signe section par section** (question à options, recommandée) : J3-12f applique les sections signées à sa date. Écarté : attendre le guide entier.
- **Forme courte de l'enquête : besoin 1 non évalué** (question à options, recommandée). Écarté : garder son total actuel.
- **Parts 60/20/20** : non tranchées, de la main du responsable (`D-312` §3, `DC-21`) ; l'assistant n'en propose pas le contenu.

## Fichiers modifiés

- `docs/decisions/D-516.md`.
- `docs/claude/GUIDE_12_BESOINS_NEURONUTRITION.md` : section du besoin 1, réécrite en forme opaque. Le paragraphe d'introduction du responsable est gardé.
- `docs/claude/PLAN_WELLNEURO.md` : deux lignes J3-12f, préalable « w » précisé, renvoi à `D-516`.
- `docs/claude/plan-journal/H15/2026-11-13-04-besoin-1-decision-guide.md` ; `changelog.d/2026-11-13-besoin-1-decision-guide.md` ; ce handoff.
- Hors dépôt : l'onglet du projet au dossier privé ; la mémoire de session.

## Validations exécutées

- Drapeau de forme de l'enquête relu en production (variable d'environnement seule) : allumé.
- Recherche d'opacité sur la décision et la section du guide : aucune valeur, aucun analyte, aucune rubrique, aucun texte de claim.
- Bancs du journal, anti-secrets et T1 complet : résultats donnés dans la PR.

## Problèmes ouverts

- Les parts 60/20/20 restent à motiver ou à redéfinir avant J3-12f.
- Les droits de trois sources, les usages de population « non évalués » et la surveillance restent ouverts au dossier.

## Prochaine action exacte

1. CI de la tête en tâche de fond (`wn-attendre-ci.mjs`) ; seul `0` vaut.
2. Revue PR-Agent prouvée, sinon `wn-reviewer` (`D-448`) ; un verdict par remarque.
3. Relire la boîte B, puis déclarer « prête @<sha> » ; l'intégrateur merge.
4. Ensuite : le motif des parts 60/20/20 (responsable), puis le cadrage de J3-12f.

## Interdits encore actifs

- Ni texte de claim, ni valeur, ni rubricage au dépôt (`D-251` §4, `D-325` §5).
- Aucune règle, aucun seuil, aucun poids ni aucune borne inventés ; aucun code clinique avant J3-12f.
- Aucune signature par l'assistant (`DC-16`).
- Aucune migration. Pas de `prisma format`. L'URL du dossier privé reste hors dépôt.
