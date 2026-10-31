### Audit 3, lot Q1 : les cinq faux « Échec d'envoi » de bilan repris en « Non envoyé » (D-398)

- Migration de données `20261031130000_correspondance_bilans_confirmation_non_envoye` :
  un seul UPDATE, idempotent, sur le journal `correspondances_patient`. Il
  vise les lignes de bilan en `Erreur` dont la clé de source désigne une
  confirmation requise du même dossier au registre `booklet_envois`. Elles
  passent en `Non_envoye`, avec l'objet que le code écrit depuis le
  2026-09-08 (« … — en attente de votre confirmation »). Lu en production le
  2026-10-31 : 5 lignes sur 2 dossiers, écrites les 2026-07-27 et 2026-08-16.
  Le panneau Correspondance cessera de les afficher « Échec d'envoi ».
- Aucun changement de schéma ; `booklet_envois` et `erreur_courte` restent
  tels quels ; un échec réel reste `Erreur`.
- D-398 consigne aussi les arbitrages de l'audit 3 : option A aux quatre
  questions, garde d'une heure sur les e-mails d'accès et d'objectif (refus
  écrit « Non envoyé », jamais rejoué), lots Q1 puis Q4 puis Q3, Q2 sans lot.
- Nouveau banc `bilans-confirmation-non-envoye.migration.test.ts`, qui lit le
  SQL livré et l'objet écrit par la route du bilan.
- S'applique par release-db (D-087), puis se constate par conteneur.
