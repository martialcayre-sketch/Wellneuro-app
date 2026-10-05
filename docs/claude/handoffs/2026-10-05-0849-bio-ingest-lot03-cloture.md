# Handoff — 2026-10-05 — BIO-INGEST : clôture administrative du LOT-03, LOT-07 courant

## Branche et état Git

`docs/bio-ingest-lot03-cloture`, partie de `main` (0a9f68a5, après #1315,
#1316 et #1317). Documentation et `.wn/state.json` seulement.

## Objectif

Réaligner la gouvernance de BIO-INGEST sur le code réel. Le LOT-03, livré le
2026-10-04 (#1310, #1312), restait « à_faire » et courant dans `CAMPAGNE.md`
et dans `.wn/state.json`, alors que sa fiche le disait terminé.

## Décisions prises (arbitrages du responsable, 2026-10-05)

- LOT-03 terminé partout : la fiche (datée), la campagne et l'état du cycle.
- « Relancer la lecture » est déclaré non livré. Il passe sur une fiche
  neuve, le LOT-09 (`à_faire`, non ordonnancé, dépend de LOT-02), et reste
  hors du LOT-07. Le LOT-09 relit un compte rendu non purgé dont aucune ligne
  n'est validée, avec un refus prouvé côté serveur ; il n'y a aucune relance
  destructive.
- Dépendances du LOT-07 vérifiées : LOT-02 terminé, BP-00 (#1307) et BP-01
  (#1314) mergés. Le LOT-07 est déclaré lot courant ; sa fiche n'est pas
  modifiée. La décision préalable n'est pas encore réservée au registre (pas
  de D-267 dans `docs/DECISIONS.md`).

## Fichiers modifiés

- `docs/claude/campagnes/2026-09-30-bio-ingest/` : `CAMPAGNE.md`, la fiche
  LOT-03 et la fiche neuve LOT-09.
- `.wn/state.json` : `active_lot`, `last_completed_lot`, la tête de
  `next_action` (l'ancienne est gardée en trace) et `updated_at`.
- `docs/claude/campagnes/ACTIVE_CAMPAIGN.md` et `recent_decision_ids` :
  régénérés par `wn-cycle --appliquer` (T1 rouge sur la vue dérivée avant).
- `changelog.d/2026-10-05-bio-ingest-cloture-lot03.md`, ce handoff et
  `SESSION_LOG`.

## Validations exécutées

`wn-cycle`, `check_no_secrets` (dépôt et lignes indexées), `npm run check`
(audit des campagnes compris), puis le CI de la PR.

## Problèmes ouverts

- BIO-PARCOURS est hors périmètre de cette PR, mais il est lui-même
  incohérent : `lot_courant` vaut toujours LOT-01 (BP-01) alors que BP-01 est
  terminé ; la suite arbitrée est BP-02.
- `BIOFLOW_ROADMAP.md` est déjà mergée (#1317), avant cette clôture. Elle est
  à remettre en forme (arbre court, lot courant et prochain gate par piste).
- Dette de gouvernance : l'auto-merge contourne le contrôle de clôture
  (handoff et `SESSION_LOG`), qui n'est pas un check GitHub (#1315).

## Prochaine action exacte

Arrêt après le merge, sur consigne du responsable. Ensuite viennent la PR de
remise en forme de la roadmap, puis la décision préalable au LOT-07.

## Interdits encore actifs

- Aucun code ni aucune migration du LOT-07 avant la décision préalable
  mergée.
- `ResultatBiologique` ne change pas.
- Pas de worker ni de queue avant la décision sur l'asynchrone durable.
- Pas d'auto-merge sur une PR de lot.
