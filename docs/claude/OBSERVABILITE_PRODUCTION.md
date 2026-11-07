# Observabilité Production WellNeuro

**Restes versés au plan le 2026-10-14** : les restes à faire nommés dans ce document sont tenus au plan (docs/claude/PLAN_WELLNEURO.md, §8 et file D au §4), qui en porte l'ordre et le sort ; ce document reste tenu à jour.

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

## Sentry — CÂBLÉ le 2026-09-07, et inerte tant que le DSN n'est pas posé

`D-141`. Le câblage qui manquait est en place : `withSentryConfig` dans
`web/next.config.mjs`, initialisation par runtime depuis `register()` de
`web/src/instrumentation.ts`, `onRequestError` exporté (sans lui, une erreur de
composant serveur n'atteint jamais Sentry), et `Sentry.captureException` dans
`web/src/app/global-error.tsx` — c'est cette dernière ligne qui ferme le maillon
manquant décrit ci-dessous.

**Rien ne part tant que `SENTRY_DSN` (serveur, edge) et
`NEXT_PUBLIC_SENTRY_DSN` (client) ne sont pas posés dans l'environnement
Scalingo**, et la condition est écrite dans `instrumentation.ts`, pas seulement
héritée du SDK : sur une application de santé, ce qui déclenche un envoi vers un
tiers se lit dans le dépôt.

Ce que le câblage a coûté de corriger, et qu'il ne faut pas défaire :

- le `beforeSend` recopié dans les trois runtimes coupait la query string et
  **gardait le chemin** — or `/portail/lien/<jeton>` est le lien magique
  lui-même. `masquageChemin.ts` réduit tout chemin à un gabarit par liste
  d'autorisation, et `masquageChemin.routes.test.ts` parcourt `web/src/app` pour
  rougir dès qu'une route nouvelle n'y figure pas ;
- `beforeSend` ne voit que les ERREURS. `beforeSendTransaction` et
  `beforeSendSpan` sont posés parce qu'à `tracesSampleRate` 0,1 une requête sur
  dix produit une transaction en régime normal, route comprise ;
- les fils d'Ariane `console` sont supprimés et les fils `ui.*` perdent leur
  message : le sélecteur DOM porte des `aria-label` écrits pour être lus par un
  patient ;
- pas de Session Replay — les deux taux sont à zéro, délibérément : il filmerait
  l'écran du patient ;
- les cartes de source ne partent que si les trois variables `SENTRY_*` du build
  sont posées, et sont supprimées après envoi.

**Reste dû au responsable de traitement** : poser les DSN, déclarer Sentry aux
personnes (`docs/DOSSIER_RGPD.md:194` — la liste des prestataires de
`donnees_confidentialite` ne le cite pas), signer le DPA et vérifier la
résidence UE (`docs/DOSSIER_RGPD.md:614`, échéance 2026-10-21).
**2026-10-14** : l'échéance du 2026-10-21 est levée ; la revue RGPD a une
échéance unique au 2027-06-30 ([[D-265]] §4, [[D-283]] §9). La pose des DSN
reste à consigner (plan, file D, D/32).

## Surveillance de disponibilité

Deux alertes Scalingo sont armées sur `wellneuro`, type `web` :

- `memory` ≥ 0.85 pendant 5 min (rappel 30 min) — posée après l'incident
  mémoire du 2026-08-31 ;
- `p95_response_time` ≥ 5000 pendant 5 min (rappel 30 min) — c'est celle qui
  aurait signalé cet incident avant le 504. **Unité vérifiée le 2026-11-04** :
  la métrique est en millisecondes (`"suffix": "ms"` dans la liste des
  métriques de l'API Scalingo, developers.scalingo.com/metrics) — le seuil
  vaut 5 s.

**Elles sont internes, et c'est leur limite** : si l'hébergeur devient
indisponible, ses alertes le deviennent avec lui, et aucun écran applicatif ne
peut s'afficher — la page servie est alors celle du routeur.

**Sonde externe et page d'état (d33, 2026-11-04)**, chez Better Stack, hors de
l'hébergeur :

- sonde « Application Wellneuro » : `GET https://app.wellneuro.fr/login`, 200
  attendu, toutes les 3 min depuis l'Europe, délai 30 s (le plus proche des
  25 s prévus que l'API admette), incident après 3 min d'échec confirmé,
  alerte par e-mail. Elle voit l'hébergeur ou le routeur tombé, **pas** une
  base en panne derrière une page qui s'affiche encore — choix du responsable,
  sans route de santé à coder ;
- page d'état `https://wellneuro.betteruptime.com` (Better Stack, page
  270413, sonde 5185405) : sans abonnement (aucune adresse recueillie chez le
  tiers), indexable par les moteurs de recherche (choix du responsable),
  interface du prestataire en anglais ;
- son adresse est écrite dans les trois e-mails que le patient garde ou reçoit
  en dernier : `acces_portail@3`, `acces_portail_lien@2`, `lien_magique@2`
  (registre des gabarits, textes validés le 2026-11-04). Elle n'existe nulle
  part ailleurs : la changer exige une nouvelle version de chacun.

La sonde de `https://wellneuro.fr` (site vitrine, en pause depuis le
2026-09-06) n'a pas été touchée.
