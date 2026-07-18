# Brief compile - Boussole alimentaire slice V1

> **Statut 5.0 — historique non exécutable.** Ce brief provient des sources
> importées et peut contenir le scan, OFF, des scores patient ou des modules
> différés. CAMPAGNE.md, AUDIT_CONFORMITE_5_0.md et les huit lots canoniques
> sont la référence exécutable. Le dossier sources/ est préservé sans être
> normatif.

_Genere le 2026-07-11 par scripts/wn-campaign.mjs._

## Identite de campagne

- Dossier campagne : docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1
- Fichier final : docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/CAMPAGNE.md

## Sources compilees

- docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md - 03 — GPS alimentaire : évolution de la Boussole alimentaire
- docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/11_BACKLOG_MODULES_AVANCES.md - 11 — Backlog des modules avancés
- docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md - 12 — Garde-fous cliniques, RGPD et sécurité

## 1. Intention metier

- Faire évoluer la Boussole alimentaire vers un **GPS alimentaire personnalisé**, basé sur Ciqual, Open Food Facts en cache, aliments vedettes, mapping propriétaire WellNeuro, objectifs actifs du patient et protocole en cours. (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- Objectif : guider le patient vers des choix cohérents avec son protocole, sans culpabilisation. (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- Lecture selon votre objectif actuel : (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- Le soir, il soutient moins votre objectif d’apaisement. (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- Règle : ne jamais dire “ce produit est mauvais”, mais “ce produit est moins aligné avec votre objectif actuel”. (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- un peu trop stimulant pour l’objectif sommeil (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- Open Food Facts live sans cache (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/11_BACKLOG_MODULES_AVANCES.md)
- aucun stockage de résultat réel (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/11_BACKLOG_MODULES_AVANCES.md)
- interprétation automatisée complète (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/11_BACKLOG_MODULES_AVANCES.md)
- comparaisons longitudinales réelles (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/11_BACKLOG_MODULES_AVANCES.md)
- lien au protocole ou complément (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/11_BACKLOG_MODULES_AVANCES.md)
- notifications automatiques nombreuses (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/11_BACKLOG_MODULES_AVANCES.md)

## 2. Probleme a resoudre

- Attention : la chronobiologie nécessite une donnée horaire. Sans heure de repas, ne pas calculer le besoin rythme alimentaire. (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)

## 3. Utilisateurs concernes

- patient_id (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- message_patient (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- petit-déjeuner trop glucidique ; (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- dîner tardif ; (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- oméga-3 insuffisants. (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- Votre action alimentaire cette semaine (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- Ajouter 2 portions d’aliments riches en oméga-3. (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- sardines ; (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- maquereau ; (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- noix ; (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- huile de colza. (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- 1. Mode courses : scan panier + suggestions en temps réel. (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- 2. Mode frigo : le patient indique ce qu’il a, l’app propose une assiette compatible. (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- 4. Mode famille : adapter les conseils à un repas partagé. (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- 5. Mode “écart utile” : transformer un écart en repas équilibré. (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- Le patient comprend en une phrase si un aliment va dans son sens. (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- La lecture est toujours contextualisée. (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- Le praticien peut voir le détail clinique. (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- Le moteur ne remplace pas Mon équilibre. (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- Le score aliment ne dépend jamais de la biologie patient. (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- Pas d’affichage culpabilisant. (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- score de décrochage visible patient (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/11_BACKLOG_MODULES_AVANCES.md)
- Le praticien valide avant diffusion. (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md)
- Dans le dépôt, les exemples et seeds, seuls ces patients fictifs peuvent apparaître : (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md)
- Ne jamais inventer ou afficher de données patient réelles. (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md)
- autorisé : catalogue marqueurs, packs proposés, documents à discuter médecin (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md)
- interdit : stockage de résultats biologiques réels patient (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md)
- Variables sensibles uniquement en environnement. (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md)
- Pas de modification OAuth sans analyse. (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md)
- Exécuter type-check. (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md)
- Votre praticien ajustera si besoin. (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md)
- Un bouton “Valider” ne suffit pas pour les contenus sensibles. Prévoir une validation explicite : (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md)
- J’ai relu les données utilisées. (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md)
- Je valide la diffusion au patient. (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md)
- Ce document ne remplace pas un avis médical. (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md)

## 4. Parcours cible

- Référence exécutable : parcours praticien LOT-04, puis projection patient
  LOT-05 après validation et diffusion du protocole.

## 5. Fonctionnalites candidates

- Ce produit est plutôt à placer le matin. (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- Flocons d’avoine + noix + yaourt nature. (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- satiété (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- fibres (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- stabilité glycémique (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- manque de glucides complexes apaisants (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- protéines régulières ; (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- meilleure diversité végétale. (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- Trous nutritionnels probables : (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- oméga-3 ; (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- magnésium ; (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- fibres fermentescibles. (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- food_ref (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- active_goals[] (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- intrinsic_scores[] (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- contextual_score (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- message_practitioner (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- confidence_level (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- items[] (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- strengths[] (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- gaps[] (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- suggested_substitutions[] (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- context: courses | repas | semaine (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- from_food_ref (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- to_food_ref (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- same_family: true/false (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- clinical_gain (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- linked_axes[] (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- rationale (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- + cohérence avec protocole inflammation basse (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- Chaque aliment vedette doit répondre à : (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- Matin : élan / protéines / dopamine (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- Goûter : transition / sérotonine (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)

## 6. Donnees / modeles / integrations pressenties

- statut retenu / acceptable / à éviter / à vérifier (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/11_BACKLOG_MODULES_AVANCES.md)
- multiplication de prompts non auditables (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/11_BACKLOG_MODULES_AVANCES.md)

## 7. Contraintes projet

- WellNeuro ne diagnostique pas. (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md)
- WellNeuro ne prescrit pas automatiquement. (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md)
- WellNeuro prépare des recommandations structurées. (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md)
- Les hypothèses doivent rester des hypothèses. (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md)
- Les scores ne suffisent jamais à eux seuls. (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md)
- Pas de secret en dur. (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md)
- Pas de migration DB sans confirmation. (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md)
- Exécuter `scripts/check_no_secrets.sh` si disponible. (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md)

## 8. Risques et dependances

- Risques et dépendances arbitrés dans AUDIT_CONFORMITE_5_0.md et dans les
  sections dédiées de chacun des huit lots.

## 9. Decisions a prendre

- 3. Mode restaurant : conseils de choix sans calcul détaillé. (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- Faut-il commencer par produit ou par assiettes vedettes ? (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- Le mode panier est-il V1 ou V2 ? (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)
- Les substitutions doivent-elles être limitées aux aliments vedettes au départ ? (docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/sources/sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md)

## 10. Decoupage recommande

- R0 : audit de l'existant et clarification du perimetre, sans modification.
- R1 : contrat fonctionnel, UX et checklist E2E.
- R2 : tranche verticale minimale sur le scenario principal.
- R3 : donnees / integrations / persistance, apres validation du besoin.
- R4 : compatibilite legacy et cas limites.
- R5 : UI, durcissement, securite et accessibilite.
- R6 : tests, documentation et decision go/no-go.

## Materiau non classe a relire

- Aucun.
