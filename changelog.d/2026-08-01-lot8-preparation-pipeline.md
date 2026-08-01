### Interne

- **Lot 8 — le pipeline de claims sait marquer et filtrer l'orientation.**
  `draft.mjs` gagne `--usage orientation` : chaque claim produit porte
  `metadata.usage` (le serveur passe `metadata` tel quel en JSONB, couvert par
  trois tests nouveaux sur `parseRagClaimsIngestPayload`), et le drafting
  applique un filtre par construction (`tools/corpus/claims/lib/
  filtre-orientation.mjs`, banc branché dans `run-certify-bancs.sh` qui exige
  désormais des bancs dans les deux dossiers) : quarantaine sanitaire exclue
  quelle que soit la thématique, perfusion (WN-SRC-0244) seule exclusion
  A-009 restante après l'amendement de la décision f. Un runbook
  (`tools/corpus/claims/README.md`) donne la séquence exacte du run sommeil —
  12 PDF ingérables sur 17 sources (4 MP4 à transcrire, WN-SRC-0318 en
  quarantaine) — et documente le trou d'immuabilité de `metadata` (une
  ré-ingestion ne requalifie jamais un claim existant).
