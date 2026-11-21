### NF-7 : la release-db du lot 1 a son constat consigné (H59, D-534 §3, 2026-11-16)

Lot de la file A, sans code ni migration ; lecture seule de la production.

- Le run release-db 43071990332 a appliqué la migration
  `20261111100000_nf7_declaration_suicide_cabinet_v1` (#1976) le 2026-11-11.
  Aucun constat n'avait été consigné.
- Constat a posteriori par conteneur, en lecture seule et en agrégats :
  migration terminée et non annulée, colonnes et contraintes présentes et
  validées. La ligne `WN_CONSTAT_RELEASE_DB` est posée sur #1976.
- Le reste NF-7 relevé par D-534 §3 est levé. La porte 24 reste fermée.
