-- Catalogue biologie — trois unités calées sur ce que le laboratoire imprime
-- (D-264, LOT-06 de BIO-INGEST). Une unité au vocabulaire, trois unités
-- d'analyte changées : aucune plage, aucune borne, aucune conversion (D-157).
--
-- Le premier compte rendu réel n'imprime l'hémoglobine et la CCMH qu'en g/dL,
-- et les folates érythrocytaires qu'en ng/mL. Le catalogue les attendait en g/L
-- et en nmol/L : aucune ligne n'était validable, et passer de l'une à l'autre
-- serait une conversion. L'unité retenue reste UNIQUE par analyte ; elle suit
-- désormais l'impression (arbitrage du responsable, 2026-10-03), par
-- dérogation à la règle SI de D-261 §2 pour ces trois-là seulement.
--
-- AUCUNE VALEUR BIOLOGIQUE PATIENT : ce fichier n'écrit dans aucune table de
-- résultats.

-- ── Garde : changer l'unité d'un analyte qui porte déjà une mesure ou une
-- plage rendrait cette mesure fausse. Constaté vide le 2026-10-03 par
-- conteneur ; la garde tient jusqu'à l'application.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "resultats_biologiques"
    WHERE "analyte_code" IN ('BIO_HEMOGLOBINE', 'BIO_CCMH', 'BIO_FOLATES_ERYTHROCYTAIRES')
  ) OR EXISTS (
    SELECT 1 FROM "biology_reference_ranges"
    WHERE "analyte_code" IN ('BIO_HEMOGLOBINE', 'BIO_CCMH', 'BIO_FOLATES_ERYTHROCYTAIRES')
  ) OR EXISTS (
    SELECT 1 FROM "biology_functional_ranges"
    WHERE "analyte_code" IN ('BIO_HEMOGLOBINE', 'BIO_CCMH', 'BIO_FOLATES_ERYTHROCYTAIRES')
  ) THEN
    RAISE EXCEPTION 'D-264: un résultat ou une plage porte déjà l''unité ancienne — changement d''unité refusé';
  END IF;
END $$;

-- ── Extension ADDITIVE du vocabulaire d'unités : « g/dL » ─────────────────
-- Sur les quatre CHECK ensemble (« défini une fois, appliqué quatre fois »).
ALTER TABLE "biology_analytes" DROP CONSTRAINT "biology_analytes_unite_check";
ALTER TABLE "biology_analytes" ADD CONSTRAINT "biology_analytes_unite_check"
    CHECK ("unite" IS NULL OR "unite" IN (
        'g/L', 'mg/L', 'µg/L', 'ng/L', 'ng/mL', 'pg/mL', 'µg/dL', 'mg/dL',
        'mol/L', 'mmol/L', 'µmol/L', 'nmol/L', 'pmol/L',
        'UI/L', 'mUI/L', 'UI/mL', 'kUI/L',
        'g/24h', 'mg/24h', 'µg/24h', 'µg/g', 'mg/g', 'µg/mL',
        '10^9/L', '10^12/L', 'fL', 'pg', '%', 'ratio', 'score',
        'mL/min/1,73 m²', 'g/dL'));
ALTER TABLE "biology_reference_ranges" DROP CONSTRAINT "biology_reference_ranges_unite_check";
ALTER TABLE "biology_reference_ranges" ADD CONSTRAINT "biology_reference_ranges_unite_check"
    CHECK ("unite" IN (
        'g/L', 'mg/L', 'µg/L', 'ng/L', 'ng/mL', 'pg/mL', 'µg/dL', 'mg/dL',
        'mol/L', 'mmol/L', 'µmol/L', 'nmol/L', 'pmol/L',
        'UI/L', 'mUI/L', 'UI/mL', 'kUI/L',
        'g/24h', 'mg/24h', 'µg/24h', 'µg/g', 'mg/g', 'µg/mL',
        '10^9/L', '10^12/L', 'fL', 'pg', '%', 'ratio', 'score',
        'mL/min/1,73 m²', 'g/dL'));
ALTER TABLE "biology_functional_ranges" DROP CONSTRAINT "biology_functional_ranges_unite_check";
ALTER TABLE "biology_functional_ranges" ADD CONSTRAINT "biology_functional_ranges_unite_check"
    CHECK ("unite" IN (
        'g/L', 'mg/L', 'µg/L', 'ng/L', 'ng/mL', 'pg/mL', 'µg/dL', 'mg/dL',
        'mol/L', 'mmol/L', 'µmol/L', 'nmol/L', 'pmol/L',
        'UI/L', 'mUI/L', 'UI/mL', 'kUI/L',
        'g/24h', 'mg/24h', 'µg/24h', 'µg/g', 'mg/g', 'µg/mL',
        '10^9/L', '10^12/L', 'fL', 'pg', '%', 'ratio', 'score',
        'mL/min/1,73 m²', 'g/dL'));
ALTER TABLE "resultats_biologiques" DROP CONSTRAINT "resultats_biologiques_unite_check";
ALTER TABLE "resultats_biologiques" ADD CONSTRAINT "resultats_biologiques_unite_check"
    CHECK ("unite" IS NULL OR "unite" IN (
        'g/L', 'mg/L', 'µg/L', 'ng/L', 'ng/mL', 'pg/mL', 'µg/dL', 'mg/dL',
        'mol/L', 'mmol/L', 'µmol/L', 'nmol/L', 'pmol/L',
        'UI/L', 'mUI/L', 'UI/mL', 'kUI/L',
        'g/24h', 'mg/24h', 'µg/24h', 'µg/g', 'mg/g', 'µg/mL',
        '10^9/L', '10^12/L', 'fL', 'pg', '%', 'ratio', 'score',
        'mL/min/1,73 m²', 'g/dL'));

-- ── Trois unités d'analyte, une instruction chacune ────────────────────────
-- Une par ligne : le banc du resolver relit ces UPDATE pour connaître l'unité
-- en vigueur (`resolverLibellesV1.test.ts`).
UPDATE "biology_analytes" SET "unite" = 'g/dL', "updated_at" = CURRENT_TIMESTAMP WHERE "code" = 'BIO_HEMOGLOBINE';
UPDATE "biology_analytes" SET "unite" = 'g/dL', "updated_at" = CURRENT_TIMESTAMP WHERE "code" = 'BIO_CCMH';
UPDATE "biology_analytes" SET "unite" = 'ng/mL', "updated_at" = CURRENT_TIMESTAMP WHERE "code" = 'BIO_FOLATES_ERYTHROCYTAIRES';
