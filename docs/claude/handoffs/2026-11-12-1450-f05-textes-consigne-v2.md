# Handoff — 2026-11-12 — F05, textes des fiches d'usage : cadrage, puis consigne v2 (D-501)

## Branche et état Git

`f05-textes-cadrage`, créée depuis `origin/main` (16c29f6f) dans le worktree
`b-fiche-usage-iode-selenium`. Un commit (D-501), poussé ; PR ouverte. Le
préalable #2020 était déjà mergé par l'intégrateur (16c29f6f).

## Objectif

Cadrer la rédaction des textes des 54 fiches d'usage du besoin 2, puis
préparer l'outil avant le premier envoi, comme l'a arbitré le responsable.

## Décisions prises

- Trois arbitrages du responsable, le 2026-11-12, sur question à options :
  (1) pilote fer (six fiches, 21 rubriques), puis un dossier par lot ;
  (2) consigne v2 **d'abord**, contre la recommandation ; (3) les libellés
  sont rédigés par l'outil.
- D-501 (proposée) : axes signés et marque des claims sous réserve
  d'indication dans le message ; règle des libellés d'hypothèse de D-477 §2
  dans la consigne. Modèles par défaut inchangés (arbitrage 25).

## Fichiers modifiés

- `tools/corpus/fiches-usage/` : `lib/preparation.mjs`, `rediger.mjs`,
  `consignes/redaction.md`, `consignes/contre-lecture.md`, `lib/consigne.mjs`
  (v2, empreinte `9ce94ab537e3dd49`), tests, README.
- `web/src/lib/fiches-usage/reserveIndication.ts` (neuf, identifiants
  seuls) ; `reserveMarqueurAntiLdl.guard.test.ts` (égalité des deux listes).
- `docs/TRUST_IA_FICHES_USAGE.md`, `docs/decisions/D-501.md`, fragment de
  changelog, journal F05 `2026-11-12-02`.

## Validations exécutées

- Bancs de l'outil (`scripts/run-certify-bancs.sh`) : 115/115.
- Banc de D-498 (vitest) : 14/14.
- `rediger.mjs` se charge (arrêt attendu sur un argument inconnu ; aucun
  modèle appelé).
- T1 rapide, puis T1 complet : verts.
- Aucune écriture en base ; aucun appel aux fournisseurs d'IA.

## Problèmes ouverts

- **La v2 doit être relue par le responsable avant le merge** (D-501,
  statut). La consigne nomme le marqueur pour l'interdire : ce point est à
  confirmer à la relecture.
- L'instantané local des claims (`draft-LOT_004_2026-07-25.json`) ne contient
  pas les 599 claims épinglés : il faut l'extraire de la production par
  conteneur, en lecture seule (gzip puis base64), vers
  `~/.wellneuro/corpus/claims/`, hors dépôt, au format attendu par
  `chargerClaimsLocaux` (`claimId`, `versionClaim`, `texteNormalise`,
  `contentSha256`, `sourceId`).
- L'identifiant `claude-sonnet-5` reste à éprouver au premier appel.

## Prochaine action exacte

Après la relecture de la v2 et le merge : extraire l'instantané, lancer
`rediger.mjs --fiche FU_FER_P1,…,FU_FER_P6` (clés de la copie principale par
`--env-file`), puis `deposer.mjs --validate`, puis `--cible
https://app.wellneuro.fr`. Constater par conteneur, puis faire relire et
valider par le responsable à l'écran.

## Interdits encore actifs

- Production en lecture seule, par conteneur ; un dépôt passe par la route
  interne, jamais par un SQL.
- Aucun texte de fiche, de libellé ni de claim dans le dépôt (D-251 §4) ; les
  pièces non opaques vont au dépôt privé `wellneuro-revues`.
- Validation et signature : gestes du responsable seul, sauf délégation
  explicite.
- Ne pas toucher à `ficheUsageBesoin2V1.ts` sans D-xxx ni re-signature.
- Pas de pull, merge ni rebase d'une branche qui a des commits sans
  arbitrage.
