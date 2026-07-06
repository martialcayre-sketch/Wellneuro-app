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
