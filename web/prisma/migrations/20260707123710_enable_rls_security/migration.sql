-- Sécurité : activer Row Level Security (RLS) sur toutes les tables applicatives.
--
-- Contexte : l'API REST Supabase (PostgREST) est exposée avec la clé anon/publishable,
-- publique côté client. Sans RLS, les rôles `anon` et `authenticated` peuvent lire/écrire
-- toutes les lignes, y compris les données patients. L'application n'utilise PAS le client
-- PostgREST : elle accède à la base uniquement via Prisma en connexion Postgres directe
-- (rôle propriétaire des tables), qui contourne RLS. Activer RLS sans policy applique donc
-- un deny-all pour anon/authenticated tout en laissant l'app intacte.
--
-- Aucune policy n'est créée volontairement : deny-all par défaut = posture voulue.

ALTER TABLE "public"."patients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."assignations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."questionnaire_reponses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."syntheses_ia" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."audit_syntheses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."booklet_envois" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."neuro_axis" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."nutrient_axis_weight" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."supplement_ingredients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."supplement_ingredient_formes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."supplement_source_references" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."supplement_safety_alerts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."clinical_intent_tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."clinical_criteria" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."functional_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."clinical_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ingredient_functional_thresholds" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."protocol_review_flags" ENABLE ROW LEVEL SECURITY;

-- `_prisma_migrations` n'existe pas dans la shadow database créée par
-- `prisma migrate dev` (Prisma ne l'y réplique pas), ce qui faisait échouer la
-- vérification de drift (P3006). On rend l'activation RLS conditionnelle :
-- appliquée sur les bases réelles (où la table existe), ignorée dans la shadow.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = '_prisma_migrations'
  ) THEN
    EXECUTE 'ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;
