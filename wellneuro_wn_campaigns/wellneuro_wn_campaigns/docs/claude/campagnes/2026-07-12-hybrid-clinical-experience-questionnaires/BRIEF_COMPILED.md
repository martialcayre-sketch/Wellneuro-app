# BRIEF COMPILED — Hybrid Clinical et expérience questionnaires patient

## 1. Problème observé

Le test réel de l'interface a mis en évidence un écart entre conformité technique et qualité perçue :

- navigation visuellement brouillonne ;
- rail et panneaux latéraux mal alignés ;
- « icônes » textuelles optiquement décentrées ;
- trop de cartes et de bordures concurrentes ;
- hiérarchie insuffisante entre information, décision et action ;
- portail patient fonctionnel mais encore long, monotone et administratif ;
- questionnaires rendus avec une logique uniforme, peu adaptée aux instruments longs ou aux contextes de fatigue, douleur, stress ou déficit attentionnel ;
- dossier patient encore trop organisé par modules plutôt que par épisode de soins et prochaine décision ;
- absence d'un mode consultation réellement focalisé ;
- suivi longitudinal, comparaison avant/après et prévisualisation patient encore insuffisamment structurés.

## 2. Vision validée

### Praticien — Hybrid Clinical

- rail sombre structurel pleine hauteur ;
- espace de travail clair en mode Jour ;
- mode Nuit conçu comme une ambiance dédiée, non comme une inversion ;
- contrôle `Auto / Jour / Nuit` ;
- vraies icônes SVG homogènes ;
- grille d'alignement stricte ;
- réduction du nombre de cadres ;
- une action principale identifiable par zone ;
- cockpit orienté « prochaine décision utile » ;
- double niveau de lecture : synthèse immédiate puis détail expert ;
- mode consultation sans distraction ;
- timeline clinique longitudinale ;
- cartes de décision explicables ;
- comparaison avant / maintenant ;
- prévisualisation fidèle de la vue patient.

### Patient — Patient Zen clair

- thème clair fixe ;
- fond crème, cartes blanches, teal pour l'action, gold pour la progression ;
- langage non technique ;
- faible densité visuelle ;
- progression et prochaine étape explicites ;
- rassurance sur la sauvegarde, la confidentialité et la suite du parcours ;
- interactions tactiles larges ;
- absence de tableau horizontal sur mobile ;
- résumé de ce qui a changé depuis la dernière visite ;
- confort de lecture simple ;
- distinction claire entre réponses conservées localement et données réellement transmises.

## 3. Architecture technique cible

Le rôle et le mode colorimétrique sont séparés :

```html
<div data-theme="praticien" data-color-mode="light">
<div data-theme="praticien" data-color-mode="dark">
<div data-theme="patient" data-color-mode="light">
```

Préférence praticien :

```ts
type ColorModePreference = 'auto' | 'light' | 'dark';
```

- `auto` suit `window.matchMedia('(prefers-color-scheme: dark)')` ;
- préférence persistée dans `localStorage` ;
- script pré-hydratation pour éviter le flash de thème ;
- aucune migration Prisma nécessaire.

Les préférences patient de confort de lecture peuvent rester locales si elles ne contiennent aucune donnée clinique.

## 4. Choix de bibliothèques

- **Conserver** Next.js 14, React 18, Tailwind et Recharts.
- **Ajouter Lucide React** pour remplacer les abréviations et symboles hétérogènes.
- **Radix UI / shadcn ciblé** pour les primitives interactives difficiles : sheet, dialog, alert dialog, tabs, dropdown, tooltip, command.
- **Motion ciblé** uniquement pour les transitions qui expliquent un changement d'état.
- **Ne pas introduire** Material UI, Ant Design, WebGL, Three.js ou une migration de framework.

## 5. Problème spécifique aux questionnaires

Le renderer actuel :

- affiche une section complète ;
- utilise essentiellement radio/select/number ;
- calcule une progression par section ;
- sauvegarde automatiquement tout en proposant aussi un bouton de sauvegarde ;
- utilise une confirmation native avant transmission ;
- ne distingue pas les besoins d'un questionnaire court, long, sensible, répétitif ou cognitif.

La cible n'est pas de rendre chaque questionnaire « ludique ». Elle est de réduire la charge cognitive tout en préservant la fidélité clinique.

## 6. Profils d'expérience proposés

### `focus`

Une question principale par écran ou viewport. Usage : items sensibles, longs, complexes, patients fatigués, mobile étroit.

### `micro_batch`

Deux à cinq items cohérents par page. Usage : majorité des questionnaires longs. Permet un rythme régulier sans sensation de tunnel.

### `guided_sections`

Une section clinique courte avec introduction, objectif et estimation de durée. Usage : anamnèse, mode de vie, questionnaires internes structurés.

### `compact_repeated_scale`

Plusieurs items partageant exactement la même échelle, avec en-tête d'ancrage commun. Desktop/tablette uniquement; sur mobile, retour en cartes individuelles. À éviter lorsque les libellés sont longs ou l'échelle complexe.

### `progressive_disclosure`

Questions de suivi révélées selon une réponse antérieure. Usage : champs conditionnels existants et questionnaires internes. Ne doit pas masquer un item requis par un instrument validé.

### `timeline_input`

Saisie chronologique pour l'histoire des symptômes ou événements. Réservée aux formulaires internes non scorés, pas aux échelles validées.

### `frequency_routine`

Grille légère « moment / fréquence » pour habitudes ou routines. Réservée aux questionnaires internes; transformation en cartes sur mobile.

### `priority_sort`

Classement de priorités ou préférences. Réservé au recueil qualitatif et à la co-construction du plan, jamais comme remplacement d'une échelle clinique existante.

### `review_before_submit`

Résumé final par section, réponses manquantes visibles, possibilité de revenir directement à l'item concerné, puis transmission explicite.

## 7. Politique de randomisation

### Interdit par défaut

- ordre des items d'un questionnaire validé ;
- ordre des sections ;
- échelles ordinales ;
- réponses Oui/Non ;
- fréquence, intensité, accord, douleur, temporalité ;
- items inversés ou paires conçues pour contrôler un biais ;
- instruments dont le manuel fixe la présentation.

### Autorisable sous conditions

- options nominales sans ordre naturel ;
- questionnaire interne WellNeuro ;
- politique déclarée dans les métadonnées ;
- valeurs de scoring indépendantes de la position ;
- ordre stable pendant toute la tentative ;
- options spéciales épinglées ;
- test automatique de conservation de la valeur ;
- validation clinique et UX.

### Principe technique

La randomisation doit être déterministe, basée sur des identifiants non sensibles, par exemple :

```text
seed = hash(idAssignation + question.id + versionRenderer)
```

Elle ne doit jamais utiliser l'adresse email, le nom ou une donnée clinique comme graine.

## 8. Garde-fou psychométrique

Une amélioration visuelle peut modifier le mode d'administration et donc la mesure. Pour chaque questionnaire, déclarer un niveau de liberté :

- `strict` : fidélité totale au protocole ;
- `layout_only` : mise en page adaptable, contenu et ordre fixes ;
- `nominal_shuffle_allowed` : seules les options nominales déclarées peuvent être mélangées ;
- `internal_flexible` : questionnaire interne autorisant des profils d'interaction plus variés.

Aucune catégorie ne doit être inférée automatiquement à partir du seul type TypeScript.

## 9. Principes ergonomiques médicaux

- préserver la concentration plutôt que divertir ;
- afficher la durée estimée et la progression utile ;
- permettre la pause et la reprise ;
- annoncer la sauvegarde automatique sans demander une action redondante ;
- ne pas précocher de réponse ;
- afficher une option « non concerné » seulement si elle existe dans l'instrument ;
- éviter les formulations culpabilisantes ;
- ne pas afficher le score au patient avant transmission sauf choix clinique explicite ;
- limiter les animations et respecter `prefers-reduced-motion` ;
- prévoir les usages avec fatigue, douleur, dyslexie, tremblements, déficits visuels ou attentionnels.

## 10. Innovations UX — Vague 2

### P1 — À prototyper et arbitrer dans la campagne

#### Mode consultation

Vue focalisée des mêmes données : identité patient, motif, attentes, signal principal, vigilances, notes, prochaine décision et clôture. Aucun second dossier, aucune captation audio implicite.

#### Double niveau de lecture

La première couche répond à « qu'est-ce qui compte maintenant ? ». La seconde donne accès aux scores, sources, calculs, historique et limites.

#### Timeline clinique

Chronologie unifiée des consultations, questionnaires, synthèses, biologie, protocoles, documents et corrections. Chaque entrée distingue événement, décision et résultat.

#### Carte de décision clinique

Une proposition doit montrer justification, données contributives, niveau de confiance, limites, données manquantes et source. Toute validation reste humaine.

#### Comparateur avant / maintenant

Le suivi des phases de 21 jours doit afficher les dates, conditions et comparabilité. Aucune tendance ne doit être extrapolée avec des données insuffisantes.

#### Prévisualisation patient

Depuis les synthèses, protocoles et documents, afficher fidèlement ce qui sera partagé. Les informations internes doivent être exclues par contrat.

### P2 — À intégrer lorsqu'elles restent compatibles avec les lots

- palette de commandes `Ctrl/Cmd + K` sans remplacer la navigation ;
- vues opérationnelles fixes ;
- états vides actionnables ;
- distinction `Enregistrer / Valider / Envoyer` ;
- réversibilité et historique ;
- résumé de session patient ;
- réglages simples de confort de lecture ;
- statut de sauvegarde et connexion explicite ;
- lexique éditorial praticien/patient ;
- constructeur visuel de protocoles 21 jours si compatible avec C1.

### P3 — Architecture prête, implémentation différée

- dashboard entièrement personnalisable ;
- recherche globale multimodule ;
- carte corporelle riche ;
- visualisations longitudinales avancées ;
- véritable test adaptatif CAT.

## 11. Règles de conception avancée

### États vides

Ils expliquent pourquoi la zone est vide, si cela est normal et quelle action est possible.

### Densité contextuelle

- dashboard synthétique ;
- annuaire plus dense ;
- fiche progressive ;
- consultation calme ;
- configuration experte ;
- patient peu dense.

### Motion

Autoriser seulement les transitions qui expliquent une ouverture, un déplacement, une sauvegarde, un changement de statut ou une progression.

### Couleurs

- teal : action/navigation ;
- gold : progression ou repère rare ;
- vert : succès confirmé ;
- orange : attention ;
- rouge : danger/erreur/destruction ;
- violet : catégorie clinique documentée.

### Lexique

Le langage patient évite les termes techniques internes. Les messages doivent indiquer ce qui s'est passé, ce qui est conservé et ce que le patient doit faire ensuite.

## 12. Migration progressive

1. Inventorier et classifier les écrans, questionnaires et innovations.
2. Construire les primitives sans modifier le catalogue clinique.
3. Prototyper mode consultation, carte de décision et timeline avec les patients fictifs autorisés.
4. Migrer trois questionnaires pilotes : court, long répétitif, interne conditionnel.
5. Valider scoring, navigation, reprise et accessibilité.
6. Ajouter le comparateur et la prévisualisation sur un parcours pilote.
7. Étendre par lots de catégories et surfaces.
8. Interdire tout nouveau renderer ou pattern clinique local hors du moteur commun.
9. Maintenir les capacités P3 dans un backlog gouverné.

## 13. Références méthodologiques à consulter pendant l'implémentation

- FDA, *Guidance for Industry — Patient-Reported Outcome Measures: Use in Medical Product Development to Support Labeling Claims*, décembre 2009.
- W3C, *Web Content Accessibility Guidelines (WCAG) 2.2* et ressources WAI sur les formulaires.
- NIH / HealthMeasures, documentation PROMIS et Computerized Adaptive Testing.
- Krosnick, travaux sur la charge cognitive, le satisficing et les effets d'ordre dans les questionnaires.

Ces références ne dispensent pas de consulter le manuel propre à chaque instrument utilisé dans WellNeuro.
