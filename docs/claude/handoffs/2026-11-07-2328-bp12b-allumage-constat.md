# Handoff — 2026-11-07 — BP-12b (F09), allumage de l'atelier des positions d'expert

## Branche et état du dépôt

- Branche `docs/bp12b-allumage-constat`, worktree neuf
  `.claude/worktrees/b-bp12b-allumage-constat`, depuis `origin/main`
  `88abb491` (#1924), qui contient #1918 (`70fd1db4`, D-458).
- Documentation seule ; D-373 : déclarer « prête @sha » avec ce handoff
  en commentaire de PR, sans merger.

## Objectif

Consigner la pose du drapeau et son constat technique, sans verser de position.

## Décisions prises

- Le responsable a délégué explicitement les deux commandes de pose et de
  redémarrage. Aucun autre geste d'écriture en production.
- Chronologie Scalingo : variable ajoutée et redémarrage à
  **2026-11-07 22:26:18 UTC**. Les deux conteneurs web et le worker portent
  cette heure de création ; ils sont en cours d'exécution.
- D-439 §5-§6 et A2-A3, D-458 et les arbitrages du 2026-11-06 restent
  inchangés. Aucun versement, signature ni arbitrage dans ce lot.

## Fichiers modifiés

- `docs/FEATURE_FLAGS.md` : pose et constat technique datés.
- `docs/claude/plan-journal/F09/2026-11-07-03-allumage-positions-expert.md`
  (rang 03 relu sur `origin/main`, rangs 01 et 02 occupés).
- Ce handoff ; hors dépôt : ligne p27 de BioFlow à actualiser.

## Validations exécutées

- Première ligne des déploiements : `70fd1db4`, succès ; même version dans
  les one-off 866 et 4873 avant la pose, puis 8422 après redémarrage.
- Sonde release-db sur #1924 : code 0, aucun run non conclu.
- Avant : route sans session en 404, garde des validateurs présente,
  drapeau éteint ; 0 version, 0 acte, 0 arbitrage (one-off 4873).
- Après : route sans session en 401, drapeau actif, garde présente ;
  mêmes compteurs à 0 (one-off 8422, 22:26:30 UTC, lecture seule).
- Absence d'arbitrage au cockpit établie par le compteur nul et le lecteur
  `lireArbitragesAuCockpit`, qui ne liste que les têtes existantes ; aucun
  dossier patient ouvert pour ce contrôle.
- T1 complet et anti-secrets : résultats consignés dans la PR.

## Problèmes ouverts

- Vérification visuelle par le responsable encore attendue : page
  `/dashboard/bibliotheque/positions-expert` ouverte et conflits du registre
  signé `a0da49fd` affichés. Le constat technique ne vaut pas ce constat écran.
- Mise à jour de p27 de BioFlow encore à effectuer ; aucun outil ArtifactData
  n'est disponible dans cette session. L'URL privée reste hors dépôt.
- Revue de la PR et CI à lire avant de la déclarer prête.

## Prochaine action exacte

1. Recueillir le constat écran du responsable et mettre à jour p27.
2. T1 complet, anti-secrets, commit, PR ; CodeRabbit sur la tête, sinon
   PR-Agent prouvé à 0, sinon wn-reviewer (D-448). Un verdict par remarque.
3. Déclarer « prête @sha » avec le chemin de ce handoff, sans merger.
4. Suite, hors de ce lot : versement et signature par le responsable à
   l'atelier ; arbitrage fiche par fiche seulement après le constat de la
   curation des conflits polyphénols par l'autre session. Re-signature du
   registre : arbitrages des entrées modifiées « à relire » (D-439 A3).

## Interdits encore actifs

- Production en lecture seule après les deux commandes déléguées.
- Aucune migration, aucun `schema.prisma`, aucun code applicatif modifié.
- Aucun versement, signature ni arbitrage par l'assistant.
- Aucune valeur de variable d'environnement ni donnée patient au dépôt.
- Ne pas merger cette PR (D-373).
