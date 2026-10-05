# Handoff — 2026-10-05 — Gouvernance : incohérences 3, 4 et 5 tranchées

## Branche et état Git

`docs/gouvernance-incoherences-3-4-5`, partie de `main` (7dbd2ba5). Ce
changement est de la documentation et de l'état du cycle seulement.

## Objectif

Trancher trois incohérences relevées à la clôture de BIO-INGEST LOT-03
(#1318).

## Décisions prises (arbitrages du responsable, 2026-10-05)

1. **Identifiant de dossier** : règle prospective, sans réécriture de
   l'historique.
   - Une règle est ajoutée à `.claude/rules/docs-changelog.md` : un
     identifiant de dossier réel ne s'accompagne jamais de mesures de son
     contenu dans un fichier durable.
   - La copie vivante dans `.wn/state.json` est retirée.
   - Les fixtures de code ne sont pas visées.
2. **Dette auto-merge** : inscrite dans `HISTORIQUE_CHANTIERS_TECHNIQUES.md`
   (« Dette technique restante »), sous forme de lot outillage à faire. Rien
   n'est implémenté. En attendant, pas d'auto-merge sur une PR de lot tant
   que sa clôture manque.
3. **LOT-09** : placé juste après LOT-07, avant le chantier worker. Après
   LOT-07, la relance permet de relire sous le nouveau procédé un compte rendu
   sans ligne validée.

## Fichiers modifiés

- `.claude/rules/docs-changelog.md`.
- `.wn/state.json` : la copie de l'identifiant et l'ordonnancement de LOT-09.
- `docs/HISTORIQUE_CHANTIERS_TECHNIQUES.md`.
- BIO-INGEST : `CAMPAGNE.md` et la fiche LOT-09.
- `changelog.d/2026-10-05-gouvernance-incoherences-3-4-5.md`, ce handoff et
  l'entrée `SESSION_LOG.md`.

## Validations exécutées

`check_no_secrets`, `npm run check`, puis le CI de la PR.

## Problèmes ouverts

- Restent dans `.wn/state.json` d'autres identifiants de dossier, dans des
  traces opérationnelles (envoi d'un bilan, dossier de contrôle). Ils ne
  portent aucune mesure clinique : ils sont conformes à la règle et laissés
  en place.
- L'état des lieux du 2026-10-04 est à verser quand son texte sera fourni.

## Prochaine action exacte

La décision préalable au LOT-07, sur feu vert du responsable.

## Interdits encore actifs

- Aucun code ni aucune migration du LOT-07 avant la décision préalable
  mergée.
- Pas d'auto-merge sur une PR de lot sans sa clôture.
