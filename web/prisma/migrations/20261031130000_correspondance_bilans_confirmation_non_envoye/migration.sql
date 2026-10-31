-- Le journal `correspondances_patient` reprend cinq lignes de bilan écrites
-- « Erreur » alors qu'aucun e-mail n'était parti (audit 3, écart E1 ; D-398).
-- DONNÉES SEULES : aucun changement de schéma, aucune ligne créée ni
-- supprimée, `booklet_envois` n'est pas touché (il reste l'historique).
--
-- Le 2026-07-27 et le 2026-08-16, l'appelant historique rangeait tout statut
-- d'audit autre que `Envoye` dans `Erreur`. Ces cinq lignes sont des
-- confirmations requises (garde du registre anxiogène) : rien n'est parti,
-- rien n'a échoué, mais le panneau Correspondance les affiche « Échec
-- d'envoi ». Depuis le 2026-09-08, `statutJournalDepuisAuditBooklet` écrit
-- ce cas en `Non_envoye`, avec l'objet que reprend cet UPDATE
-- (`logBookletEnvoi`, `api/praticien/booklet/route.ts`).
--
-- Lu en production le 2026-10-31 (conteneur, REPEATABLE READ READ ONLY,
-- agrégats seuls) : 5 lignes visées, sur 2 dossiers, et aucune autre ligne
-- `Erreur` dans le journal. Toutes portent leur clé de source, le même
-- dossier que leur ligne de registre, et la même `erreur_courte` que les
-- trois confirmations écrites depuis le 2026-09-08 : cette colonne reste
-- telle quelle.
--
-- Ciblé par clé : la ligne de registre désignée par `source_id` doit être une
-- confirmation requise du même dossier. Un échec réel (`booklet_envois.statut`
-- autre) reste `Erreur`. Idempotent : rejoué, le filtre sur `Erreur` ne
-- retrouve plus rien. Sur une base neuve (CI), zéro ligne, aucune erreur.
UPDATE "correspondances_patient" AS c
SET "statut" = 'Non_envoye',
    "objet" = CASE WHEN b."operation" = 'Renvoi'
        THEN 'Renvoi du bilan neuronutritionnel — en attente de votre confirmation'
        ELSE 'Envoi du bilan neuronutritionnel — en attente de votre confirmation'
    END
FROM "booklet_envois" AS b
WHERE c."type" = 'booklet'
  AND c."statut" = 'Erreur'
  AND c."source_type" = 'booklet_envoi'
  AND c."source_id" = b."id"
  AND c."id_patient" = b."id_patient"
  AND b."statut" = 'Confirmation_Requise';
