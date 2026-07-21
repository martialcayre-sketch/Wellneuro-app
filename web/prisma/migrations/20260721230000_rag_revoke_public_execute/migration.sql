-- La création d'une fonction accorde EXECUTE à PUBLIC par défaut ; la
-- révocation de 20260721090000_add_pgvector_rag ne visait qu'anon et
-- authenticated. Constaté en production le 2026-07-21 après déploiement
-- (proacl `=X/postgres`) : anon héritait encore de l'exécution via PUBLIC.
-- Sans policy, le RLS rendait déjà la recherche vide pour anon — ceci
-- referme l'exécution elle-même. postgres (propriétaire, runtime Prisma)
-- et service_role conservent leurs droits explicites.
REVOKE EXECUTE ON FUNCTION public.match_wellneuro_rag_chunks(
  extensions.vector, integer, double precision, text, text[], text[]
) FROM PUBLIC;
