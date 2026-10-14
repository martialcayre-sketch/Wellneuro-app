# Handoff — passation après la file D (à lire après `/clear`)

## Branche et état Git

- Session de pilotage du plan close. Dernière branche : `ccr-6dd6bb64-2sku9o`, repartie de `origin/main` 39a1d1d3 (#1448) ; PR de plan « BP-09 migration mergée » en cours (CI, revue CodeRabbit, merge par l'assistant, D-290).
- Mergées dans la session : #1445 (état du plan au 2026-10-14), #1449 (file D, plus aucune dette hors du plan).
- Après le merge de la PR en cours : repartir de `main`, jamais de la branche squashée.

## Objectif de la session suivante

Exécuter la file D du plan (`docs/claude/PLAN_WELLNEURO.md`, §4, photographie D.1 à D.5), en commençant par l'urgent.

## Décisions prises (session du 2026-10-14)

- La file D existe : ce qui n'est ni file A, ni B, ni C y est rangé (gestes du responsable et objets sans file) ; lignes sans rang « D/n ».
- Aucune dette hors du plan : une dette de code vit au §8 avec sa file ; un geste vit en file D ; les registres hors plan portent « Versé au plan le 2026-10-14 ».
- Les traces de `next_action` de `.wn/state.json` sont de l'historique, non des dettes.

## Fichiers modifiés dans la session

- `docs/claude/PLAN_WELLNEURO.md` (§0, §1, §2, §4, §8, fiches) ; 22 registres et documents (ligne de versement ou de renvoi) ; tête de `.wn/state.json` ; fragments `changelog.d/2026-10-14-plan-*.md` ; `SESSION_LOG.md`.

## Validations exécutées

- `npm run check` (T1 complet) : code 0 à chaque PR. Après une avance sur `main`, refaire `npx prisma generate` (et `npm ci` si une dépendance a été ajoutée) avant T1 : le client local périmé fait échouer `tsc`.

## Problèmes ouverts

- **Urgent — M-5 (2/2)** : release-db de BP-09 (#1448, D-294) à approuver hors usage. Tant qu'elle manque, tout effacement de dossier échoue (transaction annulée, rien d'effacé). Puis constat par conteneur, puis PR 2 de BP-09.
- Release-db du lot (j) de D-284 (#1426) non consignée (porte 9, D.2).
- D/7 : cj prend le numéro libre suivant (D-295 au plus tôt).
- D/9 : PR de pilotage pour `.wn/state.json` (tête, `recent_decision_ids`, validation).
- Verdict de la seconde passe Codex de #1448 non consigné au dépôt.
- Deux lignes du §8 marquées [A verifier].

## Prochaine action exacte

1. Approuver la release-db de BP-09 hors usage, la constater par conteneur.
2. Puis, dans l'ordre de D.1 : F25 (effectif de masquage), G-7 (essai de restauration, porte 8), K-05a et D4 (porte 5), S-7 (NABM), ca (agenda du sommeil), lettres m, n, ac, z.
3. Constat daté du 2026-10-29 : première lecture de re-mesure de l'agenda du sommeil (porte 16).

## Interdits encore actifs

- Aucun pull, merge ni rebase automatique ; réconciliation par arbitrage humain ; aucune écriture par script pour contourner un refus du crochet.
- Production : lecture par conteneur seulement ; écriture par migration relue puis release-db approuvée.
- Forme opaque du plan ; aucune règle clinique ni seuil sans D-xxx ; handoffs, SESSION_LOG et DECISIONS append-only.
