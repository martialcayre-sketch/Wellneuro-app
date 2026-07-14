# Standard UX — Questionnaires patient WellNeuro

## 1. Finalité

Le moteur de questionnaires doit adapter la présentation à la nature de la tâche sans modifier la mesure clinique.

Objectifs :

- réduire la charge cognitive ;
- limiter l'impression de tunnel ;
- améliorer la compréhension ;
- faciliter la pause et la reprise ;
- éviter les erreurs de saisie ;
- préserver la fidélité de l'instrument ;
- maintenir une expérience calme et professionnelle.

Le but n'est pas de « gamifier » la santé. La variété est fonctionnelle et mesurée.

## 2. Classification préalable obligatoire

Chaque questionnaire doit recevoir un profil documentaire avant migration :

```ts
type QuestionnaireExperienceProfile = {
  administrationPolicy: 'strict' | 'layout_only' | 'nominal_shuffle_allowed' | 'internal_flexible';
  preferredRenderer: 'focus' | 'micro_batch' | 'guided_sections' | 'compact_repeated_scale';
  estimatedMinutes?: number;
  sensitivity?: 'standard' | 'sensitive' | 'high';
  fatigueRisk?: 'low' | 'medium' | 'high';
  allowResume: boolean;
  allowSectionNavigation: boolean;
  showReviewBeforeSubmit: boolean;
};
```

Ce contrat est une cible de conception. Son implantation exacte doit être auditée en mode Plan et ne doit pas imposer de migration de base.

## 3. Profils de rendu principaux

### 3.1 `focus`

Une question ou un bloc très court par écran.

Usage recommandé :

- question sensible ;
- libellé long ;
- échelle complexe ;
- patient fatigué ou douloureux ;
- mobile ;
- questionnaire court à moyen.

Caractéristiques :

- titre du questionnaire discret ;
- repère `Question x sur y` ou progression par section ;
- question dominante visuellement ;
- réponses en grandes cartes tactiles ;
- navigation basse persistante ;
- sauvegarde automatique ;
- retour arrière sans perte.

### 3.2 `micro_batch`

Deux à cinq questions cohérentes par page.

Usage recommandé :

- questionnaires longs ;
- échelles répétitives ;
- items courts ;
- besoin de conserver un contexte local.

Règles :

- groupe sémantique, pas découpage arbitraire tous les N items ;
- pas plus d'une échelle de réponse différente dans un micro-lot ;
- page suffisamment courte pour voir le bouton suivant sans défilement excessif ;
- progression calculée sur les réponses, pas seulement sur le nombre de pages.

### 3.3 `guided_sections`

Sections courtes précédées d'une introduction.

Usage recommandé :

- anamnèse ;
- mode de vie ;
- questionnaires internes multidomaines ;
- formulaires non strictement psychométriques.

Chaque section affiche :

- objectif ;
- durée estimée ;
- nombre d'éléments ;
- caractère obligatoire ou facultatif ;
- message de transition vers la section suivante.

### 3.4 `compact_repeated_scale`

Plusieurs items utilisant strictement la même échelle.

Usage recommandé :

- desktop ou tablette ;
- items courts ;
- échelle répétée de 3 à 7 niveaux ;
- questionnaire validé autorisant une mise en page matricielle.

Garde-fous :

- jamais de matrice dense sur mobile ;
- en mobile, chaque ligne devient une carte ;
- ancrages visibles à proximité ;
- aucune cellule minuscule ;
- état sélectionné lisible par texte et forme, pas seulement couleur ;
- ligne active clairement repérée ;
- test lecteur d'écran obligatoire.

## 4. Modes complémentaires réservés aux questionnaires internes

### 4.1 `timeline_input`

Recueil d'une chronologie de symptômes, événements, traitements ou changements.

- cartes datées ;
- ajout progressif ;
- tri chronologique visible ;
- possibilité d'indiquer une période approximative ;
- jamais utilisé pour remplacer un item scoré.

### 4.2 `frequency_routine`

Recueil de routines : matin, midi, soir, nuit; jours de semaine; fréquence.

- grille légère sur desktop ;
- cartes par période sur mobile ;
- éviter la précision artificielle ;
- fournir `Variable / Rarement / Souvent` uniquement si le modèle clinique le prévoit.

### 4.3 `priority_sort`

Classement des attentes ou priorités du patient.

- glisser-déposer optionnel mais jamais unique ;
- commandes Monter/Descendre accessibles ;
- nombre limité d'éléments ;
- réservé à la co-construction, pas au scoring clinique validé.

### 4.4 `symptom_map`

Sélection de zones corporelles pour contextualiser une plainte.

- toujours accompagnée d'une alternative textuelle ;
- corps non genré par défaut ou choix explicite respectueux ;
- données structurées et éditables ;
- jamais obligatoire si l'interaction graphique est inaccessible ;
- réservée à un module interne séparé d'une échelle validée.

### 4.5 `interval_response`

Réponse sous forme de plage lorsque l'expérience varie réellement, par exemple heure habituelle de coucher ou durée variable.

- utiliser seulement pour une donnée descriptive interne ;
- ne pas transformer une échelle ponctuelle validée en intervalle ;
- afficher clairement minimum, maximum et unité.

## 5. Progression

### Règles

- afficher une estimation honnête ;
- distinguer progression du questionnaire et progression du parcours global ;
- ne pas commencer à 0 % lorsque le patient a déjà ouvert et compris la première étape ;
- calculer la progression sur les items effectivement requis ;
- mettre à jour la progression lorsque des branches conditionnelles sont ajoutées ou retirées ;
- éviter une progression qui recule sans explication ;
- annoncer les sections longues avant leur début.

### Libellés préférés

- `Partie 2 sur 5` ;
- `8 réponses sur 20` ;
- `Environ 6 minutes restantes` ;
- `Votre brouillon est enregistré sur cet appareil`.

Éviter :

- `50 % complété` seul ;
- une estimation trop précise non fiable ;
- une barre décorative sans information textuelle.

## 6. Sauvegarde, reprise et synchronisation

### V1 sans migration

- autosave local ;
- indicateur `Enregistré` ;
- dernière heure d'enregistrement ;
- reprise au dernier groupe ou item ;
- ordre randomisé stable ;
- bouton explicite `Quitter et reprendre plus tard` si nécessaire.

Supprimer la contradiction actuelle entre autosave et bouton `Sauvegarder le brouillon`, sauf si le bouton force une synchronisation différente clairement expliquée.

### Échec réseau

- ne jamais perdre les réponses locales ;
- afficher un message non alarmant ;
- permettre de réessayer ;
- ne pas afficher « transmis » avant confirmation serveur ;
- prévenir avant fermeture uniquement si un risque réel de perte existe.

## 7. Navigation

### Mobile

Barre d'action persistante :

- `Précédent` secondaire ;
- `Suivant` principal ;
- prise en compte des safe areas ;
- clavier virtuel ne masque pas le champ actif ;
- défilement vers la première erreur.

### Navigation libre

Autoriser le retour aux sections lorsque :

- l'instrument ne l'interdit pas ;
- les réponses conditionnelles restent cohérentes ;
- le patient comprend ce qui est complet ou incomplet.

Ne pas permettre un saut qui contourne une instruction obligatoire ou crée un état incohérent.

## 8. Validation et erreurs

- validation proche du champ ;
- résumé des erreurs en haut uniquement en complément ;
- message précis et actionnable ;
- ne pas attendre la dernière page pour révéler de nombreuses erreurs ;
- ne pas rendre un bouton désactivé incompréhensible ;
- si le bouton est désactivé, indiquer les réponses attendues ;
- option `Je préfère ne pas répondre` uniquement si autorisée par l'instrument.

## 9. Réponses et composants

### Likert / ordinal

- grandes cartes radio ou échelle segmentée accessible ;
- ordre stable ;
- ancrages complets ;
- direction constante ;
- pas de slider si les valeurs sont discrètes et verbalement ancrées, sauf validation spécifique.

### Binaire

- deux choix textuels symétriques ;
- ordre constant ;
- pas de couleur rouge/verte suggérant une bonne réponse.

### Numérique

- unité visible ;
- bornes expliquées ;
- clavier numérique mobile ;
- pas de valeur par défaut ;
- option approximative si le recueil le permet.

### Choix multiple

- indiquer clairement `Plusieurs réponses possibles` ;
- `Aucun` doit désélectionner les autres si la logique le prévoit ;
- `Autre` ouvre un champ sans perdre la sélection.

### Texte libre

- préciser l'objectif ;
- proposer un exemple non orientant ;
- compteur seulement si limite réelle ;
- accepter une réponse courte ;
- éviter les zones de texte géantes par défaut.

## 10. Transitions et variété visuelle

La variété doit provenir de :

- changement de rythme entre section, question et résumé ;
- transitions de contexte ;
- regroupement sémantique ;
- alternance contrôlée entre cartes, échelles et champs adaptés ;
- micro-pause entre deux blocs longs ;
- message d'encouragement factuel et non infantilisant.

Exemples :

- `Cette partie est terminée. La suivante porte sur votre sommeil récent.`
- `Vous pouvez faire une pause : vos réponses sont enregistrées.`
- `Il reste une courte section d'environ 3 minutes.`

Éviter badges, confettis, points, récompenses ou ton ludique dans un contexte clinique.

## 11. Résumé avant transmission

Le patient voit :

- sections complètes ;
- réponses manquantes ;
- réponses marquées `Non concerné` ;
- possibilité de corriger ;
- rappel du verrouillage après transmission ;
- explication de la procédure de demande de correction.

La confirmation finale doit être un composant WellNeuro accessible, pas `window.confirm()`.

## 12. Lecture seule après transmission

- conserver la même structure que la saisie ;
- afficher clairement `Transmis au praticien` ;
- ne pas donner l'impression que les champs sont modifiables ;
- permettre l'impression ou l'export seulement si prévu ;
- expliquer la demande de correction ;
- ne pas exposer de détails techniques du scoring au patient par défaut.

## 13. Accessibilité et situations de vulnérabilité

Prévoir :

- fatigue importante ;
- douleur ;
- troubles de l'attention ;
- dyslexie ;
- tremblements ;
- baisse visuelle ;
- utilisation d'un lecteur d'écran ;
- faible littératie numérique ;
- connexion instable.

Mesures :

- textes simples ;
- cibles larges ;
- contraste ;
- pas de limite temporelle ;
- reprise ;
- réduction des animations ;
- aucun geste caché ;
- alternative à tout glisser-déposer ;
- test à 200 % de zoom.

## 14. Tests minimaux par profil

- mobile 375 px ;
- tablette portrait et paysage ;
- desktop ;
- clavier seul ;
- lecteur d'écran sur un parcours pilote ;
- zoom 200 % ;
- reduced motion ;
- reprise après rechargement ;
- échec réseau simulé ;
- retour arrière ;
- correction après déverrouillage ;
- stabilité de l'ordre autorisé ;
- identité des valeurs soumises avant/après refonte.
