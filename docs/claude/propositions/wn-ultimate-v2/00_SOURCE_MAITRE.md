---
id: "wellneuro-source-maitre-moteur-clinique-v2"
titre: "Source maître — moteur clinique WellNeuro"
version: "2.0"
statut: "canonique_propose_a_validation"
date_source_declaree: "2026-07-14"
integre_le: "2026-07-13"
statut_integration: "proposition_non_executable_a_valider"
---

# Source maître — moteur clinique WellNeuro

## 1. Finalité du produit

WellNeuro est un environnement d’aide au raisonnement et au suivi en neuronutrition. Il ne doit être ni un simple collecteur de questionnaires, ni un générateur de texte, ni un catalogue autonome de produits.

Le produit central est une **décision de phase courte**, sobre, explicable, révisable et validée par le praticien.

```text
Comprendre
→ qualifier ce qui est mesuré
→ montrer ce qui manque
→ repérer les discordances et risques
→ choisir une priorité
→ proposer trois actions maximum
→ suivre pendant 21 jours
→ réévaluer
```

## 2. Architecture clinique cible

```text
A. Collecte
   questionnaires, fiche signalétique, anamnèse, traitements,
   compléments, objectifs, contraintes, journal, check-ins

B. Mesures et moteurs existants
   scoring des questionnaires
   Mon équilibre
   cinq objets cliniques
   momentum
   vigilances déterministes
   analyses du journal alimentaire

C. ClinicalSnapshot
   photographie immuable, datée, versionnée et sourcée

D. Qualification
   ClinicalSignals
   MissingDataRequirements
   ClinicalDiscordances
   SafetyFindings
   abstention

E. Décision
   DecisionCard

F. Intervention
   InterventionIntents
   ProtocolDraft de 21 jours
   trois actions maximum
   plans idéal / minimal / secours

G. Validation et restitution
   validation praticien
   prévisualisation patient
   documents patient / praticien / médecin

H. Suivi
   check-ins J7/J14/J21
   journal alimentaire
   effet, tolérance, adhésion
   résumé J21
   nouveau snapshot
```

## 3. Répartition des responsabilités

### Déterministe

Le déterministe :

- calcule les scores ;
- normalise les polarités ;
- identifie les données manquantes ;
- applique les règles de sécurité ;
- repère les discordances explicites ;
- calcule la couverture et la comparabilité ;
- produit les candidats de décision ;
- bloque lorsque les conditions ne sont pas réunies.

### Corpus clinique

Le corpus :

- explique un mécanisme ;
- documente une règle ;
- précise une indication, une limite ou une précaution ;
- fournit des blocs d’intervention publiés ;
- conserve la provenance et la version.

### Intelligence artificielle

L’IA :

- structure des notes libres sous schéma ;
- reformule ;
- prépare plusieurs niveaux de lecture ;
- compose un document depuis des objets validés ;
- propose un brouillon clairement identifié.

Elle ne :

- remplace pas le scoring ;
- ne transforme pas une absence en zéro ;
- ne choisit pas seule une priorité ;
- n’invente pas une posologie ;
- n’arbitre pas une interaction ;
- ne valide pas un protocole ;
- ne diffuse pas sans autorisation.

### Praticien

Le praticien :

- valide ou modifie les findings sensibles ;
- arbitre les discordances ;
- accepte l’abstention ou demande des données ;
- valide la priorité ;
- sélectionne et adapte les actions ;
- autorise la diffusion ;
- décide de la phase suivante.

## 4. Principes non négociables

1. Aucune donnée absente n’est assimilée à zéro.
2. Chaque valeur porte date, version et provenance.
3. Les niveaux A/B/C/D qualifient la mesure patient, pas la force scientifique universelle d’un claim.
4. Les claims du corpus possèdent leur propre classe d’autorité et leur propre statut de validation.
5. Un score ne déclenche jamais directement un produit ou un protocole.
6. Une priorité principale et trois actions maximum en phase 1.
7. Une action importante possède un plan idéal, minimal et de secours.
8. La charge thérapeutique excessive bloque la diffusion ou exige une justification.
9. Les données manquantes et discordances apparaissent avant la recommandation.
10. Le système peut s’abstenir.
11. Les points d’étape J7/J14/J21 ne recalculent pas Mon équilibre.
12. Les jalons de mesure T0/J21/J42/J90 restent séparés des check-ins.
13. Le journal ne reconstruit pas les scores officiels des questionnaires SIIN.
14. La Boussole ne décide pas seule de la priorité clinique.
15. Le RAG n’accède jamais aux PDF bruts non publiés.
16. Aucune migration Prisma/SQL sans confirmation distincte.
17. Aucune donnée patient réelle dans NotebookLM ou les fixtures.
18. Vocabulaire UI : recommandation, protocole personnalisé, explorations à discuter ; jamais diagnostic, prescription ou ordonnance.

## 5. Objet pivot : ClinicalSnapshot

Le `ClinicalSnapshot` est la photographie commune utilisée par le cockpit, la décision, la synthèse et les documents.

Il contient :

- identité technique du patient et de l’épisode ;
- contexte clinique normalisé ;
- résultats de questionnaires ;
- résultat Mon équilibre ;
- cinq objets cliniques ;
- momentum disponible ;
- vigilances ;
- trajectoire alimentaire disponible ;
- qualité, fraîcheur et comparabilité ;
- versions des moteurs et du corpus ;
- hash des entrées.

Le snapshot ne choisit pas la priorité. Il garantit que tous les consommateurs lisent la même réalité.

## 6. Mon équilibre dans le système

Mon équilibre est le **moteur de mesure transversale des 12 besoins**.

Il produit :

- 12 couvertures par besoin ;
- trois strates Corps / Ancrage / Esprit ;
- pondération 60/20/20 ;
- indice global ;
- fondations critiques et plafonnement ;
- besoins non évaluables ;
- version du calcul.

Il ne produit pas :

- une DecisionCard ;
- un protocole ;
- un choix de complément ;
- un diagnostic ;
- un score d’adhésion ;
- un score alimentaire quotidien.

Formule canonique :

```text
Mon équilibre mesure.
Le moteur clinique qualifie et priorise.
Le protocole agit.
Le suivi vérifie.
```

## 7. Cinq objets cliniques

Les objets existants — indice global, clarté, réserve d’adaptation, stabilité métabolique et momentum — sont des **read models praticien**.

Ils :

- accélèrent la compréhension ;
- peuvent contribuer à un signal ;
- restent sourcés et versionnés ;
- ne déclenchent pas seuls une intervention.

Leurs formules doivent être enregistrées comme `ClinicalObjectDefinition`.

## 8. AssessmentEpisode

La V1 actuelle reconstruit un état depuis les dernières réponses disponibles à une date donnée. Pour éviter de mélanger des questionnaires très éloignés dans le temps, le système cible un `AssessmentEpisode` :

```text
T0 / J21 / J42 / J90
→ fenêtre de collecte
→ réponses incluses
→ statut de complétude
→ clôture
→ BalanceAssessment comparable
```

Tant que cet objet n’est pas persisté, le snapshot doit afficher la dispersion temporelle des sources.

## 9. De la mesure au signal

```text
score questionnaire
→ QuestionnaireFinding
→ mapping besoin / domaine
→ BalanceAssessment
→ règles de convergence, manque, discordance et sécurité
→ ClinicalSignal
```

Un signal porte :

- domaine ;
- direction ;
- intensité ;
- règle et version ;
- sources ;
- limites ;
- claims documentaires éventuels.

## 10. DecisionCard

La DecisionCard répond à :

- quelle priorité maintenant ?
- pourquoi ?
- quelles sources convergent ?
- qu’est-ce qui manque ?
- quelles discordances subsistent ?
- quels bloqueurs s’appliquent ?
- qu’est-ce qui pourrait faire changer d’avis ?
- que peut-on observer à J21 ?

Elle conserve les références de règles et de corpus.

## 11. ProtocolDraft

Le protocole de phase 1 contient :

- un objectif ;
- trois actions maximum ;
- charge thérapeutique ;
- plans idéal / minimal / secours ;
- critères observables ;
- précautions ;
- statut de validation ;
- liens vers les blocs d’intervention publiés.

Une action peut être alimentaire, rythmique, activité, apaisement, complément, exploration à discuter ou orientation.

## 12. Journal alimentaire

Le journal est une source longitudinale bornée de 21 jours.

Il produit :

- données de saisie ;
- couverture ;
- fiabilité ;
- observations par marqueur ;
- neuf axes V1 ;
- adhésion aux actions alimentaires ;
- projections prudentes vers les questionnaires ;
- `DietaryTrajectoryFinding`.

Il ne :

- compte pas les calories par défaut ;
- n’impose pas de pesée ;
- ne reconstitue pas un diagnostic ;
- ne produit pas le score officiel SIIN ;
- ne modifie pas quotidiennement Mon équilibre.

## 13. Boussole alimentaire

La Boussole sépare :

1. **déclaré** — questionnaires ;
2. **observé** — journal ;
3. **intrinsèque** — profil général d’un aliment ou d’une action ;
4. **contextuel** — pertinence pour la priorité validée du patient.

Elle est alimentée par :

- CIQUAL pour les nutriments ;
- Open Food Facts pour les produits ;
- corpus SIIN publié pour les mappings ;
- règles WellNeuro versionnées ;
- contexte patient et protocole actif.

## 14. Corpus SIIN

```text
Drive = archive brute
NotebookLM = atelier éditorial
GitHub Markdown/YAML = vérité clinique validée
Clinical Knowledge Compiler = transformation et contrôle
PostgreSQL + recherche hybride = runtime
Clinical Engine = calcul
LLM = formulation
Praticien = autorité finale
```

Aucun PDF brut non validé n’est interrogeable en production.

## 15. Restitution et UX

HC-F fournit les mécanismes :

- `ModeConsultation` ;
- `TwoLevelReading` ;
- `PrévisualisationPatient` ;
- rail sombre structurel et espace de travail clair ;
- états explicites de sauvegarde et validation.

Ces mécanismes affichent les objets cliniques ; ils ne les recalculent pas.

## 16. Cycle complet de 21 jours

```text
J0
AssessmentEpisode T0
ClinicalSnapshot
DecisionCard
ProtocolDraft validé
activation du programme

J1–J6
actions + journal facultatif selon protocole

J7
check-in très court

J8–J13
poursuite / adaptation validée

J14
check-in très court

J15–J20
poursuite

J21
check-in final
questionnaires de mesure prévus
clôture du journal
DietaryTrajectoryFinding
BalanceAssessment J21
PhaseReview
nouvelle décision
```

## 17. Définition de réussite

- compréhension praticien en moins de deux minutes ;
- préparation de phase en moins de dix minutes ;
- données manquantes visibles avant la décision ;
- trois actions maximum ;
- contenu patient calme ;
- provenance accessible ;
- suivi séparant effet, tolérance et adhésion ;
- comparaison uniquement si versions et fenêtres sont compatibles ;
- possibilité d’abstention ;
- aucune diffusion sans validation.
