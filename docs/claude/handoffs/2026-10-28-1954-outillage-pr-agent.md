# Handoff — 2026-10-28 — Outillage : PR-Agent revoit les PR sur l'API Anthropic

## Branche et état du dépôt

- Branche `outillage-pr-agent`, worktree `.claude/worktrees/act5-mineurs`
  (session concurrente, cycle en `git` et `gh` directs). Partie de
  `origin/main` ad1cbab6 (#1758).
- Workflow CI seul : ni code applicatif, ni migration, ni chemin clinique,
  ni authentification. `.coderabbit.yaml` intact (empreinte inchangée).
  PR ordinaire.
- Dans le même worktree, la PR #1763 (bh, D-392) attend sa revue
  CodeRabbit ; elle est indépendante de celle-ci.

## Objectif

Ajouter une revue automatique des PR par PR-Agent, sur la clé Anthropic du
dépôt. Elle s'ajoute à CodeRabbit, qui ne revoit plus seul : le dépôt a
moins de dix étoiles, et le quota gratuit est épuisé le soir même.

## Décisions prises

Aucune décision D-xxx. Arbitrages du responsable en conversation, le
2026-10-28 :
- image épinglée par empreinte (v0.49.0), jamais `@main` du dépôt tiers ;
- description publiée en commentaire, corps de PR jamais écrasé ;
- modèle Sonnet 5.5, modèle faible et repli Haiku 5.5. La demande citait
  `claude-3-5-sonnet`, retiré depuis le 2025-10-28 ;
- « tous les réglages optimaux » : revue incrémentale au push, fichiers de
  clôture ignorés, consignes de revue reprises des règles non négociables,
  étiquettes coupées, cinq remarques au plus.
- D-290 non amendé : CodeRabbit reste la revue exigée avant le merge. Une
  décision qui ferait de PR-Agent la revue suffisante en P2 a été proposée,
  pas écrite.

## Fichiers modifiés

- `.github/workflows/pr_agent.yml` (nouveau).
- Clôture : `changelog.d/2026-10-28-outillage-pr-agent.md`, ce handoff.

## Validations exécutées

- YAML relu par `js-yaml` : déclencheurs, image, variables d'environnement.
  Les trois listes JSON (`push_commands`, `ignore.glob`, `fallback_models`)
  sont analysées sans erreur.
- T1 `npm run check:rapide` : vert, 17 étapes, 2 sautées.
- Empreinte de `.coderabbit.yaml` relue avant le commit :
  `cbbcf80e2035e7a6ef1dc4c01b5110fb02220636`, inchangée.
- **Non constaté** : aucune exécution réelle de PR-Agent avant cette PR.
  Elle-même est la première exécution (déclencheur `opened`).

## Reprise (2026-10-28, lot « revue de substitution »)

PR reprise, sur demande du responsable, par la session du worktree
`.claude/worktrees/h89-integrateur-c`, qui écrit aussi D-393. `origin/main`
y est fusionnée.
- Premier run : il échouait sur une clé non rattachée à un workspace. Le
  responsable a changé la clé. Run relancé : revue Sonnet publiée, en
  français, avec un bloc caché `pr-agent-review-state:v1` qui nomme
  `last_run.head_sha`. La description, elle, échouait encore sur Haiku 5.5
  (`temperature`).
- Correctifs : `no_temperature_models` pour Haiku ; concurrence séparée pour
  les runs sur commentaire ; garde fork. Ces deux derniers correctifs
  viennent des deux remarques de PR-Agent.
- En-tête aligné sur D-393 : CodeRabbit sur la tête, PR-Agent en
  remplacement ; fichier gardé par sa file.
- Elle se merge après la PR de D-393, par sa file.

## Problèmes ouverts

- À constater sur cette PR : le job tourne, le rapport est en français, la
  description arrive en commentaire. Une erreur 401 voudrait dire secret
  absent ou mal nommé.
- À constater au premier push : `/review -i` fait bien une revue
  incrémentale avec v0.49.0.
- Coût réel par PR : à lire dans la console Anthropic. L'estimation
  (environ 0,30 $) n'a pas été mesurée. Plafond de dépense mensuel : geste du
  responsable.
- La décision qui amende D-290 est D-393, écrite dans une PR à part. Cette
  PR se merge après elle.
- À constater au push de la reprise : `/review -i` relit-il bien la nouvelle
  tête, et le bloc d'état nomme-t-il ce sha ?

## Prochaine action exacte

1. Lire le run `-i` du push de reprise et le bloc d'état.
2. `/security-review`, puis `wn-reviewer`, mission « le workflow
   affaiblit-il la revue ? » (D-393, P1).
3. CI par `node scripts/wn-attendre-ci.mjs <N>` en fond ; revue de bot sur
   la tête, selon D-393 une fois mergée, et un verdict par remarque.
4. Après le merge de D-393 : étape 7 bis de `wn-merge`, sonde
   `node scripts/wn-sonde-release-db.mjs <N>` à 0, puis merge
   `--squash --delete-branch --match-head-commit`.

## Interdits encore actifs

- Aucun merge avant celui de D-393, ni sans revue de bot sur la tête ni
  sonde release-db à 0 ; jamais d'auto-merge, jamais par l'intégrateur.
- Ne pas modifier `.coderabbit.yaml` dans ce lot.
- Aucune clé en dur : le secret vit dans GitHub Actions seulement.
- Dépôt public : aucun lien d'artefact, aucune identité réelle.
