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

## 2026-07-07 — Parcours patient packs débloqué (accès multi-questionnaires)

**Décisions prises** : correction du parcours patient pour les packs afin d’éviter la saisie séquentielle forcée. Ajout d’une API `GET /api/patient/assignations` (auth via `idAssignation + email`) qui retourne toutes les assignations du patient et marque celles à saisir. Intégration d’un panneau « Questionnaires en attente » sur le portail patient, cliquable et mobile-compatible, visible pendant consentement, saisie, consultation et après envoi. Ajout d’un compteur « Restants » plus visible. Texte email pack clarifié : un seul lien donne accès à tous les questionnaires en attente.

**Options écartées** : imposer un ordre linéaire des questionnaires (trop long/dissuasif) ; ouvrir un flux séparé dédié packs (plus lourd, inutile ici).

**Prochaine action prioritaire** : validation E2E en prod avec un pack de base (Plaintes, Mode de vie, Alimentaire, DNSM) et vérification UX mobile sur téléphone réel.

**Questions ouvertes** : faut-il rendre configurable l’ordre d’affichage des questionnaires par pack côté praticien ?

## 2026-07-08 — Portail patient : token d'accès permanent + onboarding consultation

**Décisions** : token permanent révocable sur `Patient` + nouvelle route `/portail/[token]` (distincte du flux `/patient`) ; nouveau modèle `Consultation` (historisable) portant consentement/fiche/anamnèse/motif ; anamnèse en formulaire dédié **resserré** (repères, motif & attentes, histoire, signaux d'alerte, antécédents, traitements/compléments répétables) ; motif de consultation placé dans l'anamnèse (pas la fiche) ; pack de base = « Base de consultation » marqué `par_defaut`. Livré en prod : commit `51f6951`, migration Supabase appliquée, Vercel READY (`app.wellneuro.fr`), smoke test OK. A réparé au passage un build prod cassé (`Module not found: @/lib/consultation/motifs`).

**Options écartées** : réutiliser le lien d'assignation (→ token dédié, sémantique « permanent jusqu'à révocation ») ; anamnèse via `GenericQuestionnaire` (→ formulaire sur-mesure) ; anamnèse complète (→ resserrée, car redondante avec le pack : plaintes/douleurs, mode de vie, alimentaire, DNSM).

**Prochaine action prioritaire** : compléter le pack « Base de consultation » (3 qids seulement en prod) une fois « plaintes actuelles / douleurs ressenties » intégrées à la base de questionnaires.

**Questions ouvertes** : enrichir `MOTIFS_CONSULTATION` (1er RDV, suivi…) ; valider les champs exacts fiche/anamnèse avec le praticien.

## 2026-07-08 — Packs fonctionnels, seed prod et migration Prisma registre

**Décisions** : livraison UI/API des catégories fonctionnelles + registre packs, commit/push `a5877ce`, déploiement prod validé (GO technique). Seed prod de 6 packs de base dans `packs` pour rendre la liste visible. Lancement d’une migration Prisma propre “registre normalisé” (tables `questionnaire_categories`, `questionnaires`, `questionnaire_secondary_categories`, `questionnaire_packs`, `pack_questionnaires`, `pack_triggers`) et push du commit `1d30a5d`.

**Options écartées** : migration “big bang” immédiate au début (reportée pour réduire le risque), puis abandon d’un `prisma migrate deploy` bloqué pooler au profit d’une application SQL transactionnelle enregistrée dans `_prisma_migrations`.

**Prochaine action prioritaire** : brancher progressivement l’application sur le modèle relationnel (lecture/écriture packs/triggers) avec rétrocompatibilité `packs.qids`.

**Questions ouvertes** : stratégie de décommission de `packs.qids` ; calendrier de migration des données registre (catégories/questionnaires/triggers) vers le nouveau schéma.

## 2026-07-08 — Scoring DNSM par neuromédiateur + mini-synthèse déterministe

**Décisions** : (1) Correction affichage DNSM (`Q_INF_03`) dans la fiche patient — la table de scoring était déjà correcte (4 sous-scores DA/NA/SE/ME) et consommée par le moteur « Mon équilibre » ; le bug était purement d'affichage (`FichePatientPanel` ne montrait que le total général 0-160). La table « Détail technique » rend désormais le détail par neuromédiateur (score/40 + badge d'interprétation coloré). (2) Ajout d'une mini-synthèse **déterministe** par questionnaire (`lib/scoring/miniSynthese.ts` → `buildMiniSynthese`), affichée sous chaque titre et injectée dans l'input de la synthèse IA globale (`buildUserMessage`). Aucune génération IA par questionnaire, aucune migration Prisma (front/logique uniquement).

**Options écartées** : IA par questionnaire et approche hybride (→ déterministe : gratuit, instantané, cohérent, auditable, conforme au cadre déontologique).

**Prochaine action prioritaire** : validation visuelle navigateur (session OAuth praticien) sur un patient fictif ayant complété DNSM + un questionnaire simple.

**Questions ouvertes** : exposer la mini-synthèse côté portail patient en masquant `protocol` (contenu praticien) ?

## 2026-07-08 — Synthèse IA du premier bilan nourrie par fiche + anamnèse

**Décisions prises** : brancher la fiche signalétique et l'anamnèse (blobs JSON sur `Consultation`, jamais relus jusqu'ici) sur la synthèse IA — purement additif, aucune migration, aucune modif front. Nouveau module déterministe `lib/consultation/contexteClinique.ts` (`buildContexteClinique` + `extraireVigilanceDeterministe`), dans l'esprit de `miniSynthese.ts`. Approche **déterministe + IA** pour les signaux d'alerte/traitements : fusionnés en tête de `points_de_vigilance`, garantis même si le LLM les omet. Contexte injecté en texte lisible (pas JSON brut). Périmètre = cœur clinique (motif, histoire, antécédents, IMC, contexte de vie), bruit administratif écarté. Anamnèse récupérée par `idPatient` (pas de rattachement pack). System prompt → v2 (garde-fous conservés). Livré : `contexteClinique.ts` + route synthèse + `anthropic.ts` + CHANGELOG. Vérifié : type-check, check_no_secrets, 16 assertions déterministes.

**Options écartées** : JSON brut (→ texte déterministe, lisible/économe) ; IA seule sur les red flags (→ déterministe garanti) ; rattachement pack↔anamnèse (→ inutile, synthèse déjà patient-level) ; inclure le compte rendu de fin de consultation (→ phase 2 : nouveau modèle + UI + migration).

**Prochaine action prioritaire** : test e2e navigateur (session OAuth praticien) sur patient fictif avec anamnèse + questionnaires — vérifier motif reflété, signaux d'alerte en vigilance, dégradation gracieuse sans anamnèse.

**Questions ouvertes** : exposer ce contexte dans le booklet patient ? Attaquer la phase 2 (compte rendu de fin de consultation → synthèse longitudinale) ?

## 2026-07-09 — Réalignement documentaire (R0) + préparation R1

**Décisions prises** : retour au dev par une séquence de consolidation (R0 → R6, cf. `docs/roadmap.md`) plutôt que par une nouvelle brique métier. Lot R0 livré : réalignement de `README.md`, `AGENTS.md`, `CLAUDE.md` (racine, inclus sur décision utilisateur), `docs/roadmap.md`, `docs/claude/PROJET_CONTEXTE.md`. Audit code confirmant que **Google Sheets est entièrement retiré du runtime** (zéro occurrence de `SHEET_ID`/`sheets.googleapis.com`/`spreadsheets`/`googleapis` dans `web/src`, scope OAuth = `openid email profile`, route `migrate-historique` absente du disque) : les docs affirmaient encore l'inverse. Documentés à l'état réel : portail patient permanent `/portail/[token]` (flux principal) + hub « Mes questionnaires », `/patient/[idAssignation]` requalifié legacy, cookie signé `wn_portail`, modèle `Consultation`, registre relationnel packs/questionnaires, synthèse IA enrichie fiche+anamnèse. Checklist E2E R1 préparée (nouvelle « Phase 0 » dans la checklist de tests end-to-end).

**Options écartées** : ouvrir un chantier évolutif (compléments clean label, RAG SIIN, protocole 21 jours, enrichissement synthèse IA) avant validation du flux central ; supprimer les mentions d'hygiène `SHEET_ID` (conservées : garde-fou `check_no_secrets.sh` légitime) ; toucher au code (R0 = docs pures, zéro changement runtime).

**Prochaine action prioritaire** : R1 — exécuter la checklist « Phase 0 » E2E du parcours patient unifié sur un patient fictif (Sophie Nicola / Jennifer Martin / Michel Dogné), validation mobile incluse.

**Questions ouvertes** : compléter le pack « Base de consultation » (R2) ; calendrier de bascule lecture packs → registre relationnel puis décommission `packs.qids` (R3) ; harmonisation UX patient tokens design system (R4).

## 2026-07-09 — Setup CLI Supabase local + vérification Prisma

**Décisions prises** : installation du CLI Supabase dans le conteneur, authentification CLI validée, initialisation locale dans `web/supabase/`, liaison du workspace `web` au projet Supabase `ohnbmypinamzzfhqymlt`, puis démarrage local Supabase avec migration `20260701174726_remote_schema.sql` appliquée. Vérification Prisma réalisée contre la DB locale `127.0.0.1:54322` : connectivité OK et 10 migrations Prisma locales détectées comme non appliquées sur cette base fraîche.

**Options écartées** : aucun changement Prisma/SQL distant ; pas de `prisma migrate dev` ni de migration destructive ; pas d’usage de secrets en dur, uniquement le login CLI.

**Prochaine action prioritaire** : décider si la base locale doit rester un miroir Supabase minimal ou recevoir aussi les migrations Prisma du dépôt pour tests applicatifs complets.

**Questions ouvertes** : faut-il supprimer l’avertissement `supabase/seed.sql` absent ; veut-on standardiser une procédure locale Supabase + Prisma dans la doc projet ?

## 2026-07-09 — Configuration DATABASE_URL dev et checks de reprise

**Décisions prises** : configuration de `DATABASE_URL` en local via terminal avec saisie masquée du mot de passe, écriture dans `web/.env.local` (jamais affichée, jamais commit). Vérification non intrusive de présence de la variable, puis validation Prisma (`npx prisma validate`) réussie. Exécution des contrôles de reprise disponibles : `npm run type-check` et `npm run scoring-check` (OK, 63 questionnaires certifiés).

**Options écartées** : partage du secret dans le chat ; affichage de la valeur dans les logs ; modification de schéma/migrations Prisma.

**Prochaine action prioritaire** : lancer la reprise des tests fonctionnels/E2E du parcours praticien/patient avec cette configuration locale.

**Questions ouvertes** : ajouter un script `npm run test` unifié dans `web/package.json` pour standardiser la commande de validation ?

## 2026-07-10 — [R1] Validation E2E du parcours patient unifié (prod)

**Décisions prises** : exécution de la Phase 0 en environnement A (prod, patient fictif Michel Dogné `PAT_SEED_03`, lecture SQL du token autorisée). Flux complet validé par pilotage HTTP : email gate (403/200, cookie signé `wn_portail`, email saisi une fois), garde d'ordre consentement→fiche→anamnèse, validation créant 4 assignations du pack par défaut, transmission Q_MOD_03 avec score serveur, verrouillage (409), demande de correction commentée tracée en base, déverrouillage praticien, retransmission corrigée re-verrouillée. Checklist Phase 0 cochée (14/17 étapes, 5/6 critères). Base locale préparée au passage (migrations via `scripts/wn-local-migrate.sh`, verrouillé 127.0.0.1).

**Options écartées** : environnement local complet (bascule prod demandée en cours de lot) ; correctifs de code pendant le lot (validation pure).

**Prochaine action prioritaire** : tests navigateur restants — redirection hub, brouillon/reset (localStorage), rendu mobile réel — puis R2.

**Questions ouvertes** : passer `GET /api/portail/session` en POST (token+email en query string, visibles dans les logs d'accès) ; exposer le lien portail dans le frontend praticien (aujourd'hui envoi email uniquement).

## 2026-07-10 — R1 — session portail sans email en URL

**Décisions prises** : bascule de `/api/portail/session` en `POST` JSON et adaptation de l’écran `/portail/[token]` pour garder l’email hors de l’URL. Vérification ciblée OK sur les deux fichiers modifiés.

**Options écartées** : conserver le `GET` avec query string ; élargir le périmètre à d’autres routes R1.

**Fichiers modifiés** : `web/src/app/api/portail/session/route.ts`, `web/src/app/portail/[token]/page.tsx`.

**Risques résiduels** : la validation navigateur complète reste à refaire après ce changement; le reste du flux R1 n’a pas été retouché.

**Prochaine action prioritaire** : reprendre la checklist navigateur R1 sur `/portail/[token]`, puis poursuivre vers R2.

**Questions ouvertes** : aucune nouvelle question fonctionnelle ; seulement confirmer que le POST suffit côté logs/proxy.

## 2026-07-10 — [R1] Clôture — validation navigateur du portail patient (Playwright, prod)

**Décisions prises** : validation des 3 étapes navigateur restantes de la Phase 0 en Chromium headless (Playwright installé hors dépôt, scratchpad) sur prod, patient fictif Michel Dogné (`PAT_SEED_03`), token lu en base en mémoire uniquement (autorisation utilisateur explicite). 21/22 PASS : session POST sans query string, hub accessible et rechargeable sans re-saisie email (cookie), brouillon localStorage sauvegardé/restauré (`wellneuro:draft:*`), reset limité au non-transmis (badge redevenu « À compléter », vue transmise en lecture seule), émulation iPhone 13 sans débordement horizontal. Checklist et roadmap mises à jour (R1 ✅, R2 prochaine action).

**Options écartées** : correctifs de code pendant le lot (validation pure) ; environnement local complet.

**Fichiers modifiés** : `docs/checklist_tests_end_to_end.md`, `docs/roadmap.md`, `docs/claude/SESSION_LOG.md`.

**Risques résiduels** : `GET /api/patient/reponses?…&email=…` expose encore l'email en query string dans la vue « Consulter » (même classe que le GET session corrigé — correctif à planifier) ; test tactile sur téléphone réel non fait (émulation seulement) ; titres de questionnaires tronqués sur mobile (à traiter en R4).

**Prochaine action prioritaire** : R2 — finalisation du pack « Base de consultation » ; au passage, corriger le passage de l'email en query string sur `/api/patient/reponses`.

**Questions ouvertes** : le correctif `reponses` doit-il couvrir aussi les autres routes `api/patient/*` appelées avec `email` en repli ?

## 2026-07-10 — [R2] Finalisation du pack « Base de consultation »

**Décisions prises** : investigation (3 agents Explore en parallèle) sur le registre packs/catalogue, l'UI praticien d'assignation et le hub patient. Constat clé : le pack de base (`Pack.parDefaut`) était **déjà complété en prod** le 2026-07-09 via `PacksPanel` — les 4 questionnaires cibles documentés depuis le 2026-07-08 (Plaintes `Q_MOD_03`, Mode de vie `Q_MOD_01`, Alimentaire `Q_ALI_01`, DNSM `Q_INF_03`, ≈45 min) y sont déjà dans le bon ordre ; vérifié en lecture seule via un script Prisma ad hoc (miroir de `lib/prisma.ts`, adaptateur `pg`), aucune écriture prod nécessaire. Anti-doublon anamnèse garanti par conception (anamnèse volontairement resserrée pour ne pas recouper ces 4 thèmes) — aucun changement requis côté anamnèse. Complété côté code : (1) tri secondaire `createdAt asc` dans `api/portail/assignations` et `api/patient/assignations` pour fiabiliser l'ordre d'affichage intra-pack (les questionnaires d'un même pack partageaient une `dateAssignation` figée, ordre auparavant non garanti) ; (2) `AssignationPatient.duree` ajouté (résolu depuis `questionnaires-catalog.ts`, jusque-là réservé au praticien), affiché par item et en total pour la section « À compléter » du hub ; (3) titre de carte questionnaire en `line-clamp-2` (au lieu de `truncate`) pour éviter la coupure du titre DNSM (61 caractères) sur mobile — décision utilisateur explicite de traiter ce point maintenant plutôt que de le laisser pour R4.

**Options écartées** : écriture prod du contenu du pack (finalement inutile, déjà fait) ; changer le sens global du tri (`desc`→`asc`) du hub (aurait modifié le comportement pour toutes les assignations, pas seulement les packs) — préféré un tri secondaire ciblé ; toucher `assignBasePack.ts`/`packs/assign/route.ts` (l'ordre se répare entièrement côté lecture, sans toucher l'écriture) ; bascule vers le registre relationnel `QuestionnairePack` (hors périmètre, réservé à R3) ; correctif de l'email en query string sur `/api/patient/reponses` (risque résiduel distinct, non traité ici).

**Fichiers modifiés** : `web/src/app/api/portail/assignations/route.ts`, `web/src/app/api/patient/assignations/route.ts`, `web/src/lib/consultation/mapAssignation.ts`, `web/src/app/portail/[token]/questionnaires/page.tsx`, `CHANGELOG.md`, `docs/roadmap.md` (R1 et R2 passés à ✅, la mise à jour R1 avait été omise lors de la clôture précédente).

**Risques résiduels** : `GET /api/patient/reponses?…&email=…` toujours en query string (reporté, cf. entrée précédente) ; pas de validation navigateur réelle de ce lot (vérifié par `type-check` + `check_no_secrets` + relecture manuelle du diff, pas de test Playwright) ; le script de lecture Prisma ad hoc a été supprimé après usage (non commité, scratchpad).

**Prochaine action prioritaire** : R3 — transition progressive vers le registre relationnel packs/questionnaires (lecture primaire `questionnaire_packs`, fallback `packs.qids`).

**Questions ouvertes** : la mise à jour visuelle du hub (durée + titre 2 lignes) mérite-t-elle une vérification navigateur avant de considérer R2 définitivement clos ?

## 2026-07-10 — [R3] Lecture primaire registre relationnel packs/questionnaires, fallback legacy

**Décisions prises** : découverte en tout début de lot (diagnostic lecture seule) que le registre relationnel (`questionnaires`, `questionnaire_packs`, `pack_questionnaires`) était **entièrement vide** en prod malgré une synchronisation d'écriture déjà active depuis le 2026-07-08 (`syncPackToRegistry`, silencieusement no-op faute de `QuestionnaireDefinition` seedées). Scope « complet » choisi par l'utilisateur : seed idempotent de 15 `QuestionnaireCategory` + 60 `QuestionnaireDefinition` (58 du catalogue d'affichage + `Q_NEU_11`/`Q_NEU_12`, deux questionnaires actifs référencés par 3 packs mais absents du catalogue d'affichage — repérés par le contrôle de couverture du script, qui bloque toute écriture si un qid de pack reste orphelin), puis backfill de `pack_questionnaires` pour les 7 packs existants en réutilisant `syncPackToRegistry` (extraite dans `web/src/lib/consultation/packRegistry.ts`, comportement inchangé). Nouveau helper `resolvePackQuestionnaireIds` : ne fait confiance au registre que si son ensemble de qids correspond exactement au `qids` legacy du pack (sinon fallback), câblé dans les deux routes d'assignation (`portail/valider`, `praticien/packs/assign`). Backfill exécuté avec confirmation explicite de l'utilisateur avant l'écriture prod (aperçu dry-run montré au préalable) ; résultat vérifié deux fois (sortie du script + script de cohérence indépendant `check:pack-registry`) : 7/7 packs en MATCH exact, 0 mismatch, 0 registre vide.

**Options écartées** : lecture registre sans garde-fou de correspondance exacte (jugé trop risqué après la découverte du bug de sync silencieux) ; ajouter `Q_NEU_11`/`Q_NEU_12` au catalogue d'affichage `questionnaires-catalog.ts` (fichier clinique, curation dédiée requise) — préféré une liste d'extras restreinte et documentée dans le script de backfill, sans toucher au catalogue ; faire lire `PacksPanel.tsx`/la route GET d'édition depuis le registre (expérience praticien inchangée, `qids` reste la source d'édition) ; requête SQL prod ad hoc supplémentaire en cours de lot (bloquée par le classificateur auto-mode, jugée légitimement superflue — le contrôle de couverture intégré au script suffisait).

**Fichiers modifiés** : `web/src/lib/consultation/packRegistry.ts` (nouveau), `web/src/app/api/praticien/packs/route.ts`, `web/src/app/api/portail/valider/route.ts`, `web/src/app/api/praticien/packs/assign/route.ts`, `web/prisma/backfillQuestionnaireRegistry.ts` (nouveau), `web/prisma/checkPackRegistryConsistency.ts` (nouveau), `web/prisma/runWithAlias.js` (nouveau, loader jiti pour l'alias `@`), `web/package.json` (3 scripts npm). `packs.qids` jamais modifié, ni en écriture ni en lecture pour l'édition praticien.

**Risques résiduels** : diff non commité à la fin du lot (en attente de confirmation) ; `QuestionnaireDefinition.niveau`/`.publicCible` seedés avec des placeholders documentés (`'standard'`/`'patient'`, aucune source de vérité par questionnaire aujourd'hui, non lus par le code applicatif) ; `QuestionnaireSecondaryCategory` volontairement non seedée (hors périmètre) ; vérification par script + relecture uniquement (choix utilisateur), pas de test automatisé ni de validation navigateur des deux routes d'assignation.

**Prochaine action prioritaire** : committer le diff R3 après revue, puis R4 — harmonisation UX patient selon le design system.

**Questions ouvertes** : faut-il curer réellement `niveau`/`publicCible` par questionnaire si un usage applicatif apparaît plus tard ; le registre étant maintenant fiable et vérifiable (`npm run check:pack-registry`), quel calendrier pour une éventuelle décommission de `packs.qids` ?
