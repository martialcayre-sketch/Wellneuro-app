### Ajouté

- **La table de contradictions V1 part avec une règle, C-STR**, et son moteur
  déterministe ([[D-042]]). C-STR constate qu'une adaptation au stress déclarée
  perturbée coexiste avec un DASS-21 situant la dépression et le stress dans la
  bande « Normal » — un signal fonctionnel que les instruments spécifiques ne
  confirment pas, **à clarifier en entretien**. Elle ne dit jamais lequel des
  deux instruments a raison : une discordance se signale, elle ne se moyenne ni
  ne se supprime (`DC-30`).
- **Les trois chiffres sont des bandes publiées, aucun n'est un arbitrage.**
  `ADAPTATION_STRESS ≤ 8` est exactement la bande « Adaptation perturbée » de
  l'axe (0-8 / 10-17 / 18-24) ; `D ≤ 4` et `S ≤ 7` sont les bandes « Normal »
  du DASS-21. **Le trou à 9 reste ouvert, délibérément** : les bandes de l'axe
  ne couvrent pas cette valeur, et la fermer coûterait un point sans source. Le
  patient à 9 garde son orientation (`R2-STR-01`, `≤ 17`), il perd la vigilance
  de discordance.
- **Ce qui n'est pas dans la table y est motivé.** C-SOM et C-ALI portent, dans
  la table elle-même, le motif de leur retrait et la condition exacte de leur
  retour ([[D-042]] en fait un livrable) : une règle retirée sans motif lisible
  revient toujours, à l'identique, par la main de quelqu'un qui ignorait
  pourquoi elle était partie.
- **Le recoupement avec `R2-STR-01` est justifié dans la règle**, pas supposé
  (`DC-37`). Les deux sorties coexisteront à l'écran pour un même patient :
  `R2-STR-01` propose une mesure, C-STR nomme une contradiction entre deux
  mesures déjà faites. Supprimer l'une ferait perdre soit l'instrument à
  administrer, soit le signal que les instruments existants se contredisent.
- Le moteur **importe la lecture de scores du moteur d'orientation** au lieu de
  la réécrire : recueil incomplet, sous-score absent, plancher jamais comparé
  numériquement — les gardes de `DC-24` valent à l'identique pour les deux, et
  ne peuvent pas diverger en silence. Il se tait plutôt que de produire un
  constat dont une passation ne porterait pas son identifiant : une
  contradiction non remontable jusqu'à ses données ne serait pas vérifiable par
  le praticien (`DC-34`, `DC-35`).
- La table est **écrite, pas signée** (`validationExterne: false`), et son SHA
  est comparé à un **littéral épinglé** — jamais recalculé dans le test, qui
  serait alors une tautologie incapable de rougir.

### Modifié

- **`prescriptif` n'est plus exigé des claims de toutes les tables** ([[D-046]]).
  Le claim qui fonde C-STR — « les symptômes de stress […] ne présentent pas de
  corrélation avec la gravité de la charge allostatique » — est descriptif, et
  c'est précisément ce qui rend la discordance informative. Exiger d'un tel
  claim qu'il soit prescriptif était une erreur de catégorie héritée de la table
  d'orientation, dont chaque règle **suggère une exploration**. Le contrat de
  fraîcheur porte désormais la table qui épingle chaque claim : quatre
  propriétés pour l'orientation, trois pour les contradictions. Une table
  inconnue est **refusée** plutôt que de recevoir un jeu par défaut.
