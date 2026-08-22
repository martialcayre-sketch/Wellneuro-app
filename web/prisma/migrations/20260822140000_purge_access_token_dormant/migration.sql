-- D-085 §5 (2026-08-22) : purge des colonnes de VALEUR du jeton permanent —
-- la « PR 2 » annoncée par #397. Le jeton n'est plus un credential depuis
-- #397 (cookie de session signé seul) : ces valeurs en clair sont des
-- secrets morts, et les garder hébergées est le résidu nommé des exigences
-- 2/4 du gate G-TRUST-04.
--
-- Périmètre corrigé le jour même : DEUX colonnes, pas trois —
-- `access_token_revoked` est le drapeau VIVANT de révocation du portail
-- (posé par la route praticien `token`, honoré aux trois entrées) et reste.
--
-- Le DROP de `access_token` emporte son index unique. Aucune donnée de santé
-- concernée ; la copie Supabase, gardée chaude pour rollback, sera effacée en
-- entier au décommissionnement (D-080, 2026-09-01).
ALTER TABLE "patients" DROP COLUMN "access_token";
ALTER TABLE "patients" DROP COLUMN "access_token_created_at";
