# Brief compile - Décision clinique 21 jours V1

_Genere le 2026-07-11 par scripts/wn-campaign.mjs._

## Identite de campagne

- Dossier campagne : docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1
- Fichier final : docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/CAMPAGNE.md

## Sources compilees

- docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/03_HIERARCHISATION_STRATEGIQUE.md - 03 — Hiérarchisation stratégique de la conversation
- docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md - 05 — Vertical slice 1 : fiche patient cockpit + protocole 21 jours minimal
- docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/06_SPEC_UX_COCKPIT_PRATICIEN.md - 06 — Spécification UX : cockpit praticien
- docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/07_SPEC_PROTOCOLE_21J_MINIMAL.md - 07 — Spécification : protocole 21 jours minimal
- docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/09_SPEC_DOCUMENTS_MULTI_DESTINATAIRES.md - 09 — Spécification : documents multi-destinataires
- docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/10_SPEC_DONNEES_MANQUANTES_SIGNAUX_DISCORDANTS.md - 10 — Spécification : données manquantes et signaux discordants
- docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md - 12 — Garde-fous cliniques, RGPD et sécurité
- docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/14_DEFINITION_OF_DONE.md - 14 — Definition of Done transversale

## 1. Intention metier

- Créer le premier écran WellNeuro 3.0 qui change réellement la consultation : une fiche patient cockpit qui transforme les données en décision 21 jours. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- anamnèse ; (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- scores ; (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- mini-synthèses déterministes ; (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- synthèse IA globale ; (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- Mon équilibre ; (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- assignations ; (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- demandes de correction. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- résumé décisionnel ; (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- priorité actuelle ; (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- signaux convergents ; (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- signaux discordants ; (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- données manquantes ; (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- protocole 21 jours minimal ; (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- charge thérapeutique ; (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- ├── Cartographie / Mon équilibre (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- └── Historique technique repliable (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- Décision proposée pour 21 jours (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- Types d’actions autorisées en V1 : (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- 2 points par action quotidienne contraignante (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- 1 point si nécessite achat ou préparation (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- 10+ : excessif, justification requise (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- À vérifier dans le dépôt avant action : (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- web/src/lib/scoring/miniSynthese.ts (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- web/src/components/protocol/ProtocolMiniBuilder.tsx (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- web/src/lib/protocol/therapeuticLoad.ts (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- stockage persistant du protocole ; (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- compléments clean label avancés ; (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- messagerie ; (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- biologie réelle ; (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- scanner alimentaire ; (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- modification des seuils de scoring. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- L’historique technique reste accessible mais n’est pas l’entrée principale. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- Le protocole minimal ne dépasse pas 3 actions sans alerte. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- Tous les textes sont en français. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- Aucun changement DB. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- Type-check OK. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- Passer d’un dashboard classique à une interface de décision clinique. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/06_SPEC_UX_COCKPIT_PRATICIEN.md)
- Créer un protocole phase 1 sobre, utile, validable. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/07_SPEC_PROTOCOLE_21J_MINIMAL.md)
- Chaque protocole doit répondre : (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/07_SPEC_PROTOCOLE_21J_MINIMAL.md)
- exploration biologique à discuter (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/07_SPEC_PROTOCOLE_21J_MINIMAL.md)
- complément validé manuellement (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/07_SPEC_PROTOCOLE_21J_MINIMAL.md)
- Règle : un protocole excessif ne doit pas être envoyé sans justification. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/07_SPEC_PROTOCOLE_21J_MINIMAL.md)
- Chaque protocole devrait pouvoir contenir : (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/07_SPEC_PROTOCOLE_21J_MINIMAL.md)
- Idéal : petit-déjeuner protéiné complet. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/07_SPEC_PROTOCOLE_21J_MINIMAL.md)
- Minimal : skyr ou deux œufs + fruit. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/07_SPEC_PROTOCOLE_21J_MINIMAL.md)
- Secours : shake protéiné simple. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/07_SPEC_PROTOCOLE_21J_MINIMAL.md)
- Prévoir la logique sans forcément tout persister en V1 : (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/07_SPEC_PROTOCOLE_21J_MINIMAL.md)
- Pas de prescription automatique. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/07_SPEC_PROTOCOLE_21J_MINIMAL.md)
- Pas d’envoi sans validation. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/07_SPEC_PROTOCOLE_21J_MINIMAL.md)
- Pas de posologie sensible sans cadre validé. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/07_SPEC_PROTOCOLE_21J_MINIMAL.md)
- Pas de protocole surchargé par défaut. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/07_SPEC_PROTOCOLE_21J_MINIMAL.md)
- Toujours distinguer recommandation et exploration médicale. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/07_SPEC_PROTOCOLE_21J_MINIMAL.md)
- Le protocole peut être préparé sans être envoyé. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/07_SPEC_PROTOCOLE_21J_MINIMAL.md)
- La charge est visible. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/07_SPEC_PROTOCOLE_21J_MINIMAL.md)
- La raison d’être est affichée. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/07_SPEC_PROTOCOLE_21J_MINIMAL.md)
- Aucun changement DB obligatoire en première itération. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/07_SPEC_PROTOCOLE_21J_MINIMAL.md)
- Transformer les données validées en documents adaptés au destinataire. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/09_SPEC_DOCUMENTS_MULTI_DESTINATAIRES.md)
- Aider le praticien à ne pas surinterpréter et à identifier ce qui doit être exploré. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/10_SPEC_DONNEES_MANQUANTES_SIGNAUX_DISCORDANTS.md)
- Ce que nous ne savons pas encore. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/10_SPEC_DONNEES_MANQUANTES_SIGNAUX_DISCORDANTS.md)
- Priorisation inflammatoire fragile : CRPus non disponible. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/10_SPEC_DONNEES_MANQUANTES_SIGNAUX_DISCORDANTS.md)
- Axe oméga-3 non documenté : profil acides gras non disponible. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/10_SPEC_DONNEES_MANQUANTES_SIGNAUX_DISCORDANTS.md)
- Fatigue persistante : B12 active, ferritine, folates ou TSH non renseignés. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/10_SPEC_DONNEES_MANQUANTES_SIGNAUX_DISCORDANTS.md)
- Digestion fortement plainte : calprotectine ou marqueurs intestinaux non documentés. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/10_SPEC_DONNEES_MANQUANTES_SIGNAUX_DISCORDANTS.md)
- Un signal discordant n’est pas une conclusion. C’est un point à explorer. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/10_SPEC_DONNEES_MANQUANTES_SIGNAUX_DISCORDANTS.md)
- Fatigue élevée mais sommeil déclaré correct. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/10_SPEC_DONNEES_MANQUANTES_SIGNAUX_DISCORDANTS.md)
- Stress perçu faible mais hyperexcitabilité forte. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/10_SPEC_DONNEES_MANQUANTES_SIGNAUX_DISCORDANTS.md)
- Alimentation déclarée satisfaisante mais apports protéiques faibles. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/10_SPEC_DONNEES_MANQUANTES_SIGNAUX_DISCORDANTS.md)
- Motivation forte mais adhésion faible. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/10_SPEC_DONNEES_MANQUANTES_SIGNAUX_DISCORDANTS.md)
- La branche répond à l’objectif annoncé. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/14_DEFINITION_OF_DONE.md)

## 2. Probleme a resoudre

- Le document indique ses limites. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/09_SPEC_DOCUMENTS_MULTI_DESTINATAIRES.md)

## 3. Utilisateurs concernes

- L’IA et les moteurs déterministes préparent. Le praticien valide. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/03_HIERARCHISATION_STRATEGIQUE.md)
- La phase 1 doit chercher le plus petit changement susceptible de produire un bénéfice perceptible. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/03_HIERARCHISATION_STRATEGIQUE.md)
- 2. Protocole 21 jours minimal. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/03_HIERARCHISATION_STRATEGIQUE.md)
- 5. Documents patient/médecin/praticien. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/03_HIERARCHISATION_STRATEGIQUE.md)
- score global anxiogène côté patient (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/03_HIERARCHISATION_STRATEGIQUE.md)
- IA qui répond seule au patient (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/03_HIERARCHISATION_STRATEGIQUE.md)
- Ce changement réduit-il la charge cognitive du praticien ou du patient ? (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/03_HIERARCHISATION_STRATEGIQUE.md)
- patient ; (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- document patient simple ; (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- validation praticien. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- aucune diffusion sans validation praticien (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- complément uniquement si déjà validé manuellement par praticien (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- web/src/components/FichePatientPanel.tsx (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- web/src/app/dashboard/patients/[idPatient]/page.tsx (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- web/src/app/api/praticien/equilibre/route.ts (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- web/src/app/api/praticien/reponses/route.ts (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- web/src/components/patient-cockpit/PatientCockpit.tsx (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- web/src/components/patient-cockpit/DecisionSummaryCard.tsx (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- web/src/components/patient-cockpit/CurrentPriorityCard.tsx (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- web/src/components/patient-cockpit/TherapeuticLoadBadge.tsx (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- web/src/components/patient-cockpit/MissingDataPanel.tsx (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- envoi automatique patient ; (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- La fiche patient s’ouvre sans régression. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- Le praticien voit un résumé décisionnel lisible. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- Aucune donnée patient réelle n’apparaît. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- Questionnaires transmis récemment (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/06_SPEC_UX_COCKPIT_PRATICIEN.md)
- Idée structurante : le praticien ne doit pas chercher patient par patient ce qui demande son attention. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/06_SPEC_UX_COCKPIT_PRATICIEN.md)
- thème praticien sombre ; (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/06_SPEC_UX_COCKPIT_PRATICIEN.md)
- deep teal + champagne gold ; (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/06_SPEC_UX_COCKPIT_PRATICIEN.md)
- tokens CSS existants ; (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/06_SPEC_UX_COCKPIT_PRATICIEN.md)
- ne pas utiliser `text-primary` comme texte sur fond sombre ; (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/06_SPEC_UX_COCKPIT_PRATICIEN.md)
- ne jamais signaler un état clinique par la couleur seule. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/06_SPEC_UX_COCKPIT_PRATICIEN.md)
- Tout panneau doit avoir un état vide utile : (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/06_SPEC_UX_COCKPIT_PRATICIEN.md)
- Aucun protocole préparé pour ce patient. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/06_SPEC_UX_COCKPIT_PRATICIEN.md)
- Aucune donnée manquante critique identifiée à ce stade. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/06_SPEC_UX_COCKPIT_PRATICIEN.md)
- Aucun document en attente de validation. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/06_SPEC_UX_COCKPIT_PRATICIEN.md)
- Le praticien doit voir d’abord **ce qu’il doit décider**, puis seulement ensuite les détails. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/06_SPEC_UX_COCKPIT_PRATICIEN.md)
- Le praticien peut modifier chaque action. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/07_SPEC_PROTOCOLE_21J_MINIMAL.md)
- Un document patient simple peut être généré. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/07_SPEC_PROTOCOLE_21J_MINIMAL.md)
- Document simple, pédagogique, non anxiogène : (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/09_SPEC_DOCUMENTS_MULTI_DESTINATAIRES.md)
- Quand recontacter le praticien (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/09_SPEC_DOCUMENTS_MULTI_DESTINATAIRES.md)
- Document argumenté, sobre, factuel : (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/09_SPEC_DOCUMENTS_MULTI_DESTINATAIRES.md)
- Explorations biologiques à discuter (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/09_SPEC_DOCUMENTS_MULTI_DESTINATAIRES.md)
- Zone de validation / avis médical (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/09_SPEC_DOCUMENTS_MULTI_DESTINATAIRES.md)
- L’IA prépare un brouillon. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/09_SPEC_DOCUMENTS_MULTI_DESTINATAIRES.md)
- Le praticien valide. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/09_SPEC_DOCUMENTS_MULTI_DESTINATAIRES.md)
- Aucune information non sourcée dans les données patient ne doit être affirmée. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/09_SPEC_DOCUMENTS_MULTI_DESTINATAIRES.md)
- Distinguer données déclaratives, calculées, biologiques, hypothèses, validation. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/09_SPEC_DOCUMENTS_MULTI_DESTINATAIRES.md)
- Même source clinique, sorties différentes selon destinataire. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/09_SPEC_DOCUMENTS_MULTI_DESTINATAIRES.md)
- Textes en français. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/09_SPEC_DOCUMENTS_MULTI_DESTINATAIRES.md)
- Pas de donnée réelle dans les exemples. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/09_SPEC_DOCUMENTS_MULTI_DESTINATAIRES.md)
- Validation explicite avant diffusion. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/09_SPEC_DOCUMENTS_MULTI_DESTINATAIRES.md)
- └── impact possible sur protocole (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/10_SPEC_DONNEES_MANQUANTES_SIGNAUX_DISCORDANTS.md)
- Ne pas afficher les discordances de manière brute. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/10_SPEC_DONNEES_MANQUANTES_SIGNAUX_DISCORDANTS.md)
- Certains points seront précisés avec votre praticien. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/10_SPEC_DONNEES_MANQUANTES_SIGNAUX_DISCORDANTS.md)
- Pas de conclusion automatique. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/10_SPEC_DONNEES_MANQUANTES_SIGNAUX_DISCORDANTS.md)
- Chaque donnée manquante explique pourquoi elle pourrait changer la décision. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/10_SPEC_DONNEES_MANQUANTES_SIGNAUX_DISCORDANTS.md)
- Les signaux discordants sont visibles côté praticien. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/10_SPEC_DONNEES_MANQUANTES_SIGNAUX_DISCORDANTS.md)
- Aucune alerte anxiogène côté patient. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/10_SPEC_DONNEES_MANQUANTES_SIGNAUX_DISCORDANTS.md)
- Le praticien valide avant diffusion. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md)
- Dans le dépôt, les exemples et seeds, seuls ces patients fictifs peuvent apparaître : (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md)
- Ne jamais inventer ou afficher de données patient réelles. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md)
- autorisé : catalogue marqueurs, packs proposés, documents à discuter médecin (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md)
- interdit : stockage de résultats biologiques réels patient (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md)
- Variables sensibles uniquement en environnement. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md)
- Pas de modification OAuth sans analyse. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md)
- Exécuter type-check. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md)
- Votre praticien ajustera si besoin. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md)
- Un bouton “Valider” ne suffit pas pour les contenus sensibles. Prévoir une validation explicite : (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md)
- J’ai relu les données utilisées. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md)
- Je valide la diffusion au patient. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md)
- Ce document ne remplace pas un avis médical. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md)
- Pas de données patient réelles. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/14_DEFINITION_OF_DONE.md)
- Pas d’envoi patient automatique. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/14_DEFINITION_OF_DONE.md)
- Langage patient non culpabilisant. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/14_DEFINITION_OF_DONE.md)
- Theme praticien/patient respecté. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/14_DEFINITION_OF_DONE.md)
- Validation praticien visible. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/14_DEFINITION_OF_DONE.md)
- Incertitudes affichées côté praticien. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/14_DEFINITION_OF_DONE.md)

## 4. Parcours cible

- A completer.

## 5. Fonctionnalites candidates

- Commencer par HTML imprimable plutôt que PDF natif. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/09_SPEC_DOCUMENTS_MULTI_DESTINATAIRES.md)
- Export/impression fonctionnel. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/09_SPEC_DOCUMENTS_MULTI_DESTINATAIRES.md)

## 6. Donnees / modeles / integrations pressenties

- 1. Fiches conseils contextuelles. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/03_HIERARCHISATION_STRATEGIQUE.md)
- 2. Bibliothèque compléments sélectionnée. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/03_HIERARCHISATION_STRATEGIQUE.md)
- 3. Boussole alimentaire vertical slice. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/03_HIERARCHISATION_STRATEGIQUE.md)
- 3. Scanner alimentaire complet. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/03_HIERARCHISATION_STRATEGIQUE.md)
- 4. Base complément exhaustive. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/03_HIERARCHISATION_STRATEGIQUE.md)
- 6. Copilotes IA multiples indépendants. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/03_HIERARCHISATION_STRATEGIQUE.md)
- À ne pas développer dans les premières branches : (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/03_HIERARCHISATION_STRATEGIQUE.md)
- stockage de résultats biologiques réels (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/03_HIERARCHISATION_STRATEGIQUE.md)
- migration Prisma ; (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)
- mobile/tablette first ; (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/06_SPEC_UX_COCKPIT_PRATICIEN.md)
- Mobile/tablette vérifiés quand pertinent. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/14_DEFINITION_OF_DONE.md)
- Les API existantes ne changent pas sans nécessité. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/14_DEFINITION_OF_DONE.md)

## 7. Contraintes projet

- WellNeuro ne diagnostique pas. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md)
- WellNeuro ne prescrit pas automatiquement. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md)
- WellNeuro prépare des recommandations structurées. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md)
- Les hypothèses doivent rester des hypothèses. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md)
- Les scores ne suffisent jamais à eux seuls. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md)
- Pas de secret en dur. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md)
- Pas de migration DB sans confirmation. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md)
- Exécuter `scripts/check_no_secrets.sh` si disponible. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md)
- Toute migration éventuelle est explicitement demandée et confirmée. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/14_DEFINITION_OF_DONE.md)
- Pas de secret. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/14_DEFINITION_OF_DONE.md)

## 8. Risques et dependances

- afficher trop d’informations ; (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/06_SPEC_UX_COCKPIT_PRATICIEN.md)
- masquer les détails techniques nécessaires ; (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/06_SPEC_UX_COCKPIT_PRATICIEN.md)
- casser l’accès aux réponses ; (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/06_SPEC_UX_COCKPIT_PRATICIEN.md)
- perdre la traçabilité ; (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/06_SPEC_UX_COCKPIT_PRATICIEN.md)
- trop dépendre de l’IA pour le résumé. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/06_SPEC_UX_COCKPIT_PRATICIEN.md)
- Les risques restants sont documentés. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/14_DEFINITION_OF_DONE.md)

## 9. Decisions a prendre

- Avant chaque développement, demander : (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/03_HIERARCHISATION_STRATEGIQUE.md)
- questionnaires ; (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md)

## 10. Decoupage recommande

- R0 : audit de l'existant et clarification du perimetre, sans modification.
- R1 : contrat fonctionnel, UX et checklist E2E.
- R2 : tranche verticale minimale sur le scenario principal.
- R3 : donnees / integrations / persistance, apres validation du besoin.
- R4 : compatibilite legacy et cas limites.
- R5 : UI, durcissement, securite et accessibilite.
- R6 : tests, documentation et decision go/no-go.

## Materiau non classe a relire

- Le système doit aider à faire moins, mais mieux : (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/03_HIERARCHISATION_STRATEGIQUE.md)
- Le périmètre est réduit à une branche courte. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/14_DEFINITION_OF_DONE.md)
- Les fichiers probables sont identifiés. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/14_DEFINITION_OF_DONE.md)
- Les hors-périmètre sont écrits. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/14_DEFINITION_OF_DONE.md)
- Les impacts cliniques sont compris. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/14_DEFINITION_OF_DONE.md)
- Changement minimal. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/14_DEFINITION_OF_DONE.md)
- Pas de refactor large non demandé. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/14_DEFINITION_OF_DONE.md)
- Tous les textes UI en français. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/14_DEFINITION_OF_DONE.md)
- Pas de changement de seuils/scoring sans validation. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/14_DEFINITION_OF_DONE.md)
- États chargement/erreur/vide prévus. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/14_DEFINITION_OF_DONE.md)
- Aucun état clinique indiqué par la seule couleur. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/14_DEFINITION_OF_DONE.md)
- Distinction entre donnée déclarative, calculée, biologique, hypothèse, IA, validation. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/14_DEFINITION_OF_DONE.md)
- Pas de diagnostic automatique. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/14_DEFINITION_OF_DONE.md)
- Pas de prescription automatique. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/14_DEFINITION_OF_DONE.md)
- Le comportement existant n’est pas cassé. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/14_DEFINITION_OF_DONE.md)
- Les composants sont réutilisables. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/14_DEFINITION_OF_DONE.md)
- Les textes sont clairs en français. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/14_DEFINITION_OF_DONE.md)
- Le code reste lisible. (docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/sources/sources/14_DEFINITION_OF_DONE.md)
