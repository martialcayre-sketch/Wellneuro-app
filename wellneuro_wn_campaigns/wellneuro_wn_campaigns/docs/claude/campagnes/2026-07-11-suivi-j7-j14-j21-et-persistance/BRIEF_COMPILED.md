# Brief compile - Suivi J7/J14/J21 et persistance

_Genere le 2026-07-11 par scripts/wn-campaign.mjs._

## Identite de campagne

- Dossier campagne : docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance
- Fichier final : docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/CAMPAGNE.md

## Sources compilees

- docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/07_SPEC_PROTOCOLE_21J_MINIMAL.md - 07 — Spécification : protocole 21 jours minimal
- docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md - 08 — Momentum et prévention du décrochage
- docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_SPEC_COMPAGNON_PATIENT_MINIMAL.md - 08 — Spécification : compagnon patient minimal
- docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/14_DEFINITION_OF_DONE.md - 14 — Definition of Done transversale
- docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/16_STRUCTURE_PROPOSEE_DANS_LE_REPO.md - 16 — Structure proposée dans le dépôt

## 1. Intention metier

- Créer un protocole phase 1 sobre, utile, validable. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/07_SPEC_PROTOCOLE_21J_MINIMAL.md)
- Chaque protocole doit répondre : (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/07_SPEC_PROTOCOLE_21J_MINIMAL.md)
- exploration biologique à discuter (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/07_SPEC_PROTOCOLE_21J_MINIMAL.md)
- complément validé manuellement (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/07_SPEC_PROTOCOLE_21J_MINIMAL.md)
- Règle : un protocole excessif ne doit pas être envoyé sans justification. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/07_SPEC_PROTOCOLE_21J_MINIMAL.md)
- Chaque protocole devrait pouvoir contenir : (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/07_SPEC_PROTOCOLE_21J_MINIMAL.md)
- Idéal : petit-déjeuner protéiné complet. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/07_SPEC_PROTOCOLE_21J_MINIMAL.md)
- Minimal : skyr ou deux œufs + fruit. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/07_SPEC_PROTOCOLE_21J_MINIMAL.md)
- Secours : shake protéiné simple. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/07_SPEC_PROTOCOLE_21J_MINIMAL.md)
- Prévoir la logique sans forcément tout persister en V1 : (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/07_SPEC_PROTOCOLE_21J_MINIMAL.md)
- Pas de prescription automatique. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/07_SPEC_PROTOCOLE_21J_MINIMAL.md)
- Pas d’envoi sans validation. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/07_SPEC_PROTOCOLE_21J_MINIMAL.md)
- Pas de posologie sensible sans cadre validé. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/07_SPEC_PROTOCOLE_21J_MINIMAL.md)
- Pas de protocole surchargé par défaut. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/07_SPEC_PROTOCOLE_21J_MINIMAL.md)
- Toujours distinguer recommandation et exploration médicale. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/07_SPEC_PROTOCOLE_21J_MINIMAL.md)
- Le protocole peut être préparé sans être envoyé. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/07_SPEC_PROTOCOLE_21J_MINIMAL.md)
- La charge est visible. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/07_SPEC_PROTOCOLE_21J_MINIMAL.md)
- La raison d’être est affichée. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/07_SPEC_PROTOCOLE_21J_MINIMAL.md)
- Aucun changement DB obligatoire en première itération. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/07_SPEC_PROTOCOLE_21J_MINIMAL.md)
- Faire du suivi longitudinal un moteur de décision et de motivation. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- Le momentum n’est pas seulement la différence entre deux scores. C’est une lecture de trajectoire : (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- symptômes + adhésion + régularité + messages + tolérance + ressenti (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- date (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- milestone: T0 | J7 | J14 | J21 | J42 | J90 (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- balance_score (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- need_scores[] (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- symptom_deltas[] (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- adherence_summary (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- checkin_regularity (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- risk_flags[] (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- practitioner_summary (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- signal_type (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- severity (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- detected_from (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- explanation (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- suggested_action (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- messages plus anxieux ; (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- baisse de motivation ; (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- réponses plus négatives ; (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- formulations de découragement. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- Créer une expérience patient calme, mobile-first, centrée sur l’action utile du moment. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_SPEC_COMPAGNON_PATIENT_MINIMAL.md)
- La branche répond à l’objectif annoncé. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/14_DEFINITION_OF_DONE.md)
- ├── 02_OBJECTIF_CIBLE_BRAINSTORM.md (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/16_STRUCTURE_PROPOSEE_DANS_LE_REPO.md)

## 2. Probleme a resoudre

- Ne pas seulement montrer un score global. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- Comparer charge proposée et charge réellement suivie. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- “Souhaitez-vous que l’on simplifie votre protocole cette semaine ?” (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- Les signaux faibles ne sont pas anxiogènes. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- Le système distingue échec protocole et faible adhésion. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- Votre praticien ajustera si besoin. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_SPEC_COMPAGNON_PATIENT_MINIMAL.md)

## 3. Utilisateurs concernes

- Le praticien peut modifier chaque action. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/07_SPEC_PROTOCOLE_21J_MINIMAL.md)
- Un document patient simple peut être généré. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/07_SPEC_PROTOCOLE_21J_MINIMAL.md)
- patient_id (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- message patient : “je n’y arrive pas”. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- ne pas ajouter de nouvelles actions ; (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- Vous avez été régulier 5 jours cette semaine. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- Votre sommeil montre une tendance positive. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- On garde le cap avec une action simple. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- Validé ou déclenché par le praticien. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- Le momentum est visible côté praticien. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- Le patient voit une version positive et simple. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- Le praticien peut agir depuis le signal. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- Le patient doit-il voir son taux d’adhésion ? (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- Le patient ne voit pas toute la cartographie clinique. Il voit : (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_SPEC_COMPAGNON_PATIENT_MINIMAL.md)
- message praticien si nécessaire (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_SPEC_COMPAGNON_PATIENT_MINIMAL.md)
- Cette semaine, nous travaillons surtout sur votre énergie du matin. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_SPEC_COMPAGNON_PATIENT_MINIMAL.md)
- Petit-déjeuner protéiné simple. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_SPEC_COMPAGNON_PATIENT_MINIMAL.md)
- Comment était votre énergie ce matin ? (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_SPEC_COMPAGNON_PATIENT_MINIMAL.md)
- 3 idées simples de petit-déjeuner protéiné. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_SPEC_COMPAGNON_PATIENT_MINIMAL.md)
- Vous pouvez reprendre doucement. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_SPEC_COMPAGNON_PATIENT_MINIMAL.md)
- adhésion à l’action principale (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_SPEC_COMPAGNON_PATIENT_MINIMAL.md)
- Interface lisible sur mobile. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_SPEC_COMPAGNON_PATIENT_MINIMAL.md)
- Une seule action principale visible. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_SPEC_COMPAGNON_PATIENT_MINIMAL.md)
- Pas de score anxiogène. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_SPEC_COMPAGNON_PATIENT_MINIMAL.md)
- Texte rassurant. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_SPEC_COMPAGNON_PATIENT_MINIMAL.md)
- Le patient sait quoi faire aujourd’hui. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_SPEC_COMPAGNON_PATIENT_MINIMAL.md)
- Le praticien reste responsable de l’ajustement. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_SPEC_COMPAGNON_PATIENT_MINIMAL.md)
- Pas de données patient réelles. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/14_DEFINITION_OF_DONE.md)
- Pas d’envoi patient automatique. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/14_DEFINITION_OF_DONE.md)
- Langage patient non culpabilisant. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/14_DEFINITION_OF_DONE.md)
- Theme praticien/patient respecté. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/14_DEFINITION_OF_DONE.md)
- Validation praticien visible. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/14_DEFINITION_OF_DONE.md)
- Incertitudes affichées côté praticien. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/14_DEFINITION_OF_DONE.md)
- ├── 05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/16_STRUCTURE_PROPOSEE_DANS_LE_REPO.md)
- ├── 06_SPEC_UX_COCKPIT_PRATICIEN.md (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/16_STRUCTURE_PROPOSEE_DANS_LE_REPO.md)
- ├── 08_SPEC_COMPAGNON_PATIENT_MINIMAL.md (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/16_STRUCTURE_PROPOSEE_DANS_LE_REPO.md)
- web/src/components/patient-cockpit/ (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/16_STRUCTURE_PROPOSEE_DANS_LE_REPO.md)
- web/src/components/patient-companion/ (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/16_STRUCTURE_PROPOSEE_DANS_LE_REPO.md)

## 4. Parcours cible

- A completer.

## 5. Fonctionnalites candidates

- ├── 11_BACKLOG_MODULES_AVANCES.md (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/16_STRUCTURE_PROPOSEE_DANS_LE_REPO.md)

## 6. Donnees / modeles / integrations pressenties

- Mobile/tablette vérifiés quand pertinent. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/14_DEFINITION_OF_DONE.md)
- Les API existantes ne changent pas sans nécessité. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/14_DEFINITION_OF_DONE.md)
- ├── 10_SPEC_DONNEES_MANQUANTES_SIGNAUX_DISCORDANTS.md (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/16_STRUCTURE_PROPOSEE_DANS_LE_REPO.md)
- Les routes API doivent rester fines et vérifiables. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/16_STRUCTURE_PROPOSEE_DANS_LE_REPO.md)
- Persistance protocole, check-ins, document bundles et momentum nécessiteront probablement de nouveaux modèles Prisma. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/16_STRUCTURE_PROPOSEE_DANS_LE_REPO.md)

## 7. Contraintes projet

- V1 peut être sans persistance ou avec stockage différé selon arbitrage. Ne pas créer de migration sans confirmation. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_SPEC_COMPAGNON_PATIENT_MINIMAL.md)
- Toute migration éventuelle est explicitement demandée et confirmée. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/14_DEFINITION_OF_DONE.md)
- Pas de secret. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/14_DEFINITION_OF_DONE.md)
- ├── 12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/16_STRUCTURE_PROPOSEE_DANS_LE_REPO.md)
- 1. prototype UI sans migration (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/16_STRUCTURE_PROPOSEE_DANS_LE_REPO.md)

## 8. Risques et dependances

- Attention : jamais de diagnostic psychologique automatique. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- check-ins absents ; (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- protocole non coché ; (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- message de découragement ; (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- symptômes qui remontent ; (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- action quotidienne trop souvent ignorée ; (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- charge protocole élevée. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- 4 jours sans check-in ; (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- routine sommeil suivie à 28 % ; (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- envoyer un message court de soutien ou alléger le protocole. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- Le risque de décrochage doit-il être calculé ou simplement tagué ? (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- Les risques restants sont documentés. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/14_DEFINITION_OF_DONE.md)

## 9. Decisions a prendre

- Quels signaux sont suffisants en V1 ? (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/08_MOMENTUM_DECROCHAGE.md)
- ├── 15_RISQUES_DECISIONS_ET_ARBITRAGES.md (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/16_STRUCTURE_PROPOSEE_DANS_LE_REPO.md)

## 10. Decoupage recommande

- R0 : audit de l'existant et clarification du perimetre, sans modification.
- R1 : contrat fonctionnel, UX et checklist E2E.
- R2 : tranche verticale minimale sur le scenario principal.
- R3 : donnees / integrations / persistance, apres validation du besoin.
- R4 : compatibilite legacy et cas limites.
- R5 : UI, durcissement, securite et accessibilite.
- R6 : tests, documentation et decision go/no-go.

## Materiau non classe a relire

- Le périmètre est réduit à une branche courte. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/14_DEFINITION_OF_DONE.md)
- Les fichiers probables sont identifiés. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/14_DEFINITION_OF_DONE.md)
- Les hors-périmètre sont écrits. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/14_DEFINITION_OF_DONE.md)
- Les impacts cliniques sont compris. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/14_DEFINITION_OF_DONE.md)
- Changement minimal. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/14_DEFINITION_OF_DONE.md)
- Pas de refactor large non demandé. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/14_DEFINITION_OF_DONE.md)
- Tous les textes UI en français. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/14_DEFINITION_OF_DONE.md)
- Pas de changement de seuils/scoring sans validation. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/14_DEFINITION_OF_DONE.md)
- États chargement/erreur/vide prévus. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/14_DEFINITION_OF_DONE.md)
- Aucun état clinique indiqué par la seule couleur. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/14_DEFINITION_OF_DONE.md)
- Distinction entre donnée déclarative, calculée, biologique, hypothèse, IA, validation. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/14_DEFINITION_OF_DONE.md)
- Pas de diagnostic automatique. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/14_DEFINITION_OF_DONE.md)
- Pas de prescription automatique. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/14_DEFINITION_OF_DONE.md)
- Le comportement existant n’est pas cassé. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/14_DEFINITION_OF_DONE.md)
- Les composants sont réutilisables. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/14_DEFINITION_OF_DONE.md)
- Les textes sont clairs en français. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/14_DEFINITION_OF_DONE.md)
- Le code reste lisible. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/14_DEFINITION_OF_DONE.md)
- Si ces documents sont intégrés au dépôt, emplacement conseillé : (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/16_STRUCTURE_PROPOSEE_DANS_LE_REPO.md)
- ├── 00_START_HERE_AGENT_CODE.md (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/16_STRUCTURE_PROPOSEE_DANS_LE_REPO.md)
- ├── 01_ETAT_ACTUEL_DEPOT_ET_ROADMAP.md (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/16_STRUCTURE_PROPOSEE_DANS_LE_REPO.md)
- ├── 03_HIERARCHISATION_STRATEGIQUE.md (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/16_STRUCTURE_PROPOSEE_DANS_LE_REPO.md)
- ├── 04_ROADMAP_DE_TRANSITION.md (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/16_STRUCTURE_PROPOSEE_DANS_LE_REPO.md)
- ├── 07_SPEC_PROTOCOLE_21J_MINIMAL.md (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/16_STRUCTURE_PROPOSEE_DANS_LE_REPO.md)
- ├── 09_SPEC_DOCUMENTS_MULTI_DESTINATAIRES.md (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/16_STRUCTURE_PROPOSEE_DANS_LE_REPO.md)
- └── source_evolutions_originales/ (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/16_STRUCTURE_PROPOSEE_DANS_LE_REPO.md)
- Les composants UI doivent rester présentationnels autant que possible. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/16_STRUCTURE_PROPOSEE_DANS_LE_REPO.md)
- Les règles de calcul doivent être dans `lib/`. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/16_STRUCTURE_PROPOSEE_DANS_LE_REPO.md)
- Les objets métier doivent être typés. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/16_STRUCTURE_PROPOSEE_DANS_LE_REPO.md)
- Ne pas mettre de logique clinique lourde directement dans les composants. (docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/sources/sources/16_STRUCTURE_PROPOSEE_DANS_LE_REPO.md)
