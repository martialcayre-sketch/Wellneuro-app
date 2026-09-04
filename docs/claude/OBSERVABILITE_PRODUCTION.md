# Observabilité Production WellNeuro

## Objectif

WellNeuro utilise une journalisation JSON structurée vers stdout/stderr, relue par `scalingo --app wellneuro logs` (hébergement HDS, depuis le cutover du 2026-08-22).
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

Le correlationId permet de retrouver la séquence complète d un incident dans les logs Scalingo.

## Runbook logs

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

## Sentry — présent mais INERTE (dette ouverte au 2026-09-04)

État réel, constaté par revue adversariale : `@sentry/nextjs` est en dépendance
et `web/sentry.{client,server,edge}.config.ts` existent, mais **rien ne les
branche** — `web/next.config.mjs` n'appelle pas `withSentryConfig`, il n'y a pas
d'`instrumentation.ts`, et aucun `Sentry.captureException` dans `src`. Aucune
erreur ne part donc nulle part.

Ce que cela coûte concrètement, depuis les écrans d'échec livrés le 2026-09-03 :
l'écran d'erreur du portail peut s'afficher pour une personne suivie **sans que
personne ne l'apprenne**. Et le `digest` que cet écran propose comme référence
n'est posé que par le rendu SERVEUR : une erreur survenue dans le navigateur —
le cas dominant, la plupart des pages du portail étant clientes — n'en porte
pas, donc la ligne « Référence » ne s'affiche pas **et** aucune trace ne
subsiste. La boucle de support a un maillon manquant, pas un maillon faible.

Au câblage, conserver le cadrage privacy-first prévu : pas de Session Replay au
départ, source maps actives, tags release/deployment/branch, corrélation avec
les event codes et le correlationId.

## Surveillance de disponibilité

Deux alertes Scalingo sont armées sur `wellneuro`, type `web` :

- `memory` ≥ 0.85 pendant 5 min (rappel 30 min) — posée après l'incident
  mémoire du 2026-08-31 ;
- `p95_response_time` ≥ 5000 pendant 5 min (rappel 30 min) — c'est celle qui
  aurait signalé cet incident avant le 504. Vérifier l'unité affichée dans
  l'interface : le seuil a été posé en supposant des millisecondes.

**Elles sont internes, et c'est leur limite** : si l'hébergeur devient
indisponible, ses alertes le deviennent avec lui, et aucun écran applicatif ne
peut s'afficher — la page servie est alors celle du routeur. Une sonde externe
et une page d'état hébergées ailleurs restent à créer ; l'adresse de cette page
devra figurer dans l'e-mail du lien magique, sans quoi personne ne saura qu'elle
existe au moment où elle servirait.
