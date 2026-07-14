# Référence UX/UI — Hybrid Clinical

## 1. Positionnement

Hybrid Clinical combine :

- une structure praticien sombre et stable ;
- un espace de travail clair pour les usages prolongés ;
- un mode Nuit dédié ;
- une expérience patient claire et chaleureuse ;
- une hiérarchie clinique plus forte que la décoration.

Le modèle doit évoquer précision, calme, confiance et expertise.

## 2. Architecture praticien

### Desktop

Trois zones :

1. rail structurel pleine hauteur ;
2. barre de commande supérieure ;
3. zone centrale de travail.

Le rail ne doit pas être enfermé dans une carte flottante. Il définit la géométrie principale de la page.

### Tablette

- paysage : rail compact ou étendu selon place ;
- portrait : drawer accessible ;
- mêmes icônes et mêmes libellés ;
- aucune fonction critique uniquement au survol.

### Mobile

- navigation basse limitée aux entrées prioritaires ;
- menu « Plus » dans une sheet accessible ;
- contenu en une colonne ;
- aucun tableau horizontal par défaut ;
- action principale accessible au pouce.

## 3. Grille et alignements

### Grille de base

- unité : 4 px ;
- rythme principal : 8 px ;
- espacements usuels : 8 / 12 / 16 / 24 / 32 / 48 px.

### Navigation

- ligne : 48 à 52 px ;
- zone d'icône : 44×44 px ;
- icône SVG : 20 ou 21 px ;
- même `strokeWidth` ;
- centre géométrique contrôlé par `grid place-items-center` ;
- aucun caractère ou emoji utilisé comme icône fonctionnelle ;
- indicateur actif latéral ou fond discret, jamais trois marqueurs concurrents.

### Surfaces

Limiter à quatre niveaux :

1. fond application ;
2. surface structurelle ;
3. panneau/carte ;
4. surface élevée temporaire.

Éviter : carte dans carte dans carte, bordures sur chaque section, ombres systématiques.

## 4. Modes praticien

### Jour

- rail : deep teal sombre ;
- fond de travail : crème très clair ;
- cartes : blanc ;
- texte : teal presque noir ;
- action primaire : teal ;
- accent rare : champagne gold.

### Nuit

- rail : deep teal très sombre ;
- fond : teal désaturé profond ;
- cartes : surface légèrement plus claire ;
- texte principal : crème ;
- texte secondaire : teal clair ;
- focus : gold ou teal clair fortement contrasté.

Le mode Nuit ne doit pas transformer toutes les couleurs de statut en tons saturés lumineux.

### Auto

- suit la préférence système ;
- réagit à son changement ;
- n'impose aucune heure ;
- reste surchargé par un choix manuel ;
- évite le flash de mauvais thème avant hydratation.

## 5. Patient clair fixe

### Palette

- fond : crème ;
- surfaces : blanc ;
- titre : deep teal ;
- action : teal ;
- progression : champagne gold ;
- succès : vert sobre ;
- avertissement : ambre ;
- erreur : rouge réservé aux erreurs réelles.

### Ambiance

- faible densité ;
- titres courts ;
- phrases rassurantes ;
- pas de jargon technique ;
- progression visible ;
- une action principale ;
- explication de l'étape suivante.

## 6. Typographie

- sans-serif pour l'interface et les champs ;
- serif de marque uniquement pour titres éditoriaux ou grands titres de page ;
- pas de serif pour petits libellés, tableaux ou contrôles ;
- corps patient mobile cible : 16 px lorsque possible ;
- interlignage généreux ;
- largeur de lecture contrôlée.

## 7. Icônes

Bibliothèque recommandée : Lucide React.

Règles :

- une seule famille ;
- taille cohérente ;
- libellé accessible ;
- pas d'icône seule pour une action ambiguë ;
- pas d'emoji pour les notifications, états ou commandes ;
- icône destructive toujours accompagnée d'un texte ou d'une confirmation.

## 8. Composants obligatoires

À créer ou normaliser :

- `AppShell` ;
- `PractitionerSidebar` ;
- `TopCommandBar` ;
- `MobileBottomNavigation` ;
- `PageHeader` ;
- `SectionHeader` ;
- `ActionCard` ;
- `MetricCard` ;
- `StatusBadge` ;
- `AlertPanel` ;
- `EmptyState` ;
- `LoadingState` ;
- `FormField` ;
- `ResponsiveDialogOrDrawer` ;
- `QuestionnaireRenderer`.

## 9. États

Chaque composant interactif doit documenter :

- normal ;
- hover ;
- focus-visible ;
- active/pressed ;
- loading ;
- success ;
- warning ;
- error ;
- disabled ;
- reduced motion.

## 10. Premium : critères

Un écran est premium s'il présente :

- une grille nette ;
- peu de niveaux visuels ;
- des alignements constants ;
- un espace respirant ;
- une hiérarchie évidente ;
- une action principale ;
- des textes utiles ;
- des transitions discrètes ;
- aucune fonction décorative trompeuse.

Il n'est pas premium par accumulation de :

- gradients ;
- flous ;
- glassmorphism ;
- ombres fortes ;
- animations ;
- dorures ;
- graphiques non actionnables.

## 11. Règles pour les futures pages

Toute nouvelle page doit déclarer avant implémentation :

- rôle : praticien ou patient ;
- mode : clair, sombre ou les deux ;
- action principale ;
- information prioritaire ;
- densité ;
- comportement mobile ;
- états vide/chargement/erreur ;
- contraintes d'accessibilité ;
- données de démonstration utilisées ;
- dépendances à une mesure clinique.

Une page qui ne fournit pas ces éléments ne doit pas passer en implémentation.
