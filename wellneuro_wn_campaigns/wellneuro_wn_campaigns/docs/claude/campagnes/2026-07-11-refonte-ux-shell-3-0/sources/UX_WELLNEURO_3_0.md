# WellNeuro — Synthèse UX/UI 3.0 et perspectives 4.0

**Statut :** document de cadrage et de brainstorming  
**Date :** 11 juillet 2026  
**Périmètre :** front-end praticien, front-end patient, responsive design, portabilité mobile, interactions tactiles, organisation des dashboards  
**Hors périmètre :** implémentation, migration Prisma/SQL, modification des données, refonte métier

---

## 1. Finalité du document

Ce document formalise une direction UX/UI pour faire évoluer WellNeuro vers une interface :

- plus légère visuellement ;
- plus rapide à parcourir ;
- mieux adaptée aux usages cliniques quotidiens ;
- cohérente entre ordinateur, tablette et mobile ;
- indépendante des interactions au survol de la souris ;
- compatible avec les futurs modules de synthèse IA, biologie, protocoles 21 jours, compléments alimentaires et documents patients.

L’objectif n’est pas de remplacer immédiatement l’existant, mais de définir une cible progressive :

- **WellNeuro 3.0** : simplification, hiérarchisation, responsive design et cohérence des interactions ;
- **WellNeuro 4.0** : cockpit clinique augmenté, longitudinal et orienté aide à la décision.

---

## 2. Synthèse du diagnostic actuel

### 2.1. Points solides

L’application dispose déjà de plusieurs fondations pertinentes :

- séparation claire entre portail praticien et portail patient ;
- architecture Next.js App Router compatible avec des shells d’interface distincts ;
- design system initial autour du **deep teal**, du **champagne gold** et d’un thème patient clair ;
- composants de scores et de visualisation déjà amorcés ;
- logique de packs et d’assignations de questionnaires ;
- parcours patient multi-questionnaires fonctionnel ;
- premiers éléments de progression et de priorisation ;
- bonne compatibilité intrinsèque de plusieurs champs radio grâce à des zones entièrement cliquables.

### 2.2. Limites principales

#### Dashboard praticien encore linéaire

Le dashboard actuel fonctionne davantage comme une page de sommaire que comme un véritable poste de pilotage clinique. Les informations sont empilées verticalement et la hiérarchie entre :

- ce qui est urgent ;
- ce qui nécessite une action ;
- ce qui est simplement informatif ;

reste insuffisamment marquée.

#### Navigation horizontale peu extensible

La barre supérieure actuelle convient à un nombre réduit de modules, mais devient moins adaptée à mesure que WellNeuro intègre :

- les patients ;
- les questionnaires ;
- les packs ;
- les synthèses IA ;
- les bilans biologiques ;
- les protocoles ;
- les compléments alimentaires ;
- les documents et booklets ;
- les paramètres et règles cliniques.

Une navigation horizontale finit alors par se tasser, perdre en lisibilité ou nécessiter des menus secondaires.

#### Page Patients trop polyvalente

La page Patients regroupe actuellement plusieurs usages distincts :

- consultation de l’annuaire ;
- création d’un patient ;
- création d’un pack ;
- assignation de questionnaires ;
- consultation des assignations ;
- édition et actions secondaires.

Cette concentration alourdit la page et rend son adaptation mobile difficile.

#### Dépendance partielle au survol

Certaines informations ou aides sont encore associées à des comportements de type :

- `hover` ;
- attribut `title` ;
- tooltip uniquement visible à la souris ;
- actions révélées au survol d’une ligne.

Ces comportements ne sont pas fiables sur mobile et peuvent être difficiles à utiliser sur tablette.

#### Incohérence du thème patient

Le portail patient utilise encore localement des couleurs bleues et grises codées directement, alors que la charte cible prévoit une expérience :

- plus chaleureuse ;
- plus rassurante ;
- centrée sur le teal, le crème et les accents gold ;
- distincte de l’environnement praticien sombre.

---

## 3. Vision produit UX

### 3.1. Principe directeur praticien

Le praticien ne doit pas avoir à chercher ce qui nécessite son attention.

Le dashboard doit répondre immédiatement à trois questions :

1. **Que dois-je traiter aujourd’hui ?**
2. **Quels patients nécessitent une décision ou une validation ?**
3. **Quelle est la prochaine action la plus utile ?**

### 3.2. Principe directeur patient

Le patient ne doit pas avoir à comprendre l’architecture interne de l’application.

Son interface doit répondre à trois questions simples :

1. **Où en suis-je ?**
2. **Que dois-je faire maintenant ?**
3. **Que se passera-t-il ensuite ?**

### 3.3. Principe directeur mobile

Aucune action importante et aucune information clinique ne doit dépendre exclusivement :

- du survol ;
- d’une très petite icône ;
- d’un tableau horizontal ;
- d’un menu inaccessible au pouce ;
- d’un geste caché non expliqué.

---

## 4. Architecture cible WellNeuro 3.0

### 4.1. Shell praticien desktop

La cible recommandée repose sur trois zones persistantes :

1. **Rail de navigation gauche** ;
2. **Barre de commande supérieure** ;
3. **Zone centrale de travail**.

```text
┌────────────────────────────────────────────────────────────────────┐
│ Recherche globale · Action rapide · Notifications · Profil         │
├──────┬─────────────────────────────────────────────────────────────┤
│  WN  │                                                             │
│  ⌂   │  Zone de travail                                            │
│  👥  │                                                             │
│  🧭  │  Dashboard / Patients / Synthèse / Biologie / Protocoles    │
│  📦  │                                                             │
│  ✨  │                                                             │
│  🧪  │                                                             │
│  ⚙   │                                                             │
└──────┴─────────────────────────────────────────────────────────────┘
```

#### Comportement du rail

- largeur compacte par défaut ;
- icône toujours visible ;
- libellé visible lors de l’expansion ;
- état actif immédiatement identifiable ;
- badges uniquement pour les alertes utiles ;
- aucune information indispensable uniquement au survol.

#### Navigation recommandée

| Icône | Libellé | Fonction principale |
|---|---|---|
| Accueil | Accueil | Priorités, activité, raccourcis |
| Patients | Patients | Annuaire et fiches patients |
| Cartographie | Équilibre | 12 besoins, scores, priorités |
| Packs | Packs | Création et gestion des packs |
| IA | Synthèses IA | Synthèses, relectures, documents |
| Biologie | Biologie | Bilans, prescriptions, résultats |
| Paramètres | Paramètres | Modèles, sécurité, compte |

Les icônes doivent être accompagnées de libellés accessibles aux lecteurs d’écran.

### 4.2. Shell tablette

Sur tablette paysage :

- conserver le rail gauche compact ;
- réduire les marges latérales ;
- afficher une ou deux colonnes selon la largeur ;
- ouvrir les formulaires dans un panneau latéral pleine hauteur.

Sur tablette portrait :

- rail rétractable ;
- accès par bouton menu explicite ;
- navigation principale disponible sans survol ;
- cartes à une seule colonne.

### 4.3. Shell mobile

Sur mobile, le rail gauche ne doit pas être conservé tel quel. La cible recommandée est une **navigation basse** limitée aux sections prioritaires.

```text
┌──────────────────────────────┐
│ Titre · Recherche · Profil   │
├──────────────────────────────┤
│                              │
│ Contenu                      │
│ Cartes et actions            │
│                              │
├──────────────────────────────┤
│ Accueil Patients IA Plus     │
└──────────────────────────────┘
```

Navigation basse praticien proposée :

- Accueil ;
- Patients ;
- Synthèses ;
- Plus.

Le menu **Plus** ouvre une bottom sheet contenant :

- Packs ;
- Équilibre ;
- Biologie ;
- Paramètres.

---

## 5. Dashboard praticien 3.0

### 5.1. Rôle du dashboard

Le dashboard ne doit pas devenir une page de formulaires. Il doit rester un poste de pilotage.

Les actions détaillées doivent être déplacées vers :

- un panneau latéral ;
- une page dédiée ;
- un assistant en plusieurs étapes ;
- une action contextuelle dans la fiche patient.

### 5.2. Structure proposée

```text
Accueil praticien

[Recherche globale : patient, questionnaire, synthèse...]

┌──────────────────────────────────────────────────────────────┐
│ PRIORITÉS DU JOUR                                            │
│ 3 patients nécessitent une action                            │
│ [Voir les priorités]                                         │
└──────────────────────────────────────────────────────────────┘

┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│ Patients   │ │ À traiter  │ │ Synthèses  │ │ Documents  │
│ 42         │ │ 8          │ │ 3          │ │ 5          │
└────────────┘ └────────────┘ └────────────┘ └────────────┘

┌─────────────────────────────┐ ┌─────────────────────────────┐
│ Patients à traiter          │ │ Activité récente            │
│ Sophie Nicola               │ │ Pack envoyé                 │
│ Jennifer Martin             │ │ Synthèse générée            │
│ Michel Dogné                │ │ Réponses complétées         │
└─────────────────────────────┘ └─────────────────────────────┘
```

### 5.3. Hiérarchie des cartes

#### Carte priorité

Doit afficher :

- type d’action ;
- patient concerné ;
- niveau de priorité ;
- délai éventuel ;
- action principale unique.

#### Cartes métriques

Limiter les métriques visibles à celles qui déclenchent une décision :

- patients actifs ;
- questionnaires en attente ;
- synthèses à valider ;
- demandes de modification ;
- bilans ou documents prêts.

Les métriques purement statistiques peuvent être placées dans une vue secondaire.

#### Activité récente

Afficher une chronologie courte :

- pack assigné ;
- questionnaire terminé ;
- synthèse générée ;
- bilan validé ;
- protocole publié.

---

## 6. Annuaire patients 3.0

### 6.1. Séparer les usages

La section Patients doit être divisée conceptuellement en :

- annuaire ;
- création ;
- assignation ;
- gestion des packs ;
- activité récente.

### 6.2. Desktop : vue hybride

Deux modes possibles :

- **cartes**, pour la lecture clinique et l’action ;
- **tableau**, pour la densité et les opérations administratives.

L’utilisateur peut conserver son dernier mode choisi.

#### Exemple carte patient

```text
┌─────────────────────────────────────────┐
│ Sophie Nicola                           │
│ Suivi actif · Dernière activité : hier  │
│                                         │
│ 2 questionnaires en attente             │
│ Priorité : sommeil et adaptation        │
│                                         │
│ [Ouvrir la fiche]  [Assigner]  [⋯]      │
└─────────────────────────────────────────┘
```

#### Exemple tableau desktop

Colonnes recommandées :

- patient ;
- statut du parcours ;
- dernière activité ;
- prochaine action ;
- priorité ;
- menu actions.

Éviter d’afficher simultanément toutes les informations administratives et cliniques.

### 6.3. Mobile : cartes obligatoires

Sur mobile :

- pas de tableau horizontal par défaut ;
- une carte par patient ;
- action principale visible ;
- actions secondaires dans un menu `⋯` ;
- filtres dans une bottom sheet ;
- recherche persistante en haut.

### 6.4. Création d’un patient

La création ne doit plus occuper une section permanente du dashboard.

Cible :

- bouton **Nouveau patient** ;
- panneau latéral sur desktop ;
- écran plein sur mobile ;
- validation en une seule étape lorsque les données sont minimales ;
- messages d’erreur proches des champs concernés.

Toute donnée de démonstration doit utiliser exclusivement :

- Sophie Nicola ;
- Jennifer Martin ;
- Michel Dogné.

---

## 7. Fiche patient praticien 3.0

### 7.1. En-tête patient

L’en-tête doit rester visible ou facilement accessible et contenir :

- identité ;
- statut du suivi ;
- dernière activité ;
- action principale ;
- actions secondaires.

```text
Sophie Nicola
Suivi actif · Dernière réponse : 10 juillet 2026

[Assigner] [Générer une synthèse] [⋯]
```

### 7.2. Onglets proposés

- Vue clinique ;
- Questionnaires ;
- Mon équilibre ;
- Biologie ;
- Protocoles ;
- Documents.

Sur mobile, les onglets peuvent devenir :

- un sélecteur déroulant ;
- une barre horizontale scrollable avec indicateur clair ;
- ou un menu de section.

### 7.3. Vue clinique

```text
┌──────────────────────┐ ┌──────────────────────────────────┐
│ Indice global         │ │ Priorités actuelles              │
│ Score + tendance      │ │ 1. Sommeil                       │
│ Momentum              │ │ 2. Stress et adaptation          │
└──────────────────────┘ └──────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ Timeline clinique                                          │
│ Questionnaires → synthèse → biologie → protocole → suivi  │
└────────────────────────────────────────────────────────────┘
```

### 7.4. Progressivité de l’information

La fiche ne doit pas afficher tout le détail technique immédiatement.

Niveaux de lecture recommandés :

1. synthèse courte ;
2. signaux prioritaires ;
3. détails par besoin ;
4. réponses sources ;
5. règles de calcul et références.

Ce mécanisme réduit la surcharge sans masquer la traçabilité.

---

## 8. Portail patient 3.0

### 8.1. Positionnement visuel

Le portail patient doit évoquer :

- un accompagnement ;
- une progression ;
- une interface calme ;
- une lecture accessible ;
- un espace de confiance.

Direction graphique :

- fond crème ou très clair ;
- cartes blanches ;
- teal comme couleur principale ;
- champagne gold pour les étapes franchies ou les accents ;
- rouge réservé aux erreurs et alertes réelles ;
- langage non technique.

### 8.2. Accueil patient

```text
Bonjour Sophie

┌──────────────────────────────────────┐
│ Votre parcours                       │
│ 2 questionnaires restants            │
│ Progression : ██████░░ 70 %          │
└──────────────────────────────────────┘

À faire maintenant
┌──────────────────────────────────────┐
│ Mes plaintes actuelles               │
│ 7 questions · environ 3 minutes      │
│ [Continuer]                          │
└──────────────────────────────────────┘

Ensuite
- Mode de vie
- Habitudes alimentaires
- Mon équilibre
```

### 8.3. Timeline patient

```text
1. Consentement              Terminé
2. Plaintes actuelles        En cours
3. Mode de vie               À faire
4. Alimentation              À faire
5. Analyse praticien         À venir
6. Mon équilibre             À venir
```

Chaque étape doit préciser :

- son statut ;
- son objectif ;
- sa durée estimée ;
- l’action disponible.

### 8.4. Questionnaire mobile

Principes :

- une question ou un petit groupe cohérent par écran ;
- réponses entièrement cliquables ;
- bouton Suivant facilement accessible au pouce ;
- bouton Précédent secondaire ;
- progression visible ;
- sauvegarde automatique clairement indiquée ;
- aucun tooltip indispensable ;
- texte suffisamment grand ;
- contraste élevé ;
- gestion explicite des erreurs de connexion.

#### Navigation basse du questionnaire

```text
┌──────────────────────────────────────┐
│ Question 4 sur 12                    │
│                                      │
│ Contenu de la question               │
│                                      │
│ Réponses                             │
├──────────────────────────────────────┤
│ [Précédent]               [Suivant]  │
└──────────────────────────────────────┘
```

Les boutons peuvent être rendus persistants en bas de l’écran, en tenant compte des zones sûres iOS et Android.

---

## 9. Règles souris, tactile et clavier

### 9.1. Règle impérative

Une fonction critique doit être utilisable :

- à la souris ;
- au doigt ;
- au clavier ;
- avec un lecteur d’écran.

### 9.2. Remplacement des interactions au survol

| Interaction actuelle ou risquée | Cible recommandée |
|---|---|
| Tooltip uniquement au survol | Bouton d’information cliquable |
| Attribut `title` | Popover, accordéon ou panneau de détail |
| Actions révélées au survol | Action principale visible + menu `⋯` |
| Sous-menu au passage de la souris | Clic ou appui explicite |
| Graphique lisible uniquement au survol | Valeurs et légende accessibles au toucher |
| Ligne de tableau cliquable sans indication | Bouton ou affordance explicite |

### 9.3. Zones tactiles

Cible recommandée :

- minimum 44 × 44 px pour les commandes tactiles ;
- espacement suffisant entre deux actions destructrices ou opposées ;
- bouton principal facilement accessible au pouce ;
- aucune action importante placée uniquement dans un coin difficile à atteindre.

### 9.4. États interactifs

Chaque composant doit prévoir :

- état normal ;
- survol ;
- focus clavier ;
- appui tactile ;
- chargement ;
- succès ;
- erreur ;
- désactivé.

Le focus clavier ne doit jamais être supprimé sans alternative visible.

---

## 10. Templates graphiques proposés

### 10.1. Template A — Clinique premium sombre

**Usage :** praticien desktop et tablette.

Caractéristiques :

- fond deep teal ;
- cartes légèrement plus claires que le fond ;
- séparation par espace plutôt que par bordures lourdes ;
- accents champagne gold ;
- typographie nette ;
- densité contrôlée ;
- indicateurs cliniques sobres ;
- graphiques sans effets décoratifs inutiles.

```text
┌─ Rail ─┐ ┌──────────── Barre de commande ──────────────┐
│ WN     │ │ Rechercher un patient ou une action         │
│ Accueil│ └──────────────────────────────────────────────┘
│Patients│
│Équilib.│ ┌────────────────┐ ┌─────────────────────────┐
│Packs   │ │ Indicateurs     │ │ Patients prioritaires  │
│IA      │ └────────────────┘ └─────────────────────────┘
└────────┘
```

### 10.2. Template B — Patient zen clair

**Usage :** portail patient.

Caractéristiques :

- fond crème ;
- cartes blanches ;
- titres teal ;
- progression positive gold ;
- phrases courtes ;
- boutons larges ;
- langage rassurant ;
- faible densité visuelle.

### 10.3. Template C — Mobile native

**Usage :** praticien et patient sur smartphone.

Caractéristiques :

- navigation basse ;
- en-tête compact ;
- cartes sur une colonne ;
- formulaires plein écran ;
- bottom sheets pour filtres et actions ;
- boutons persistants lorsque nécessaire ;
- menus secondaires réduits.

### 10.4. Template D — WellNeuro 4.0 augmenté

**Usage :** future fiche patient avancée.

Caractéristiques :

- résumé clinique instantané ;
- affichage des preuves et sources ;
- timeline longitudinale ;
- priorisation 21 jours ;
- relation questionnaires ↔ besoins ↔ biologie ↔ protocole ;
- validation humaine explicite ;
- traçabilité de chaque proposition IA.

```text
┌────────────────────────────────────────────────────────────┐
│ Synthèse clinique assistée                                 │
│ Signal principal · Confiance · Sources · Validation        │
└────────────────────────────────────────────────────────────┘

┌──────────────────────┐ ┌──────────────────────────────────┐
│ 12 besoins            │ │ Priorisation 21 jours            │
│ Cartographie          │ │ Phase 1 · Phase 2 · Phase 3      │
└──────────────────────┘ └──────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ Timeline : questionnaires · biologie · protocole · suivi   │
└────────────────────────────────────────────────────────────┘
```

---

## 11. Design system 3.0

### 11.1. Couleurs sémantiques

Les composants ne doivent pas dépendre directement de couleurs techniques comme `blue-600` ou `gray-900` lorsque des tokens sémantiques peuvent être utilisés.

Tokens recommandés :

- `surface-app` ;
- `surface-panel` ;
- `surface-elevated` ;
- `surface-patient` ;
- `text-primary` ;
- `text-secondary` ;
- `text-muted` ;
- `accent-primary` ;
- `accent-secondary` ;
- `status-success` ;
- `status-warning` ;
- `status-danger` ;
- `status-info` ;
- `border-subtle` ;
- `focus-ring`.

### 11.2. Typographie

Hiérarchie recommandée :

- titre de page ;
- titre de section ;
- titre de carte ;
- corps ;
- métadonnées ;
- libellé de contrôle.

Éviter :

- trop de tailles différentes ;
- l’abus de capitales ;
- les textes secondaires trop pâles ;
- les lignes de texte excessivement longues.

### 11.3. Cartes

Une carte doit avoir une fonction identifiable :

- informer ;
- alerter ;
- permettre une action ;
- résumer une section.

Éviter les cartes imbriquées dans plusieurs autres cartes.

### 11.4. Boutons

Niveaux recommandés :

- principal ;
- secondaire ;
- tertiaire ;
- danger ;
- icône.

Une zone ne doit idéalement comporter qu’une seule action principale forte.

### 11.5. Icônes

Les icônes doivent :

- provenir d’une seule famille ;
- conserver une épaisseur cohérente ;
- être accompagnées d’un libellé lorsque leur sens n’est pas universel ;
- avoir un nom accessible ;
- ne pas être la seule indication d’un statut clinique.

---

## 12. Composants cibles

Cette liste décrit une architecture UX potentielle, sans imposer immédiatement une refactorisation.

### Shell

- `AppShellPraticien`
- `SidebarRail`
- `TopCommandBar`
- `MobileBottomNav`
- `PageHeader`
- `ContextDrawer`
- `BottomSheet`

### Dashboard

- `PriorityQueue`
- `MetricCard`
- `RecentActivity`
- `QuickAction`
- `PatientAttentionCard`

### Patients

- `PatientDirectory`
- `PatientCard`
- `PatientTable`
- `PatientFilters`
- `PatientCreateDrawer`
- `AssignmentComposer`
- `PackAssignmentPanel`

### Fiche patient

- `PatientHeader`
- `ClinicalOverview`
- `ClinicalTimeline`
- `NeedScoreCard`
- `PriorityPlanCard`
- `SourceEvidencePanel`

### Patient

- `PatientJourney`
- `CurrentTaskCard`
- `QuestionnaireProgress`
- `TouchChoice`
- `StickyFormNavigation`
- `PatientHelpSheet`

---

## 13. Responsive design par rupture

### Mobile compact

- largeur inférieure à environ 480 px ;
- une colonne ;
- navigation basse ;
- marges réduites ;
- texte essentiel uniquement ;
- cartes sans informations secondaires inutiles.

### Mobile large / petite tablette

- environ 480 à 768 px ;
- une colonne large ;
- certains groupes de cartes en deux colonnes ;
- menu principal par tiroir ou navigation basse.

### Tablette

- environ 768 à 1 024 px ;
- rail compact possible ;
- deux colonnes ponctuelles ;
- panneaux latéraux adaptés.

### Desktop

- au-delà de 1 024 px ;
- rail gauche ;
- barre de commande ;
- grilles de deux à quatre colonnes selon le contenu ;
- largeur maximale adaptée aux données cliniques, sans enfermer toutes les pages dans un conteneur trop étroit.

---

## 14. Accessibilité et sécurité UX

### Accessibilité

- contraste conforme ;
- navigation clavier complète ;
- libellés de champs explicites ;
- messages d’erreur compréhensibles ;
- titres structurés ;
- composants graphiques accompagnés d’une alternative textuelle ;
- taille de texte ajustable sans rupture majeure ;
- absence de dépendance à la couleur seule.

### Actions sensibles

Pour les actions comme :

- suppression ;
- désassignation ;
- remplacement d’une synthèse ;
- publication d’un protocole ;
- validation d’une proposition clinique ;

prévoir :

- libellé explicite ;
- confirmation proportionnée au risque ;
- distinction claire entre brouillon et contenu publié ;
- historique ou possibilité de retour lorsque cela est pertinent.

---

## 15. Perspective WellNeuro 4.0

WellNeuro 4.0 ne doit pas être uniquement une amélioration graphique. Il doit transformer l’organisation de l’information clinique.

### 15.1. Cockpit longitudinal

La fiche patient devient une chronologie intégrée :

```text
Questionnaires
      ↓
Cartographie des besoins
      ↓
Hypothèses et synthèse praticien
      ↓
Exploration biologique
      ↓
Priorisation thérapeutique
      ↓
Protocoles successifs de 21 jours
      ↓
Réévaluation et évolution des scores
```

### 15.2. IA assistive, non décisionnaire

L’IA peut :

- résumer ;
- reformuler ;
- mettre en relation ;
- suggérer une structure ;
- préparer un document ;
- expliciter des données.

Elle ne doit pas :

- masquer les règles utilisées ;
- publier automatiquement une décision clinique ;
- produire une prescription sans validation ;
- remplacer les garde-fous déterministes ;
- mélanger faits, hypothèses et recommandations.

### 15.3. Affichage de la confiance et des sources

Une proposition doit pouvoir afficher :

- les données patient utilisées ;
- les questionnaires concernés ;
- les scores ;
- les références ou règles ;
- les éléments manquants ;
- le niveau de confiance ;
- la validation du praticien.

---

## 16. Feuille de route recommandée

### Phase UX-0 — Validation conceptuelle

Livrables :

- choix du shell praticien ;
- validation du rail gauche ;
- validation de la navigation mobile ;
- sélection d’un template graphique ;
- validation de la hiérarchie du dashboard.

Aucun changement métier.

### Phase UX-1 — Shell praticien 3.0

Objectifs :

- remplacer la navigation horizontale par le nouveau shell ;
- conserver les routes actuelles ;
- ne pas modifier la logique métier ;
- ajouter la navigation mobile ;
- harmoniser les états actifs et le focus clavier.

### Phase UX-2 — Dashboard léger

Objectifs :

- créer la file des priorités ;
- simplifier les métriques ;
- déplacer les formulaires détaillés ;
- ajouter l’activité récente ;
- rendre les actions contextuelles.

### Phase UX-3 — Annuaire patients

Objectifs :

- créer un mode cartes ;
- conserver un tableau desktop optionnel ;
- ajouter les filtres mobiles ;
- sortir la création et l’assignation dans des panneaux dédiés.

### Phase UX-4 — Fiche patient

Objectifs :

- ajouter l’en-tête patient ;
- structurer les onglets ;
- introduire la timeline clinique ;
- organiser la progressivité des détails ;
- supprimer les informations accessibles uniquement au survol.

### Phase UX-5 — Portail patient

Objectifs :

- appliquer le thème patient clair ;
- transformer l’accueil en parcours guidé ;
- améliorer la progression ;
- ajouter une navigation tactile persistante ;
- tester sur smartphones réels.

### Phase UX-6 — Préparation 4.0

Objectifs :

- définir la timeline longitudinale ;
- intégrer l’affichage des sources ;
- préparer la relation entre besoins, biologie et protocoles ;
- formaliser les états brouillon, validé et publié ;
- préparer l’aide à la décision traçable.

---

## 17. Critères d’acceptation UX généraux

Une évolution est considérée comme acceptable si :

- elle fonctionne sans survol ;
- elle est utilisable au clavier ;
- elle conserve des zones tactiles suffisantes ;
- elle n’introduit pas de défilement horizontal non justifié ;
- elle ne masque pas une action clinique importante ;
- elle différencie clairement information, alerte et action ;
- elle n’augmente pas le nombre d’étapes sans bénéfice ;
- elle respecte les thèmes praticien et patient ;
- elle utilise uniquement les patients fictifs autorisés pour les exemples ;
- elle ne modifie pas la logique métier hors périmètre ;
- elle est testée sur au moins un mobile réel et une largeur desktop.

---

## 18. Indicateurs de réussite

Indicateurs possibles après implémentation :

- temps nécessaire pour ouvrir une fiche patient ;
- temps nécessaire pour assigner un pack ;
- nombre de clics pour accéder à une synthèse ;
- taux d’abandon d’un questionnaire mobile ;
- nombre d’erreurs ou retours arrière ;
- proportion de patients terminant un pack ;
- nombre d’actions praticien réalisées depuis la file de priorités ;
- taux d’utilisation mobile ;
- satisfaction praticien ;
- satisfaction patient.

---

## 19. Décisions proposées à ce stade

1. Adopter un **rail gauche praticien** sur desktop.
2. Utiliser une **navigation basse** sur mobile.
3. Transformer le dashboard en **file de priorités**, non en page de formulaires.
4. Sortir la création patient et l’assignation dans des **panneaux dédiés**.
5. Utiliser des **cartes patient sur mobile**.
6. Organiser la fiche patient en **onglets et niveaux de détail**.
7. Transformer le portail patient en **parcours guidé**.
8. Interdire toute dépendance fonctionnelle au **survol**.
9. Harmoniser les couleurs via des **tokens sémantiques**.
10. Construire WellNeuro 4.0 autour d’une **timeline clinique traçable**.

---

## 20. Questions ouvertes

- Le rail gauche doit-il être toujours compact ou mémoriser son état ouvert ?
- La recherche globale doit-elle inclure uniquement les patients ou également les questionnaires, packs et documents ?
- Le dashboard doit-il être personnalisable par le praticien ?
- Faut-il conserver le tableau patients comme mode expert ?
- Quelles sont les quatre entrées prioritaires de la navigation mobile praticien ?
- La fiche patient doit-elle ouvrir par défaut sur la vue clinique ou sur la dernière section consultée ?
- Quels éléments doivent être affichés au patient avant validation du praticien ?
- Quelle place donner aux notifications sans créer de surcharge ?
- La version 3.0 doit-elle introduire immédiatement une timeline clinique ou seulement préparer sa structure ?

---

## 21. Prochaine action prioritaire

Créer une première maquette statique du **shell praticien 3.0** comprenant :

- rail gauche ;
- barre de commande ;
- dashboard léger ;
- file de priorités ;
- version tablette ;
- version mobile avec navigation basse.

Cette maquette doit être validée avant toute refonte des composants métier existants.
