# Entrées archivées SESSION_LOG — 2026-07-04 à 2026-07-10 (compact)

Archivées le 2026-07-11 pour garder le journal actif court et orienté reprise. Les détails complets restent dans l'historique git et, pour les toutes premières entrées, dans `docs/archive/sessions/SESSION_LOG_2026-07-04_to_2026-07-06_early.md`.

## 2026-07-04

- D1 design system livré : tokens deep teal/champagne gold, thèmes patient/praticien, composants UI, shell praticien sombre et Recharts pour les scores.

## 2026-07-05

- Bascule Postgres pure de routes E0 et audit de fidélité des questionnaires. Découverte de divergences entre plusieurs sources Markdown et l'officiel Drive.
- Alignement de `Q_MOD_02`, `Q_NEU_03`, `Q_ALI_01` et `Q_ALI_03`, avec ajout des dérivés Monnier dans le moteur.

## 2026-07-06

- E0 finalisé côté routes restantes, abandon du nom NeuroScore au profit de Mon équilibre / Cartographie neuro-fonctionnelle, et démarrage de l'architecture 12 besoins / 4 piliers.
- R8-lite lancé tôt pour le consentement et les statuts, puis implémenté et mergé en prod avec schéma de statuts et verrouillage manuel.
- Arbitrages Boussole alimentaire : MVP vertical slice, priorisation clinique du besoin 2, axes Niveau 2 nommés dès V1.

## 2026-07-07

- Lot 7 finalisé, décommission Sheets/OAuth entérinée et parcours patient packs débloqué avec accès multi-questionnaires.

## 2026-07-08

- Portail patient permanent consolidé, packs fonctionnels, seed prod et migration Prisma du registre relationnel.
- Scoring DNSM et synthèse IA enrichie par la fiche et l'anamnèse.

## 2026-07-09

- Réalignement documentaire R0, préparation R1, setup CLI Supabase local et vérification Prisma.
- Configuration `DATABASE_URL` dev et checks de reprise.

## 2026-07-10

- Validation E2E du parcours patient unifié, session portail sans email en URL, finalisation du pack Base de consultation.
- Lecture primaire du registre relationnel avec fallback legacy, harmonisation UX patient, revue critique du projet et clôture de plusieurs sujets en suspens.
- Consolidation des tests et de la CI de sécurité : ESLint non interactif, correction du premier run CI réel, validation de la synthèse IA, hygiène repo/doc.
