# Journal de session — Wellneuro NNPP2

## 2026-07-04 — Série D1 (design system) terminée

**Décisions prises** : livraison complète de la série D1 (PR #4 à #10, mergées) — tokens deep teal/champagne gold, thèmes `patient` (clair)/`praticien` (sombre) via `data-theme`, composants `ui/` (Badge, MetricCard, PatientRow), shell praticien sombre, `MetricsSection`/`PatientsPanel` restylés, Recharts retenu pour les composants de score, `docs/design-system-d1.md` rédigé.

**Options écartées** : `text-primary` pour le logo en mode sombre (contraste ~1,9:1, rejeté) → `text-accent` ; forge de cookie NextAuth pour tester `/dashboard` → redirect commenté temporairement puis annulé (plus simple) ; Nivo/Visx/ECharts pour la viz de score → Recharts (API JSX, bundle raisonnable).

**Corrections notables** : deux vrais bugs de contraste AA détectés uniquement par capture d'écran (`dashboard/page.tsx`, `dashboard/patients`/`synthese`), un commit égaré sur une mauvaise branche (espace Git partagé), convention CRLF/LF non uniforme du dépôt.

**Prochaine action prioritaire** : E0 — bascule Sheets → PostgreSQL exclusif (dette technique, prioritaire avant tout nouvel empilement), ou E1 (référentiels Ciqual, parallélisable).

**Questions ouvertes** : `SynthesePanel.tsx` reste non migré au thème sombre (aucun lot D1 ne le couvre) — à trancher si un futur lot le concerne.

## 2026-07-05 — E0 (bascule Sheets→Postgres) + audit fidélité questionnaires

**Décisions prises** : migration Postgres pure de 4/6 routes E0 (`metrics`, `reponses`, `assignations`, `patients`), avec redéfinition du compteur "questionnaires en cours" (statuts Sheets obsolètes) et génération `PATnnn` via MAX() Postgres. Lancement d'un audit (2 agents) comparant `questions.ts` aux sources md officielles d'un dossier Drive fourni par l'utilisateur ; confirmation directe que 3 sources md elles-mêmes divergent de l'officiel (IPSS Q002, item huile d'olive MEDAS, Conners Parents = mauvaise version/108 items).

**Options écartées** : nouveau modèle Prisma `Questionnaire` (migration schema) au profit d'un enrichissement du catalogue en code, une fois les données fournies.

**Corrections notables** : `web/.env.production.local` contient un `DATABASE_URL` prod en clair (gitignoré, non commité, signalé sans action).

**Prochaine action prioritaire** : rattrapage `migrate-historique` (dry-run puis réel) avant déploiement de `patients/route.ts` ; utilisateur poursuit les corrections cliniques via Copilot.

**Questions ouvertes** : audit Neuro-psychologie/Stress/Addictions inachevé (limite de session) ; version cible Conners Parents (27 vs 108 items) à trancher ; scope OAuth `spreadsheets`/`SHEET_ID` toujours actifs.

## 2026-07-05 — Alignement questionnaires ALI/NEU/MOD + scoring Monnier

**Décisions prises** : alignement source Drive de `Q_MOD_02`, `Q_NEU_03`, `Q_ALI_01` et `Q_ALI_03` dans `web/src/lib/questions.ts`, en conservant les primitives de scoring existantes (`sum`, `sum_no_interpretation`, `subscore`) et sans modifier le schéma Prisma. Ajout d’une sortie calculée dédiée Monnier dans le moteur (`proteinesGJour`, `caloriesBaseEstimees`, `caloriesAdditionnelles`, `caloriesTotalesEstimees`).

**Options écartées** : création d’un nouveau type de scoring global ; migration DB ; refactor large du moteur.

**Prochaine action prioritaire** : vérifier le rendu UI des nouveaux libellés longs (ALI_01/ALI_03) côté formulaires patient/praticien.

**Questions ouvertes** : besoin éventuel d’interprétations cliniques automatiques spécifiques Monnier (aujourd’hui calcul brut + dérivés).

## 2026-07-06 — E0 committé/poussé + lancement "Mon équilibre" (ex-NeuroScore)

**Décisions prises** : commit/push des 4 routes E0 restantes (Sheets→Postgres). Terminologie "NeuroScore" définitivement abandonnée au profit de "Mon équilibre" (patient) / "Cartographie neuro-fonctionnelle" (praticien), actée dans 6 documents fournis par l'utilisateur (vérifiés réels dans son Drive) : `MON_EQUILIBRE_CONTEXTE.md`, `ROADMAP_R9_UPDATE.md` (appliqué au roadmap), `PROMPTS_MON_EQUILIBRE.md`/`PROMPTS_BOUSSOLE_ALIMENTAIRE.md` (14 branches scénarisées), `GUIDE_12_BESOINS_NEURONUTRITION.md`, `BOUSSOLE_ALIMENTAIRE_CONTEXTE.md`. Architecture actée : 12 besoins/4 piliers/3 strates pondérées (Corps 60 %, Ancrage 20 %, Esprit 20 %), plafonnement anti-moyenne sur fondations critiques. Première branche livrée : `feat/e2-scoring-engine` (`web/src/lib/equilibre/`), mapping vers 8 questionnaires existants, 4 besoins explicitement non évaluables (aucune source), vérifié par 5 assertions.

**Options écartées** : mon propre brouillon `docs/neuroscore-e2-methodologie.md` (6-8 axes, obsolète) — supprimé au profit de l'architecture actée par l'utilisateur ; vertical slice Nutrition Lab improvisé — abandonné, les 14 branches déjà scénarisées font foi.

**Prochaine action prioritaire** : `feat/e2-evidence-levels` et `feat/e2-momentum-tracking` (parallélisables), puis les 3 branches UI ; en parallèle, les 7 branches Boussole alimentaire peuvent démarrer.

**Questions ouvertes** : `npm run prisma:seed` cassé (config `migrations.seed` manquante dans `prisma.config.ts`, Prisma 7) — non corrigé, hors périmètre de la branche ; choix futur d'un vrai framework de test si le moteur grossit.

## 2026-07-06 — R8-lite lancé en avance : consentement, statuts, branche expérimentale

**Décisions prises** : R8 avancé hors séquencement E3 via une branche
isolée `experiment/r8-consent-flow-early-test`, pour obtenir un retour
d'expérience rapide avec des patients test réels. Patient conserve un
droit de consultation permanent de ses réponses et un droit de demande de
modification, validée manuellement par le praticien (pas de notification
auto). Texte de consentement figé (nom praticien en dur : "Martial
Cayre") et schéma de statuts arbitré : `consentement`
(non_donne/donne/retire) et `statut_reponses`
(non_rempli/verrouille/modification_demandee/deverrouille). Badge de
demande de modification placé sur la fiche patient individuelle
uniquement. Expéditeur email confirmé : alias `noreply@wellneuro.fr` sur
Gmail Pro Workspace.

**Options écartées** : social auth Google côté patient (dépendance tiers
publicitaire) ; compte persistant/magic link réutilisable et passkeys
(reportés, non nécessaires pour un test ponctuel) ; notification
automatique praticien sur demande de modification.

**Prochaine action prioritaire** : créer le squelette de la branche
`experiment/r8-consent-flow-early-test` (écran consentement, champs de
statut sur l'assignation — migration à confirmer séparément, écran
consultation/demande de modification, badge fiche patient).

**Questions ouvertes** : réconciliation future de cette branche avec le
lot E3 officiel ; délivrabilité de l'alias `noreply@wellneuro.fr` à
surveiller sur un volume de test réel.

## 2026-07-06 — R8-lite : squelette consentement + verrouillage implémenté

**Décisions prises** : squelette livré sur `experiment/r8-consent-flow-early-test`
(non commité) : docs figées, migration Prisma confirmée (6 champs
`consentement`/`statutReponses` sur `Assignation`), écran de consentement
+ consultation lecture seule côté patient, badge + déverrouillage manuel
côté praticien (fiche dépliée uniquement, jamais la liste). Aucune
nouvelle fonction email : le lien d'invitation existant mène désormais
au consentement avant le questionnaire. Cycle complet vérifié via l'API
(non_donne→donne→verrouille→modification_demandee→deverrouille→verrouille).

**Options écartées** : écraser le `CLAUDE.md` racine avec la version
collée par l'utilisateur — confirmé comme contexte seulement, pas une
instruction de dépôt.

**Prochaine action prioritaire** : vérification visuelle navigateur
(Playwright absent de l'environnement, non testé) et test du
déverrouillage praticien via une vraie session authentifiée, avant tout
essai avec des patients réels.

**Questions ouvertes** : réconciliation avec E3 officiel ; délivrabilité
`noreply@wellneuro.fr` ; nom praticien en dur vs dynamique ; décision de
commit/push de la branche.

**Perspectives à envisager** : scripter le démarrage de Postgres local
(instance trouvée arrêtée, redémarrée manuellement) ; ouvrir une PR
courte dédiée à ce squelette une fois validé ; anticiper la bascule vers
le R8 officiel (magic link + passkeys, E3) en réutilisant le gating déjà
posé ici plutôt qu'en le redupliquant.

## 2026-07-06 — R8-lite mergé en prod + Boussole §9 tranché + schéma neuro_axis

**Décisions prises** : R8-lite (consentement/verrouillage) commité, mergé
et poussé sur `main`. Les 12 décisions ouvertes de `BOUSSOLE_ALIMENTAIRE_CONTEXTE.md`
§9 tranchées avec l'utilisateur : MVP en vertical slice (besoin 1 seul,
~12 aliments vedettes), pondération clinique du besoin 2 (fer/B9/B12
prioritaires), 3 axes Niveau 2 nommés dès V1 (Calme/stress,
Microbiote/digestif, Clarté cognitive), signaux Niveau 2 affichés au
patient dès V1, chronobiologie différée après le MVP. Branche
`feat/e1-neuro-axes-schema` livrée : tables `neuro_axis` et
`nutrient_axis_weight`, migration appliquée en local, mergée sur `main`.

**Options écartées** : `web/src/lib/questions.ts` (rewrite + conversion
CRLF) et `clone_env_vars.py` exclus de tous les commits — travaux non
liés, laissés tels quels dans l'arbre.

**Prochaine action prioritaire** : `feat/e1-mapping-seed-v1`, scopée au
seul besoin 1 (vertical slice).

**Questions ouvertes** : sort de `questions.ts`/`clone_env_vars.py` ;
`seuil_reference` en `String?` vs `Float?` (choisi String pour préserver
l'unité, à reconfirmer) ; contrainte d'exclusivité besoin_niveau1/2 non
posée en base (validation applicative seulement).

## 2026-07-06 — Moteur d'équilibre, priorisation clinique et protocole 21 jours

**Décisions prises** : effet domino conservé mais requalifié — abandon de
la matrice numérique de poids (ex. sommeil→GABA=8), remplacée par une
classification qualitative à 3 niveaux (fondation/intermediaire/
peripherique), taguée niveau de preuve D, cantonnée strictement au moteur
de priorisation (jamais dans le score « Mon équilibre » affiché au
patient). Niveaux de preuve A/B/C/D retenus à la place du champ
`confiance` continu. Moteur de cohérence (sécurité) déterministe et
testable, sans LLM. Couche narrative LLM : traduit uniquement, ne décide
jamais, avec garde-fou anti-hallucination (blocage/régénération). Audit
trail immuable dès le Jalon 1. Ordre de dépendance dev validé : sécurité/
audit → priorisation → narration → suivi longitudinal → extensions
premium — ne jamais avancer la narration avant validation clinique du
noyau sécurité. Livrable : `SYNTHESE_MOTEUR_EQUILIBRE.md`, destiné à
remplacer la section R9 de `ROADMAP_AGENT_PLAN.md`.

**Options écartées** : champ `confiance` continu (remplacé par A/B/C/D) ;
matrice domino numérique 12×12 comme donnée de calcul silencieuse
(remplacée par classification qualitative tracée).

**Prochaine action prioritaire** : intégrer la section 10 de
`SYNTHESE_MOTEUR_EQUILIBRE.md` dans `ROADMAP_AGENT_PLAN.md` (remplacement
de la section R9 actuelle).

**Questions ouvertes** : écrasement vs traçage double lors d'un ajustement
par biomarqueur (niveau C sur donnée niveau A) ; poids exacts du score de
priorité composite ; seuil de sobriété (nombre d'actions max par phase) ;
écran détail des 12 besoins côté praticien (non conçu).

## 2026-07-07 — Lot 7 finalisé + décommission Sheets/OAuth

**Décisions prises** : Lot 7 terminé et poussé sur main avec extraction complète du catalogue questionnaires en modules de domaine, conservation des IDs et validation scoring-check + type-check. Audit des dépendances Google Sheets réalisé : seule la route de migration historique restait active côté runtime. Décommission engagée : suppression de la route migrate-historique, retrait du scope OAuth spreadsheets et nettoyage des types de session JWT associés.

**Options écartées** : maintien d’un scope OAuth large « au cas où » (rejeté pour réduction de surface de risque) ; conservation d’une route de migration non appelée en routine (rejetée pour dette technique et ambiguïté opérationnelle).

**Prochaine action prioritaire** : pousser le commit de décommission et aligner la documentation technique sur l’état réel (README, AGENTS, CLAUDE, roadmap).

**Questions ouvertes** : faut-il conserver un mécanisme de remigration manuel hors runtime applicatif (script admin dédié) ?

## 2026-07-07 — Chantier "Mon équilibre"/"Cartographie neuro-fonctionnelle" livré (6 lots)

**Décisions prises** : 6 PR mergées sur `main` (#12-#21) — nettoyage dashboard/SynthesePanel (D1), merge des 5 branches en attente (pagination, paramètres, preuve, momentum, objets cliniques), adaptateur Prisma → moteur d'équilibre, fiche patient praticien (5 objets cliniques), écran détail 12 besoins (radar+liste), écran patient "Mon équilibre" en extension du flux existant (cercles concentriques 2D). Parcours patient vérifié par capture d'écran (Playwright) ; praticien vérifié par API/code seulement (pas de session Google ici).

**Options écartées** : rendu 3D (repli 2D) ; nouvelle authentification E3 (flux existant réutilisé) ; garde-fou email de `check_no_secrets.sh` (obsolète, R8-lite).

**Prochaine action prioritaire** : avant prod réelle, faire vérifier visuellement les écrans praticien par l'utilisateur (session Google réelle).

**Questions ouvertes** : convention `dateT0` à valider cliniquement ; teinte rouge du badge niveau D à reconsidérer ; migration D1 du reste du portail patient non faite.

## 2026-07-07 — Mise en prod réelle : RLS, seed prod, PR #22

**Décisions prises** : constat que le code (`main` HEAD `2e473ce`) et le schéma (4 migrations) étaient déjà en prod (auto-déploiement Vercel + `migrate status` = up to date). Travail réel = sécuriser/peupler/valider. Faille RLS (19 tables exposées via clé anon) corrigée : migration `enable_rls_security` créée + appliquée en prod (deny-all, Prisma en direct non impacté) → advisor CRITICAL résolu. Seed prod lancé sur décision explicite malgré la mention « ne jamais exécuter en prod » : 3 patients fictifs `PAT_SEED_*` + 15 réponses (upsert idempotent). Go/No-Go = GO technique. PR #22 (RLS + libellés UI « Google Sheets »→PostgreSQL).

**Options écartées** : staging Supabase isolé (test direct en prod choisi) ; seed des référentiels neuro/supplément/clinique (aucune source + aucun écran ne les lit).

**Prochaine action prioritaire** : merger PR #22 puis validation E2E praticien en session Google réelle (patients seedés Sophie/Jennifer/Michel).

**Questions ouvertes** : suppression des 3 patients de test après validation ? `ANTHROPIC_API_KEY` présente côté Vercel prod (synthèse IA) ?

## 2026-07-07 — Incident TLS Prisma résolu + cadrage refonte UX praticien

**Décisions prises** : PR #22 mergée (RLS). Incident prod découvert en validant : dashboard praticien cassé (metrics/patients/synthèse) — Prisma ne se connectait pas à Supabase en runtime Vercel (Node 24), `self-signed certificate in certificate chain`, bug préexistant depuis le 05/07, **sans rapport avec RLS** (rôle `postgres` = bypassrls). Cause : `@prisma/adapter-pg` en libpq-compat dérive le TLS depuis `sslmode` dans l'URL et écrase l'option `ssl` du Pool. Correctif `stripSslParams()` (le TLS n'est piloté que par `ssl:{rejectUnauthorized:false}`) — PR #23→#25, prod rétablie (sonde `/api/patient/questionnaire` = 404 propre). Cadrage refonte UX en 5 lots (dashboard, filtre catégorie, viz équilibre praticien, packs éditables en base, Ciqual/compléments différé) → doc `docs/claude/CONTEXTE_REFONTE_UX_PRATICIEN_2026-07-07.md`.

**Options écartées** : correctifs TLS #23 (host-gated) et #24 (gating conditionnel) insuffisants sur Node 24 ; catalogue packs en code (préféré éditable en base) ; `NODE_TLS_REJECT_UNAUTHORIZED=0` (repli non requis).

**Prochaine action prioritaire** : Lot A — refonte dashboard (retirer la feuille de route obsolète Lot 0→C5).

**Questions ouvertes** : retrait du log diag `[prisma] connexion db …` ; planning épic Ciqual R1/R2 ; migration Prisma `Pack` (Lot D) à confirmer.

## 2026-07-07 — Refonte UX praticien livrée (lots A→D) + migration prod packs

**Décisions prises** : refonte cadrée en 4 lots, une PR par lot, toutes mergées
sur `main` (auto-déploiement Vercel). #26 Lot A (dashboard : feuille de route
morte retirée → « Accès rapides » + « Patients à traiter », composant
`PatientsATraiter`). #27 Lot B (filtre catégorie client dans l'assignation).
#28 Lot C (viz **cercles concentriques** sur la fiche patient — choix acté vs
radar ; `strate` ajoutée à `PrioriteBesoin`). #29 Lot D (packs éditables :
modèle Prisma `Pack`, API CRUD + `packs/assign`, UI `PacksPanel`). Migration
`add_pack_model` **appliquée en prod** via Supabase MCP (5432 direct injoignable
d'ici) + `_prisma_migrations` réconcilié (checksum = sha256 du .sql, méthode
vérifiée) ; RLS deny-all sur `packs`, advisor OK.

**Options écartées** : viz radar 12 axes (repli cercles) ; `prisma migrate
deploy` direct (port 5432 injoignable) ; différer Lot D (utilisateur a autorisé
la migration prod) ; toucher au `CHANGELOG.md` (en édition parallèle).

**Prochaine action prioritaire** : vérif visuelle des 4 écrans praticien en
session Google réelle + test fonctionnel packs (créer → assigner → N
assignations) ; ajouter l'entrée `CHANGELOG.md` du Lot D.

**Questions ouvertes** : Lot E (Ciqual + compléments) — plan dédié à faire ;
retrait du log diag `[prisma] connexion db …` ; suppression des 3 patients de
test après validation.
