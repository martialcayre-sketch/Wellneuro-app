# Handoff — 2026-10-28 — H93 : lecteur scripté de la revue PR-Agent (D-393 §2)

## Branche et état du dépôt

- Branche `h93/lecteur-revue-pr-agent`, worktree
  `.claude/worktrees/h93-lecteur-revue` (session concurrente, `git` et `gh`
  directs). Partie de `origin/main` 63c5b5c8, avancée en `--ff-only` sur
  404e3235 (#1764) avant le premier commit.
- Outillage du merge seul : ni code applicatif, ni migration, ni chemin
  clinique, ni authentification, ni `pr_agent.yml`. PR ordinaire.

## Objectif

Fiche H93, reste ouvert sans porte : un lecteur scripté des quatre
conditions de D-393 §2, avec banc, appelé par l'étape 6 de `wn-merge`. Les
constats sur de vraies PR suivent dans une seconde PR (une finalité par PR).

## Décisions prises

Aucune décision neuve. Le lecteur est plus strict que la lettre de D-393 §2,
jamais plus ouvert ; ce que D-393 « ne décide pas » (lecteur scripté) est
fait sans la modifier.

## Fichiers modifiés

- `scripts/wn-revue-pr-agent.mjs` (neuf) et son banc
  `scripts/wn-revue-pr-agent.test.mjs`, enregistré dans
  `bancs-outillage-check` (`web/package.json`).
- `.claude/skills/wn-merge/SKILL.md` (étape 6 : appel du lecteur, codes,
  `tete=`), `.claude/rules/pr-revue-et-release-db.md` (§1.6 : le lecteur et
  ses durcissements).
- Clôture : `changelog.d/2026-10-28-h93-lecteur-revue-pr-agent.md`,
  `docs/claude/plan-journal/H93/2026-10-28-02-lecteur-quatre-conditions.md`,
  ce handoff.

## Validations exécutées

- Lecteur joué sur de vraies PR : #1766 → `0`, #1769 → `0` (preuve déjà
  vérifiée à la main), #1764 → `1` ((b) « pruning diff », (c) pied « Review
  coverage »), PR d'avant le workflow → `1` (aucun run). Sur #1769, un run
  sur commentaire a tourné pendant la revue : son journal dit qu'il a ignoré
  le commentaire, le lecteur rend bien `0`.
- Banc : 50 tests verts ; avec `wn-controle-fusion`, `wn-sonde-release-db`
  et `wn-deploiement-observation` (bancs qui lisent `wn-merge`) : 132 sur
  132. T1 rapide, puis T1 complet `npm run check` rejoué après les
  correctifs de revue : verts.
- Revue `wn-reviewer`, mission « le lecteur peut-il dire 0 sans revue
  réelle de la tête ? » : GO sous réserve, aucun bloquant. Corrigé :
  - appariement commande-run remplacé par la lecture des runs sur
    commentaire actifs pendant le run (journal « Ignoring comment ») ;
  - fichiers écartés sans compression refusés en (b) ;
  - journal qui doit nommer la PR seule en (a) ;
  - PR qui modifie `pr_agent.yml` signalée (ligne `·`, D-393 §6) ;
  - égalité au début refusée, commandes de robot comptées, blancs de
    Python, avis et en-tête à la tête, revues et commentaires en ligne lus,
    journal lu seulement d'un run vert, tête entière dans la ligne `REVUE`.
  - Écartés avec motif : contrefaçon par un autre workflow (hors modèle de
    menace, dite dans la règle 1.6) ; précondition CodeRabbit (dite à
    l'étape 6, lue avant l'appel).

## Problèmes ouverts

- Constats à consigner au journal de H93, PR suivante :
  - lecteur sur #1766 et #1769 (`0`) ;
  - PR au-delà du plafond : #1764, « pruning diff », revue sans remarque
    rognée (pied « Review coverage », sans bloc) — à consigner ;
  - revue sans remarque non rognée (aucun bloc) : à saisir quand elle passe ;
  - `/review` d'un membre sur une PR ouverte : à faire ;
  - commentaire de non-membre : non constaté (ne se provoque pas) ;
  - coût réel par revue : à demander au responsable (console).
- Le plafond de 32 000 jetons est atteint par une PR de doc de 5 fichiers
  (#1764) : signal pour la file de `pr_agent.yml`, pas pour ce lot.

## Prochaine action exacte

1. Commit, push, PR `--body-file` ; CI par `wn-attendre-ci` en fond.
2. Revue de bot sur la tête : CodeRabbit saute le dépôt, donc PR-Agent,
   prouvé par `node scripts/wn-revue-pr-agent.mjs <N>` à `0` ; verdict de
   chaque remarque dans un commentaire de PR distinct.
3. Étape 7 bis de `wn-merge`, sonde release-db à `0`, merge
   `--squash --delete-branch --match-head-commit`.
4. PR des constats.

## Interdits encore actifs

- Aucun merge sans revue de bot sur la tête ni sonde release-db à `0`.
- Aucune PR fabriquée pour un constat.
- Limite de dépense de la console Anthropic : geste du responsable.
- Dépôt public : aucun lien d'artefact, aucun identifiant interne de page,
  aucune identité réelle.
- Jamais de rebase, de `git stash` nu ni de push forcé dans ce worktree.
