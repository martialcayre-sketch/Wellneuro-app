# 2026-08-22 11:14 — Le Socle s'ouvre en primaire, cadré sur mesures

## Ce qui a changé

- **Campagne ouverte** : `2026-08-21-socle-restitution-sure` — CAMPAGNE.md +
  trois lots, `activate --lot LOT-01` + `sync`, FILE_ATTENTE rang 1 →
  PRIMAIRE, `next_action` tracé.
- **Le cadrage est écrit sur des mesures du 2026-08-22, pas sur le brief** :
  cinq constats vérifiés par workflow (citations `fichier:ligne`), cinq
  corrections — la table « État réel au cadrage » de CAMPAGNE.md fait foi.
  Les plus lourdes : booklet et courrier médecin **ont déjà** leurs gardes ;
  les dettes réelles sont la garde de synthèse **journalisante à point
  unique** (`synthese/route.ts:560-587`) et le bilan portail servi **sans
  re-vérification** ; la correction d'en-tête d'`orientationRulesV1` est un
  **geste clinique** (sha épinglé) jamais acté par `D-042`.

## À savoir pour la suite

- **LOT-01** : bancs de débranchement par chemin + re-vérification au service
  du bilan portail. **Aucun verdict existant ne change** — l'arbitrage
  journalisant/bloquant de la garde de synthèse s'instruit au lot et se
  tranche par le responsable, jamais par le lot.
- **LOT-02** : huit fichiers au niveau « demande » (la liste re-mesurée après
  #734 — `corpusSyntheseV1` signée `D-082` pendant l'ouverture même) ;
  l'en-tête sous `D-xxx` avec re-épinglage du sha ; relecture adversariale du
  diff de hook obligatoire. Candidat restant : `stopRulesLibelles`.
- **LOT-03** : registre de gabarits au patron trust **adapté** (deux dates =
  ajout, pas de hash-chain) ; huit gabarits déménagés au caractère près,
  écarts « aucune donnée de santé » déclarés, jamais corrigés (décision
  praticien hors campagne).
- **Doublons « fichier 2.md »** : 21 purgés (tous byte-identiques à leur
  original, zéro divergent) — un mécanisme local (iCloud/Finder ?) duplique
  des fichiers dans le dépôt ; si le phénomène revient, le nommer au
  responsable plutôt que purger en silence.

## Ouvert

- PR d'ouverture en cours (CI) ; puis LOT-01 sur branche fraîche.
- Arbitrages responsables pendants : journalisant/bloquant (LOT-01),
  `stopRulesLibelles` (LOT-02), base E2E dédiée du Mac (handoff 10:23),
  commentaire du verrou `isCbResultsEnabled` (CB-09).
