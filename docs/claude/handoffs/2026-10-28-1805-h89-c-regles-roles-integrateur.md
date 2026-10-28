# Handoff — 2026-10-28 — H89, PR (c) : les règles et les rôles décrivent le régime de l'intégrateur (D-373 §2, §3 et §7)

## Branche et état du dépôt

- Branche `outillage/h89-pr-c-regles-roles`, worktree
  `.claude/worktrees/h89-integrateur-c` (session concurrente, cycle en `git`
  et `gh` directs). Partie de `origin/main` e57521c4 (#1757).
- Texte seul : ni code, ni migration, ni chemin clinique, ni
  authentification, ni `.coderabbit.yaml`. PR ordinaire, libération dès le
  merge.

## Objectif

Livrer la PR (c) de la fiche H89 : les règles et les rôles décrivent le
régime de l'intégrateur, ce que `wn-merge` exécute depuis #1756. Restent la
PR (d) (liste commune de questions et guichet), puis l'essai.

## Décisions prises

Aucune décision nouvelle, aucun numéro pris. Lectures de mise en œuvre :
- D-290 §1 et D-287 §2 reçoivent chacun une ligne « Mise à jour
  (2026-10-28, D-373, H89) », sous le paragraphe amendé, sans réécrire son
  texte.
- Les textes nomment les gestes de 7 bis et 7 ter et renvoient au skill pour
  les commandes, les codes et les arrêts : rien n'en est recopié.
- L'avance `--ff-only` est attribuée à l'intégrateur, comme D-373 §2.
- « Crochets » reste le mot de D-373 §2, sans liste de chemins ajoutée.

## Fichiers modifiés

- `docs/DECISIONS.md` : deux lignes datées (D-290 §1, D-287 §2).
- `CLAUDE.md` : § « PR, CI, merge » et § « Début de session ».
- `docs/claude/REGLES_PR_MERGE.md` : paragraphe « L'intégrateur », « Cycle
  PR complet » (7 bis, 7 ter, avance `--ff-only`).
- `docs/ROLES_MACHINES.md` : section « La copie principale et
  l'intégrateur », protocole nominal (étape 4) et repli du PC (étape 3).
- `.claude/rules/pr-revue-et-release-db.md` : §1.10 (qui merge, remarque
  arrivée après « prête ») et trois lignes au tableau du §2.
- Clôture : `changelog.d/2026-10-28-h89-c-regles-roles-integrateur.md`,
  `docs/claude/plan-journal/H89/2026-10-28-03-pr-c.md`, ce handoff.

## Validations exécutées

- Bancs qui tiennent ces textes : `wn-sonde-release-db.test.mjs` (les
  règles et `REGLES_PR_MERGE.md` nomment la sonde), `skill-cross-invocation`,
  `skill-bang-cwd`, `wn-chevauchement` : 100 sur 100. Numérotation du
  registre : OK, D-001 à D-391. Aucun banc de longueur sur `CLAUDE.md` ;
  aucun banc neuf, faute d'écart réel.
- T1 `npm run check:rapide` : vert, 16 étapes (après `npm ci` et
  `prisma generate` dans le worktree neuf). T1 complet `npm run check` joué
  avant le commit.
- Revue `wn-reviewer` : GO sous réserve.
  - Corrigés, à corriger : le repli du PC (`ROLES_MACHINES.md`) disait
    encore « puis merger » ; les défauts du tableau du §2 n'étaient pas
    sourcés (ancrés sur #1590, #1577, #1697, ou reformulés sur D-373 §2).
  - Mineurs corrigés : ordre 7 bis puis 7 ter dans `ROLES_MACHINES.md` ;
    « déploiement ordinaire » (D-373 §1) dans la ligne de D-287 ; borne
    « hors phase 1 de D-374 » dans `CLAUDE.md` ; `allow_auto_merge` daté ;
    avance `--ff-only` attribuée à l'intégrateur.
- CodeRabbit : verdicts dans la PR.

## Problèmes ouverts

- **Question de la revue, non tranchée** : qui merge quand aucune session
  intégrateur ne tourne ? D-373 §5 ne prévoit que le décompte des
  dépassements et le repli après trois. Les textes ne l'inventent pas : à
  trancher par le responsable, ou à laisser à §5.
- Toujours ouverte, hors périmètre : le run release-db déploie-t-il le
  commit approuvé quand le CI de `main` est rouge ?

## Prochaine action exacte

1. Merger cette PR après CodeRabbit sur la tête, étape 7 bis de `wn-merge`
   puis `node scripts/wn-sonde-release-db.mjs <N>` à 0.
2. Puis H89 PR (d) dans une session neuve : liste commune de questions et
   guichet (fiche H89, critère (d)).

## Interdits encore actifs

- Aucun merge sans la sonde release-db à 0 ; jamais d'auto-merge.
- Approbation et déclenchement de release-db : gestes humains.
- Aucune migration sans demande ; production en lecture seule, par
  conteneur.
- Dépôt public : aucun lien d'artefact, aucun identifiant interne de page,
  aucune identité réelle.
- Jamais de rebase ni de `git stash` nu dans ce worktree ; une fusion
  d'`origin/main` est permise si `main` avance.
