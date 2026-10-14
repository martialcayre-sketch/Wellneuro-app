### Gouvernance : la revue des PR passe de Copilot à CodeRabbit (D-290, 2026-10-14)

Lot de gouvernance, sans code applicatif, sans migration, sans règle clinique.
Le quota de Copilot est épuisé ; le responsable a installé CodeRabbit sur le
dépôt. **CodeRabbit revoit, l'assistant merge.**

- **`.coderabbit.yaml`** à la racine, chaque clé validée sur le schéma
  officiel : français, profil `chill`, revue automatique sur `main` et
  incrémentale à chaque push sans pause, brouillons exclus ; tout ce qui
  commite sur la branche coupé (un commit de Copilot avait gelé `verify`) ; fichiers
  générés et archivés exclus ; consignes par chemin recopiées des règles du
  dépôt (clinique, base, authentification, UI, docs) ; nos règles comme
  lignes directrices ; détecteur de secrets gardé, linters doublonnant le CI
  coupés.
- **Règles réalignées** : `CLAUDE.md` (PR, CI, merge),
  `docs/claude/REGLES_PR_MERGE.md` (régime en vigueur, historique du
  2026-07-21 gardé), `docs/claude/POLITIQUE_REVUE.md` (barème inchangé),
  `.claude/rules/pr-revue-et-release-db.md` (1.1 : trois sorties à lire ;
  1.5 à 1.7 généralisées au bot de revue ; 1.10 neuve : statut ≠ revue,
  demande de revue, verdicts dans le fil), `/wn-merge` (régime déduit, revue
  sur le sha de tête).
- **Constat** : sur #1438, CodeRabbit a posé un statut `CodeRabbit` à
  `success` alors qu'il avait sauté la revue — un statut vert n'est pas une
  revue.
