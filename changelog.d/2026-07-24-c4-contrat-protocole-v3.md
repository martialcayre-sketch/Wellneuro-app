### Contrat protocole V3 — référence catalogue de compléments gouvernée (2026-07-24)

Évolution de contrat clinique versionné (C4 LOT-04, option 1 tranchée par le
praticien le 2026-07-24) : le protocole 21 jours peut désormais, en payload V3
explicite, porter une référence **opaque et gouvernée** vers le catalogue de
compléments — posée par le praticien seul, jamais générée par l'IA.

- **`VERSION_PROTOCOL_DRAFT_V3`** déclarée sur le motif exact de la V2 ; le
  type `SupplementCatalogRef` (`ingredientId`, `ruleId`, `ruleVersion`,
  `productId` optionnel, `justification`) est admis uniquement sur une action
  `supplement_exploration`. `productId` reste non résolu tant que le schéma
  produit (LOT-01) n'est pas branché : validation structurelle seule, la
  validation d'existence (FK) arrivera à ce branchement.
- **La garde `FORBIDDEN_SUPPLEMENT_FIELDS` reste intégralement en place** :
  produit, forme, dose et marque en texte libre restent rejetés à toute
  version, V3 comprise. Le protocole continue de parler d'intentions.
- **Fermé en lecture (garantie réelle aujourd'hui)** : le chemin de lecture
  `reconstructProtocolDraft` refuse tout payload de version V3 (garde de version
  V1/V2 seule) — donc aucune référence catalogue ne peut être reconstituée ni
  atteindre la vue patient. C'est la propriété de sécurité porteuse, verrouillée
  par test.
- **Enforcement d'écriture : côté client seulement, à ce stade.** La route de
  persistance `POST /api/praticien/protocoles` enregistre le draft du corps de
  requête sans passer par `buildProtocolDraft` ni par les nouveaux validateurs
  (`assertProtocolDraftSupplementStructure`, `assertSupplementCatalogRef`, qui
  restent du code non câblé — un stub de contrat). La garantie « jamais généré
  par l'IA, structurellement validé » repose donc pour l'instant sur l'UI
  praticien qui n'émet pas de payload V3. **Chantier d'activation** (lot
  ultérieur, avant tout usage réel) : brancher `assertProtocolDraftSupplementStructure`
  dans la route de persistance et dans `reconstructProtocolDraft`, ajouter V3
  aux gardes de version, et prévoir un chemin de révision V3-aware. Détail :
  `docs/claude/campagnes/2026-07-11-complements-clean-label-v1/LOT-04-SUITE-ACTIVATION-V3.md`.
- **`buildProtocolDraft` (chemin de génération)** rejette de son côté toute
  référence catalogue (« exige un payload protocole V3 explicite », même
  mécanique que `foodCompassRef` → V2) ; en V3, `assertSupplementCatalogRef`
  valide structurellement (champs requis non vides, `ruleVersion` entier
  strictement positif, champ inconnu → rejet).
- **Vue patient inchangée** : `patientProtocolView` ne rend rien de la
  référence (ni plans praticien, ni dose) — invariant vérifié par test ; le
  rendu patient-safe arrivera avec la fiche validée (LOT-06).
