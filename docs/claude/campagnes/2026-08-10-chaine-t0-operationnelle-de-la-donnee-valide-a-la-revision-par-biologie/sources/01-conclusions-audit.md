# Conclusions de l'audit — golden case de référence (2026-08-10)

Audit en lecture seule du dépôt, conduit sur un cas longitudinal réel utilisé
comme banc d'essai (« golden case »). Le rapport détaillé et le dossier clinique
restent hors dépôt (aucune donnée patient réelle ici — le cas sera rejoué par
une fixture anonymisée sur patients fictifs autorisés). Ce document consigne les
conclusions d'architecture qui fondent la campagne.

## Verdict d'ensemble

WellNeuro est un système d'**observation gouvernée** solide (scores
déterministes certifiés, orientation sourcée par claims signés, validation
praticien structurellement obligatoire, append-only généralisé) mais **pas
encore un système de raisonnement révisable** : la boucle
observer → hiérarchiser → réviser → arrêter n'existe pas. Beaucoup de contrats
existent déjà **sans producteur** — la campagne consiste plus à brancher qu'à
inventer.

## Constats majeurs (avec ancrage code)

1. **Invalidation de données sans modèle de données.** Aucun champ de validité
   sur `QuestionnaireReponse` (`web/prisma/schema.prisma:277-295`). Le retrait
   des passations non interprétables vit dans un registre en dur
   (`web/src/lib/scoring/passationsNonInterpretables.ts:80-90`), granularité
   instrument+date : invalider une passation individuelle exige un déploiement.
   `donneesEntree` des synthèses conserve les données **non filtrées**
   (`web/src/app/api/praticien/synthese/route.ts:396-400`), et une synthèse
   validée générée avant la mise en service du retrait n'est ni régénérée ni
   marquée dans son contenu.
2. **Pas de déduplication à la synthèse** : toutes les passations partent au
   prompt (`route.ts:627-630`), quand l'orientation, elle, déduplique et
   recalcule (`orientationEngine.ts:611`, `orientationService.ts:86-115`) — les
   deux consommateurs du même dossier ne voient pas la même chose.
3. **Surinterprétations LLM constatées en production** : hypothèses
   psychologiques trop fortes sur une discordance, causalité suggérée depuis un
   score fonctionnel DNST, facteur de risque promu en « signal d'alerte
   médical », extrapolation mécanistique non sourcée. Causes racines :
   l'interdit de causalité n'existe que dans le corpus **éteint**
   (`corpusSyntheseV1.ts:32,44`), aucune taxonomie facteur de
   risque/symptôme/dépistage, validation de sortie par **coercion jamais rejet**
   (`anthropic.ts:446-461`), aucun niveau de preuve dans le schéma de sortie.
4. **Moteur de contradictions absent** : le type `DiscordanceFinding` existe
   (`clinical-engine/types.ts:199-207`) mais aucun producteur ; aucun croisement
   inter-instruments nulle part.
5. **L'orientation ne sait qu'allumer** : aucune règle d'extinction ni de
   rétrogradation ; `dejaRepondu` est décoratif (`orientationEngine.ts:675-686`) ;
   pas de charge patient ni de gain d'information (« PAS DE PLAFOND GLOBAL »,
   `orientationEngine.ts:713-715`) ; le SCOFF n'est cible d'aucune règle.
6. **Aucune règle d'arrêt d'exploration** (« information suffisante ») ; la seule
   abstention est décisionnelle et vaut toujours `not_evaluated` en production.
7. **Chaîne décisionnelle C1 débranchée** : `buildClinicalReview` appelé sans
   règles, `buildDecisionCard` sans candidats
   (`api/praticien/cockpit/route.ts:196-206`) → décision toujours bloquée,
   protocole 100 % manuel. `POST /api/praticien/protocoles/versions` accepte
   `episode` et `decisionCard` du client sans recalcul serveur
   (`versions/route.ts:54-58,101-104`).
8. **T0 sans précondition, unique et irréversible** : confirmable sur dossier
   vide (`EpisodeConfirmationPanel.tsx:38-42`) ; id d'épisode déterministe +
   `upsert(update:{})` → un seul cycle par patient pour toujours ; aucune UI
   pour confirmer J21/J42/J90 (seul `T0` est câblé,
   `ClinicalRuntimeSection.tsx:198,234`) — la carte `jalon_j21` est insoluble
   depuis l'interface.
9. **Momentum monodimensionnel** : delta d'un seul scalaire (« Mon Équilibre »)
   entre T0 et le dernier jalon, sans bande de bruit (`momentum.ts:36-46`) ;
   la plainte patient n'a **aucun canal** (`Q_PLAINTES` hors `BESOIN_SOURCES`,
   `plaintes.ts:14`) ; `patientContext` transporté mais lu par personne ;
   ni poids, ni digestion, ni activité, ni sommeil en axes propres.
10. **Biologie : schéma complet, exécution nulle** : 12 tables `Biology*` bien
    conçues (claims obligatoires) mais catalogue vide (0 INSERT hors NABM),
    aucune route, aucun moteur de statuts, aucune saisie de résultats (gate HDS,
    `featureFlag.ts:30-31` sans appelant), aucun courrier médecin généré.
11. **Rien entre « recommander » et « bloquer »** : aucun statut
    `non indiqué actuellement` / `attendre la biologie` / `différé` nulle part.
12. **Structures écrites jamais branchées** (gisement pour la campagne) :
    `ProtocolReviewFlag` (jamais persisté), `DecisionCounterfactual`,
    `ClinicalRuleRef` (aucun producteur), `QuestionnairePackTrigger` (table
    morte), `trajectoireIntentions.ts` (aucun appelant), `payload` d'épisode
    (écrit, jamais relu), comparateur multi-cycles et cohorte cabinet
    (inatteignables).

## Ce qui fonctionne et doit être préservé

- Doctrine « la couche déterministe décide ; le LLM formule » écrite et
  largement tenue (`orientationRulesV1.ts:15-17`).
- Vigilances déterministes fusionnées en tête de synthèse, non censurables
  (`route.ts:276-286`).
- Triple porte praticien sur le protocole : sélection `practitioner` → revue →
  approbation de diffusion, caduque à chaque révision (`diffusion.ts:26-81`).
- Séparation praticien/patient portée par les types
  (`documents/depuisSynthese.ts:28-36`) ; narratif patient sans scores ni
  vocabulaire anxiogène.
- Gouvernance de l'orientation (claims versionnés, signature, SHA-256, double
  verrou fail-closed) — patron à répliquer pour contradictions, stop rules,
  candidats, biologie.
- `versionScore` et ses gardes de comparabilité longitudinale.
- Append-only et hashes d'intégrité sur toute la chaîne clinique.

## Décisions de cadrage actées (brainstorming post-audit)

- **T0 = point de décision, pas de complétude.** Conditions dures : premier
  rideau complet et valide + anamnèse consignée + synthèse validée. Conditions
  souples contournables avec justification tracée. Biologie, agendas et journal
  ne sont **pas** des prérequis : ce sont des instruments de la phase 1 post-T0.
- **Assistance en couches** : le déterministe produit candidats, interdits,
  statuts conditionnels et contradictions ; le LLM formule ; le praticien
  valide (portes existantes inchangées).
- **La biologie arrive après T0 et c'est le cas nominal** : T0 fige la mesure,
  pas l'intervention ; le retour de bilan déclenche une **révision** du
  protocole (nouvelle version append-only, re-validation).
- **Compléments avant biologie : autorisés sur claims valides** — règle C4
  validée avec grade de preuve + sécurité catalogue + déclencheur clinique
  (jamais un score DNST seul) + validation praticien ; statut
  `conditionnelle_biologie` avec `waitFor` quand la règle l'exige ; la biologie
  confirme ou infirme, la révision résout.
- **Arbitrage biologique sans valeurs** (V1, verrou HDS maintenu) : le praticien
  consigne son verdict (confirme/infirme/sans objet + note), aucune valeur
  d'analyse stockée.
- **T1/T2 = T0 de cycles suivants** (re-ancrage), pas des jalons
  supplémentaires ; J21/J42/J90 restent les jalons intra-cycle. Le déblocage
  multi-cycle est un chantier ultérieur nommé.
- **Domaines d'intervention** : les 8 types d'action existants + `observation`
  (agendas/journal) + `medical_referral` (courrier médecin) à ajouter.
- **Sources de l'intervention** : claims NNPP2/SIIN, scores certifiés, anamnèse
  et drapeaux, plainte/priorité patient (canal à brancher), agendas, biologie
  (catalogue à peupler), catalogue compléments C4, check-ins (révision
  uniquement, jamais mesure).

## Priorisation issue de l'audit

- **P0 (sécurité clinique)** : statut de validité par passation + filtre unifié ;
  déduplication ; interdit de causalité et taxonomie dans le prompt vivant ;
  validation stricte de sortie ; moteur de contradictions minimal ; recalcul
  serveur de la chaîne snapshot→review→decisionCard ; tests de régression
  (donnée invalidée, signal non confirmé, discordance stress).
- **P1 (valeur clinique)** : préconditions T0 ; stop rules et extinction ;
  candidats déterministes ; protocole structuré et compléments sur claims ;
  biologie opérante et boucle de révision ; jalons J21/J42/J90 et momentum par
  domaine.
- **P2/P3 (ultérieur)** : hypothèses cliniques persistées et evidence graph,
  information gain et charge patient, multi-cycle, saisie de valeurs
  biologiques (décision HDS), extension du journal alimentaire
  (faim/satiété/digestion), social jet lag de l'agenda sommeil.
