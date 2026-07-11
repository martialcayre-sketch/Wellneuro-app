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

## 2026-07-10 — [R4] Harmonisation UX patient (design tokens teal/gold)

**Décisions prises** : migration de tout le parcours patient (`/portail/[token]/*`, `GenericQuestionnaire`, `PlaintesForm`, `QuestionField`, `ConsentScreen`, `ConsultationScreen`, `MonEquilibreAccueil`, `MonEquilibreDetail`, `portail/layout.tsx`) des classes Tailwind `blue-*` brutes vers les tokens sémantiques du design system D1 (`primary`/`accent`/`border`/`muted`, déjà définis mais jamais consommés côté patient hors `MonEquilibreDetail` partiellement). Hub « Mes questionnaires » : statuts désormais rendus via le composant `Badge` (nouvelle variante additive `info`) au lieu d'un simple texte gris — jamais de statut porté par la seule couleur. Zone tactile des options likert élargie (`py-2.5`→`py-3`). Périmètre `/patient/[idAssignation]` (legacy, doublon pré-unification) explicitement exclu, décision actée avec l'utilisateur. Bug découvert en cours de vérification : Tailwind ne générait aucune règle CSS pour les modificateurs d'opacité (`bg-primary/10`, `border-primary/30`, etc.) sur des couleurs définies en `var(--x)` brut — corrigé à la source (`globals.css` + `tailwind.config.ts`, variables RGB additives, rétrocompatible) après validation explicite de l'utilisateur sur le choix de correctif (token vs. site-par-site).

**Options écartées** : migrer aussi `/patient/[idAssignation]` (legacy) ; corriger le bug d'opacité site par site (21 usages, rendu moins fidèle à la palette) plutôt qu'au niveau des tokens partagés ; installer Playwright pour une vérification visuelle réelle (aucun navigateur disponible dans l'environnement, changement jugé suffisamment vérifié par lecture directe du CSS compilé).

**Fichiers modifiés** : `web/src/app/globals.css`, `web/tailwind.config.ts`, `web/src/app/portail/layout.tsx`, `web/src/app/portail/[token]/page.tsx`, `web/src/app/portail/[token]/questionnaires/page.tsx`, `web/src/app/portail/[token]/questionnaires/[idAssignation]/page.tsx`, `web/src/components/patient/{ConsentScreen,ConsultationScreen,GenericQuestionnaire,MonEquilibreAccueil,MonEquilibreDetail,PlaintesForm,QuestionField}.tsx`, `web/src/components/ui/Badge.tsx`.

**Risques résiduels** : pas de validation navigateur réelle (aucun Playwright/Chromium installé) — vérifié par `type-check` OK, `check_no_secrets.sh` OK, balayage exhaustif confirmant zéro `blue-*` résiduel dans le périmètre, et inspection directe du CSS compilé (dev server local) confirmant que chaque classe custom (y compris les modificateurs d'opacité corrigés) résout vers la bonne couleur ; diff non commité à la fin du lot (en attente de confirmation) ; `GET /api/patient/reponses?…&email=…` toujours en query string (reporté depuis R1/R2, non traité).

**Prochaine action prioritaire** : committer le diff R4 après revue ; si souhaité, installer Playwright pour une passe visuelle réelle (hub, page questionnaire, mobile) avant de considérer R4 définitivement clos ; sinon poursuivre vers R5 — validation de la synthèse IA enrichie.

**Questions ouvertes** : le correctif de l'email en query string sur `/api/patient/reponses` (et éventuelles routes `api/patient/*` similaires) doit-il être traité avant R5, ou reste-t-il un lot dédié séparé ?

## 2026-07-10 — Revue critique de l'organisation du projet + plan d'action R7/R8

**Décisions prises** : à la demande de l'utilisateur, revue critique complète de l'organisation du dépôt (process, outillage Claude Code — hooks, skills, mémoire —, stack technique) menée puis synthétisée en plan d'action. Deux nouveaux lots ajoutés à `docs/roadmap.md`, sur une piste technique transverse indépendante de la séquence produit R0→R6 (ne bloquent pas, ne sont pas bloqués) : **R7** (hygiène repo/doc — `.gitattributes`, réalignement `REGLES_CRITIQUES.md` obsolète sur Sheets, nettoyage racine, peuplement `memory/`) et **R8** (filet de sécurité technique — CI GitHub Actions minimale, tests unitaires vitest sur les fonctions déterministes, formalisation en tests commités des parcours Playwright jusqu'ici réinstallés puis jetés à chaque lot). Constats déclencheurs : absence totale de CI et de tests automatisés dans le dépôt ; documentation ponctuellement en contradiction avec l'état réel du code (`REGLES_CRITIQUES.md` toujours au format ancien Sheets) ; mémoire persistante Claude Code (`memory/`) jamais peuplée malgré 16 jours d'historique riche dans ce fichier. Incohérence supplémentaire relevée en cours de revue (non corrigée, signalée dans `docs/roadmap.md`) : la définition de R6 diverge entre `docs/roadmap.md` (« préparation du moteur clinique avancé ») et `.claude/skills/wn-r6/SKILL.md` (« stabilisation build/tests/go-no-go »).

**Options écartées** : renommer/réordonner les lots R0-R6 existants pour y insérer ce chantier (→ aurait cassé la cohérence avec les entrées SESSION_LOG et docs déjà rédigées référençant R3/R4/R5/R6 par leur nom) ; convertir immédiatement `wn-r0`…`wn-r6` en simples fichiers doc (jugé pertinent mais hors périmètre — purement documentaire, réservé à R7) ; toute modification de code applicatif ou de schéma (ce lot est strictement roadmap + session log, conformément à la demande).

**Fichiers modifiés** : `docs/roadmap.md`, `docs/claude/SESSION_LOG.md`.

**Prochaine action prioritaire** : exécuter R7 en premier (aucun risque, gain de cohérence immédiat), puis R8. `/wn-auto` peut être invoqué pour démarrer l'un ou l'autre.

**Questions ouvertes** : R8 doit-il inclure un `npm run build` complet en CI (nécessite `DATABASE_URL` en secret CI) ou rester limité à type-check/lint/scoring-check/secrets pour l'instant ? Les tests Playwright de R8 doivent-ils tourner en CI ou rester une suite locale lancée manuellement vu la dépendance base de données ? Quelle définition de R6 (roadmap vs skill) fait foi ?

## 2026-07-10 — Clôture des questions en suspens R0→R6 (R9/R10)

**Décisions prises** : à la demande de l'utilisateur, consolidation de toutes les « Questions ouvertes » et risques résiduels laissés par les entrées SESSION_LOG des lots R0 à R6 en deux nouveaux lots dans `docs/roadmap.md`. **R9** (clôture technique, vérifiable) : correctif de l'email en query string sur `GET /api/patient/reponses` (et routes `api/patient/*` similaires) resté ouvert depuis R1/R2/R4 ; passe de validation navigateur réelle pour R2/R3/R4 (jamais faite, seulement type-check/lecture/script) ; test tactile sur téléphone réel pour clore R1 (émulation seulement à ce jour). **R10** (arbitrages produit, pas des bugs) : trancher la définition de R6 (divergente entre `docs/roadmap.md` et `.claude/skills/wn-r6/SKILL.md`) ; exposer ou non le lien portail patient côté frontend praticien ; calendrier de décommission de `packs.qids` ; curation de `QuestionnaireDefinition.niveau`/`.publicCible` (statut surveillance, pas action immédiate). Au passage, statuts de **R3** et **R4** corrigés dans `docs/roadmap.md` de « ⏳ À faire » à « ✅ Livré » : les deux lots étaient en réalité déjà commités et mergés sur `main` (commits `3f367a7`, `eaad01a`) alors que le tableau roadmap n'avait jamais été mis à jour après leur clôture SESSION_LOG. Collision de numérotation notée dans `docs/roadmap.md` : le préfixe « R » y désigne une séquence de consolidation technique différente de celle du même préfixe dans `docs/claude/ROADMAP_AGENT_PLAN.md` (modules produit) — `R9` en particulier entre en collision avec « R9 — Mon équilibre » de ce second fichier ; signalé mais non résolu, périmètre non demandé ici.

**Options écartées** : trancher moi-même la définition de R6 ou les arbitrages produit de R10 (→ décisions qui reviennent à l'utilisateur, listées mais pas résolues) ; renommer immédiatement les séquences R pour lever la collision entre les deux fichiers roadmap (→ hors périmètre de cette demande, signalé comme point à désambiguïser plus tard) ; toute modification de code applicatif (ce lot est strictement roadmap + session log).

**Fichiers modifiés** : `docs/roadmap.md`, `docs/claude/SESSION_LOG.md`.

**Prochaine action prioritaire** : R9 en premier (corrections/vérifications concrètes, aucune décision produit requise), puis R10 avec l'utilisateur pour les arbitrages. `/wn-auto` peut être invoqué.

**Questions ouvertes** : celles listées dans R10 ci-dessus, à trancher avec l'utilisateur avant de les considérer closes.

## 2026-07-10 — [R9] Clôture — correctif email en query string

**Décisions prises** : à la demande de l'utilisateur, scope réduit au point (1) de R9 (les points 2/3 — validation navigateur réelle et test tactile téléphone réel — nécessitent une action manuelle hors de portée de cet environnement). Correctif appliqué au parcours patient unifié (`/portail/[token]/*`), qui dispose d'une session cookie posée par `POST /api/portail/session` (R1) : `ConsultationScreen`, `MonEquilibreAccueil` et `MonEquilibreDetail` ne reçoivent plus la prop `email` depuis la page hub (`portail/[token]/questionnaires/[idAssignation]/page.tsx`), leur prop `email` devenant optionnelle et la query string n'étant construite qu'en présence d'une valeur — supprimant l'exposition de l'email en clair dans l'URL (historique navigateur, logs serveur, en-tête Referer) pour ces 3 requêtes `GET`. Le parcours legacy `/patient/[idAssignation]` (sans session cookie, exclu de l'harmonisation depuis R4) continue de passer l'email en query string à ces mêmes composants partagés — comportement inchangé, car nécessaire à son fonctionnement. Les 3 autres composants du hub (`ConsentScreen`, `PlaintesForm`, `GenericQuestionnaire`) envoient déjà l'email en corps de requête `POST`, donc hors périmètre (pas d'exposition en URL). L'utilisateur a validé R9 comme clos avec ce périmètre.

**Options écartées** : retirer entièrement la prop `email` des 3 composants partagés (aurait cassé le parcours legacy, qui n'a pas de session cookie) ; étendre le correctif aux routes `POST` (`consentement`, `submit`) — email déjà en corps de requête, pas concerné par le risque visé.

**Fichiers modifiés** : `web/src/components/patient/ConsultationScreen.tsx`, `web/src/components/patient/MonEquilibreAccueil.tsx`, `web/src/components/patient/MonEquilibreDetail.tsx`, `web/src/app/portail/[token]/questionnaires/[idAssignation]/page.tsx`, `docs/roadmap.md`.

**Risques résiduels** : points 2 et 3 de R9 (validation navigateur réelle R2/R3/R4, test tactile téléphone réel R1) restent à faire par l'utilisateur, hors de portée de cet environnement — R9 clos malgré cela, sur décision explicite de l'utilisateur. Faux positif préexistant et non lié à ce correctif : `scripts/check_no_secrets.sh` signale `docs/roadmap.md:48` (mention documentaire de `SHEET_ID`, obsolète, partie du backlog R7) — aucun secret réel dans les fichiers modifiés ici. Diffs CRLF→LF préexistants et non liés sur 5 scripts shell (`scripts/*.sh`), non commités avec ce lot, décision de traitement encore en attente (probablement R7).

**Prochaine action prioritaire** : R10 avec l'utilisateur (arbitrages produit : définition de R6, exposition du lien portail côté praticien, calendrier décommission `packs.qids`), ou R7/R8 (hygiène repo, CI/tests) si préféré en premier.

**Questions ouvertes** : celles de R10, toujours en suspens.

## 2026-07-10 — [R7] Hygiène repo/doc

**Décisions prises** : `/wn-r6` a été interrompu (R6 gelé tant que R0→R5 non validés, et sa définition même est disputée — R10) ; `/wn-auto` a déterminé R7 comme prochain lot conservateur, non bloqué, avec preuves concrètes déjà présentes dans l'arbre de travail. Exécuté les 4 sous-points documentés : (1) `.gitattributes` ajouté (`text=auto eol=lf`, `*.sh` explicite) et commit du diff CRLF→LF déjà présent sur les 5 scripts (`scripts/*.sh`, vérifié `--ignore-all-space` sans changement de logique, en attente depuis R9) ; (2) `docs/claude/REGLES_CRITIQUES.md` corrigé — retrait de `SHEET_ID` de la liste des variables sensibles requises et remplacement de la note obsolète (Sheets « encore requis ») par le constat réel de décommission (2026-07-07) ; (3) nettoyage racine : `.clasp.example.json`, `.claspignore` et `package-lock.json` (stub vide) supprimés du dépôt (décision utilisateur explicite : suppression plutôt que déplacement vers `archive/gas-legacy/`), `wellneuro_claude_automation_kit.zip` supprimé du disque (non tracké git, décision utilisateur explicite) ; (4) mémoire persistante Claude Code (`memory/`) peuplée avec 6 mémoires (format SESSION_LOG, dry-run avant écriture prod, patients fictifs autorisés, pas de migration sans confirmation, UI en français, préférence utilisateur pour un périmètre minimal vérifiable) — vide jusqu'ici malgré l'historique riche du log.

**Options écartées** : déplacer les fichiers clasp vers `archive/gas-legacy/` plutôt que les supprimer (option initialement proposée, écartée par l'utilisateur — GAS déjà décommissionné et archivé ailleurs) ; garder `wellneuro_claude_automation_kit.zip` ou seulement l'ignorer (écarté par l'utilisateur, suppression directe demandée) ; toute action sur R0/R5/R6/R10 (hors périmètre de ce lot, strictement hygiène repo/doc).

**Fichiers modifiés** : `.gitattributes` (nouveau), `scripts/check_no_secrets.sh`, `scripts/export-clasp-creds.sh`, `scripts/import-clasp-creds.sh`, `scripts/release_go_no_go.sh`, `scripts/setup_supabase_prisma.sh` (fins de ligne uniquement), `docs/claude/REGLES_CRITIQUES.md`, `docs/roadmap.md` (R7 → ✅). Supprimés : `.clasp.example.json`, `.claspignore`, `package-lock.json` (racine). Mémoire Claude Code peuplée hors dépôt git (`memory/MEMORY.md` + 6 fichiers).

**Risques résiduels** : aucun identifié — lot strictement documentaire/hygiène, aucune logique applicative touchée. Le faux positif `check_no_secrets.sh` sur `docs/roadmap.md:48` (mention `SHEET_ID`) devrait maintenant disparaître avec le statut R7 passé à ✅ et la ligne demeurant une mention historique documentaire, à revérifier après commit.

**Prochaine action prioritaire** : R10 avec l'utilisateur (arbitrages produit : définition de R6, exposition du lien portail côté praticien, calendrier décommission `packs.qids`), ou R8 (CI/tests) si préféré en premier ; R0/R5 restent la voie de reprise vers un R6 débloqué.

**Questions ouvertes** : celles de R10, toujours en suspens.

## 2026-07-10 — [R5] Validation de la synthèse IA enrichie — audit statique, 7/7 conforme

**Décisions prises** : audit en lecture seule (aucune modification de code, aucun appel Anthropic réel — pas de coût, pas de donnée patient) des 7 scénarios du skill `wn-r5`, par traçage manuel du chemin de données de bout en bout (`route.ts` → `contexteClinique.ts`/`miniSynthese.ts` → `buildUserMessage` → `SYSTEM_PROMPT_SYNTHESE` → `validateSyntheseSchema`). Verdict : **7/7 conforme**. (1) Sans anamnèse : `contexteClinique`/`vigilanceDeterministe` retombent proprement à `''`/`[]` (try/catch best-effort), message explicite "non renseigné" injecté au LLM, prompt instruit de s'appuyer sur les seuls scores. (2) Anamnèse complète : 5 sections texte alimentées sans perte jusqu'au message utilisateur. (3) Traitements et (4) compléments : vigilance déterministe forcée en tête (`fusionnerVigilance`, dédup insensible à la casse), formulation d'interaction uniquement, jamais de dosage/arrêt — contrainte doublée dans le code et dans le system prompt. (5) Signal d'alerte : forcé en tête de `points_de_vigilance`, ne peut être supprimé par le LLM même si sa réponse est vide/malformée. (6) DNSM : branche multi-axes de `buildMiniSynthese` correcte (tri sévérité, top 3, repli si rien de perturbé). (7) Questionnaires partiels : les champs `missing`/`missingIds`/`notApplicable`/`certification` (définis dans `lib/scoring/types.ts`) sont bien transmis au LLM — l'objet `scores` complet est passé tel quel dans `buildUserMessage` — mais le system prompt ne les nomme pas explicitement, seulement une instruction générique ("si les données sont insuffisantes… signale-le"). Jugé conforme et non bloquant : les données brutes sont présentes, l'instruction générique couvre le cas, et une instruction nommée par champ serait une extension du moteur, hors périmètre du lot (interdit explicite du skill).

**Options écartées** : exécuter un vrai appel Anthropic sur un patient fictif pour observer le comportement réel du LLM (jugé superflu — la logique déterministe autour du LLM, elle, est garantie par le code et vérifiable statiquement ; aurait engagé un coût API et une écriture `SyntheseIA`/`AuditSynthese` en base sans nécessité) ; proposer un correctif sur le point d'attention scénario 7 (pas un bug objectivé, juste un renforcement possible non requis par le skill).

**Fichiers modifiés** : `docs/claude/SESSION_LOG.md`, `docs/roadmap.md` (R5 → ✅).

**Risques résiduels** : audit purement statique (pas d'exécution réelle du flux complet praticien→LLM→persistance) — cohérent avec le choix du lot (éviter coût API/écriture prod sans nécessité) mais n'exclut pas un écart de comportement runtime non visible à la lecture (ex. troncature effective du prompt sur un patient à très nombreux questionnaires, jamais testée en conditions réelles).

**Prochaine action prioritaire** : R6 (stabilisation build/tests/go-no-go, `.claude/skills/wn-r6/SKILL.md`) — désormais déblocable, R0→R5 tous validés/livrés ; R8 (CI/tests) reste une alternative indépendante.

**Questions ouvertes** : aucune nouvelle ; R0 reste marqué « 🟡 En cours » dans `docs/roadmap.md` sans blocage identifié sur R5 — à clarifier si cela doit être formellement clos avant R6.

## 2026-07-10 — [R0] Réalignement documentaire — clôture

**Décisions prises** : à la demande de l'utilisateur (« clarifie R0 »), audit de `docs/claude/PROJET_CONTEXTE.md` contre l'état réel du code, périmètre strictement documentaire conformément à `.claude/skills/wn-r0/SKILL.md` (lecture/écriture limitées à `README.md`, `AGENTS.md`, `docs/roadmap.md`, `docs/claude/PROJET_CONTEXTE.md`, `docs/claude/SESSION_LOG.md`). `README.md` et `AGENTS.md` déjà alignés (décommission Sheets, portail patient, flux legacy) — aucune modification nécessaire. Trois contradictions corrigées dans `PROJET_CONTEXTE.md` : (1) section « Registre relationnel questionnaires/packs » décrivait R3 comme un objectif futur alors qu'il est livré (commit `3f367a7`) — reformulée pour refléter la lecture primaire réelle via `resolvePackQuestionnaireIds` et le statut « surveillance » de la décommission de `packs.qids` ; (2) section « Ce qui reste ouvert » listait encore R2/R3 comme ouverts (tous deux validés le 2026-07-10) — remplacés par les points réellement ouverts (R6, R8, calendrier `packs.qids`, curation `niveau`/`publicCible`) ; (3) incohérence interne : `SHEET_ID` listé comme secret requis dans la section sécurité alors que la même page indique juste au-dessus qu'il n'est plus requis depuis la décommission Sheets — retiré de la liste des secrets requis. Corrigé au passage : typo « Michel Dogne » → « Michel Dogné ». `docs/roadmap.md` : R0 passé à ✅ Validé, et R6 passé de « 🔒 Gelé tant que R0→R5 non validés » à « ⏳ Débloqué — à faire » puisque R0→R5 sont désormais tous validés.

**Options écartées** : reformuler entièrement `PROJET_CONTEXTE.md` (hors périmètre — seules les sections objectivement contradictoires avec le code ont été touchées, conformément à la règle de changement minimal) ; toucher à `web/src/**` ou tout code applicatif (interdit explicite du skill wn-r0).

**Fichiers modifiés** : `docs/claude/PROJET_CONTEXTE.md`, `docs/roadmap.md`.

**Risques résiduels** : aucun identifié — lot strictement documentaire, aucune logique applicative touchée.

**Prochaine action prioritaire** : R6 (stabilisation build/tests/go-no-go, `.claude/skills/wn-r6/SKILL.md`) est maintenant débloqué ; R8 (CI/tests) reste une alternative indépendante.

**Questions ouvertes** : aucune.

## 2026-07-10 — [R6] Stabilisation build/tests — go

**Décisions prises** : exécution des vérifications du skill `wn-r6` (type-check, lint, scoring-check, no-secrets, build, diff review) sur l'état de la branche `main` avec le diff R0 non commité. Type-check et scoring-check OK sans erreur. `npm run lint` non exécutable : aucune configuration ESLint dans le repo (`.eslintrc`/`eslint.config.*` absents), `next lint` demande une configuration interactive au premier lancement — pré-existant, non lié à ce lot. `check_no_secrets.sh` : faux positif connu `SHEET_ID` (texte documentaire, déjà signalé en R7/R9/R0), aucun secret réel. Build (`npm run build`) : échec initial reproductible au prerendering (`useContext` null, `<Html>` import hors `_document`) sur `/dashboard`, `/login`, `/`, `/404`, `/500` — root cause identifiée : `NODE_ENV=development` forcé dans le shell de cet environnement de dev (Next.js avait déjà émis un avertissement "non-standard NODE_ENV value" en tout début de build). Build relancé avec `NODE_ENV` neutralisé (`env -u NODE_ENV npm run build`) : succès complet, 35/35 pages générées. Cause confirmée comme un artefact d'environnement local, sans lien avec le code (la prod Vercel ne force pas `NODE_ENV`). Vérification ciblée du parcours patient restée une relecture de code (pas de navigateur disponible, limite déjà connue depuis R1/R4). Diff review : seuls les 3 fichiers documentaires du lot R0 modifiés depuis le début, rien d'applicatif. **Verdict : GO**, aucun correctif de code nécessaire.

**Options écartées** : configurer ESLint pour débloquer `npm run lint` (hors périmètre du lot — pas de nouvelle fonctionnalité/outillage sans demande explicite, signalé comme point à traiter en R8) ; corriger `NODE_ENV` de façon permanente dans le repo (ex. script wrapper) — problème d'environnement local, pas de code, pas de correctif committable pertinent identifié pour l'instant.

**Fichiers modifiés** : aucun fichier applicatif ; ce lot n'a produit qu'un diagnostic (voir R0 pour le diff documentaire réellement en attente de commit).

**Risques résiduels** : lint reste indisponible en l'état (dette pré-existante, non nouvelle) ; pas de test navigateur réel du parcours patient dans cet environnement.

**Prochaine action prioritaire** : committer le diff R0 (toujours en attente) ; envisager R8 (CI/tests, y compris configuration ESLint et build en CI) comme prochain chantier indépendant.

**Questions ouvertes** : aucune nouvelle.

## 2026-07-10 — [R8 partiel] ESLint non-interactif + CI GitHub Actions

**Décisions prises** : périmètre choisi avec l'utilisateur — « ESLint + CI seulement », sans framework de tests (aucun test n'existe aujourd'hui dans le repo, jugé hors périmètre pour ce lot). Ajout de `web/.eslintrc.json` (`next/core-web-vitals` + plugin `@typescript-eslint` déclaré) pour rendre `npm run lint` exécutable de façon non interactive — `next lint` demandait jusqu'ici une configuration interactive au premier lancement (dette signalée en R6/R7). `@typescript-eslint/eslint-plugin@^7.2.0` ajouté en devDependency : absent alors que des commentaires `eslint-disable-next-line @typescript-eslint/no-explicit-any` préexistaient dans le code (`route.ts` de `patient/submit` et `praticien/synthese`, `lib/equilibre/score.ts`), provoquant des erreurs « rule definition not found » une fois le lint activé. Création de `.github/workflows/ci.yml` : job séquentiel sur push/PR vers `main` (scan anti-secrets → type-check → lint → build), avec variables d'environnement placeholder (`DATABASE_URL`, `NEXTAUTH_*`, `GOOGLE_CLIENT_*`) car `web/src/lib/prisma.ts` lève une erreur au niveau module si `DATABASE_URL` est absent, ce que `next build` déclenche en import de routes lors du « Collecting page data ». Corrigé au passage 2 violations `react/no-unescaped-entities` préexistantes (apostrophes non échappées dans du texte JSX français) dans `FichePatientPanel.tsx` et `PacksPanel.tsx` — seules violations restantes une fois le plugin TS reconnu. Vérifié localement : lint clean, type-check clean, build complet (35/35 pages) avec les mêmes variables placeholder que la CI. Committé (`ac1eb60`) et poussé sur `main`.

**Options écartées** : mettre en place un framework de tests (Vitest/Playwright) dans ce même lot — décision utilisateur explicite de limiter le périmètre à ESLint + CI, le reste de R8 (tests unitaires sur fonctions déterministes, tests Playwright commités) reste à faire séparément ; étendre `plugin:@typescript-eslint/recommended` complet (aurait activé beaucoup plus de règles TS et un volume de violations non maîtrisé) — préféré ne déclarer que le plugin nécessaire aux `eslint-disable` existants, sans activer de nouvelles règles ; rendre le workflow CI obligatoire (« required check ») sur `main` — action de configuration du repo GitHub hors fichiers versionnés, non demandée.

**Fichiers modifiés** : `web/.eslintrc.json` (nouveau), `.github/workflows/ci.yml` (nouveau), `web/package.json`/`web/package-lock.json` (ajout `@typescript-eslint/eslint-plugin`), `web/src/components/FichePatientPanel.tsx`, `web/src/components/PacksPanel.tsx` (échappement JSX uniquement, aucun changement de logique).

**Risques résiduels** : premier run de lint non testé en conditions CI réelles (seulement en local) — à confirmer au prochain push/PR une fois le workflow actif ; variables d'environnement de build non tracées exhaustivement route par route (`ANTHROPIC_API_KEY`, SMTP, etc. non vérifiées comme strictement absentes des chemins de génération statique) — risque jugé faible mais non garanti à 100 % ; `.env.example` racine toujours obsolète (mentionne Auth0 au lieu de Google OAuth), non traité ici, hors périmètre ; reste de R8 (tests unitaires/Playwright) non couvert par ce lot.

**Prochaine action prioritaire** : surveiller le premier run du workflow `ci.yml` sur la prochaine PR/push ; envisager la suite de R8 (Vitest sur les fonctions déterministes — scoring, `miniSynthese.ts`, `contexteClinique.ts`, `resolvePackQuestionnaireIds` — et tests Playwright commités des parcours critiques) comme prochain chantier indépendant.

**Questions ouvertes** : aucune nouvelle.

## 2026-07-10 — [R8 partiel — suite] Correction du premier run CI réel

**Décisions prises** : le premier run réel du workflow `ci.yml` (poussé en R8 partiel, jamais testé en conditions CI réelles jusqu'ici) a échoué à l'annonce Vercel signalée par l'utilisateur — investigation qui a révélé que Vercel lui-même avait déployé avec succès (READY, `app.wellneuro.fr` correctement aliasé) ; l'échec concernait uniquement le check GitHub Actions séparé. Authentification `gh` CLI effectuée (device flow) pour investiguer directement les runs et logs. Deux bugs distincts corrigés en 2 itérations : (1) `scripts/check_no_secrets.sh` — la regex `SHEET_ID.*[A-Za-z0-9_-]{25,}` matchait n'importe quelle ligne de documentation mentionnant `SHEET_ID` suivie plus loin d'un token de 25+ caractères sans espace (`wellneuro_claude_automation_kit`, mention du zip supprimé en R7), sans rapport avec un vrai secret ; resserrée au format `check_pattern` standard (assignation `SHEET_ID=`/`SHEET_ID:` requise), vérifié qu'aucune assignation réelle n'existe dans le repo (Sheets décommissionné) donc aucun risque de faux négatif introduit. (2) `.github/workflows/ci.yml` — `NODE_ENV: production` au niveau du job faisait sauter les devDependencies à `npm ci` (tailwindcss, typescript, eslint absents, `npm ci` respectant `NODE_ENV`), et l'étape Type-check lançait `tsc --noEmit` sans avoir généré le client Prisma au préalable (`@/generated/prisma` introuvable) ; corrigé en retirant `NODE_ENV` du job (redondant — `next build` le force déjà en interne, la prod Vercel ne le force pas non plus, cf. diagnostic R6) et en ajoutant une étape `npx prisma generate` avant le type-check. Les deux correctifs vérifiés par une installation fraîche isolée (rsync du dossier `web/` sans `node_modules`, `npm ci`, `prisma generate`, type-check, lint, build) avant push, pas seulement en relecture. Run CI final : succès (2m8s, 4 étapes), déploiement Vercel de production correspondant confirmé READY.

**Options écartées** : exclure `docs/` du scan anti-secrets plutôt que corriger la regex — aurait masqué un futur vrai secret documenté par erreur dans `docs/`, alors que resserrer le motif à une syntaxe d'assignation traite la cause réelle sans réduire la couverture ; garder `NODE_ENV=production` et ajouter `--include=dev` à `npm ci` — option viable mais moins propre que retirer une variable redondante et potentiellement trompeuse pour de futurs mainteneurs du workflow.

**Fichiers modifiés** : `scripts/check_no_secrets.sh`, `.github/workflows/ci.yml`, `docs/claude/SESSION_LOG.md` (entrée R8 partiel du lot précédent, restée non committée, incluse dans le même commit que le correctif SHEET_ID).

**Risques résiduels** : aucun identifié sur ce correctif — vérifié en installation fraîche isolée avant push, puis confirmé par le run CI réel et l'état READY du déploiement Vercel. Le reste de R8 (tests unitaires Vitest, tests Playwright commités) reste hors périmètre, non traité par ce lot.

**Prochaine action prioritaire** : envisager la suite de R8 (Vitest sur les fonctions déterministes — scoring, `miniSynthese.ts`, `contexteClinique.ts`, `resolvePackQuestionnaireIds` — et tests Playwright commités des parcours critiques) comme prochain chantier indépendant, ou R10 (arbitrages produit toujours en suspens) si préféré en premier.

**Questions ouvertes** : celles de R10, toujours en suspens.

## 2026-07-10 — Clôture lot cache documentaire clinique V1

**Décisions prises** : lot « préparation technique » livré et poussé (`11c5744`) avec périmètre respecté : snapshot corpus versionné + SHA-256, versions prompt/corpus/schéma explicites, métriques cache non sensibles persistées dans `donneesEntree`, script `prompt-cache-check`, doc/changelog alignés. Aucun changement Prisma/SQL.

**Options écartées** : activation immédiate du corpus V1 (bloquée tant que validation clinique externe absente) ; migration DB dédiée audit (inutile à ce stade, JSON existant suffisant).

**Prochaine action prioritaire** : fournir `ANTHROPIC_API_KEY` pour mesurer le seuil réel (`npm run prompt-cache-check`), puis activer le corpus après validation clinique externe.

**Questions ouvertes** : date/porteur de la validation clinique externe ; activation TTL 5 min ou 1h après mesure d'usage.

## 2026-07-10 — [R8 suite] Tests Vitest + Playwright committés

**Décisions prises** : livraison du reste de R8 (tests unitaires + E2E), scope validé avec l'utilisateur en amont (4 questions) : (1) `score.check.ts` porté en Vitest puis supprimé, y compris son appel dans `seed.ts` ; (2) Playwright tourne en local contre la DB de dev existante (`web/.env.local`) ; (3) CI ne gagne que l'étape Vitest, pas Playwright ni `scoring-check` ; (4) `resolvePackQuestionnaireIds` sans test unitaire dédié, couvert indirectement par le scénario Playwright. Ajout `vitest` + `@playwright/test` en devDependencies, `web/vitest.config.ts`, scripts `test`/`test:watch`/`test:e2e`. 4 fichiers de tests unitaires (32 tests, tous verts) : `questions.test.ts` (`calculateScore` — questionnaire inconnu, type `sum` sur Q_SOM_06, type `sum_items` avec item conditionnel inclus/exclus sur Q_CAN_02, dégradation sans réponse) ; `miniSynthese.test.ts` (9 tests — null/undefined/vide, interprétation simple/detail/protocol, multi-axes DNSM triés par sévérité) ; `contexteClinique.test.ts` (11 tests — fiche/anamnèse vides ou fictives complètes, IMC hors plage, vigilance déterministe signal/traitements/automédication/compléments) ; `equilibre/score.test.ts` (6 tests portés depuis `score.check.ts`, mêmes scénarios et libellés FR). `score.check.ts` supprimé, son import/appel retiré de `seed.ts` (les 4 autres `.check.ts` du dossier `equilibre/` restent inchangés, hors périmètre). CI (`ci.yml`) : étape `Unit tests (Vitest)` ajoutée entre type-check et lint, sans DB (cohérent avec la contrainte). Playwright : `web/playwright.config.ts` (2 projets Desktop Chromium + iPhone 13, `webServer` auto sur `npm run dev`, timeouts élargis pour la latence du pooler Supabase distant), `web/e2e/portail-parcours.spec.ts` formalisant le parcours Phase 0 déjà validé manuellement le 2026-07-10 (gate → consentement → fiche → anamnèse → onboarding pack → questionnaire → brouillon/réinitialisation → transmission 200 → re-soumission serveur 409 → vue verrouillée → demande de correction → déblocage praticien via cookie de session NextAuth signé directement (pas d'automatisation OAuth Google réelle) → re-soumission). **Exécuté réellement en Chromium headless contre la DB de dev (patient fictif Michel Dogné, `PAT_SEED_03`) : passe de bout en bout après 3 corrections trouvées uniquement à l'exécution** — (a) un patient sans `Consultation` existante atterrit directement sur l'écran "Merci !" (`prochaineEtape` retourne `done` si `!consultation`) : le test provisionne désormais une vraie consultation via `POST /api/praticien/consultations` plutôt que de fabriquer l'état en base, pour rester dans les conditions réelles ; (b) `POST /api/patient/submit` valide `answers` non vide (400) avant de vérifier l'état "already_done" (409) — le test envoie un answer placeholder pour la vérification de re-soumission ; (c) navigation vers une page nécessitant un fetch (clic sur "Corriger") sans attendre la réponse réseau avant de remplir le formulaire suivant, corrigé par un `waitForResponse` explicite (même pattern déjà utilisé ailleurs dans le spec). Corrigé au passage une hypothèse obsolète : le test affirmait initialement que `GET /api/patient/reponses` exposait encore l'email en query string (point résiduel documenté dans `docs/checklist_tests_end_to_end.md`) — l'exécution réelle a montré que c'était déjà corrigé par R9 ; assertion et README ajustés en conséquence. iPhone 13 (WebKit) non exécutable dans ce sandbox (dépendances système manquantes, pas d'accès `apt`) — logique identique validée via Chromium, à confirmer sur la machine de l'utilisateur.

**Options écartées** : mock Prisma pour `resolvePackQuestionnaireIds` (coût de maintenance élevé, faible fidélité — tranché par l'utilisateur) ; automatiser le vrai login OAuth Google dans Playwright (fragile, hors périmètre — cookie de session NextAuth signé directement à la place, pattern standard) ; garder `score.check.ts` en parallèle des tests Vitest (redondance de logique de test — tranché par l'utilisateur, suppression après portage) ; ajouter Playwright et `scoring-check` à la CI dans ce même lot (provisionnement DB en CI = décision distincte, tranché par l'utilisateur).

**Fichiers modifiés** : `web/vitest.config.ts`, `web/playwright.config.ts` (nouveaux) ; `web/src/lib/questions.test.ts`, `web/src/lib/scoring/miniSynthese.test.ts`, `web/src/lib/consultation/contexteClinique.test.ts`, `web/src/lib/equilibre/score.test.ts` (nouveaux) ; `web/e2e/portail-parcours.spec.ts`, `web/e2e/helpers/db.ts`, `web/e2e/helpers/auth.ts`, `web/e2e/README.md` (nouveaux) ; `web/prisma/seed.ts` (retrait import/appel `verifierMoteurEquilibre`) ; `.github/workflows/ci.yml` (étape Vitest) ; suppression `web/src/lib/equilibre/score.check.ts`. Note : les ajouts `test`/`test:watch`/`test:e2e` + devDependencies `vitest`/`@playwright/test` dans `web/package.json` ont été absorbés par un commit concurrent (`11c5744`, autre session/terminal actif sur `main` pendant ce lot) plutôt que de rester isolés dans ce diff — signalé à l'utilisateur, aucune action corrective prise sans confirmation.

**Risques résiduels** : iPhone 13 (WebKit) jamais exécuté réellement dans cet environnement ; le spec Playwright n'est pas exécuté en CI (décision explicite) donc sa non-régression dépend d'exécutions locales futures ; latence notable observée contre le pooler Supabase distant (course de navigation déjà corrigée une fois, d'autres pourraient exister sur des variantes de catalogue non couvertes par le patient de test unique) ; historique git de ce lot partiellement entremêlé avec un commit concurrent non lié (`web/package.json`).

**Prochaine action prioritaire** : committer ce lot (aucun commit fait par l'agent dans cette session) ; envisager Vitest sur `resolvePackQuestionnaireIds` (sous-logique pure si extraction possible) ou Playwright-en-CI comme chantiers séparés si souhaité.

**Questions ouvertes** : aucune nouvelle.

## 2026-07-11 — Clôture R8 (suite) : commit

**Décisions prises** : R8 (suite) livré et committé (`fec6def`) — 32 tests Vitest (scoring, mini-synthèse, contexte clinique, pipeline équilibre porté depuis `score.check.ts` supprimé) + parcours Playwright committé du portail patient, exécuté réellement en Chromium contre la DB de dev (3 bugs de test corrigés au passage, pas de bug applicatif). Étape Vitest ajoutée à la CI. Avant de committer, `git status` a révélé des changements sans rapport (wn-campaign, SKILL.md divers, dossier `nw_campaign_writer_autoname_kit/` vide) issus d'une autre session concurrente sur `main` — périmètre du commit clarifié avec l'utilisateur : uniquement les 16 fichiers du lot R8, rien d'autre.

**Options écartées** : committer aussi les fichiers wn-campaign (hors périmètre, tranché par l'utilisateur).

**Fichiers modifiés** : voir commit `fec6def` (détail dans l'entrée précédente).

**Risques résiduels** : iPhone 13/WebKit jamais exécuté réellement (limite sandbox) ; Playwright hors CI (décision explicite) ; les changements wn-campaign restent non committés dans l'arbre de travail, à la charge de l'autre session.

**Prochaine action prioritaire** : aucune côté R8 ; reprendre R10/R8-Vitest sur `resolvePackQuestionnaireIds` ou Playwright-en-CI si souhaité comme chantier séparé.

**Questions ouvertes** : aucune.
