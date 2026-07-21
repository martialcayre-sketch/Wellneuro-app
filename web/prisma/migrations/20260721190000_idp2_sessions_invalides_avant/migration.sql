-- IDP2 LOT-02b — la session patient cesse d'être ancrée au jeton porteur.
-- Migration confirmée explicitement par l'utilisateur le 2026-07-21.
--
-- ADDITIVE UNIQUEMENT : une colonne nullable. Aucune colonne existante
-- modifiée, aucun DROP, aucun renommage, aucun backfill.
-- Rollback = abandon de la colonne.
--
-- APPLIQUER CETTE MIGRATION NE DÉCONNECTE PERSONNE. La colonne naît à NULL sur
-- les 17 dossiers, et NULL vaut « aucune session invalidée ». Les 13 accès
-- portail ouverts restent ouverts.
--
-- POURQUOI UNE DATE PLUTÔT QUE LA RELECTURE DE `access_token_revoked`. Le
-- cookie portail scelle aujourd'hui l'empreinte du jeton permanent : la
-- révocation d'une session n'existe que par ce jeton. LOT-04 retire
-- `patients.access_token` — il retirerait le coupe-circuit avec lui. Une date
-- d'invalidation appartient au COMPTE : elle survit au retrait du jeton, et
-- elle porte une propriété que le booléen n'a pas — une révocation ne se défait
-- pas par effet de bord d'une réémission d'accès.
--
-- SÉMANTIQUE. Une session portail porte sa date d'émission (`iat`). Elle est
-- refusée si `sessions_invalides_avant` est postérieure à cette date. Révoquer
-- pose la date ET `access_token_revoked = true` ; réémettre ne défait que le
-- second.

ALTER TABLE "patients" ADD COLUMN "sessions_invalides_avant" TIMESTAMP(3);

-- BACKFILL — il transporte l'état de révocation d'aujourd'hui, il n'en crée
-- aucun. Sans lui, deux propriétés existantes se perdraient au déploiement.
--
-- 1) Les cookies déjà en circulation ne portent pas de date d'émission : elle
--    est reconstruite depuis leur expiration. Sous l'ancien modèle, un tel
--    cookie mourait dès que le jeton tournait — c'était la propriété annoncée
--    au praticien. `access_token_created_at` la reproduit à l'identique : toute
--    session antérieure au jeton courant tombe, toute session postérieure
--    survit. Ne déconnecte donc personne dont l'accès est réellement ouvert.
UPDATE "patients"
SET "sessions_invalides_avant" = "access_token_created_at"
WHERE "access_token_created_at" IS NOT NULL;

-- 2) Un dossier déjà révoqué doit le rester quand le jeton permanent
--    disparaîtra (LOT-04) : c'est ici, et seulement ici, que l'information
--    « ce compte est révoqué » existe encore. Ces comptes n'ont par
--    construction aucun accès ouvert.
UPDATE "patients"
SET "sessions_invalides_avant" = now()
WHERE "access_token_revoked" = true;
