# Handoff — file D, d25-b1 et d25-b2 : bancs des décisions BIO-INGEST

## Branche et état Git

`test/file-d-d25-bancs-decisions`, créée depuis `origin/main` 5322e908 (après
le merge de #1904). Tests, CI et documentation seulement : aucun code de
production, aucune migration, aucun chemin déclencheur de release-db.

## Objectif

Fermer les deux `SURVIT` de la contre-revue par mutations du 2026-11-07 (M1,
M2), sur arbitrage du responsable du même jour (`20261107-1158-d` : écrire
les deux lots maintenant).

## Décisions prises

- Arbitrages du responsable du 2026-11-07, consignés dans la liste commune :
  `20261107-1158-d` (les deux lots, maintenant), `20261107-1753-d` (M7 reste
  un constat), `20261107-1754-d` (pièces au dépôt privé des revues,
  `d25-mutations-2026-11-07/`, 76 fichiers, commit 0344cffa). Pas de D-xxx.
- Le témoin PostgreSQL force le refus par `count !== 1` (course à deux
  sessions), pas par une fin d'extraction future : le trigger des extractions
  date lui-même `termine_le` (premier essai rouge à tort, constaté).
- `DB_POOL_MAX = 4` dans le banc : avec une seule connexion, une écriture
  hors transaction attendrait la connexion de la transaction et échouerait
  avec elle, et le banc ne verrait pas la faute.
- Hors lot, relayé tel quel : `20261104-2225-b` (file B, clinique) tranché par
  le responsable, « marque non servi posée par acte » ; lot et D-xxx à la
  file B.

## Fichiers modifiés

- `web/src/lib/biology-library/import/decisions.test.ts` (deux cas)
- `web/scripts/banc-decisions-atomicite-prisma.test.ts` (neuf)
- `.github/workflows/ci.yml` (pas « Bio decisions atomicity bench »)
- `scripts/wn-test-worktree.sh` (entrée du banc)
- `docs/claude/campagnes/2026-09-30-bio-ingest/REVUE_CODEX_MUTATIONS_2026-11-07.md` (§7)
- `docs/claude/PLAN_WELLNEURO.md` (ligne D/25)
- ce handoff

## Validations exécutées

- `decisions.test.ts` : 34 sur 34 sur le code intact ; M1 rejouée (via `sed`)
  → 1 échec, le cas « LOT MIXTE » ; M2 rejouée → 1 échec, le cas des
  écritures sur `tx` ; restauration par `git checkout --` et
  `git status --porcelain` vérifié après chaque mutation.
- Banc PostgreSQL sur la base locale du worktree (`wn-dev-db.sh --migrate`) :
  vert sur le code intact (ok 1, ok 2) ; rouge sous M2 sur « un résultat
  reste au dossier » ; restauré.
- T1 complet, T2 : voir la PR.

## Problèmes ouverts

- Aucun pour ce lot. La file B porte `20261104-2225-b` (lot de code et D-xxx).

## Prochaine action exacte

PR, CI en tâche de fond (`node scripts/wn-attendre-ci.mjs <N>`), revue
(CodeRabbit, sinon PR-Agent, sinon `wn-reviewer`), verdicts, « prête @sha ».
Après le merge : question `20261107-1158-d` à passer `close`.

## Interdits encore actifs

Rien sous `web/src/lib/clinical/` ni dans `indicationsBiologieV1.ts` ; ni
migration ni `schema.prisma` ; aucune écriture en production ; aucune valeur,
seuil ou délai proposés par la session ; aucune D-xxx sans arbitrage ; pas de
merge (essai D-373). En attente : d31, d53 (pas avant le 2026-11-13), d22,
d56, d59, H98/d58.
