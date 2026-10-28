-- Colonne « objectif » des deux panels non indiqués — DONNÉES SEULES (D-389 §4).
-- Le motif de BIO-NIA-01 et de BIO-NIA-02 est la lecture signée que le
-- responsable fait du claim cité (D-389 §1), pas une citation : la colonne
-- perd le mot que la migration d'août lui donnait, et garde le claim et le
-- motif de la table signée `indicationsBiologieV1.ts`, reproduit mot pour mot
-- (apostrophe typographique comprise). La migration d'août reste intacte.
--
-- Aucun DDL, aucune règle, aucune valeur biologique patient. Mise à jour
-- ciblée par code de panel, idempotente : rejouée, elle ne change aucune ligne.
-- Le banc `objectifLectureSignee.migration.test.ts` relit ces deux UPDATE
-- contre la table signée.

-- ── Garde : les deux panels existent (migration d'août), sinon une mise à
-- jour sans ligne passerait pour appliquée.
DO $$
BEGIN
  IF (SELECT count(*) FROM "biology_panels"
      WHERE "code" IN ('PANEL_MG_PLASMATIQUE', 'PANEL_CORTISOL_ISOLE')) <> 2 THEN
    RAISE EXCEPTION 'D-389 §4 : un des deux panels non indiqués est absent — mise à jour refusée';
  END IF;
END $$;

UPDATE "biology_panels" SET "objectif" = 'Non indiqué actuellement — WN-CL-0242-007, lecture signée du responsable : « Le dosage plasmatique du magnésium circulant n’est pas recommandé en première intention : seulement 1 % du pool magnésien se trouve sous cette forme. L’exploration pertinente est le magnésium érythrocytaire. »', "updated_at" = CURRENT_TIMESTAMP WHERE "code" = 'PANEL_MG_PLASMATIQUE' AND "objectif" IS DISTINCT FROM 'Non indiqué actuellement — WN-CL-0242-007, lecture signée du responsable : « Le dosage plasmatique du magnésium circulant n’est pas recommandé en première intention : seulement 1 % du pool magnésien se trouve sous cette forme. L’exploration pertinente est le magnésium érythrocytaire. »';
UPDATE "biology_panels" SET "objectif" = 'Non indiqué actuellement — WN-CL-0042-007, lecture signée du responsable : « Une mesure matinale unique de cortisol est peu fiable en raison des variations inter-individuelles et des rythmes biologiques ; l’exploration pertinente est le cortisol awakening response, qui repose sur deux mesures matinales. »', "updated_at" = CURRENT_TIMESTAMP WHERE "code" = 'PANEL_CORTISOL_ISOLE' AND "objectif" IS DISTINCT FROM 'Non indiqué actuellement — WN-CL-0042-007, lecture signée du responsable : « Une mesure matinale unique de cortisol est peu fiable en raison des variations inter-individuelles et des rythmes biologiques ; l’exploration pertinente est le cortisol awakening response, qui repose sur deux mesures matinales. »';
