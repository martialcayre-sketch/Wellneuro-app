# Observabilité Production WellNeuro

## Objectif

WellNeuro utilise une journalisation JSON structurée vers stdout/stderr pour exploitation dans les Runtime Logs Vercel.
Aucun fichier .log local ou production ne doit être utilisé.

## Niveaux

- DEBUG: diagnostic local uniquement.
- INFO: opération nominale utile.
- WARN: anomalie récupérable.
- ERROR: opération échouée.
- FATAL: indisponibilité majeure.
- SECURITY: événement sécurité.
- AUDIT: événement métier notable.

## Domaines

- AUTH
- PORTAIL_PATIENT
- PRATICIEN
- QUESTIONNAIRE
- ASSIGNATION
- CONSULTATION
- SCORING
- SYNTHESE_IA
- BOOKLET
- EMAIL
- DATABASE
- SECURITY
- SYSTEM

## Format minimal d événement

Chaque événement doit inclure:

- timestamp
- level
- event
- domain
- message
- environment
- release
- runtime
- route
- method
- requestId
- correlationId
- statusCode
- durationMs

## Données interdites en logs

Ne jamais journaliser:

- nom/prénom patient
- email en clair
- téléphone
- date de naissance
- token portail
- cookies
- token NextAuth
- réponses questionnaires
- anamnèse
- résultats biologiques
- contenu de synthèse
- prompt clinique
- URL complète avec query sensible

## Politique d anonymisation

- deny-by-default pour les objets inconnus.
- masquage des clés sensibles.
- suppression des query params dans les URLs.
- sérialisation des erreurs via type/code/message uniquement.

## Corrélation

Chaque réponse API instrumentée doit inclure:

- X-WellNeuro-Correlation-Id

Le correlationId permet de retrouver la séquence complète d un incident dans Vercel Logs.

## Runbook Vercel

1. Filtrer par route et status HTTP.
2. Filtrer par level ERROR/FATAL/SECURITY.
3. Rechercher correlationId ou requestId.
4. Isoler event codes récurrents.
5. Vérifier release et branche.
6. Confirmer absence de données sensibles dans les lignes concernées.
7. Documenter l action corrective.

## Nomenclature d incident

- P1: FATAL/SYSTEM indisponibilité production.
- P2: erreurs répétées route critique.
- P3: anomalie fonctionnelle isolée.
- P4: bruit de logs ou dette d instrumentation.

## Sentry (optionnel)

Sentry peut être ajouté après stabilisation du socle Vercel Logs, en mode privacy-first:

- pas de Session Replay au départ
- source maps actives
- tags release/deployment/branch
- corrélation avec event codes et correlationId
