# Handoff — 2026-11-12 — F05, textes des fiches d'usage : pilote fer, consigne v3 (D-501 §5 et §6)

## Branche et état Git

`f05-textes-v3`, recréée sur `origin/main` (e00cf5ca) dans le worktree
`b-fiche-usage-iode-selenium`, sans fusion. #2023 (D-501, v2) est mergée
(e6f365c5). Un commit, poussé ; PR ouverte, **non prête** tant que le
responsable n'a pas approuvé la v3.

## Objectif

Rendre la rédaction des fiches possible après l'échec du pilote fer sous la
v2, sans relâcher la fidélité aux claims.

## Décisions prises

- Arbitrage du responsable (question à options) : v3, où la structure signée
  fonde la désignation et jamais un fait, avec sa restriction dictée : un
  identifiant opaque ne fonde aucun sens, aucune hypothèse ne se déduit, les
  claims seuls établissent, une contradiction fait refuser la fiche, et la
  contre-lecture reçoit les mêmes bases (D-501 §5, proposé).
- Arbitrage du responsable : `POP_FEMME_REGLEE_NON_ANEMIQUE` est un libellé
  proposé par l'assistant, repris de l'identifiant, et approuvé ; il part en
  brouillon sans contre-lecture, traçabilité explicite (D-501 §6).
- Arbitrage du responsable : dépôt immédiat des deux libellés du fer.

## Fichiers modifiés

- `tools/corpus/fiches-usage/` : `lib/preparation.mjs`
  (`designationsDeLaFiche`, `LIBELLES_USAGE_DECISIONNEL`, `lireReponseFiche`,
  messages), `rediger.mjs` (`--designations`, refus du rédacteur),
  `consignes/redaction.md`, `consignes/contre-lecture.md`,
  `lib/consigne.mjs` (v3, `26d46ed349b9c996`), tests, README.
- `docs/decisions/D-501.md` (§5, §6), `docs/TRUST_IA_FICHES_USAGE.md`,
  changelog, journal F05 `2026-11-12-03`.

## Validations exécutées

- Bancs de l'outil : 118/118. T1 rapide et T1 complet avant le commit (voir
  la PR).
- Pilote fer sous la v2 (après le remplacement de la clé Anthropic par le
  responsable) : 6 fiches rédigées, 6 refusées à la contre-lecture. Rapports
  locaux sous `~/.wellneuro/corpus/fiches-usage/FU_FER_P*/`, hors dépôt.
- Libellés : `POP_GROSSESSE_ALLAITEMENT` retenu par l'outil (v2) ;
  `POP_FEMME_REGLEE_NON_ANEMIQUE` refusé par l'outil, puis brouillon §6. Les
  deux passent `deposer.mjs --validate`. Dépôt sur app.wellneuro.fr :
  `BROUILLON_DEPOSE` n° 1 chacun.
- Constat par conteneur (one-off-9729, lecture seule) : 2 libellés sur
  l'empreinte `e59d35c3`, 0 acte de libellé, 0 version, 0 acte de version.

## Problèmes ouverts

- **La v3 doit être approuvée par le responsable avant le merge** (D-501
  §5, statut « proposé »).
- **Les deux libellés attendent la validation du responsable à l'écran**
  (Biologie fonctionnelle, rayon « Fiches d'usage »). Sans elle, le pilote
  v3 refuse les six fiches avant tout appel.
- Le `RAG_INTERNAL_SECRET` de la copie principale (`web/.env.local`) n'est
  pas celui de la production (empreintes différentes). Le dépôt a passé le
  secret de production au seul processus, sans l'afficher ni réécrire le
  fichier. Mise à jour du fichier local : geste du responsable.
- Fichier des désignations à produire, par conteneur en lecture seule, après
  la validation des libellés : libellés validés sur l'empreinte en cours et
  `biology_analytes` (`BIO_FERRITINE`).

## Prochaine action exacte

Après l'approbation de la v3 et le merge, puis la validation des deux
libellés : extraire les désignations vers
`~/.wellneuro/corpus/fiches-usage/designations.json`, puis lancer
`rediger.mjs --fiche FU_FER_P1,…,FU_FER_P6 --designations … --claims
~/.wellneuro/corpus/claims/f05-epingles-2026-11-12.json`. Ensuite
`deposer.mjs --validate`, puis `--cible https://app.wellneuro.fr`, puis le
constat par conteneur.

## Interdits encore actifs

- Production en lecture seule, par conteneur ; un dépôt passe par la route
  interne, jamais par un SQL.
- Aucun texte de fiche, de libellé ni de claim dans le dépôt (D-251 §4).
- Validation et signature : gestes du responsable seul, sauf délégation
  explicite.
- Ne pas toucher à `ficheUsageBesoin2V1.ts` sans D-xxx ni re-signature.
- Pas de pull, merge ni rebase d'une branche qui a des commits sans
  arbitrage.
