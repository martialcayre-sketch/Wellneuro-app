# Handoff — file D, d25 : résultats de la passe de mutations BIO-INGEST versés

## Branche et état Git

`docs/file-d-d25-resultats`, créée depuis `origin/main` 6e775456 (après le
merge de #1903, l'énoncé). PR de documentation seule : aucun code, aucune
migration, aucun chemin déclencheur de release-db.

## Objectif

Verser le verdict de la passe Codex des mutations M1 à M11 et M15 (cible
`4ecad8e1`), proposer un lot de banc par `SURVIT` sans l'écrire, puis clore
d25.

## Décisions prises

- Résultats versés dans un fichier neuf à côté du registre, sans réécrire son
  §1 : le registre du 2026-10-10 reçoit seulement un §5 daté qui renvoie.
- Pièces de preuve (diffs, JSON, sorties de bancs) laissées hors du dépôt,
  dans le dossier de preuve local du responsable ; le fichier versé les cite
  par leur nom.
- D/25 close (« fait le 2026-11-07 ») : la condition de levée était
  « résultats versés ». Aucune D-xxx, aucun fragment de changelog.
- Deux lots de banc proposés, non écrits : d25-b1 (M1, lot mixte avec action
  inconnue) et d25-b2 (M2, doubles distincts global/transactionnel et témoin
  PostgreSQL local). Ils attendent l'arbitrage du responsable.

## Fichiers modifiés

- `docs/claude/campagnes/2026-09-30-bio-ingest/REVUE_CODEX_MUTATIONS_2026-11-07.md` (neuf)
- `docs/claude/campagnes/2026-09-30-bio-ingest/REVUE_CODEX_MUTATIONS_2026-10-10.md` (§5 ajouté)
- `docs/claude/PLAN_WELLNEURO.md` (ligne D/25)
- ce handoff

## Validations exécutées

- Relecture sur `4ecad8e1` : `decisions.ts:232` (refus `decision_invalide`),
  `:299` (création sur `tx`), `decisions.test.ts:87` (double
  `$transaction` qui appelle `cb(prisma)`) ; diffs M1 et M2 du dossier de
  preuve conformes ; constat de suppression de la copie jetable lu.
- T1 complet : voir la PR.

## Problèmes ouverts

- d25-b1 et d25-b2 : à arbitrer (écrire, quand, quelle file).
- Le dossier de preuve local de Codex est sous `/tmp`, volatil.
- Constat M7 (réservation 6 min contre péremption 5 min) : consigné, sans
  règle ; l'étendre à M7 serait une exigence nouvelle à décider.

## Prochaine action exacte

CI de la PR en tâche de fond (`node scripts/wn-attendre-ci.mjs <N>`), revue
(CodeRabbit, sinon PR-Agent, sinon `wn-reviewer`), verdicts, « prête @sha ».
Puis page de suivi : ligne d25 close.

## Interdits encore actifs

Aucune mutation dans le worktree du lot ; rien sous `web/src/lib/clinical/`
ni dans `indicationsBiologieV1.ts` ; ni migration ni `schema.prisma` ; aucune
écriture en production ; aucune valeur, seuil ou délai proposé par la
session ; aucune D-xxx sans arbitrage ; pas de merge (essai D-373). En
attente : d31, d53 (pas avant le 2026-11-13), d22, d56, d59, H98/d58.
