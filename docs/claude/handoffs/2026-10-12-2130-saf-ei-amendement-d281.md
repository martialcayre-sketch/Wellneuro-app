# Handoff — 2026-10-12 — SAF-EI-01 amendée avant signature (D-281)

## Branche et état Git

`docs/saf-ei-amendement`, dans le worktree `.claude/worktrees/bio-ingest-cloture`,
partie de `origin/main` (`50c5d356`). PR #1406, décision seule, aucun code. La
copie principale a été basculée par Codex sur la branche locale
`test/saf-ei-01-cas-fictifs` (banc de 20 cas, jamais poussée) : à remettre sur
`main` avant d'y relancer les `/wn-*`.

## Objectif

Constat S-1 en conteneur, puis éprouver `SAF-EI-01` sur des cas fictifs avant
sa signature, et amender la règle selon les arbitrages du responsable.

## Décisions prises

- Constat S-1 (agrégats, lecture seule) : zéro signalement d'effet
  indésirable depuis l'origine ; aucun import `bio-extraction-v4` ; zéro
  accusé `usage_ia` v7 (aucun dépôt patient depuis sa publication) ;
  questionnaires tous valides, dernier il y a six jours ; tête de `main`
  déployée.
- Banc de 20 cas fictifs (Codex, relu ici) : blocage total du dossier,
  rattachement au programme entier, « Je ne sais pas » sans effet, levée sans
  motif.
- `D-281` : rattachement à un élément du programme ; « Je ne sais pas » et
  « un autre produit » valent tous les compléments ; pause au portail sous deux
  textes signés ; aucune diffusion avant la validation de l'implication ;
  impliqué ⇒ aménagement choisi par le praticien, jamais à l'identique ni
  augmenté ; aucun délai ; même règle quelle que soit la gravité ; le statut
  « traité » ne lève rien (tranché à la relecture) ; signature en fin de
  chantier, règle livrée non armée d'ici là.

## Fichiers modifiés

- `docs/DECISIONS.md` (`D-281`).
- `docs/claude/doctrine/CONSTITUTION_CLINIQUE.md` (renvoi sous `DC-42`).
- `changelog.d/2026-10-12-saf-ei-amendement-d281.md`.
- `docs/claude/SESSION_LOG.md` et ce handoff.

## Validations exécutées

- `npm run check:rapide` vert ; `check_no_secrets.sh --staged` vert.
- CI de #1406 vert au premier passage (`wn-attendre-ci` code 0).
- Banc de Codex : 42 tests verts selon son rapport, non rejoués ici.

## Problèmes ouverts

- Copie principale sur `test/saf-ei-01-cas-fictifs` ; son `check:rapide`
  échoue faute de `prisma generate` après #1397.
- Le banc de Codex vise la règle livrée : caduc, à refaire au lot 4 de
  `D-281` §6.

## Prochaine action exacte

Merger #1406 après lecture des commentaires, puis ouvrir le lot 2 de
`D-281` §6 : la migration (élément désigné, mode de rattachement, validation
de l'implication), relue puis `release-db` approuvée et constatée.

## Interdits encore actifs

- Ne pas signer `SAFETY_EI_METADATA` avant le lot 5 ; signature = acte du
  praticien.
- Pas de migration ni de `schema.prisma` sans la demande du lot 2.
- Les textes « en pause » de `D-281` §4 sont signés : mot pour mot.
