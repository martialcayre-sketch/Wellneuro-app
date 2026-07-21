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

## État des gates (2026-07-21)

- **G0 acté** par décision utilisateur du 2026-07-21 (verdict global sur les
  droits des supports SIIN — `docs/claude/REGISTRE_FRONTIERES.md`, A9). Le
  passage `rightsStatus: verified` de chaque notice se fait **à l'ingestion
  de la source**, jamais en masse : une notice non ingérée reste `to_verify`.
- **G1–G4** : portés par la machine à états `NOTEBOOK_VALIDATIONS` (verdict
  CONFORME + preuve + validateur + date, par notebook).
- **G5 acté** par la PR #196 (migration `20260721090000_add_pgvector_rag`,
  relue et corrigée après audit).
- **G6** : non ouvert.

La date source déclarée par le pack est le 2026-07-14. L'audit et
l'intégration réels ont été réalisés le 2026-07-13.
