# Handoff — Lettre d'adressage remise au patient : constat du drapeau (D-262)

## Branche et état Git
- Branche `ccr-233e115a-00c8c1`, PR de doc #1383 ouverte, `origin/main`
  fusionnée dans la branche (merge commit, pas de rebase).
- Diff : `docs/FEATURE_FLAGS.md`, `changelog.d/2026-10-10-lettre-adressage-constat.md`,
  `docs/claude/SESSION_LOG.md` (ajout en fin), ce fragment.

## Objectif
Consigner `WN_LETTRE_ADRESSAGE_PATIENT` « constaté par le comportement »,
sur déclaration du responsable du 2026-10-10.

## Décisions prises
- Constat consigné tel que déclaré, sans comptes ni horodatages (non transmis) :
  à relire par conteneur si une preuve datée est requise.
- Aucun identifiant de dossier à côté d'une mesure dans le texte neuf (règle
  du 2026-10-05) ; la mention déjà versée par #1313 n'est pas réécrite.
- Écart de séquence dit explicitement (revue Copilot) : D-262 §7 veut la pose
  après le constat ; pose 2026-10-04, constat 2026-10-10.

## Fichiers modifiés
Voir « Branche et état Git ». Aucun code.

## Validations exécutées
- `scripts/check_no_secrets.sh` : OK.
- CI de la PR (`controles`, `e2e`, `verify`) vert sur la tête `ee9e0e0` ;
  à rejouer sur la tête portant ce fragment.

## Problèmes ouverts
- Date de la lettre au jour UTC (générateur) : une lettre consignée la nuit
  à Paris porte la veille — à arbitrer.
- E-mail envoyé même si la lettre est révoquée pendant la remise.
- L'export d'accès n'inclut pas les remises.
- Impression refusée par le chokepoint → 404 JSON dans l'onglet.

## Prochaine action exacte
CI vert sur la tête courante de #1383, fils de revue traités → merge squash.
Puis arbitrer les problèmes ouverts ci-dessus (décision `D-xxx` si clinique).

## Interdits encore actifs
- Aucune identité réelle dans le dépôt ; dossiers réels par identifiant
  seulement, jamais visés par seed ou E2E.
- Production : lecture par `scalingo run -d`, écriture par migration relue +
  `release-db` approuvée ; pose de drapeau = geste humain.
- Pas de migration ni de `schema.prisma` sans demande explicite.
