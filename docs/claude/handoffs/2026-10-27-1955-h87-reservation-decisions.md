# Handoff — H87 : numéro de décision réservé à la rédaction (D-370)

## Branche et état Git

`lot/h87-reservation-decisions`, depuis `origin/main` 8990cd1e ; `main` a
avancé de deux commits depuis, à fusionner avant la PR. Copie principale.

## Objectif

Livrer D-370 : script de réservation, garde du CI, étape d'avertissement,
amendements de texte. Aucune décision neuve.

## Décisions prises

- Script `scripts/wn-reserver-decision.mjs [--nombre N]` : il crée
  `refs/tags/reserve/D-NNN` en ne passant que le nom de la référence et le sha
  de `main`. Seul « Reference already exists » fait passer au numéro suivant :
  le refus se lit dans le message, puisque deux refus différents sont des 422.
  Tout autre refus rend « inconnu », code 3, sans nouvel essai. Le garde-fou
  de 50 refus « déjà existante » d'affilée arrête aussi en code 3. Code 2
  quand rien n'a été tenté.
- Le garde passe en mode PR par `GITHUB_EVENT_NAME=pull_request` (ou par
  `--pr` au poste local) : la commande reste celle de `npm run check`, donc la
  parité tient. Les réservations et la base `HEAD^1` ne se lisent que s'il y
  a un trou. Une décision présente sur la base et absente de la PR est
  refusée, même réservée (P1 de la revue : une réservation ne se nettoie
  jamais). Hors PR, un trou n'est qu'un avertissement, sans lecture distante.
- Accompagnement `--accompagnement HEAD^1`, placé après `setup-node`, en
  `continue-on-error` : il sort toujours 0.

## Fichiers modifiés

Le script et son banc ; `scripts/lib/decisions-numerotation.mjs` et son
banc ; `ci.yml` (`GH_TOKEN` sur le garde, étape du banc, étape
d'accompagnement) ; `web/package.json` (`bancs-outillage-check`) ;
`docs/DECISIONS.md` (en-tête, D-287 §2 par ligne datée) ;
`pr-revue-et-release-db.md` §2 ; `REGLES_PR_MERGE.md` ; plan (§0, §5
point 2, N-5 dans la table et au §5, §10, fiche H87) ; fragment
`changelog.d/`.

## Validations exécutées

- Bancs : 110 tests sur 110 verts (garde, script, parité, invariants) ; 63
  sur 63 sous `GITHUB_EVENT_NAME=pull_request`.
- Six mutations rougissent les bancs.
- T1 complet vert, puis `check:rapide` vert après les correctifs.
- Revue `wn-reviewer` : GO avec réserves ; P1 et quatre P2 corrigés.
- `git ls-remote` : aucune référence `reserve/*` n'existe. Le jeton par
  défaut du dépôt est en lecture.

## Problèmes ouverts

- Critère « une première décision numérotée par le script mergée » : il se
  constate sur la prochaine décision.
- Le ruleset de `refs/tags/reserve/D-*` est hors lot (réglage du
  responsable).

## Prochaine action exacte

Fusionner `main`, puis CI et CodeRabbit (un verdict par remarque). Vérifier
le gel : intégral tant que H88 n'est pas mergée, et aucun run `release-db`
non conclu. Relire les paragraphes communs si H88 a mergé. Merger avec
`--squash --delete-branch --match-head-commit`, puis `/clear`.

## Interdits encore actifs

- Ne créer aucune référence réelle pendant le lot.
- Ne pas toucher aux fichiers propres de H88 : `release-db.yml`, la sonde,
  `wn-merge`, le §5 piège 2.
- Ne pas toucher à la clôture de H86, qui s'écrit à partir du 2026-11-03.
