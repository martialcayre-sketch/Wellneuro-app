### Ajouté

- Registre des sources d'intervention NNPP2
  (`docs/claude/corpus/nnpp2_interventions_registry.json`, LOT-00 de la campagne
  `2026-08-03-packs-moteur-d-intervention-et-corpus-consommable`) : **95 sources
  sur 12 notebooks** — fiches de synthèse, ordonnances commentées, fiches
  protocole, doctrine d'exploration — portant 2002 claims (1247 validés, 755 en
  attente, 1004 prescriptifs). Rien ne distinguait jusqu'ici une conduite d'un
  support de cours ; les LOT-03 et LOT-05 n'avaient donc pas de matière désignée.
  Le critère de sélection est rejouable et inscrit dans l'artefact : `documentType`
  déclaré ∪ motif de titre, moins le notebook 00. **Le champ déclaré prime sur le
  titre** — le titre seul ratait 51 sources sur 99, dont toute la doctrine
  d'exploration.
- Garde `npm run interventions-check`
  (`scripts/lib/verifier_registre_interventions.js` + banc `node --test`, 26 cas) :
  référence croisée avec `source_registry.json`, disjonction gardée avec
  `instrument_registry.json` (un instrument relève du banc `certify`, pas de la
  chaîne de claims), `statutValidation` recalculé plutôt que cru sur parole, motif
  obligatoire sur toute source écartée ou sans claim. Chaque invariant a son cas
  d'échec prouvé, et une contre-lecture du périmètre attrape l'entrée oubliée à la
  saisie — qu'aucun contrôle d'intégrité interne ne verrait.

### Modifié

- Campagne `2026-08-03-packs-moteur-d-intervention-et-corpus-consommable` : le
  périmètre passant de 48 à 95 sources, LOT-01 passe de 327 à **755 claims** à
  valider. L'arbitrage PMI-2 tient — 755 reste très loin des 2982 du corpus
  entier — mais `CAMPAGNE.md`, `LOT-01`, `AUDIT_ETAT_REEL.md` et
  `INVENTAIRE_SOURCES_INTERVENTION.md` ont été remis d'équerre.
