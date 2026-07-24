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
- **Fermé par défaut** : `buildProtocolDraft` (V1) rejette toute référence
  catalogue (« exige un payload protocole V3 explicite », même mécanique que
  `foodCompassRef` → V2) ; en V3, la référence est validée structurellement
  (champs requis non vides, `ruleVersion` entier strictement positif, champ
  inconnu → rejet). Aucun chemin d'écriture de production ne produit encore de
  payload V3 : l'instrument bibliothèque qui posera la référence arrive dans un
  lot ultérieur, et le chemin de lecture (`reconstructProtocolDraft`) refuse un
  payload V3 tant qu'il n'est pas ouvert délibérément.
- **Vue patient inchangée** : `patientProtocolView` ne rend rien de la
  référence (ni plans praticien, ni dose) — invariant vérifié par test ; le
  rendu patient-safe arrivera avec la fiche validée (LOT-06).
