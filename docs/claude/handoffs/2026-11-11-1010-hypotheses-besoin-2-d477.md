# Handoff — 2026-11-11 — Fiches d'usage : hypothèses du parcours du besoin 2 (D-477)

## Branche et état Git

Branche `b-bp17-cadre`, worktree `.claude/worktrees/b-bp17-cadre`, avancée par
`git merge --ff-only` sur `origin/main` (aucun commit propre avant celui du
lot). Aucune migration, aucun `schema.prisma`.

## Objectif

File B de BP-17 (F11), sous le cadrage #1968 (LOT-17), seul de référence :
poser le vocabulaire d'hypothèses du besoin 2, par une re-signature de la
structure des fiches d'usage (BP-12a, F05), avant toute bibliothèque
d'options (file C).

## Décisions prises

- D-477 (réservée, `refs/tags/reserve/D-477`) : six hypothèses de sens bas
  (`HYP_VITD_1`, `HYP_ZINC_1`, `HYP_MG_1`, `HYP_B9_1`, `HYP_B12_1`,
  `HYP_SE_1`), rattachées à trente-huit fiches. Liste arrêtée par le
  responsable le 2026-11-11 (texte d'un spécialiste tiers, adopté tel quel).
- Libellé = état fonctionnel, jamais un résultat de dosage ni un seuil ; les
  libellés vivent en base, saisis à l'atelier, jamais au dépôt.
- Fer différé (question à options, option recommandée) : `HYP_FER_1`
  réservé, non inscrit — `WN-CL-0241-001` n'est cité par aucune position fer
  signée, et aucune fiche fer n'est `confirmer_hypothese`.
- Pas d'hypothèse iode ; sélénium haut et surcharge en fer = adressage.
- Contre-revue Codex du diff : GO sur l'empreinte provisoire, aucun constat.
- Déclaration du responsable le 2026-11-11, recopiée :
  `dateValidation` 2026-11-11T09:02:54.000Z, `shaPerimetre` `e59d35c3…`.

## Fichiers modifiés

- `web/src/lib/fiches-usage/ficheUsageBesoin2V1.ts` et son banc
- `docs/decisions/D-477.md`
- `changelog.d/2026-11-11-d477-hypotheses-besoin-2.md`
- `docs/claude/plan-journal/F05/2026-11-11-01-hypotheses-besoin-2.md`
- `docs/claude/PLAN_WELLNEURO.md` (§8, ligne des fiches d'usage du besoin 2)
- `docs/FEATURE_FLAGS.md` (état des verrous de signature)
- ce handoff

## Validations exécutées

- Production, par conteneur, en lecture seule (2026-11-11) : 0 version de
  texte, 0 libellé de fiche, 0 constat, 34 arbitrages de conflits (non
  touchés, D-439 A3) ; claims d'appui `VALIDE`, actifs, v1.0.
- Bancs fiches d'usage, positions d'expert, bio-parcours, clinique : 1828
  verts, 13 ignorés.
- T1 complet et T3 : voir la PR.

## Problèmes ouverts

- Fer : provenance à compléter (position amendée ou règle écrite) avant
  inscription de `HYP_FER_1` et une nouvelle re-signature.
- Libellés des six hypothèses à saisir et valider à l'atelier, en production,
  après le déploiement.
- Garde des libellés dans le code (registre D-331 §3) : lot de la file C.
- `WN_BIO_CONSTAT` : état en production non vérifié ; la signature ne
  l'allume pas.
- Message à la file C (coordination BP-17) resté en attente de remise.

## Prochaine action exacte

PR « prête @sha » pour l'intégrateur ; après le merge, release-db approuvée
par le responsable (chemin de D-416), puis constat par conteneur de
l'empreinte déployée.

## Interdits encore actifs

- Production en lecture seule, par conteneur `scalingo run -d`.
- Aucun texte clinique, libellé ou valeur dans le dépôt public (D-251 §4).
- Ni signature ni arbitrage par l'assistant ; la porte 23 reste humaine.
- Pas de migration ni de `prisma format` ; pas de pull, merge ou rebase sans
  arbitrage (l'avance `--ff-only` n'en est pas une).
- PR ordinaire déclarée « prête @sha » ; l'intégrateur merge.
