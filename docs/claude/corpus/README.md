# Registre sanitaire du corpus clinique

`source_registry.json` contient 391 notices normalisées issues du pack WN
Ultimate v2. Il s'agit d'un inventaire documentaire, pas d'un corpus runtime.

## Politique de publication

- Les `sourceId` sont les seules références de localisation versionnées.
- URL, chemins, identifiants Drive et liens de doublons Drive restent dans un
  registre externe à accès restreint.
- Toutes les notices restent `rightsStatus: to_verify` et
  `clinicalReviewStatus: not_reviewed`.
- `contentHash` reste nul tant que le contenu probant n'a pas été obtenu,
  vérifié et autorisé.
- Aucune notice ne peut alimenter un prompt, un RAG, une règle, un document
  patient ou une décision clinique avant les gates G0–G4.
- Toute migration PostgreSQL/pgvector exige G5 ; le pilote
  sommeil/chronobiologie exige G6.

La date source déclarée par le pack est le 2026-07-14. L'audit et
l'intégration réels ont été réalisés le 2026-07-13.
