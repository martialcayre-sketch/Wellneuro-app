# Handoff — 2026-10-05 — BioFlow : audit des panels ; LOT-07 migré en production

## Branche et état Git

`docs/bioflow-audit-panels-2026-10-05` (PR #1327, doc seule), depuis `main`
57dfcdae. `main` porte la migration du LOT-07 (#1326), appliquée.

## Objectif

Verser le premier livrable du cadrage directeur BioFlow (§31-§32, décision
directrice §35) : mesurer et proposer, sans rien migrer ni supprimer.

## Décisions prises

- Audit versé comme snapshot daté ; roadmap : Track C (en cadrage, articulée
  à BP-04, BP-16, BP-18), règle de gel des nouveaux packs cliniques, G1 levé.
- Classification : aucun panel technique ; neuf axes cliniques déguisés ;
  trois indications ou populations ; un template optionnel ; deux coquilles.
- Trois prochaines PR proposées : décision de rationalisation, proposition
  dédoublonnée par analyte (sans migration), validation des codes d'axe
  (`cible_type = 'axe'` existe déjà, `cible_code` n'est pas contrôlé).

## Fichiers modifiés

`docs/architecture/bioflow/AUDIT_PANELS_BIOLOGIE_2026-10-05.md`,
`docs/architecture/bioflow/BIOFLOW_ROADMAP.md`,
`changelog.d/2026-10-05-bioflow-audit-panels.md`, `docs/claude/SESSION_LOG.md`,
ce handoff.

## Validations exécutées

- `npm run check` vert ; CI #1327 vert (avant les corrections de revue).
- Production, en lecture seule, agrégats : 15 panels, 78 items, 987 actes
  NABM, 0 correspondance, 0 lien, 0 panel documenté, 0 action
  `biological_exploration`.
- LOT-07 : `release-db` run 37332436697 en succès, sentinelle
  `WN_RELEASE_DB_OK id=37332436697-1`, migration appliquée (1 tentative),
  colonnes, CHECK et fonction constatés ; tête Scalingo = `main` 57dfcdae.

## Problèmes ouverts

- Trois questions au responsable : la Track C en campagne ou en lots
  BIO-PARCOURS ; les axes en liste neuve ou via `NeuroAxis` ; le signataire
  des correspondances NABM.
- LOT-07 : comportement d'un intervalle de plus de 300 caractères à trancher
  au lot de code (fiche du lot).

## Prochaine action exacte

LOT-07 : TRUST `usage_ia` v5 et registre RGPD (§2 ter, table santé, note
AIPD), servis et constatés ; cocher la case migration de la fiche. Ensuite
seulement le code (`bio-extraction-v2`).

## Interdits encore actifs

- Pas de code LOT-07 avant `usage_ia` v5 et le registre constatés (`D-267` §9).
- Aucun nouveau pack biologique clinique ; aucun refactoring des panels avant
  la décision de rationalisation.
- Aucune identité réelle, y compris celles des modèles de documents cités par
  le cadrage.
