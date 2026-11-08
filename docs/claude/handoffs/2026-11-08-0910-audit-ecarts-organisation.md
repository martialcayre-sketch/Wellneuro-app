# Handoff — 2026-11-08 — Audit des écarts restants avec l'organisation praticien

## Branche et état Git

`docs/audit-ecarts-organisation`, worktree `.claude/worktrees/audit-ecarts-organisation`, partie de `origin/main@88abb491` (#1924 mergée). Le `main` local n'est pas touché.

## Objectif

Trancher les cinq écarts laissés en suspens par [[D-460]] : case « Plus », tiroir tablette, repli du rail, rail sur le questionnaire en cours, menu « Profil ».

## Décisions prises

- Audit seul : aucun code, aucun drapeau, aucun écran constaté. Les mesures reprennent les constats de L3 à L5 et du 2026-11-07. Les projections sont marquées « calcul ».
- La relecture passe par la recherche gardée d'ui-ux-pro-max ([[D-456]]). Comme la base répond peu, les règles de navigation de `references/quick-reference.md` §9 sont citées.
- Recommandation : reprendre le seul tiroir à gauche (Q62 a) et garder le reste (Q61, Q63, Q64, Q65 a).

## Fichiers modifiés

- `docs/claude/propositions/2026-11-01-portail-rails-et-menus/README.md` : chapitre 21.
- `docs/claude/plan-journal/H83/2026-11-08-01-audit-ecarts-organisation.md` et ce handoff.

## Validations exécutées

- Relecture des sources citées sur `origin/main@88abb491` et sur la branche de #1925.
- Rien sous `web/`.

## Problèmes ouverts

- Q61 à Q65 : les cinq recommandations ont été retenues par le responsable le 2026-11-08 (« Je les retiens »).
- Q62 (a) s'écrit dans #1925 : amendement de [[D-460]] §4 et option de côté dans `PanneauSuperpose`.
- #1925 est à recaler sur `main` depuis le merge de #1924.

## Prochaine action exacte

L'intégrateur prend cette PR, déclarée prête. Dans #1925 : la recaler sur `main` et y porter la réponse à Q62.

## Interdits encore actifs

- Aucun drapeau posé ou retiré sans demande explicite du responsable.
- Pas d'identifiant de dossier ni d'heure de constat dans un fichier durable.
- Jamais le `main` local.
