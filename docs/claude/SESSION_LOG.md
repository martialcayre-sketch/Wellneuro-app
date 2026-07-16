# Journal de session — Wellneuro NNPP2

> **Archivage** : les entrées du 2026-07-04 au 2026-07-10 sont compactées dans `docs/archive/sessions/SESSION_LOG_2026-07-04_to_2026-07-10_compact.md`, et celles du 2026-07-11 au 2026-07-14 (clôture R8, WN-Doc-Assainissement, C0, C0-UX, HC-F, réconciliation 3.2, incident auth) dans `docs/archive/sessions/SESSION_LOG_2026-07-11_to_2026-07-14_compact.md`. Le journal actif ne conserve que les entrées récentes utiles à la reprise.

## [2026-07-14] — Campagne C1 : LOT-00 clôturé

**Décisions prises** : audit statique des entrées C1 terminé ; option A
confirmée (3 strates 60/20/20 sur la fiche patient, cinq objets cliniques en
lecture synthétique séparée). Les limites de clés, réponses historiques,
version de score, épisode, synthèses et preuves sont transmises à LOT-01.
PR #49 fusionnée dans la branche d'intégration ; état actif avancé à LOT-01.

**Validations exécutées** : `git diff --check`, contrôle anti-secrets, revue
indépendante GO et checks Vercel verts. Tests applicatifs non applicables au
diff documentaire.

**Options écartées** : migration, persistance, modification clinique et
implémentation cockpit — hors périmètre LOT-00.

**Prochaine action prioritaire** : cadrer LOT-01 en mode Plan depuis la branche
d'intégration C1 à jour.

**Questions ouvertes** : validation clinique future du mapping A/B/C/D.

## [2026-07-14] — Campagne C1 : LOT-01 clôturé

**Décisions prises** : contrats purs `AssessmentEpisode` et
`ClinicalSnapshot` livrés avec adaptateurs vers le moteur `equilibre`, unités,
versions, provenance, fraîcheur et hash canonique. L'absence et les réponses
incomplètes ne deviennent jamais zéro. PR #51 fusionnée dans l'intégration C1.

**Validations exécutées** : 55 tests Vitest ciblés, `type-check`, lint,
certification des 63 questionnaires, contrôle anti-secrets, `git diff --check`,
revue indépendante GO et checks Vercel verts.

**Options écartées** : persistance, migration, route API, `DecisionCard`,
`ProtocolDraft` et toute modification clinique — hors périmètre LOT-01.

**Prochaine action prioritaire** : cadrer C1 LOT-02 en mode Plan depuis la
branche d'intégration actualisée.

**Questions ouvertes** : validation clinique future des règles et seuils de
signaux, discordances, sécurité et abstention de LOT-02.

## [2026-07-14] — Campagne C1 : LOT-02 clôturé

**Décisions prises** : `ClinicalReview` livre un socle déclaratif pour les
données manquantes, discordances praticien-only, sécurité et abstention. Les
absences structurelles restent `à_documenter`, sans zéro ni criticité
automatique. Les règles candidates sont inactives et toute validation déclarée
exige un praticien.

**Validations exécutées** : 63 tests Vitest ciblés, `type-check`, lint,
certification des 63 questionnaires, contrôle anti-secrets, `git diff --check`
et revue indépendante GO.

**Options écartées** : règle ou seuil clinique, interface, `DecisionCard`,
persistance, migration et écriture Supabase — hors périmètre LOT-02.

**Prochaine action prioritaire** : publier LOT-02 vers l'intégration C1, puis
cadrer LOT-03 en mode Plan.

**Questions ouvertes** : validation clinique des règles de priorité avant
toute activation dans LOT-03 ; aucune règle n'est actuellement activée.

## [2026-07-14] — Campagne C1 : LOT-03 clôturé

**Décisions prises** : `DecisionCard` reste un brouillon déterministe et
explicable. Les candidats exigent une règle cliniquement validée, la sélection
appartient au praticien et tout bloqueur retire la proposition. La fiche
distingue revue absente et absence de manque qualifié, avant la décision.

**Validations exécutées** : 10 tests ciblés, 128 tests globaux, `type-check`,
lint, certification des 63 questionnaires, contrôle anti-secrets,
`git diff --check` et revue indépendante GO. Playwright ajouté mais non exécuté
localement faute de `NEXTAUTH_SECRET`.

**Options écartées** : priorité automatique, règle clinique, API, persistance,
migration, IA et diffusion patient — hors périmètre ou non validées.

**Prochaine action prioritaire** : publier LOT-03 vers l'intégration C1, puis
cadrer LOT-04 (`ProtocolDraft`) en mode Plan.

**Questions ouvertes** : validation clinique du barème et de la charge avant
toute activation de protocole.

## [2026-07-14] — Campagne C1 : LOT-04 clôturé

**Décisions prises** : `ProtocolDraft` reste local, non persisté et limité à
trois actions. La charge est déclarée par le praticien, jamais calculée ; le
niveau excessif exige une justification. « Relu » ne signifie ni actif ni
diffusé, et toute modification remet le protocole en brouillon.

**Validations exécutées** : 12 tests ciblés, 140 tests globaux, `type-check`,
lint, certification des 63 questionnaires, contrôle anti-secrets,
`git diff --check` et revue indépendante GO. Playwright reste bloqué localement
faute de `NEXTAUTH_SECRET`.

**Options écartées** : barème automatique, API, persistance, migration,
posologie, produit et diffusion patient — non validés ou hors périmètre.

**Prochaine action prioritaire** : publier LOT-04 vers l'intégration C1, puis
cadrer LOT-05 en mode Plan.

**Questions ouvertes** : alimentation runtime depuis `DecisionCard` et bornes
exactes de la validation de diffusion LOT-05.

## [2026-07-14] — Campagne C1 : LOT-05 clôturé

**Décisions prises** : `PatientProtocolView` projette par liste blanche les
objets relus. La validation locale, liée aux hashes, déverrouille seulement
l’aperçu ; « relu », « validé pour diffusion » et « non transmis » restent
distincts. La fiche demeure indisponible sans flux runtime C1.

**Validations exécutées** : 10 tests ciblés, 150 tests globaux, `type-check`,
lint, certification des 63 questionnaires, contrôle anti-secrets,
`git diff --check` et revue indépendante GO. Playwright non exécuté faute de
`NEXTAUTH_SECRET`.

**Options écartées** : calcul de charge, API, persistance, impression et envoi
patient — hors périmètre ou non validés.

**Prochaine action prioritaire** : publier LOT-05 vers l’intégration C1, puis
cadrer LOT-06 en mode Plan.

**Questions ouvertes** : branchement runtime et preuve persistée de
transmission, réservés à des lots ultérieurs.

## [2026-07-14] — Campagne C1 : clôture technique

**Décisions prises** : C1 et LOT-06 sont clôturés avec trois verdicts séparés :
GO technique, ergonomie humaine à valider, NO-GO runtime, activation et
diffusion. La CI de la PR #60 a réussi anti-secrets, audit campagne,
type-check, Vitest, lint, build et Playwright ; Vercel est vert.

**Options écartées** : aucun runtime, persistance, activation, transmission ou
succès ergonomique implicite ; ces preuves n’existent pas dans C1.

**Prochaine action prioritaire** : promouvoir QX et cadrer QX/LOT-02 en mode
Plan depuis son intégration actualisée.

**Questions ouvertes** : protocole chronométré avec un praticien et téléphone
physique ; construction serveur et preuve persistée de transmission pour C2/C3.

## [2026-07-14] — Campagne QX : LOT-02 terminé

**Décisions prises** : renderer `micro_batch` activé uniquement pour `Q_NEU_03`, en neuf lots visuels conservant strictement les 25 items, leurs options, le payload et le scoring. Navigation, reprise de brouillon, progression et accessibilité clavier/lecteur d’écran couvertes.

**Validations exécutées** : Vitest ciblé 11/11, type-check, certification scoring des 63 questionnaires, contrôle anti-secrets, contrôle navigateur à 375 px et largeur équivalente au zoom 200 %, revue indépendante GO.

**Options écartées** : autres renderers, mélange nominal, migration et persistance serveur — hors périmètre ou encore bloqués par certification.

**Prochaine action prioritaire** : intégrer LOT-02 vers `campaign/qx-experience-questionnaires/integration`, puis ouvrir LOT-03 dans un worktree dédié.

**Questions ouvertes** : aucune.

## [2026-07-14] — Campagne QX : LOT-03 terminé

**Décisions prises** : brouillon local V1 versionné avec réponses et page courante, reprise rétrocompatible sans saut de partie incomplète, résumé de complétude et correction ciblée avant transmission. Payload, conversion numérique et scoring restent strictement inchangés.

**Validations exécutées** : Vitest ciblé 21/21, suite 100/100, type-check, certification scoring des 63 questionnaires, anti-secrets, `git diff --check` et revue indépendante GO. Focus du résumé couvert automatiquement ; contrôle manuel 375 px, zoom 200 % et lecteur d’écran reste à consigner.

**Options écartées** : persistance serveur, migration Prisma, affichage des réponses sensibles et chantier d’identification/session patient — hors périmètre.

**Prochaine action prioritaire** : préparer LOT-04 dans un worktree dédié après intégration de LOT-03.

**Questions ouvertes** : aucune.

## [2026-07-14] — Campagne QX terminée

**Décisions prises** : LOT-04 valide l'absence de régression du renderer
`micro_batch` de `Q_NEU_03` et clôt QX. Seul ce renderer reste activé ; les
profils `focus`, `guided_sections` et `compact_repeated_scale` conservent leurs
gates de certification documentées.

**Validations exécutées** : tests ciblés 21/21, Vitest 130/130, type-check,
lint, build, scoring 63/63, anti-secrets, inventaire identique, CI PostgreSQL
et Playwright PR #63 (`29331961153`), essai manuel Chrome PC à 375 px, zoom
200 %, clavier et Narrateur Windows.

**Options écartées** : activation de renderers non certifiés, mélange
d'options, changement clinique, Prisma ou API.

**Prochaine action prioritaire** : choisir explicitement la prochaine campagne à activer.

**Questions ouvertes** : aucune.

## [2026-07-15] — Typo display, programme 5.0, campagne SP-FIL

**Décisions prises** : correctif `font-display` appliqué aux titres (PR #72 ;
wordmark login passé au primaire, le solaire étant interdit en texte) ;
disposition Spirale 5.0 actée au registre (A6) avec les cinq arbitrages —
note de relecture en time-travel, seuil cabinet n ≥ 5, consentement écoute
double niveau (gate CNIL inchangé), le Fil du jour remplace l'accueil,
reprise avec pack pré-composé jamais auto-assigné ; programme 5.0 (PR #73)
succède à la file 3.2. Campagne SP-FIL exécutée et clôturée (PR #74/#75/#76) :
le Fil devient l'accueil praticien, rail regroupé.

**Options écartées** : superposition accueil selon l'heure (imprévisible) ;
écriture libre dans le passé (falsification du dossier).

**Prochaine action prioritaire** : lever la validation ergonomique C1
(gate SP-RUN) ou activer C2A (gate migration).

**Questions ouvertes** : instruction CNIL/RGPD de l'écoute ambiante ;
PR #71 TRUST ouverte en parallèle (miroir campagnes à resynchroniser).

## 2026-07-16 — TRUST V1 en production ; pipeline de déploiement automatisé

**Décisions** : campagne TRUST transcrite intégralement (PR #78→#84 : contrats,
contenus versionnés hashés, migration trust_v1, séquence « Avant de commencer »,
centre permanent, choix, signalements, page praticien, clôture — 225 tests, e2e
vert). Incident : la chaîne Vercel n'appliquait pas les migrations → PR #85 :
`migrate deploy` au build de production (`vercel-build.sh`, `MIGRATE_DATABASE_URL`
session pooler 5432, garde `VERCEL_ENV=production`, gate humain = revue de PR).
trust_v1 appliquée (19:09), 5 tables RLS vérifiées, app.wellneuro.fr OK.
Worktree TRUST et branches mergées nettoyées.

**Options écartées** : fallback `DIRECT_URL` (valeur opaque, risque IPv6) ;
CLI Supabase pour le schéma (double comptabilité vs `_prisma_migrations`).

**Prochaine action prioritaire** : reprise programme 5.0 (validation ergonomique
C1 pour SP-RUN, ou C2A avec gate migration).

**Questions ouvertes** : branche `trust-v1-lot-migration` (0500a35 = seule copie
committée de la réorg docs, aussi présente non committée dans l'arbre) ; worktree
infra + `wip/playwright-worktree-isolation` (livrables test-worktree à statuer) ;
purge `SHEET_ID` des variables Vercel.

## 2026-07-16 (soir) — Outillage test-worktree, hygiène skills, réception pack JA 5.0

**Décisions** : PR #87 mergée — validation CI locale par worktree, e2e sur
build de production, réessais bornés du fetch `trust/etat`, cookie Secure
dérivé de `NEXTAUTH_URL` (plus de `NODE_ENV`) ; cela statue les livrables
test-worktree ouverts. PR #88 mergée — playbook repo-hygiene, routage
modèle/effort des agents, skills `wn-model`/`wn-hygiene` ; fichiers du
chantier embarqués par erreur retirés (cf66f30). Pack **Journal alimentaire
5.0** (« Ma spirale alimentaire ») déposé non tracké à la racine : documentaire
et prototypal, statut `proposition_a_arbitrer`, aucune migration ni règle
clinique.

**Options écartées** : non tracées (résumé reconstruit à froid depuis l'état
du dépôt).

**Prochaine action prioritaire** : arbitrer le pack JA 5.0
(`docs/07_DECISIONS_A_ARBITRER.md`) — intégration au dépôt et périmètre.

**Questions ouvertes** : purge `SHEET_ID` Vercel ; branche
`trust-v1-lot-migration` ; instruction CNIL écoute ambiante.

## 2026-07-16 — JA 5.0 : brainstorm, arbitrages D1–D12, actation A7

**Décisions** : pack JA 5.0 intégré en
`propositions/2026-07-16-journal-alimentaire-5-0/` ; cap acté =
**instrument à deux régimes** (doc 11, A7-11) : évaluation observationnelle
avant protocole (`DietaryObservationProfile`) + essai/friction après
protocole, objet unique `FoodObservationEpisode` porteur du régime, quatre
lectures déclaré/observé/vécu/interprété ; nom « Ma spirale alimentaire »,
vocabulaire patient « essai » ; D1–D12 tous tranchés (focalisée par défaut,
durée cible adaptative, photo/voix différées avec politiques actées,
solutions gatées IDP, constats directs — météo agrégée → SP-MET,
notifications « pourquoi maintenant » + trace rapide, comparaison gatée,
« simulateur d'action », J21 par assignation explicite) ; boucle fermée
(retour de décision, tour suivant préparé, charge perçue, trace depuis
notification). Actation A7 au registre, fiche JA et campagne recadrées
(lots JA-00 → JA5-05), programme et README à jour.

**Options écartées** : vision complète docs 00–06 (jugée trop large par la
synthèse critique du pack) ; `DietaryActionExperiment` séparé ; météo trois
états au noyau.

**Prochaine action prioritaire** : merger la PR d'actation, puis gate JA-00
(audit clinique/RGPD) ou reprise SP-RUN/C2A.

**Questions ouvertes** : inchangées (purge `SHEET_ID` Vercel, branche
`trust-v1-lot-migration`, instruction CNIL écoute ambiante).

## 2026-07-16 — JA 5.0 : contrepoint, calibrage, Ciqual, assiettes, articulation C5

**Décisions** : vision critique consignée (`12_CONTREPOINT_ET_ADAPTATION.md`)
et intégrée au plan de campagne. L'épisode passe à **trois régimes** :
bilan de **calibrage** borné 3–5 j (double calibrage clinique + produit,
métrologie complète différée en lot conditionnel), **essai** (noyau
friction), **silence** (abstention prescrite). Marqueurs adossés aux **191
aliments moyens Ciqual** (12 vedettes du slice C5 incluses), aucune valeur
nutritionnelle dans le JA. **Boucle assiettes C5B ↔ essais** actée
(« recommandation », jamais « prescription »). Lots réécrits : JA-00 +
**JA-0T validation terrain** (5 entretiens, carte papier) avant JA5-01 ;
carrière d'action, question du jour, friction-agenda, décision pré-remplie,
parité papier, delta instrumenté, affichage-avant-moteurs. Fiche C5
complétée (faisabilité JA, chronobiologie débloquable) ; budget de charge
global signalé vers C2A.

**Options écartées** : régime A métrologique dès la conception ; dépendance
dure à C5A ; assiettes hors JA.

**Prochaine action prioritaire** : merger la PR #89 ; puis JA-00/JA-0T, ou
activer C5A (candidat naturel de prochaine campagne data).

**Questions ouvertes** : inchangées (SHEET_ID, trust-v1-lot-migration,
CNIL écoute ambiante).
