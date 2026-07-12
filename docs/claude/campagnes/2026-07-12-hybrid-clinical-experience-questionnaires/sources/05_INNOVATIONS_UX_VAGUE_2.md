# Innovations UX — Vague 2

## 1. Finalité

Cette seconde vague complète Hybrid Clinical par des capacités qui transforment WellNeuro d'une application de gestion de questionnaires en environnement clinique de neuronutrition.

Elle repose sur une règle directrice :

> Chaque écran doit aider à comprendre, décider ou agir. Tout élément qui ne remplit aucune de ces fonctions doit être retiré, regroupé ou relégué.

Les innovations décrites ici ne sont pas toutes à implémenter simultanément. Elles doivent être classées, prototypées, testées et livrées progressivement, sans détourner la campagne de ses fondations : alignement, hiérarchie, accessibilité, sécurité clinique et expérience patient.

## 2. Principes communs

- Le patient reste l'unité principale du travail clinique ; les modules sont des vues transversales.
- La première lecture doit être synthétique ; la lecture experte reste accessible à la demande.
- L'interface doit expliciter la prochaine décision ou action utile.
- Les données, hypothèses, propositions IA, validations humaines et actions envoyées doivent être visuellement distinctes.
- Une innovation n'est retenue que si elle réduit la charge cognitive, le risque d'erreur ou le nombre d'étapes.
- Aucun effet graphique ne doit masquer l'incertitude clinique.
- Toute interaction complexe doit avoir une alternative clavier, tactile et textuelle.
- Les animations expliquent un changement d'état ; elles ne décorent pas.

## 3. Priorité P1 — Expérience clinique structurante

### 3.1 Mode consultation sans distraction

Créer un état de l'interface adapté à la consultation en cours :

- navigation secondaire réduite ;
- en-tête patient persistant ;
- motif, attentes et signal principal ;
- alertes et vigilances ;
- synthèse courte ;
- questionnaires récents ;
- notes de consultation ;
- prochaine décision ;
- action explicite de clôture ou préparation de la suite.

Le mode consultation ne doit pas créer un second dossier patient. Il s'agit d'une composition focalisée des mêmes données et actions.

Critères :

- activation et sortie explicites ;
- aucune donnée perdue ;
- raccourci vers la fiche complète ;
- fonctionnement sur tablette ;
- pas d'enregistrement audio ou transcription implicite.

### 3.2 Double niveau de lecture

Chaque surface clinique dense doit distinguer :

**Lecture immédiate**

- ce qui est important ;
- ce qui a changé ;
- ce qui nécessite une décision ;
- ce qui manque ou doit être vérifié.

**Lecture experte**

- scores et sous-scores ;
- réponses sources ;
- règles de calcul ;
- historique ;
- sources et niveau de preuve ;
- qualité et limites des données.

La lecture experte est accessible par progressive disclosure, onglet ou drawer, sans être chargée par défaut.

### 3.3 Timeline clinique longitudinale

La timeline devient la colonne vertébrale temporelle du dossier :

- consultations ;
- questionnaires ;
- synthèses ;
- explorations biologiques suggérées et résultats reçus ;
- protocoles et phases de 21 jours ;
- compléments ;
- documents ;
- demandes de correction ;
- changements significatifs.

Règles :

- distinguer événement, décision et résultat ;
- regrouper les événements de faible importance ;
- filtrer par catégorie ;
- ne pas dépendre du survol ;
- toujours afficher une date ou période ;
- ne pas inventer une chronologie à partir de données absentes.

### 3.4 Carte de décision clinique

Toute proposition importante peut être représentée par une carte structurée :

- décision ou priorité proposée ;
- justification ;
- données contributives ;
- niveau de confiance ;
- limites et données manquantes ;
- source de la proposition : règle, IA, praticien ;
- actions `Valider`, `Modifier`, `Reporter` ou `Écarter` selon le contexte.

Une carte de décision ne doit jamais exécuter automatiquement une prescription ou un envoi.

### 3.5 Comparateur avant / maintenant

Pour les réévaluations et phases de 21 jours :

- valeur ou état initial ;
- valeur ou état actuel ;
- évolution absolue et, si pertinent, relative ;
- date et contexte des mesures ;
- améliorations, stabilité et dégradations ;
- commentaire clinique.

Interdits :

- présenter une variation non comparable comme un progrès ;
- utiliser uniquement le vert ou le rouge ;
- extrapoler une tendance avec trop peu de points ;
- masquer les changements de questionnaire, unité ou conditions de mesure.

### 3.6 Prévisualisation permanente de la vue patient

Depuis une synthèse, un protocole, un document ou un message, permettre :

- `Voir ce que recevra le patient` ;
- comparaison praticien/patient ;
- contrôle du langage ;
- contrôle mobile ;
- distinction claire entre données internes et contenu partagé.

La prévisualisation doit utiliser le vrai composant patient ou une représentation contractuellement équivalente, pas une maquette divergente.

## 4. Priorité P2 — Productivité et sécurité du praticien

### 4.1 Palette de commandes

Une palette `Ctrl/Cmd + K` peut accélérer :

- ouverture d'un patient ;
- création d'un patient ;
- assignation d'un pack ;
- génération ou ouverture d'une synthèse ;
- demandes de correction ;
- démarrage d'une phase de 21 jours ;
- navigation vers une fonction.

Règles :

- ne remplace pas la navigation visible ;
- résultats limités aux droits réels ;
- aucune action destructive immédiate ;
- libellés français ;
- historique local non sensible ou désactivé ;
- recherche globale réellement fonctionnelle avant affichage.

### 4.2 Constructeur visuel de protocoles 21 jours

Composer les phases à partir de cartes d'intervention :

- objectif ;
- moment ;
- fréquence ;
- durée ;
- priorité ;
- vigilance et contre-indications ;
- statut proposé, validé ou envoyé.

Le glisser-déposer peut être proposé sur desktop, mais chaque déplacement doit aussi être disponible par boutons et clavier. Le builder ne doit pas contourner les validations cliniques ni transformer l'application en outil e-commerce.

### 4.3 Vues opérationnelles enregistrées

Prévoir des vues utiles, initialement fixes :

- à traiter aujourd'hui ;
- questionnaires terminés ;
- synthèses à valider ;
- demandes de correction ;
- protocoles arrivant à échéance ;
- absence d'activité prolongée.

La personnalisation complète ne vient qu'après preuve du besoin. Les filtres doivent rester explicites et réinitialisables.

### 4.4 Prévention des erreurs et réversibilité

- distinguer `Enregistrer`, `Valider` et `Envoyer` ;
- protéger les actions irréversibles ;
- permettre l'annulation immédiate lorsqu'elle est sûre ;
- conserver un historique de validation ;
- signaler les données incomplètes ;
- afficher clairement le statut brouillon ;
- ne pas placer une suppression directe dans une ligne dense.

### 4.5 États vides actionnables

Un état vide doit expliquer :

- pourquoi la zone est vide ;
- si cela est normal ;
- quelle est la prochaine action possible ;
- quelles conditions sont nécessaires.

Exemple : `Aucune synthèse. Les questionnaires requis sont terminés. Générer le premier brouillon.`

### 4.6 Densité contextuelle

La densité est définie par le métier de l'écran :

- dashboard : synthétique ;
- annuaire : moyenne ou experte ;
- fiche patient : progressive ;
- mode consultation : calme ;
- configuration : experte ;
- portail patient : faible.

Éviter un réglage global compact/confortable qui multiplierait les variantes sans bénéfice clinique démontré.

## 5. Priorité P2 — Expérience et confiance patient

### 5.1 Résumé de session patient

À chaque retour, afficher ce qui a changé :

- questionnaires transmis ;
- réception confirmée ;
- correction demandée ;
- analyse en cours ;
- prochaine action du patient.

Ne pas promettre de délai non maîtrisé ni exposer les étapes internes inutiles.

### 5.2 Confort de lecture

Un contrôle simple peut proposer :

- texte agrandi ;
- espacement renforcé ;
- réduction des animations ;
- contraste renforcé si nécessaire.

Limiter le nombre de réglages. Les préférences peuvent être locales sans migration, sous réserve qu'elles ne contiennent aucune donnée clinique.

### 5.3 État de sauvegarde et connexion

Toujours rendre compréhensible :

- sauvegarde locale ou serveur ;
- dernière sauvegarde réussie ;
- mode hors connexion ou connexion instable ;
- reprise possible ;
- transmission finale réussie ou non.

Ne pas afficher `Enregistré` lorsque seule une écriture locale non synchronisée a eu lieu. Les libellés doivent distinguer clairement `conservé sur cet appareil` et `transmis`.

### 5.4 Formulaires adaptatifs à la complexité

Au-delà des profils de questionnaire :

- petits groupes pour questions simples ;
- grille compacte uniquement pour répétitions comparables ;
- révélation progressive des conditionnels ;
- chronologie pour histoire des symptômes ;
- cartes répétables pour traitements et compléments ;
- carte corporelle avec alternative textuelle ;
- navigation par sections sur les formulaires longs.

L'adaptation dépend de la nature de la donnée, jamais d'un effet aléatoire ou ludique.

### 5.5 Cohérence éditoriale

Créer un lexique UX WellNeuro distinguant :

- vocabulaire praticien ;
- vocabulaire patient ;
- termes interdits ou à reformuler ;
- messages d'erreur ;
- confirmations ;
- statuts.

Côté patient, préférer `questionnaire proposé`, `réponses transmises`, `préparation de votre bilan` et `reprendre là où vous vous êtes arrêté` à des termes techniques internes.

## 6. Priorité P3 — Capacités à préparer sans bloquer la V1

- recherche globale étendue aux patients, questionnaires, documents et protocoles ;
- personnalisation avancée du dashboard ;
- carte corporelle riche ;
- visualisations biologiques longitudinales avancées ;
- assistant IA contextuel avec sources ;
- véritables tests adaptatifs CAT, uniquement avec banque calibrée et campagne psychométrique distincte.

Ces capacités doivent être prévues dans l'architecture, mais pas implémentées prématurément.

## 7. Motion et micro-interactions

Autorisé :

- ouverture d'un drawer ;
- déplacement explicite d'une intervention ;
- confirmation d'enregistrement ;
- changement de statut ;
- progression ;
- apparition d'une nouvelle priorité.

À éviter :

- cartes flottantes ;
- gradients animés ;
- compteurs décoratifs ;
- animations longues ;
- effets parallaxe ;
- mouvement indispensable à la compréhension.

Toujours respecter `prefers-reduced-motion`.

## 8. Sémantique des couleurs

- teal : action et navigation ;
- gold : progression, étape franchie ou repère premium rare ;
- vert : succès ou amélioration confirmée ;
- orange : attention ;
- rouge : danger, erreur ou destruction ;
- violet : catégorie clinique existante explicitement documentée.

Une surface clinique ne doit jamais être entièrement colorée sans nécessité. Préférer indicateur, bordure ou icône.

## 9. Matrice de priorisation

| Capacité | Priorité | Valeur | Risque | Lot principal |
|---|---:|---|---|---|
| Mode consultation | P1 | concentration praticien | moyen | LOT-03 |
| Double niveau de lecture | P1 | réduction de charge | faible | LOT-03 |
| Timeline clinique | P1 | compréhension longitudinale | moyen | LOT-03 |
| Carte de décision | P1 | explicabilité et validation | moyen | LOT-03 |
| Avant / maintenant | P1 | suivi 21 jours | moyen | LOT-03 |
| Prévisualisation patient | P1 | qualité de communication | faible à moyen | LOT-03/04 |
| Palette de commandes | P2 | vitesse expert | faible | LOT-02 |
| Builder protocoles | P2 | structuration 21 jours | élevé | LOT-03, éventuellement campagne dédiée |
| Résumé de session patient | P2 | confiance | faible | LOT-04 |
| Confort de lecture | P2 | accessibilité | faible | LOT-04 |
| Sauvegarde/connexion explicite | P2 | confiance et reprise | moyen | LOT-04/05 |
| États vides actionnables | P2 | guidage | faible | LOT-03/04 |
| Lexique éditorial | P2 | cohérence | faible | LOT-07 |
| CAT réel | P3 | optimisation mesure | très élevé | campagne séparée |

## 10. Stratégie de livraison

1. Prototyper le mode consultation, la carte de décision et la timeline avec les patients fictifs autorisés.
2. Valider la hiérarchie et les interactions avant connexion métier complète.
3. Implémenter le double niveau de lecture et les états vides avec les primitives communes.
4. Ajouter le résumé de session patient, le confort de lecture et les états de sauvegarde.
5. Évaluer le constructeur 21 jours dans C1 ou une campagne dédiée, selon l'état du moteur décisionnel.
6. Documenter les capacités différées et leurs prérequis.

## 11. Definition of Done de la vague 2

- Les cinq capacités P1 disposent d'un contrat UX et d'un arbitrage d'implémentation.
- Au moins le mode consultation, la carte de décision et la timeline sont prototypés avant code métier profond.
- Les états vides, erreurs, sauvegardes et confirmations utilisent un langage cohérent.
- Le portail patient explique ce qui a changé et ce qu'il doit faire ensuite.
- Toute visualisation avant/après indique dates, comparabilité et limites.
- La prévisualisation patient ne divulgue aucune donnée réservée au praticien.
- Les capacités P3 restent explicitement hors périmètre ou dans un backlog gouverné.
