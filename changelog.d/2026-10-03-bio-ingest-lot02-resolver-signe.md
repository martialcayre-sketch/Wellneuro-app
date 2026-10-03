### BIO-INGEST LOT-02 : le resolver libellé → analyte est signé (2026-10-03)

- **`resolverLibellesV1` signé** ([[D-259]]) : 98 entrées, 43 analytes, relues
  sur la surface `SURFACE_RELECTURE_RESOLVER_LIBELLES_2026-10-03.md`. L'import
  propose désormais l'analyte d'un libellé lu ; le praticien le confirme ou le
  corrige, et une unité divergente reste refusée.
- **Enrôlé dans `shaPerimetreLitteral.guard.test.ts`** le jour de sa
  signature : l'empreinte est un littéral, jamais la constante calculée.
- Le premier passage du cron de purge est constaté (2026-10-03, 0 candidat,
  0 échec). Le drapeau `WN_BIO_INGEST_ENABLED` reste éteint : sa pose suit
  les conditions de `docs/FEATURE_FLAGS.md`, puis le constat de `after()` en
  production.
