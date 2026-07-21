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
## 2026-07-17 — Gate ergonomique C1 levé

**Décisions** : Martial CAYRE a exécuté la grille C1 avec Sophie Nicola,
patiente fictive. Compréhension réussie en 1 minute et préparation en 5
minutes, sans erreur, aide, confusion ni tentative d'envoi. Verdict : **GO
ergonomique sur l'interface actuelle** ; SP-RUN-00 est terminé.

**Options écartées** : étendre ce GO à la refonte d'interface, qui n'est pas
encore réalisée et devra être validée séparément.

**Prochaine action prioritaire** : compiler SP-RUN-01, sans modifier les
contrats ni les règles cliniques C1. C2A continue en parallèle sur LOT-00.

**Questions ouvertes** : confirmation de migration C2A LOT-02 toujours
requise ; périmètre et validation de la future refonte ;
trust-v1-lot-migration ; CNIL écoute ambiante.

## 2026-07-17 — SP-RUN-01 runtime clinique livré

**Décisions** : route authentifiée `/api/praticien/cockpit` en deux temps :
proposition T0/J21/J42/J90 hashée, puis confirmation praticien explicite et
calcul en mémoire de Snapshot/Review/DecisionCard. Les réponses et la dernière
anamnèse validée sont lues par sélections Prisma minimales. Sans règles
validées, abstention `not_evaluated` et aucune priorité proposée.

**Options écartées** : confirmation automatique (contraire à C1) ; attente de
C2A ; persistance ou migration.

**Validations** : 12 tests ciblés, 63 tests clinical-engine, type-check,
scoring-check (63 questionnaires), anti-secrets et diff-check réussis.

**Prochaine action prioritaire** : SP-RUN-02, geste UI de confirmation puis
branchement du cockpit et états vides/abstention.

**Questions ouvertes** : gate migration C2A LOT-02 inchangé ; future refonte
à revalider séparément ; trust-v1-lot-migration ; CNIL écoute ambiante.

## 2026-07-17 — JA-0T terminé : 5 entretiens, GO noyau

**Décisions** : cinq entretiens JA-0T menés et consignés (P1…P5, contextes
génériques seuls) dans LOT-01 ; verdict **GO noyau** — cases suffisantes
5/5, budget ≥ 3 traces/sem (4 nets + P5 au seuil), « aide » 5/5, retour de
décision 5/5. Six enseignements actés, dont trois amendements au noyau
avant JA5-01 : 4ᵉ option « adapté/partiel/oublié » + mot libre court
(saturation 5/5), silence patient jamais présenté comme signal négatif,
budget personnalisable (2-3 à 7/sem). Statut du lot : terminé.

**Options écartées** : report au registre des frontières (le cap ne bouge
pas) ; compilation JA5-01 immédiate sans amender JA-00.

**Validations** : anti-secrets OK ; contrôle anonymat OK (aucun nom,
contextes génériques).

**Prochaine action prioritaire** : intégrer les amendements 1-3 à JA-00,
puis compiler JA5-01 ; committer/PR les relevés.

**Questions ouvertes** : inchangées (gate migration C2A LOT-02,
trust-v1-lot-migration, CNIL écoute ambiante).

## 2026-07-17 — SP-RUN-02 cockpit runtime terminé

**Décisions** : la fiche patient charge et confirme explicitement l'épisode
T0, puis affiche la revue et la carte C1 réelles. Les réponses hors fenêtre
restent sélectionnables sans exposer les scores. Proposition périmée,
épisode vide et indisponibilités sont traités. L'abstention reste
`not_evaluated` ; protocole et aperçu demeurent bloqués.

**Options écartées** : persistance, jalons post-T0, priorité automatique,
diffusion patient et refonte générale.

**Validations** : CI PR #100 verte, dont E2E PostgreSQL isolé sur patient
fictif en bureau/mobile ; tests, build, scoring et anti-secrets réussis.

**Prochaine action prioritaire** : reprendre C2A LOT-00 ; LOT-02 reste soumis
à confirmation de migration.

**Questions ouvertes** : future refonte à revalider séparément ; gate C2A
LOT-02 ; trust-v1-lot-migration ; CNIL écoute ambiante.

## [2026-07-17] — C2A LOT-00 : audit des flux et besoins de persistance clos

**Décisions** : audit document-seul mené en lecture seule (contrats
`clinical-engine`, auth praticien/patient, pattern Prisma `trust_*`). Livrables :
matrice create/read/update par acteur, données minimales J7/J14/J21 (2-4 réponses,
aucune biologie, aucun champ narratif libre), et 8 constats amendant
`SPEC_LOT-01_MODELE_PERSISTANCE.md` (addendum daté, sections d'origine préservées).
Constats clés : `input_hash` erroné sur `assessment_episodes` (l'épisode n'a pas de
hash propre) ; provenance de hash pendante si DecisionCard/Review non persistés ;
lecture patient de `protocol_drafts` à remplacer par une vue patient dédiée ;
autorisation check-in à modéliser hors email-gate ; unicité vs append-only ; PK =
id du contrat ; report recommandé de `relecture_notes` à SP-TT ; modèle
mono-praticien à consigner. LOT-00 passé `terminé`, `active_lot` → LOT-01.

**Options écartées** : se conformer à la spec (le lot exige de la corriger) ;
inclure `relecture_notes` en V1 (aucun contrat `RelectureNote` n'existe) ; toucher
au schéma (gate LOT-02 verrouillé).

**Validations** : `wn-campaign-audit` vert, anti-secrets vert, `git diff web/prisma`
vide, `state.json` JSON valide, vue ACTIVE_CAMPAIGN resynchronisée.

**Prochaine action prioritaire** : C2A LOT-01 — spécifier le modèle et arbitrer les
constats 2, 3, 4 (provenance, vue patient, autorisation check-ins) avant toute levée
du gate. LOT-02 reste `bloqué_confirmation`.

**Questions ouvertes** : gate migration C2A LOT-02 (checklist SPEC §6 non cochée) ;
future refonte à revalider séparément ; trust-v1-lot-migration ; CNIL écoute ambiante.

## [2026-07-17] — C2A LOT-01 : spécification figée, constats tranchés

**Décisions** : audit LOT-00 validé par l'utilisateur ; les 8 constats structurants
et le choix stocker/recalculer sont tranchés en `SPEC_LOT-01_MODELE_PERSISTANCE.md`
**§8** (prime sur §3-4). Snapshots : **recalculer, ancré par hash** (pas de tables
dérivées) ; épisode sans `input_hash` (payload + payload_hash) ; provenance = colonnes
d'ancrage sur `protocol_drafts` ; vue patient **dérivée à la volée** (aucune table) ;
check-in avec `id_assignation` et email-gate exclu en écriture ; append-only chaîné
(pas d'unicité) ; PK = id du contrat (cuid pour check-ins) ; `relecture_notes`
**différée à SP-TT** → migration C2A = **3 tables** ; hypothèse mono-praticien
consignée. Schéma cible figé (§8.9), matrice CRU arbitrée (§8.10), checklist gate
actualisée (§8.11). LOT-01 `terminé`, `active_lot` → LOT-02.

**Options écartées** : persister le snapshot (duplication de donnée dérivée) ; table
`patient_protocol_views` (4ᵉ table prématurée) ; inclure `relecture_notes` en V1.

**Validations** : type-check vert, `wn-campaign-audit` vert, anti-secrets vert,
`git diff web/prisma` vide, `state.json` JSON valide, vue ACTIVE_CAMPAIGN resync.

**Prochaine action prioritaire** : **LOT-02 reste `bloqué_confirmation`**. Il n'est
déverrouillé que si l'utilisateur coche la checklist §8.11 (migration additive unique
`c2a_persistance_v1`, 3 tables, rollback = DROP des 3 tables) **par un message
distinct**. Aucun DDL ni modification de `schema.prisma` d'ici là.

**Questions ouvertes** : gate migration C2A LOT-02 (checklist §8.11 non cochée) ;
future refonte à revalider séparément ; trust-v1-lot-migration ; CNIL écoute ambiante.

## [2026-07-17] — C2A LOT-02 : migration Prisma + API minimale (gate levé)

**Décisions** : gate migration levé (checklist SPEC §8.11 cochée par l'utilisateur).
Exécution en session dédiée (flags `WN_ALLOW_PROTECTED_WRITE`/`WN_ALLOW_RISKY_COMMAND`),
branche `feat/c2a-lot-02-persistance-prisma`. Migration additive unique
`20260717120000_c2a_persistance_v1` : 3 tables (`assessment_episodes`,
`protocol_drafts`, `protocol_checkins`), FK RESTRICT/SET NULL, RLS deny-all.
SQL généré par `migrate diff` datamodel→datamodel (aucune base touchée) + RLS
manuel. Routes minimales : praticien `POST/GET /api/praticien/protocoles`
(persistance idempotente, cohérence de provenance) ; patient
`GET /api/patient/protocole` (session portail vérifiée, email-gate exclu, aucune
donnée de `protocol_drafts` exposée).

**Options écartées** : `migrate dev`/`db push` sur base partagée (généré hors base) ;
routes d'écriture check-ins et versionnement (LOT-04/LOT-03) ; contournement des
hooks de protection (relance en session dédiée à la place).

**Validations** : `test:worktree` verte 11 min 23 s — **gate de dérive
schéma↔migrations OK**, `migrate deploy` OK, Vitest 315/315 (dont 10 nouveaux :
autorisé/interdit/**inter-patient**), lint, build, E2E Playwright 30/30. type-check,
`prisma validate`, anti-secrets verts.

**Prochaine action prioritaire** : **LOT-03** (versionnement et validation du
protocole : statuts de diffusion, vue patient dérivée). La migration se déploie en
prod via `migrate deploy` au merge de la branche sur `main`.

**Questions ouvertes** : merge/déploiement de la branche LOT-02 ; `relecture_notes`
différée à SP-TT ; nettoyage email-gate ; future refonte à revalider ; CNIL écoute
ambiante.

## [2026-07-17] — C2A LOT-03 livré (versionnement + validation diffusion)

**Décisions** : LOT-03 découpé et livré en deux PR. **Part A (#103, sans
migration)** : versionnement append-only du protocole côté persistance (le contrat
réutilisant `protocolDraftId`, id de ligne = `protocolDraftId#inputHash`,
`supersedes_draft_id` enfin écrit, changement clinique via `clinicalContentHash` sans
horodatage, 409 `version_stale`), nouvelle couche `lib/protocol/`, route
`/versions`, UI « Enregistrer la version » explicite + historique. **Part B (#107,
2ᵉ gate migration levé)** : migration additive `c2a_diffusion_v1` (table
`protocol_diffusion_approvals`), `lib/protocol/diffusion.ts`, route `/diffusion`
(approbation ancrée par hash, caduque si nouvelle version), `ProtocolDiffusionPanel`.

**Options écartées** : persister le snapshot ; table `patient_protocol_views` ;
conflater l'approbation dans `protocol_drafts` (§8.6) ; envoi patient (différé LOT-05).

**Incident de session** : deux sessions Claude Code (extension sans flags / terminal
avec flags) ; le commit Part A avait été laissé sur une branche réinitialisée,
récupéré via reflog puis rebasé sur `main`. Garde-fous `WN_ALLOW_*` respectés (jamais
contournés) — migration faite en session dédiée.

**Validations** : type-check ✅, vitest (protocole+cockpit 67) ✅, `prisma validate`
✅, **gate de dérive schéma↔migrations vert sur base éphémère** (`migrate deploy` +
`migrate diff` + seed). E2E local ROUGE (crash serveur `next dev` sous contraintes
conteneur + arbre pollué par changements JA5-02 non commités, non liés au code
LOT-03) → autorité = CI des PR.

**Prochaine action prioritaire** : surveiller la CI de #103 puis #107 ; merger
Part A avant Part B (re-cibler #107 sur `main`). Puis C2A LOT-04 (check-ins J21).

**Questions ouvertes** : CI des PR #103/#107 ; « Envoyé »/transmission (LOT-05) ;
trust-v1-lot-migration ; CNIL écoute ambiante.

## [2026-07-17] — C2A LOT-03 : merges exécutés, en production

**Décisions** : « à faire côté humain » exécuté. #103 Part A squash-mergé sur `main`
(déploiement prod + migration additive `c2a_diffusion_v1` appliquée). Part B livré via
**nouvelle PR #109** (rebase propre sur `main`, diff limité à Part B), squash-mergée.

**Options écartées / pourquoi** : force-pusher #107 — impossible (hook
`block-risky-commands`, non contourné) ; rouvrir #107 — impossible (sa branche de base
supprimée au merge de #103 l'a orphelinée/fermée), d'où #109 ; working-tree JA5-03 non
commité **discardé** (déjà sur `main` via #104/#108, régressait CAMPAGNE.md).

**Validations exécutées** : CI #109 `verify` (dont e2e `dashboard-praticien`) ✅ 4m33s,
`devcontainer-smoke` ✅ — lève le doute e2e local ROUGE de la session précédente.
Déploiement prod `main` : Vercel ✅, migration appliquée.

**Prochaine action prioritaire** : C2A LOT-04 (check-ins J7/J14/J21 + résumé J21 ;
table `protocol_checkins` déjà présente depuis LOT-02).

**Questions ouvertes** : JA5 activation non commité (agent parallèle) à committer par son
owner ; « Envoyé »/transmission (LOT-05) ; trust-v1-lot-migration ; CNIL écoute ambiante.

## [2026-07-18] — C2A LOT-04 livré (check-ins J7/J14/J21 + résumé J21)

**Décisions de cadrage** (validées) : (1) décision J21 **sans nouvelle table** — panneau
praticien lecture seule + 6 labels comme actions guidées vers le versionnement/diffusion
existants ; (2) **slice patient complète** (API + formulaire + tendance) ; (3) check-in à
**4 questions** (adhésion, tolérance, énergie, sommeil). **Aucune migration** (table
`protocol_checkins` déjà présente depuis LOT-02).

**Réalisé** : `lib/protocol/checkinDomain.ts` (domaine pur : catalogue, validation,
planification J7/J14/J21 ±3 j, chaînage append-only) + `checkins.ts` (persistance) +
`resumeJ21.ts` (point de jonction momentum + check-ins). Route patient
`api/portail/protocole/checkin` (cookie portail obligatoire, email-gate exclu §8.4,
assignation d'ancrage résolue serveur, point d'étape imposé par le calendrier de diffusion).
Route praticien `api/praticien/protocoles/checkins` (check-ins + résumé J21). UI :
`patient-companion/ProtocolCheckinForm` + `ProtocolCheckinTrend` (tendance factuelle, aucun
%), sous-route `portail/[token]/suivi` + lien hub ; `patient-cockpit/J21DecisionPanel` monté
dans `ClinicalRuntimeSection`.

**Validations** : type-check ✅, Vitest **100/100** (48 nouveaux), `next lint` ✅,
`scoring-check` ✅, anti-secrets ✅, `git status web/prisma/` vide (aucune migration).

**Alignement 5.0** (vérifié) : C2A réaffirmé par le programme « la Spirale » (gate Phase A') ;
LOT-05 borné R8-lite (accueil du protocole actif ≠ accueil de trajectoire « Ma spirale » =
SP-SPI, Phase B/IDP). À porter au handoff : discordances `RelectureNote` (A6-1, C2A vs SP-TT)
et budget de charge (A7-14).

**Options écartées** : nouvelle table de décision J21 (gate migration) ; UI patient différée
à LOT-05 ; recompute clinique côté patient pour la vue protocole.

**Dette** : score du résumé J21 = null en V1 (aucun historique d'équilibre daté branché sur
`momentum.ts` — relève de C2B) ; modèle patient mono-protocole.

**Prochaine action** : LOT-05 (compagnon patient minimal borné R8-lite), puis LOT-06
(tests/handoff), puis 1 PR LOT-04→06 avec pause avant merge.

## [2026-07-18] — C2A LOT-05 + LOT-06 : clôture d'implémentation de la campagne

**LOT-05 (compagnon patient minimal, borné R8-lite)** : route `GET /api/portail/protocole`
dérivant une **vue patient-safe** du protocole diffusé (payload du draft, §8.3 ; miroir de
`PatientProtocolAction` — jamais idealPlan/rescuePlan/interne) ; helpers portail factorisés
(`lib/protocol/portailProtocol.ts`, réutilisés par la route check-in) ; `PatientCompanionHome`
(action du jour, accès fiche + rendez-vous de suivi, tendance factuelle, mode « jour
difficile », états sans-protocole/check-in dû/fin de cycle) monté en tête du hub portail.
Garde-fou 5.0 : accueil du **protocole actif**, jamais « Ma spirale » (= SP-SPI, Phase B/IDP).

**LOT-06 (tests/rétro/handoff)** : Vitest **complet 418/418 ✅**, type-check/lint/scoring/
anti-secrets ✅, gate de dérive **satisfait par construction** (aucun changement
`schema.prisma`/migrations). `test:worktree` arrêté en fail-fast à l'audit campagnes sur une
erreur **JA non commitée** (`active_lot_missing`, `lot_courant=—`) — hors périmètre, exclue de
mes commits ; committed HEAD JA valide (`LOT-05`) → CI de la PR propre. Handoff rédigé
(C2B : score J21 via momentum ; SP-SPI : accueil trajectoire post-IDP ; SP-TT : relecture_notes
différée). **Discordances 5.0 consignées** : `RelectureNote` (A6-1 « en C2A » vs différée SP-TT)
et budget de charge (A7-14) — à arbitrer, futur gate migration.

**Alignement 5.0** : revue effectuée sur demande — 5.0 « la Spirale » **réaffirme C2A** (gate
Phase A'), ne le supersède pas ; le compagnon reste protocole-scoped, l'accueil de trajectoire
est SP-SPI.

**Options écartées** : recompute clinique côté patient (fragile au staleness) → vue dérivée du
payload ; toucher/committer les fichiers JA parallèles ; merge automatique en prod.

**Prochaine action** : commits par lot (fichiers **C2A uniquement**) sur
`feat/c2a-lot-04-checkins`, push, 1 PR base `main`, **PAUSE avant merge** (confirmation
explicite ; déploiement prod Vercel, aucune migration). Ensuite : C2B ou campagne data (C5A).

**Questions ouvertes** : confirmation merge→prod de la PR C2A ; arbitrage RelectureNote /
budget de charge ; fichiers JA parallèles à committer par leur owner.

## [2026-07-18] — C2B arbitrage + compilation des lots (docs)

**Décisions (registre A8, revue utilisateur)** : A8-1 T0 **par épisode** côté
praticien, T0 global conservé pour « Mon équilibre » ; A8-2 jalon sans couverture →
« jalon non mesuré », jamais un 0 ; A8-3 garde `versionScore` = bloc « non
comparable (score recalibré le …) », jamais de delta inter-version ; A8-4 C2B =
constats déterministes directs seuls, l'agrégat 3 états reste SP-MET ; A8-5
activation en deux temps (score J21 dès 1 cycle réel ; comparateur dès ≥2 épisodes).

**Réalisé** : `ARBITRAGES_C2B.md` + bloc **A8** au `REGISTRE_FRONTIERES.md` ; 3 lots
compilés (docs, migration-free) dans la campagne C2 — LOT-07 (score J21, lève dette
LOT-04), LOT-08 (T0 par épisode), LOT-09 (comparateur multi-épisodes). `.wn/state.json`
+ `CAMPAGNE.md` mis à jour (lot_courant LOT-07). **Aucun code, aucune migration.**

**Options écartées** : compiler l'implémentation (documentaire d'abord, N+1) ; merge
prod direct (PAUSE avant merge demandée) ; balayer l'arbre pollué (boussole/JA hors
périmètre, laissés à leurs owners).

**Prochaine action** : PR de compilation C2B base `main`, **PAUSE avant merge**.

**Questions ouvertes** : confirmation merge→prod ; source exacte du T0 d'épisode
(`confirmedAt` vs `targetAt`, LOT-08) ; volume réel de réponses portant `rawAnswers`.

## [2026-07-18] — C2B exécuté (LOT-07→09) : score J21, T0 par épisode, Fiche-trajectoire

**Contexte** : après arbitrage A8 + compilation (#111), exécution des 3 lots C2B, tous
**migration-free**, 1 lot = 1 PR, PAUSE/merge validés au fil de l'eau.

**Livré** : **LOT-07** (#112) score du résumé J21 branché (momentum réel via
depuisPrisma) — lève la dette LOT-04. **LOT-08** (#113) ancrage T0 **par épisode**
côté praticien (`construireHistoriqueEquilibre(…, ancreT0?)` rétro-compatible ;
« Mon équilibre » patient inchangé). **LOT-09** (PR en cours) **Fiche-trajectoire
read-only** : domaine pur `trajectoire.ts` + route `api/praticien/trajectoire` +
`TrajectoirePanel` monté au cockpit (Spirale-index daté, « jalon non mesuré » A8-2,
garde versionScore A8-3, empty-state comparaison A8-5-ii ; jamais une courbe A6).

**Décision de périmètre (revue)** : LOT-09 réalisé **read-only** plutôt que comparateur
complet — car aucun composant *compare* préexistant et modèle **mono-protocole** (pas
de clé de cycle). La vraie comparaison côte à côte multi-cycles est **reportée** à un
futur gate (modèle multi-cycles / migration).

**Options écartées** : comparateur complet + heuristique de regroupement (spéculatif,
sur-ingénierie) ; report total de LOT-09 (perte de l'index utile déjà réalisable).

**Prochaine action** : PR LOT-09 base main, PAUSE/merge selon CI verte.

**Questions ouvertes** : ouvrir le gate modèle multi-cycles (comparaison réelle) ;
SP-SPI (accueil patient trajectoire) et SP-MET/SP-CAB/SP-TT restent hors C2B.

## 2026-07-18 — Cadrage gate « modèle multi-cycles »

Ouverture du cadrage du gate reporté par LOT-09 (A8-5-ii, handoff LOT-06) : la vraie
comparaison côte à côte ≥ 2 cycles est bloquée par le modèle **mono-protocole** —
`AssessmentEpisode` n'a **aucune clé de cycle** persistée, le cycle est déduit en
mémoire (`milestone === 'T0'`), les jalons J21/J42/J90 sont re-dérivés par décalage,
sans arête stockée vers leur T0.

**Décisions** : livrable = **cadrage seul** (pose, ne tranche rien) au format
**triptyque** (BRAINSTORM + NOTE_TECHNIQUE + ARBITRAGES) sous
`propositions/2026-07-18-gate-modele-multi-cycles/`. Documentaire pur : `schema.prisma`
et `migrations/` intacts. Registre **non touché** (A8-6 promu seulement après arbitrage).

**Option écartée** : arbitrer/migrer maintenant (prématuré sans données réelles ≥ 2 cycles).

**Prochaine action** : arbitrer Q1–Q5 (colonne `cycleId` vs table `ProtocolCycle`,
`versionScore` par épisode, backfill) quand ≥ 2 cycles réels comparables existeront.

**Question ouverte** : modèle retenu — colonne vs table dédiée.

## 2026-07-18 — C5 LOT-02 import Ciqual Production

**Décisions** : import `ciqual-2025-v1` confirmé sous
`C5-LOT02-IMPORT-MC-2026-07-18-v1`, livré par PR #120 puis exécuté en
Production après advisors sans anomalie. Résultat : 55 744 lignes, 3 484
aliments, 16 constituants, un hash ; RLS active, zéro policy/grant Data API.
Le déclencheur temporaire a été retiré et C5 reste inactive.

**Option écartée** : exposer ou activer C5 avec le référentiel seul ; LOT-03 à
LOT-07 et le gate final restent requis.

**Prochaine action** : LOT-03 — moteurs et contrats versionnés, derrière
`WN_C5_ENABLED=false` par défaut.

**Questions ouvertes** : aucune pour LOT-02 ; activation Production toujours
soumise à une instruction explicite après LOT-07.

## 2026-07-18 — C5 LOT-03 moteurs et contrats versionnés

**Décisions** : contrats C5 purs livrés avec mapping clinique signé, PRAL
Remer–Manz, distribution Ciqual 2025 scellée et protocole V2. La référence C5
est liée à l'identifiant et au hash du protocole source ; la vue patient exige
un V2 relu puis approuvé et reste strictement qualitative. Les XML officiels
reproduisent les 12 fixtures signées (2 complètes, 10 partielles).

**Option écartée** : toute distribution partielle, référence transférable,
projection patient sur simple chaîne d'approbation ou diffusion automatique.

**Prochaine action** : LOT-04 — UX praticien « Observatoire ».

**Questions ouvertes** : aucune pour LOT-03 ; C5 reste inactive à `4/8`.

## 2026-07-18 — C5 LOT-04 Observatoire praticien

**Livré** : Boussole chiffrée, sourcée et tabulaire dans le cockpit, bornée au
fil `decisionCardId`. Le contexte priorité/protocole, le PRAL, les poids
nominaux, les versions et le manifeste hashé sont visibles. L'insertion reste
manuelle ; le serveur reconstruit la référence depuis Ciqual et refuse forge,
staleness, référentiel incomplet ou changement de priorité.

**Validations** : 513 tests, typage, build production, scoring-check,
anti-secrets, diff-check et revue indépendante GO. Deux warnings lint
historiques hors C5. Aucun schéma, import, migration ou activation.

**Options écartées** : confiance dans la référence fournie par le navigateur,
choix du dernier protocole du patient et diffusion automatique.

**Prochaine action** : LOT-05 — Jardin patient qualitatif. C5 reste inactive à
`5/8`; clavier, zoom 200 % et contraste seront contrôlés au go/no-go LOT-07.

**Questions ouvertes** : aucune pour LOT-04.

## 2026-07-18 — C3 exécutée (Documents contextuels multi-destinataires V1)

**Décisions** : campagne C3 exécutée intégralement — 5 lots = 5 PR
(#122/#123/#124/#125/#127), un lot → `main`, merge autonome sur CI verte, via
worktrees propres depuis `origin/main` (aucun fichier C5/JA d'autres owners
touché). Persistance V1 = **option (a) sans persistance** → aucune migration.
Domaine pur `web/src/lib/documents/` (contrat de bloc, machine d'états,
versionnage = tuple) ; composition deux colonnes ; rendus par destinataire
(field-filter, badge patient, médecin non prescriptif) ; `buildBookletHTML`
**extrait** et réemployé. Vitest documents 38/38.

**Options écartées** : persistance (b) (gate migration non ouvert) ; fil
bidirectionnel médecin (discordance 5.0) reporté au handoff LOT-04 ; montage en
page de production reporté.

**Prochaine action** : monter C3 au cockpit praticien (route + page) ou cadrer le
fil de correspondance médecin.

**Questions ouvertes** : accès/authentification médecin et régime de conservation
pour le fil bidirectionnel.

## 2026-07-18 — C3 reports post-V1 (montage + cadrages)

**Décisions** : les 3 reports du handoff LOT-04 traités. (1) **Montage construit**
(C3 LOT-05, #130) : route `GET /api/praticien/documents`, page `/dashboard/documents`
+ `DocumentsPanel`, aperçu/impression par destinataire, envoi patient réemployé
(booklet) ; page dédiée (pas d'extension de l'écran Synthèse — zéro régression).
Fix build : domaine `documents` rendu **isomorphe** (hash pur `hashStable`, retrait
de `node:crypto` du bundle client, révélé au premier montage). (2) **Fil médecin**
et (3) **persistance (b)** : **documentaires** — cadrage + gate `bloqué_confirmation`
non ouvert, sous `propositions/2026-07-18-c3-*`.

**Options écartées** : montage dans `SynthesePanel` (risque de régression sur le
chemin d'envoi) ; ouverture du gate persistance (aucun besoin d'historique immuable
confirmé) ; construction du fil bidirectionnel (accès/conservation médecin à arbitrer).

**Prochaine action** : arbitrer le fil de correspondance médecin (identité + HDS +
conservation) si le besoin se confirme.

**Questions ouvertes** : identité/accès médecin (lien signé vs compte) ; base légale
et durée de conservation d'un fil ; besoin réel d'un historique immuable (option b).

## 2026-07-18 — C5 LOT-05 Jardin patient

**Livré** : résumé Boussole qualitatif dans le protocole et l'espace alimentation,
avec zoom profond. L'autorisation serveur recoupe cookie signé, suivi actif,
protocole V2 relu/approuvé non caduc, action et référence Ciqual reconstruite.
Les profils partiels, références forgées, révocations et accès inter-patient
répondent sans énumération. Aucun score, percentile, poids, PRAL, hash ou version
interne n'est exposé.

**Validations** : 536 tests, typage, build, scoring-check, audit, anti-secrets,
diff-check et revue indépendante GO. Aucun schéma, import, migration ou activation.

**Décision** : alternatives laissées absentes jusqu'au catalogue validé LOT-06 ;
tests humains clavier/zoom/contraste regroupés au LOT-07.

**Prochaine action** : LOT-06 — assiettes, substitutions et pont JA. C5 reste
inactive à `6/8`.

## [2026-07-18] — C5 : LOT-06 et LOT-07, clôture et activation

**Contexte** : reprise des worktrees C5/JA laissés en travail non commité.
JA5-02 (LOT-03 harnais patient) et C5 LOT-06 (assiettes C5B + pont faisabilité JA)
finalisés, mergés (#134/#135, #136). Puis LOT-07 C5 mené jusqu'à la clôture.

**LOT-07 (validation, conformité, handoff)** : dossier de preuves produit
(`MATRICE_CONFORMITE_ET_TESTS_C5.md`, `VALIDATION_FINALE_C5.md`, `DETTE_C5.md`,
`HANDOFF_C5.md`, `ACTIVATION_RUNBOOK_C5.md`). Matrice verte (573 tests, type-check,
lint, scoring-check, prisma validate) ; advisors Supabase sans alerte bloquante.
Trois verdicts : **C5A GO, C5B praticien GO, C5B patient GO conditionnel** (dettes
humaines D-C5-01→04 : accessibilité, E2E boussole des 3 fixtures, vocabulaire, revue
visuelle). C5 passe à `8/8`.

**Décision** : activation demandée par le responsable (Martial CAYRE). Mécanique =
`WN_C5_ENABLED=true` dans Vercel Production + redéploiement (hors dépôt) ; rollback =
flag `false`, non destructif. Verdict patient acté conditionnel, dettes non maquillées.

**Prochaine action** : merger la PR LOT-07, définir `WN_C5_ENABLED=true` en prod +
redéployer, smoke test boussole ≠ 404, puis lever les dettes du volet patient.

## 2026-07-18 — Audit UX 5.0, poste de pilotage & A5-R2 (PR #138 mergée)

**Décisions** : SP-RUN posé étalon de conformité 5.0 ; direction « poste de
pilotage clinique » actée au registre (**A6-R1** : cockpit borné à l'écran,
cycle clinique en colonne vertébrale, instruments à tiroir, métriques actives,
patient séquentiel, typo remontée) ; canvas mid-tone « ardoise & sable » acté
(**A5-R2**, documentation seule — `globals.css` intact). Livrés : audit de
conformité du front UX, proposition + maquette autonome
(`propositions/2026-07-18-refonte-ux-5-0/`), alignement additif dans les 12
`CAMPAGNE.md`, design-system §9, CHANGELOG.

**Options écartées** : retour palette teal/or 4.0 (périmée) ; re-spécification
profonde des campagnes (risque sur contrats figés) ; application immédiate au
code (réservée Vague 1).

**Prochaine action** : lot Vague 1 (tokens portail patient, métriques actives,
cockpit borné, typo, A5-R2 dans `globals.css`), en synergie avec D-C5-04.

**Questions ouvertes** : cadrage des 7 campagnes UX (SP-COP, SP-TT, IDP,
SP-SPI, SP-MET, SP-CAB, SP-AMB) ; suivi des dettes C5 D-C5-01→04 à l'activation.

## [2026-07-18] — C5 LOT-07 : activation production confirmée

**Décisions** : activation C5 exécutée sur autorisation explicite du responsable —
`WN_C5_ENABLED=true` posé dans Vercel Production + redéploiement (`o1f0xy3re`,
aliasé `app.wellneuro.fr`). Verdict C5B patient acté GO **conditionnel**, dettes
humaines non maquillées (`DETTE_C5.md`, D-C5-01→04).

**Options écartées** : signature clinique distincte (responsable a autorisé à acter
directement) ; implémentation préalable a11y/E2E boussole (reportée en dettes pour
ne pas retarder l'activation).

**Validation** : 573 tests, type-check, lint, scoring, prisma validate, audit,
anti-secrets, advisors sans alerte bloquante, CI verte (PR #137). Smoke test prod :
route boussole non authentifiée 404→**401** ⇒ flag actif en production.

**Prochaine action** : lever les dettes du volet patient (accessibilité, E2E
boussole des 3 fixtures) avant élargissement multi-praticien.

**Questions ouvertes** : rétro-compatibilité des références d'assiette lors d'un
futur `c5b-plate-catalog-v2`.

## 2026-07-18 — Clôture branche C2B lot-09 (side-line dépassée)

**Décisions** : suppression de `feat/c2b-lot-09-trajectoire` (tip `d86f4f6`),
side-line divergente depuis le fork `928c616` — LOT-09, proposition gate
multi-cycles et filtre JA `status:'draft'` déjà présents sur le tronc C5. Deux
commits de clôture y avaient été posés (`docs(c2b)` handoff gate, `feat(ja)`
durcissement activation) puis abandonnés avec la branche. Constat associé :
Ciqual désormais injecté sur `main` (migration
`20260718100010_c5_ciqual_reference_v1`).

**Options écartées** : merger la branche (réintroduirait 13 commits `docs(c5)`
LOT-01 divergents) ; patch pleine-fichier (écraserait la garde `patientId` de C5).

**Prochaine action** : porter la seule garde non répliquée — JA
`actor !== 'praticien'` (reflog `d86f4f6`) — sur le tronc C5, ou l'abandonner.

**Questions ouvertes** : garde `actor` — porter ou abandonner définitivement ?

## 2026-07-19 — Clôture de la garde JA `actor` (question ouverte du 2026-07-18)

**Décision** : question close. La garde non répliquée de la branche C2B supprimée
a bien été portée sur le tronc par `2158581` (PR #142) :
`web/src/lib/food-observation/persistence.ts:282` rejette toute source dont
`actor !== 'praticien'`, garde posée après le contrôle `episodeId` — placement
conforme à l'intention d'origine. Couverte par
`persistence.activation.test.ts` (3 tests : refus `actor=patient`, refus sans
`actor`, cas passant praticien) — rejoués ce jour, 3/3 verts.

**Réserve** : l'objet `d86f4f6` (tip de la branche abandonnée) n'est plus
accessible localement (GC), la comparaison exhaustive avec la side-line n'est
donc plus possible. On s'appuie sur le constat du 2026-07-18 qui identifiait
cette garde comme la **seule** non répliquée.

**Prochaine action** : inchangée — point 4 « Poste de pilotage » de la Vague 1
(cockpit borné de `FichePatientPanel`), dernier point restant après #144/#145.

## 2026-07-19 — Vague 1 close : poste de pilotage mergé, E2E rattrapés, `main` protégée

**Décisions** : #146 (cockpit) et #147 (finitions) mergés — merge commit pour le
premier (préserve l'ancêtre du stack), squash pour le second. Découvert au
merge : #146 laissait **6 E2E rouges**, les specs asservissant l'ancienne fiche
linéaire alors que le cockpit affiche une phase à la fois. Specs adaptées à la navigation par
phase (`8ba41a9`) : fonctionnalité intacte, aucun test supprimé (34 passed
avant/après). Protection de `main` activée — check `verify` requis, sans rebase
strict ni revue obligatoire.

**Options écartées** : merger malgré l'E2E rouge (aurait poussé la régression en
prod) ; force-push pour aligner le co-auteur (bloqué par hook) → squash à message
explicite.

**Prochaine action** : rendre les E2E lançables en local (`NEXTAUTH_SECRET` +
Postgres seedé + build prod aujourd'hui requis) — sinon « CI rouge » restera une
découverte tardive.

**Questions ouvertes** : aucune bloquante.

## 2026-07-19 — Rectification : les E2E étaient exécutables en local

**Correction** : l'entrée précédente affirmait les E2E impossibles en local
(« build prod + Postgres seedé + `NEXTAUTH_SECRET` »). Faux sur les quatre
points. `web/e2e/README.md` documente la procédure, `npm run test:e2e` utilise
`next dev`, et `scripts/wn-test-worktree.sh` — réplique locale du job CI
`verify` — provisionne un PostgreSQL éphémère et exporte lui-même un
`NEXTAUTH_SECRET` jetable. Je n'avais lu ni ce README ni les scripts npm.

**Cause réelle de l'incident** : `CLAUDE.md` ne mentionnait ni E2E ni Playwright,
et sa règle « pas de régression visible dans le parcours praticien ou patient »
n'avait aucune commande attachée. Corrigé : commandes E2E ajoutées, plus la
lecture du CI avant d'annoncer une PR prête.

**Réserve machine** : sur ce Mac le harnais échoue encore (« PostgreSQL absent
et sudo indisponible ») — il vise Debian/`apt-get` ; macOS exige PostgreSQL
installé puis `WN_PG_BIN`.

**Prochaine action** : ce setup mac, en remplacement de l'action précédente
fondée sur un constat erroné.

## 2026-07-19 — Vague 2 : cinq PR en production, quatre gates ouverts

**Décisions** : Vague 2 exécutée en PR successives vers `main` (#148→#152), toutes
mergées et déployées. #148 cadre les 5 campagnes manquantes (écart E2 de l'audit)
et rectifie deux affirmations fausses : la maquette ne badge que 2 éléments, et le
Fil n'a **aucune carte refusable** malgré le garde-fou 5.0. #149 rend l'index de la
Spirale navigable (il était calculé et rendu nulle part — les épisodes J21/J42/J90
n'apparaissaient dans aucun écran) et transforme le « comparateur » textuel en
vraie grille. #150 dérive la météo d'adhésion des check-ins existants, sans
migration. #151 branche le pré-vol T-10 min sur l'entrée de rail restée morte.
#152 couvre le Fil, dont l'E2E passait sur un accueil cassé.

**Options écartées** : colonne `instrument_id` (le score est un composite pondéré,
elle n'aurait rien à contenir) ; recopie des discordances dans le pré-vol (deux
assemblages du `ClinicalSnapshot` pourraient diverger — le pré-vol pointe vers le
poste de pilotage) ; contournement des hooks de protection par Bash ou par
édition de `settings.local.json`.

**Prochaine action** : ouvrir une session `WN_ALLOW_PROTECTED_WRITE=1 claude` et
appliquer le gate G2, entièrement préparé dans
`campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/GATE_G2_IDENTITE_CYCLE.md`.
Sans gate : SP-COP LOT-02 (minute d'après) et SP-TT LOT-01 (lecture d'un état
passé) sont livrables tels quels.

**Questions ouvertes** : arbitrage du fil de correspondance médecin (C3, reliquat
reporté) ; routes `fil` et `metrics` ne filtrent pas sur `praticienEmail` — sans
effet en mono-praticien, fuite dès le second compte.

## 2026-07-20 — Gate G2 appliqué : identité de cycle des épisodes

**Décisions** : G2 mergé (#155, `e7beec7`), migration additive
`20260719120000_c2b_cycle_identity_v1` (`cycle_id`, `version_score` nullables).
Enjeu réel : le `versionScore` était recalculé à la lecture depuis la constante
courante, rendant la garde A8-3 **indéclenchable** ; il est désormais figé à la
confirmation, et une version nulle donne `version_inconnue` au lieu d'être
assimilée à la version courante.

**Écartés** : `instrument_id` (composite pondéré — rien à y mettre) ; requête de
cycle dupliquée dans les deux routes, remplacée par `resolveCycleId` pure.

**Vérifié** : `test:worktree --fast` (PG éphémère, aucune dérive, 675 unitaires
+ 41 E2E), CI PR et `main` verts, Vercel prod vert, migration `finished_at`
06:36:48 UTC sans rollback.

**Prochaine action** : rebaser `fix/gardes-appartenance-praticien` sur `main` —
la PR #154 porte le commit G2 en doublon.

**Questions ouvertes** : backfill non compté (lecture prod bloquée) ; gates G1,
G3 et G4 toujours ouverts.

## 2026-07-20 — Clôture de la Vague 2 : ce qui est livré, ce qui reste bloqué

**Livré** : discipline « une session = un worktree » posée dans `CLAUDE.md` et
`ROLES_MACHINES.md` après deux collisions réelles (#159) ; lecture d'un état
passé (#158) ; minute d'après SP-COP LOT-02 (#160) — état de la chaîne
Relu → Validé → Envoyé, sans jamais la franchir ; clôture documentaire (#161).

**Écarté** : dupliquer les chemins d'écriture de relecture et d'approbation dans
la minute d'après — deux vérités sur le même invariant finissent par diverger,
même argument que le refus de recopier les discordances dans le pré-vol.

**Refusé** : modifier TRUST pour des « patients réels de test ». Un patient réel
de test reste une personne réelle ; ses réponses sont des données de santé dès
la première soumission. L'invariant du dépôt recopie le droit. Livré à la
place : la checklist d'activation G-TRUST-04, dont **aucune** des sept exigences
n'est satisfaite — le point bloquant est l'hébergement, pas le code.

**Trouvé en lisant le code** : une carte du Fil n'a aucune identité (coût caché
de G1) ; le couplage de G4 au jeton permanent est purement côté navigateur,
vérification faite — le jeton n'entre jamais en base par le Journal Alimentaire.
Les deux ouvrent un travail migration-free à faire avant les gates.

**Prochaine action** : relancer une session avec `WN_ALLOW_PROTECTED_WRITE=1`
depuis ce worktree pour G3, puis G1, puis G4. Dossier prêt :
`docs/claude/GATES_VAGUE2_G1_G3_G4.md`.

**Questions ouvertes** : arbitrage du fil médecin entrant (identité, conservation)
— seul reliquat C3, le sortant étant déjà sans pièces jointes par construction ;
isolation multi-praticien à 13 routes sur 31 ; SP-SPI en attente de G4.

## 2026-07-20 — Garde-fous : trois verdicts au lieu d'un mur (PR #162)

**Déclencheur** : `WN_ALLOW_PROTECTED_WRITE=1` restait actif depuis le gate G2
du matin — la variable désactive la session, pas l'action.

**Décidé** : hooks à trois verdicts. Schéma et migrations passent du blocage dur
à `permissionDecision: ask` ; la variable est supprimée. Le niveau refus lit la
commande brute, le niveau demande la commande aux littéraux masqués — fin du
faux positif sur les corps de PR. Le MCP Supabase, qui atteignait la production
sans aucun hook, est limité aux lectures ; neuf outils mutants refusés.

**Écarté** : découper le CI en jobs parallèles — changerait les noms des checks
requis.

**Vérifié** : `assessment_episodes` est VIDE ; le backfill G2 n'a rien rattaché.

**Prochaine action** : G1. La consigne `WN_ALLOW_PROTECTED_WRITE=1` de l'entrée
précédente est caduque.

**Ouvert** : raccourci CI documentaire jamais exercé ; `_prisma_migrations` ment
sur `r8_lite_consent_fields`.

### Correctif (même session, après clôture)

**Le raccourci CI a été exercé** : PR #164, documentaire, `verify` vert en **26 s**
contre 5 min 23 s. Anti-secrets, audit campagnes et certification scoring ont
tourné ; tout le reste sauté. Le point n'est plus ouvert.

**G1 est déjà pris** : worktree `gates-g3-g1-g4` verrouillé sur
`feat/g1-cle-carte-fil`, basé sur `ed3bfe0`. Ne pas le rouvrir depuis une autre
session — c'est la collision de ce matin. Reprise libre : **G4**.

## 2026-07-20 — Isolation multi-praticien : 12 routes fermées

**Décisions** : la garde d'appartenance (#156) est étendue à 12 routes
praticien — le compte passe de 13 gardées sur 31 à 25. Trois d'entre elles
agissaient sur le monde extérieur sans contrôle : `booklet` POST envoie un
document au patient par e-mail, `assignations` et `packs/assign` déclenchent un
e-mail, `synthese` POST transmet les réponses d'un patient à l'API Anthropic.
La garde y est posée **avant** l'effet. `trust` PATCH passe de `update` à
`updateMany` : `update` n'accepte pas de filtre sur la relation patient.

**Écarté** : répondre 403 sur le patient d'un autre praticien — cela
confirmerait son existence ; il est traité comme introuvable. `praticien/token`
laissée non gardée à dessein : fichier cœur de G4, la toucher créerait un
conflit avec la session gatée.

**Vérifié** : anti-secrets, type-check, lint, Vitest (719), `test:worktree
--fast` vert — 45 E2E, aucune dérive schéma ↔ migrations. Aucune migration.

**Prochaine action** : la session gatée applique G3, puis G1, puis G4
(`docs/claude/GATES_VAGUE2_G1_G3_G4.md`).

**Questions ouvertes** : G-TRUST-04 reste non levé, l'hébergement HDS est le
point bloquant ; fil médecin entrant en attente d'arbitrage ; SP-SPI dépend
de G4.

## 2026-07-20 — Correction des constats de clôture

**Constat annulé** : `_prisma_migrations` ne ment pas. Le nom
`r8_lite_consent_fields` porte **deux** lignes — l'échec de 22:21:30, puis à
22:30:38 la trace d'un `migrate resolve --applied` (`applied_steps_count = 0`).
Le registre est correct depuis le 2026-07-06, aucune écriture de production
n'est requise. La requête inverse, qui liste les migrations dont aucune
tentative n'a abouti, ne rend aucune ligne.

**Cause réelle** : la requête de vérification que j'avais inscrite dans
`CLAUDE.md` (`ORDER BY finished_at DESC NULLS FIRST LIMIT 5`) remonte en tête
la ligne annulée et n'agrège pas les tentatives d'un même nom. Remplacée par
deux requêtes groupées par `migration_name`.

**Second constat corrigé** : le niveau « refus » de `block-risky-commands.mjs`
masque désormais le corps d'un heredoc lorsque la commande entière ne contient
aucun vecteur d'exécution. On ne cherche pas qui consomme le heredoc —
`cat <<EOF | bash` rendrait l'analyse fausse. Banc de test 10/10 : 3 cas de
prose passent, 7 évasions restent refusées.

**Écarté** : masquer aussi les littéraux entre quotes au niveau refus.
`psql -c 'DROP TABLE patients'` doit rester bloqué ; le faux positif sur
`echo 'DROP TABLE'` est assumé.

**Prochaine action** : **G4**, déjà en cours dans le worktree `gates-g3-g1-g4`
(migration `g4_portail_magic_links_v1` non commitée) — se coordonner avant d'y
toucher.

## 2026-07-20 — Audit du travail des sessions parallèles

**Constat principal** : le CHANGELOG de #167 annonce « 12 routes fermées, 25 sur
31 ». Vérifié ligne par ligne sur `origin/main` : **cinq routes praticien
manipulant de la donnée patient restent non gardées**. `booklet` GET et
`besoins` sont explicitement revendiquées — la seconde comme « catalogue sans
donnée patient », alors qu'elle prend `?idPatient` et rend prénom, nom et
couverture clinique. `synthese` PATCH (écriture), `patients` GET/PATCH/DELETE
(le registre complet) et `consultations` POST (qui lève un accès portail
révoqué) ne sont pas mentionnées.

**Calibration** : un seul compte praticien en production (17 patients). Aucune
fuite active ; le risque est latent et se matérialise au second praticien. Le
défaut est la fausse assurance, pas la brèche.

**Clos entre-temps** : `praticien/token` est gardée par #172 (G4), garde posée
avant l'effet sur POST et DELETE. Les quatre migrations du jour sont appliquées
en production, une tentative chacune, strictement additives.

**Prochaine action** : corriger le CHANGELOG (urgent, sans risque de conflit),
puis fermer les cinq routes et ajouter un test de recensement des gardes.

**Ouvert** : doctrine 403 vs 404 — le commit `1d6719b` impose le 404 partout, la
docstring de `verifierAppartenancePatient` recommande l'inverse, et les routes
G1/G3 suivent la docstring.

## 2026-07-20 — Gates de la Vague 2 : G3, G1, et le préalable de G4

**Décisions** : quatre PR mergées, deux migrations appliquées en production
(vérifié : `relecture_notes` 17:34 UTC, `fil_card_rejections` 17:47, sans
rollback). G3 — une note de relecture reçoit l'instant relu **dans son corps**,
`cree_le` posé par la base : on écrit aujourd'hui à propos du passé, sans
assouplir le refus `asOf` du cockpit. G1 — clé de carte livrée d'abord seule
(#166), puis table et geste (#168). G4 — reclé des traces locales sur
l'`idPatient` de session, à part de l'authentification.

**Écarté** : l'unicité `(id_patient, carte_cle)` demandée par le dossier —
incompatible avec l'append-only qui porte la réversibilité exigée ; écart
documenté. Le jeton d'URL comme clé de stockage : c'est un secret d'accès.

**Vérifié** : `test:worktree` complet avant chaque commit portant migration ;
CI verte sur les quatre PR ; dérive schéma ↔ migrations nulle après fusion des
deux modèles dans `schema.prisma`.

**Prochaine action** : G4 lui-même — lien haché, 24 h, consommation unique,
message unique au rejeu — avec revue de sécurité obligatoire avant merge.

**Questions ouvertes** : quand les liens permanents déjà envoyés cessent d'être
honorés, et la politique anti-énumération du canal de redemande — ni l'une ni
l'autre n'est une décision technique. Le dossier des gates recensait deux
traces locales ; il y en avait trois (`portail:derniere-visite`, en
`localStorage`) : à corriger dans le dossier.



## 2026-07-20 — G4 livré éteint, et audit des garde-fous

**Décisions** : G4 mergé (#172) — lien magique haché, 24 h, usage unique, rejeu
tracé en base — derrière `WN_G4_LIEN_MAGIQUE`, absent de Vercel. Vérifié en
production : migration appliquée, `portail_magic_links` vide. Dossier des gates
corrigé (#171). Audit de #173 : constats justes, mais son masquage des heredocs
lisait le texte au lieu de la structure. #176 corrige, plus deux trous
préexistants — dont une dérogation qui laissait passer `prisma migrate deploy`
mis en commentaire.

**Écarté** : sortir le jeton de l'URL du portail (le cœur d'authentification s'y
noierait) ; merger #173.

**Vérifié** : `test:worktree` complet avant chaque commit portant migration ;
banc de hook committé, 27 cas — 20 passent sur la version d'avant.

**Prochaine action** : décider l'activation de G4.

**Questions ouvertes** : péremption des liens permanents déjà envoyés, et
acceptation des deux résidus (réponse non égalisée, pas de limitation par IP).
Ni l'une ni l'autre n'est technique. SP-SPI en dépend.


## 2026-07-21 — G4 activé en production

**Décisions** : `WN_G4_LIEN_MAGIQUE=true`, **Production seule**. Essai concluant
sur `PAT006` (adresse du praticien) : jeton absent de la base, consommé,
**5 rejeux tracés**, 24,00 h. Le canal public reste fermé. Une partie des
dossiers de production sont de **vraies personnes** ayant consenti à une phase
de test — consigné dans la checklist G-TRUST-04.

**Écarté** : traiter ce consentement comme satisfaisant l'exigence 1. Il couvre
la licéité du traitement, pas la certification de l'hébergeur (CSP L1111-8, dont
cette exigence a disparu en 2018). Alerte, pas avis juridique.

**Corrigés en route** : le drapeau posé sur **Preview**, qui lit la base de
production — des liens auraient pu partir vers de vrais dossiers depuis une URL
de prévisualisation. Et le runbook, qui imposait la fixture, dont l'adresse
n'existe pas : l'envoi d'e-mail n'aurait jamais été testé.

**Prochaine action** : demander à Supabase et Vercel leur certification HDS.

**Questions ouvertes** : péremption des liens permanents ; les deux résidus du
canal de redemande.

## 2026-07-21 — G4 : les deux résidus du canal de redemande

**Décisions** : les deux résidus sont fermés (#182, mergée). Plancher de réponse
de 1,5 s sur **un chemin de sortie unique** — aucune branche ne peut y échapper,
pas même la panne — et arrondi au palier de 500 ms au-delà. Plafond de 20
tentatives/heure **par origine réseau**, en base : le plafond par patient ne
bornait pas l'énumération, qui ne touche aucun patient. Migration additive
confirmée explicitement ; le drapeau reste absent de la production.

**Écarté** : compter dans `portail_magic_links` (une adresse inconnue n'y crée
aucune ligne, or c'est la tentative à compter) ; un compteur en mémoire (le
serverless en a plusieurs). Écarté aussi : traiter la fermeture des résidus
comme valant décision d'ouvrir le canal.

**Vérifié** : T3 complet — 843 tests, aucune dérive schéma ↔ migrations, 51 E2E ;
en production, table créée, **0 clé étrangère vers `patients`**, RLS active, vide.

**Prochaine action** : demander à Supabase et Vercel leur certification HDS.
Inchangé depuis hier.

**Questions ouvertes** : ouverture du canal public ; péremption des liens
permanents ; LOT 4 (registre), qui revient au responsable.

## 2026-07-21 — HDS instruit, dérogation datée, TRUST clos pour la phase de test

**Établi** : Supabase et Vercel sont **absents de l'annuaire ANS** (404
hébergeurs certifiés). La question posée à Supabase le 2024-11-29 est toujours
sans réponse. HDS v2.0 en vigueur depuis le 2026-05-16. Scalingo et Clever Cloud
sont certifiés sur les six activités. Inventaire du dépôt : **aucune dépendance
bloquante à Vercel**, aucun SDK Supabase au runtime — le coût d'un déplacement
est le transfert de base, pas le code.

**Décision du responsable** : phase de test avec personnes réelles, nouveaux
dossiers compris, **bornée au 2026-10-21**. Canal public de redemande ouvert.

**Écarté** : écrire cela comme une conformité. La gratuité n'exonère pas de
L1111-8, l'information des participants ne décharge pas. C'est consigné comme
**écart assumé et compté** — l'invariant est suspendu, pas abrogé.

**Prochaine action** : poser `WN_G4_REDEMANDE_PATIENT` en Production seule.

**Questions ouvertes** : migration d'hébergeur ; tracer l'information délivrée
aux participants ; péremption des liens permanents.

## 2026-07-21 — audit de conformité 5.0 : trois PR mergées

**Décisions** : trois PR ciblées, sécurité d'abord. PR1 (#181) ferme 3 routes
praticien non isolées (le plus grave : révocation/réémission d'accès portail
pour le patient d'un autre) et recale G-TRUST-04 (13→30/33). PR2 (#183) :
score masqué au patient (E10), vocabulaire interne retiré, focus clavier +
libellé texte sur « Mes 12 besoins », cibles 44px, garde vocabulaire médecin,
couleurs retokenisées. PR3 (#185) : statuts de campagne réalignés,
`.wn/state.json` corrigé sans arbitrer G-TRUST-04 (autre session), miroir
`wellneuro_wn_campaigns/` supprimé, incohérences documentaires réglées.

**Écarté** : E11/E16 différés Vague 2 ; réserves R1–R9 non arbitrées.

**Vérifié** : T1/T3 par PR, CI verte sur les trois ; PR2/PR3 rebasées après
PR1 (conflit `CHANGELOG.md` d'insertion, sans perte).

**Prochaine action** : reprendre G-TRUST-04 une fois l'autre session conclue.

**Questions ouvertes** : celles de l'audit (R1–R9), à arbitrer par le
propriétaire produit.

## 2026-07-21 — HDS tranché, et le droit à l'effacement devient exécutable

**Décisions** : l'hébergement est **instruit et négatif** — Supabase et Vercel
absents de l'annuaire ANS. Le responsable autorise la phase de test malgré
l'écart, **bornée au 2026-10-21**. Canal public de redemande ouvert. Campagne
IDP2 ouverte (#187) ; LOT-01a livré (#189) : clôture de suivi et **effacement
réel**, l'application le promettant depuis TRUST sans rien derrière.

**Écarté** : écrire la dérogation comme une conformité (la gratuité n'exonère
pas de L1111-8) ; garder le prénom dans le résidu (rapprochable sur 17
dossiers) ; conserver l'e-mail haché (une empreinte à clé reste testable) ;
Facebook comme fournisseur d'identité.

**Vérifié** : deux T3 complets ; en production, migration appliquée en une
tentative, `dossiers_effaces` sans clé étrangère, RLS active, vide.

**Prochaine action** : LOT-01b — menu regroupé et confirmations.

**Questions ouvertes** : migration d'hébergeur ; tracer l'information délivrée
aux participants.

## 2026-07-21 — Vague 2 : typographie praticien (E16) et cadrage E11

**Décisions** : les deux écarts « moyenne » différés de l'audit 5.0, traités
selon §12.6 « sans les improviser ». **E16** (#191) — balayage **sémantique**
sur 31 fichiers praticien : corps 14 → 16 px sur le seul texte de lecture
continue, 10 titres 24 → 30 px. **E11** (#192) — **cadrage seul** : dette
rattachée au LOT-01 de SP-SPI, legacy hors périmètre (D-002).

**Écarté** : le zoom global du thème (grossit badges et tableaux denses,
n'atteint pas 28 px) ; `components/ui/**`, partagé avec le patient ;
improviser E11, qui dépend d'IDP.

**Vérifié** : T1, T2 (51/51 E2E), CI verte sur les deux PR puis sur `main`.
Branches refaites depuis `origin/main` ; trois conflits de retokenisation
résolus en gardant le token de `main`. **Non vérifié** : le rendu visuel,
faute d'outil navigateur.

**Prochaine action** : relecture visuelle humaine des écrans praticien.

**Questions ouvertes** : réserves R1–R9 ; E17 et E18.

## 2026-07-21 — Quatre lots : gouvernance, a11y/sécurité, accueil patient

**Décisions** : quatre chantiers, une PR chacun. **#195** — la chaîne
d'autorité décrivait un dépôt périmé, au point d'envoyer cette session sur une
action déjà prise ailleurs : E19 résiduel (IDP), E27, E24, IDP2 enregistrée.
**#197** — `prefers-reduced-motion` absent du dépôt, trois `aria-hidden`
manquants, et `auth.ts` qui déduisait le domaine du seul texte de l'e-mail.
**#198** — accueil séquentiel « Mon parcours » (résorbe E11) et reprise, dont
le seuil est **importé** du Fil praticien plutôt que redéfini : sinon les deux
surfaces se contrediraient.

**Écarté** : `hd` strict — verrouillerait la production si Google cessait de le
renvoyer ; « Ma spirale » — collision avec le journal alimentaire ; la
migration dans #198 — isolée dans une PR relisible.

**Vérifié** : T1 partout, T2 (51/51 E2E) sur le code, CI verte sur les quatre.
Rendu visuel toujours non contrôlé.

**Prochaine action** : E18, débloqué par le merge de #194.

**Questions ouvertes** : gate migration SP-SPI (chemin retour du pack) ; E17,
E20, R1–R6.
