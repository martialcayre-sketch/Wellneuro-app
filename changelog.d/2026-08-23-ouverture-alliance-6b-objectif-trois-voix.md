### Campagnes — « Alliance 6.0-B : l'objectif à trois voix » est cadrée, sept lots

- La campagne `2026-08-23-alliance-objectif-trois-voix` est créée et cadrée
  (inactive — `doctrine-executable` reste primaire) : Wellneuro devient
  **force de proposition** sur l'objectif négocié, sous le principe « la
  machine cite, elle n'invente pas ». Une proposition est un assemblage de
  fragments **sourcés** (anamnèse verbatim, restitution `Q_MOD_03`,
  candidats signés de la chaîne C1) — un fragment sans source est
  inconstructible.
- Le cycle complet est à trois voix : la machine propose (côté praticien
  seul), le praticien reprend/amende/écarte avec motif, le patient ratifie,
  conteste ou **« le dit autrement »** (contre-proposition dans ses mots,
  append-only, verbe nouveau du portail). L'adhésion se **constate** en
  récit, ne se compte jamais ; l'évaluation se mesure aux jalons
  J21/J42/J90, ancrée à la version exacte de l'objectif (mots + EVA brute).
- Périmètre d'application : **tous les patients actuels** (arbitrage du
  praticien du 2026-08-23 — tous sont des bêta-testeurs réels et informés),
  avec interrupteur de repli par liste d'identifiants. Le périmètre
  restreint de `D-093` (recommandations élargies) reste **inchangé** : sa
  raison est le classement non signé, pas le statut des patients ; le LOT-06
  de la campagne (bilan, gate de consolidation) en prépare la levée en
  fabriquant la provenance du classement.
- Frontière avec `doctrine-executable` (parallèle) : 6.0-B ne touche jamais
  `clinical-engine/` ; sa migration (`propositions_objectif`, LOT-01 à
  confirmation obligatoire) passe **derrière** la migration du schéma de
  claim dans `release-db` ; la clôture de `D-093` appartient à 6.0-B.
- Sept lots : doctrine fondatrice (`D-xxx` à réserver), migration, moteur
  déterministe (gardes G7), cockpit (diff proposé↔négocié), portail « dire
  autrement » (P0), jalons (P0), bilan et gate. Aucun code dans cette PR —
  cadrage seul.
