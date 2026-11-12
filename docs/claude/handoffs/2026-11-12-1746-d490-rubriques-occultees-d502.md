# Handoff — 2026-11-12 — D-490 §3 précisée, rubriques occultées (D-502), constat F79 consigné

## Branche et état Git

- Branche `docs/d490-rubriques-occultees`, créée sur `origin/main` c8585373, dans le worktree
  `.claude/worktrees/b-bp17-cadre`.
- Documentation seule. Session concurrente (file B) : `git` et `gh` en direct.

## Objectif

Lot 1 des suites des sept questions tranchées le 2026-11-12 : Q1 de `D-490` inscrite, Q3 (rubriques publiées
contre `D-325` §5) exécutée, dette F79 de `D-498` §3 soldée.

## Décisions prises

- `D-490` §3 : précision datée (Q1, `20261112-1240-b`, « garder ») ; la marque suit la même version remise en
  attente puis revalidée, sans acte ; une nouvelle version n'hérite pas. Vérifié dans le code : seuls les deux
  gestes `exclusion_recherche` de `lib/rag/claims/revue.ts` écrivent la colonne.
- `D-502` (réservée par `wn-reserver-decision`) : exception bornée aux trois lignes ; la règle
  `.claude/rules/docs-changelog.md` n'est **pas** amendée (exception ponctuelle, le garde du journal avertit sans
  bloquer).
- Libellé de remplacement : « rubrique occultée (`D-502`) ».

## Fichiers modifiés

- `docs/decisions/D-490.md` (précision §3) ; `docs/decisions/D-502.md` (neuve).
- `docs/claude/plan-journal/H15/2026-11-11-02-relecture-87-claims-polyphenols.md` (l. 6 et 10) et
  `H15/2026-11-12-03-preuve-besoin-2-achevee.md` (l. 11) : occultation seule.
- `docs/claude/plan-journal/H15/2026-11-12-06-correction-rubriques-occultees-d502.md` (correctif).
- `docs/claude/plan-journal/F79/2026-11-12-02-constat-signature-reserve-d498.md` (faits du commentaire du
  2026-11-12 11:26 UTC sur #2014).
- `changelog.d/2026-11-12-d490-rubriques-occultees-d502.md` ; ce handoff.

## Validations exécutées

- Rangs des fragments recomptés sur `origin/main` relu juste avant d'écrire (H15 : 05 → 06 ; F79 : 01 → 02).
- `grep` des trois fragments : plus aucun nom de rubrique.
- T1 complet (`npm run check`) vert, avec le contrôle anti-secrets ; le garde du journal avertit des deux fragments modifiés (attendu).

## Problèmes ouverts

- Le garde du journal avertira, en CI, de la modification des deux fragments : attendu, couvert par `D-502`.
- Aucun balayage exhaustif du journal n'a été fait : c'est l'objet du lot 3 (banc contextuel).
- `D-498` §4 reste ouvert (la recherche sert les sept claims sous réserve sans la mentionner).
- Q2 de `D-490` (`20261112-1241-b`) : lot 2 (filtre « exclus » dans les trois onglets).

## Prochaine action exacte

1. CI de la tête, revue PR-Agent prouvée (`wn-revue-pr-agent.mjs` = 0), sinon `wn-reviewer`.
2. Déclarer « prête @<sha> » ; l'intégrateur merge.
3. À la fusion : `20261112-1240-b` en `close` dans la liste commune (page file D, `pr`, `merge_le`).
4. Puis lot 2 (Q2), et lot 3 (banc) une fois ce lot mergé.

## Interdits encore actifs

- Aucune rubrique, aucun texte de claim ni dose au dépôt (`D-251` §4, `D-325` §5).
- Production en lecture seule, par conteneur.
- Ni signature, ni marquage, ni rétablissement d'exclusion.
- Pas de `prisma format`.
