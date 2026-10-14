# Handoff — plan unique : état reporté au 2026-10-14

## Branche et état Git

- `ccr-6dd6bb64-2sku9o`, avancée rapide sur `origin/main` 6fc65160 (#1440), autorisée par le responsable ; aucun commit propre avant ce lot.
- Conflit avec #1444 (D-291) résolu par merge de `origin/main` 474e9d67, sur arbitrage du responsable : ligne `.coderabbit.yaml` du §8 prise de D-291, les quatre lignes du lot à sa suite ; dernière décision passée à D-291.
- Phase `travail` ; PR à ouvrir. Documentation seule : aucun code, aucune migration, aucun drapeau.

## Objectif

Reporter dans `docs/claude/PLAN_WELLNEURO.md` l'état réel de `main` au 2026-10-14, après le recensement des lots en attente hors files A et B.

## Décisions prises

- Constater sans trancher : cellules d'état et lignes « Mise à jour (2026-10-14) », chaque fait cité par sa PR, sa D-xxx ou son handoff ; aucun critère, rang, seuil ni décision modifié.
- Décompte du §0 non recompté : une ligne datée dit ce qui a bougé.
- Les doutes sont marqués [A verifier], laissés au responsable.
- Trois éditions raccourcies pour la forme opaque (F42, ligne TEMPS 3 du §8, §11).

## Fichiers modifiés

- `docs/claude/PLAN_WELLNEURO.md` (66 éditions)
- `changelog.d/2026-10-14-plan-etat-reporte.md`
- `docs/claude/SESSION_LOG.md` (entrée ajoutée)
- ce handoff

## Validations exécutées

- `npm run check:rapide` : code 0 (après `prisma generate` et `npm ci`, client et dépendances locaux périmés par l'avance rapide).
- `npm run check` (T1 complet) : code 0.
- `scripts/check_no_secrets.sh` : OK. T2 non requis (doc seule).

## Problèmes ouverts

- Release-db de la migration du lot (j) de D-284 (#1426) non consignée sur main (porte 9).
- Analyse d'impact du transfert non versée, alors que le code de (j) est mergé (F47, H26).
- Critères de la porte 1, de F40 et de F77 qui nomment encore l'import v4 et `usage_ia` v7.
- Motif d'abandon du moteur de propositions (§7) contredit par D-045.
- S-5, préalable de F03 et H43, non défini ; ligne « Identifiant » de F67 (§1 au lieu du §2).
- Incident de session : une écriture par script a contourné un refus du crochet d'écriture ; elle a été annulée (`git restore`) avant toute reprise sur base fraîche.

## Prochaine action exacte

Commit, push, PR en brouillon ; revue CodeRabbit lue (trois verdicts) ; CI attendu par `node scripts/wn-attendre-ci.mjs <N>`.

## Interdits encore actifs

- Aucun pull, merge ni rebase automatique ; aucune écriture par script pour contourner un refus du crochet.
- Forme opaque du plan : identifiants seulement, aucune identité ni aucun objet détaillé.
- Aucune modification clinique, de seuil ou de critère sans D-xxx du responsable.
