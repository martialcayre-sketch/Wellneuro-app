### Campagnes — Alliance 6.0-A « le dossier à deux voix » s'ouvre en primaire, six lots cadrés sur mesures

- La campagne `2026-08-21-alliance-dossier-deux-voix` passe d'init-only à
  ouverte : CAMPAGNE.md et six lots écrits le 2026-08-22, sur un état réel
  **re-mesuré** (constats du brief confrontés au dépôt, citations
  `fichier:ligne`) — première campagne 6.0 derrière le gate posé par le Socle.
- **Le cadrage corrige et enrichit le brief sur trois points** : le patron
  pour tout texte patient est désormais `correspondance/registreGabarits.ts`
  (livré par le Socle LOT-03 — le patron trust n'a ni deux dates ni chaîne de
  hash ; « chaîné » s'entend par référence) ; le cycle
  `brouillon → grille_a_relire → valide` existe déjà sur `CabinetInstrument`
  (`schema.prisma:1450`) — l'EVA (LOT-05) devient **indépendante de la
  migration** ; l'ancrage de l'objectif négocié a **deux sources existantes**
  (anamnèse `motif_principal`/`attentes` figée en `anamnese Json?` + plainte
  dominante Q_MOD_03 affichée au cockpit depuis `D-054`).
- Lots : LOT-01 migration append-only à deux dates (**confirmation
  obligatoire**, seule dans sa PR, RLS d'office) ; LOT-02 objectif négocié
  v1 (jamais un score, `DC-27`/`DC-31`/`DC-32`) ; LOT-03 « ce qui compte pour
  moi aujourd'hui » (silence ≠ réponse, `DC-24`) ; LOT-04 synthèse de
  compréhension gardée + désaccord structuré (`DC-30`, derrière le circuit du
  Socle) ; LOT-05 EVA voie instrument cabinet (aucun seuil,
  `DC-19`/`DC-20`) ; LOT-06 écran portail « dossier à deux voix » (tranche
  E4, ratification, constat du gate).
- **Gate de campagne** : la ratification patient précède toute activation
  élargie protocole→produits (`priorityRulesV1` signée). File d'attente et
  état resynchronisés (`activate`, `next_action` tracé).
