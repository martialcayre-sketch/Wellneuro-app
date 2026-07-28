-- WellNeuro — suivi de 20260727140000_rag_claim_garde_seuils_v1.
--
-- Constat fait EN BASE DE PRODUCTION juste après le déploiement, en appliquant
-- l'exception migration de CLAUDE.md — « vérifier que la migration a fait ce
-- qu'elle annonçait ». Elle ne l'avait pas fait.
--
-- `REVOKE EXECUTE ... FROM PUBLIC` n'a rien retiré à personne : Supabase pose
-- des ALTER DEFAULT PRIVILEGES qui accordent EXECUTE **explicitement** à anon,
-- authenticated et service_role au moment du CREATE. Le droit de PUBLIC était
-- donc déjà doublé par des grants nominatifs, que la révocation de PUBLIC ne
-- touche pas. ACL constatée :
--
--   postgres=X/postgres | anon=X/postgres | authenticated=X/postgres | service_role=X/postgres
--
-- alors que le précédent posé le 2026-07-21 (20260721230000) affiche, lui,
-- `postgres=X/postgres | service_role=X/postgres`. La différence tient à ce que
-- 20260721090000 révoquait nommément anon et authenticated ; la migration du
-- garde ne l'a pas fait, et son commentaire affirmait pourtant tenir la règle.
--
-- L'exposition est nulle en substance : `rag_claim_porte_seuil` est une
-- fonction PURE d'un argument texte, elle ne lit aucune table et ne rend qu'un
-- booléen. Un appel anonyme via PostgREST ne dit rien d'autre que « cette
-- chaîne ressemble-t-elle à une borne ». Ce qui se corrige ici n'est pas une
-- fuite, c'est l'écart entre ce qu'une migration déclare et ce qu'elle fait —
-- et une exception au principe de fermeture par défaut, qui s'installerait.
--
-- Conditionné à l'existence des rôles, comme 20260721090000 : la base éphémère
-- du CI et celle du banc de worktree n'ont ni anon ni authenticated, la
-- migration y est un no-op.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE EXECUTE ON FUNCTION public.rag_claim_porte_seuil(text) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE EXECUTE ON FUNCTION public.rag_claim_porte_seuil(text) FROM authenticated;
  END IF;
END $$;
