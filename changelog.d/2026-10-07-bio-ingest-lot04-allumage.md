### BIO-INGEST LOT-04 : transmission par le patient ouverte en production (D-269, 2026-10-07)

- #1355 déployée (image 95c97c9f, tête de `main`) ; `usage_ia` v6 et
  `donnees_confidentialite` v13 constatées dans l'image servie (`D-248`).
- `WN_BIO_PORTAIL_ENABLED` posé le 2026-10-07 à 17:53 UTC, geste délégué par
  le responsable ; effet constaté : `api/portail/comptes-rendus` en `401` sans
  session (était `503`), page « Transmettre un compte rendu d'analyses »
  servie (était 404).
