### Sécurité clinique

- **Une composition intègre ne suffit plus à allumer un feu vert : le
  référentiel clinique doit avoir de quoi conclure.** C'est le même faux vert
  que celui fermé sur la composition vide, puis sur la composition partiellement
  résolue — et il revenait par une troisième porte, la seule qui restait
  ouverte. « Compatible » et « Aucun cumul » ne dépendent pas de la composition
  mais de `clinical_rules` et `ingredient_functional_thresholds`, toutes deux
  vides. Or `clinical_intent_tags` est une **table distincte**, et elle est
  peuplée : une intention se résout donc parfaitement pendant qu'aucune règle ne
  gouverne le moindre ingrédient. La sentinelle rend alors `[]`, et `[]` se lit
  « aucun conflit » là où il faut lire « rien n'a été examiné ».

  L'interception qui existait ne tenait qu'à un accident : la fonction qui
  applique la complétude rend les dimensions **à l'identique** sur une fiche
  intègre — et aucune fiche ne l'est aujourd'hui. Le jour où le transport écrit
  le compte de lignes source, les deux badges verts se seraient allumés sur les
  140 148 fiches, sans qu'une ligne de code ait changé. La garde vit désormais
  là où le vide se constate, pas dans une fonction qui ne raisonne que sur la
  composition.

- **Une liste vide s'annonce incomplète — c'est le cas où la mention porte le
  plus.** Une liste de grades vide n'est pas un silence : son texte affirme
  « aucune règle validée **pour cette composition** ». Sur une composition
  partiellement résolue, cette absence peut n'être due qu'aux ingrédients non
  résolus, et sans la mention le praticien la lit comme un fait sur le produit.

- **Le filtre « Interactions » passe entier chez les critères indisponibles.**
  Il ne l'était pas : deux de ses trois valeurs étaient servies, et elles étaient
  inoffensives **parce que** la table des compositions est vide. Elles deviennent
  trompeuses le jour où elle se remplit, et ce jour-là aucune ligne de code
  n'aurait changé.

  « Signalées » traverse un prédicat qui aura enfin de la matière — et rendra
  pourtant **0 fiche**, faute de seuil fonctionnel en base. Le praticien lit
  « aucune fiche ne correspond » sur un catalogue composé et conclut que le
  catalogue est propre : le faux vert n'est pas sur une fiche, il est sur les
  140 148. « Non évaluée » est un `none:` vrai par vacuité : il sert le catalogue
  entier et fait franchir en un clic le mur d'entrée que l'écran déclare
  interdit. Une facette dont aucune valeur n'est fiable n'est pas « une facette
  servie à valeurs grisées ».

  Les prédicats sont **conservés, inertes**, avec leurs trois conditions de
  réouverture écrites dans le code — ils portent la seule définition écrite de ce
  qu'est une interaction signalée, et doivent être rouverts tels qu'ils ont été
  pensés, non réinventés.

- **La justification de biodisponibilité a trois cas, pas deux.** Elle
  discriminait sur la longueur de la composition, c'est-à-dire sur ce qui a été
  **lu**. Composition remplie et règles cliniques toujours vides, le texte
  affirmerait « comparaison … à la forme préférée des règles cliniques » alors
  qu'aucune comparaison n'a eu lieu — sur 100 % du catalogue, et à côté d'un
  badge « Non évaluée » qui, lui, dit vrai. Le discriminant est désormais ce qui
  a réellement été **comparé** : une forme préférée gouvernée. Cas ajouté :
  « aucune forme préférée gouvernée … l'absence de signal ne vaut pas absence de
  risque ».

- **Une liste vide n'est plus annoncée « incomplète ».** Suffixer « établie sur
  une composition partiellement résolue : elle est incomplète » à une abstention
  enchaîne deux affirmations dont la seconde qualifie ce que la première vient de
  dire inexistant. Seules les listes qui ont quelque chose à dire sont marquées.

- **Une dose absente se dit.** La source ne dose jamais les nutriments : sur un
  complexe multivitaminé, l'écran rendait quinze lignes sans un chiffre ni un
  mot, et rien ne distinguait « la fiche ignore la dose » de « le produit n'en
  déclare pas ». La règle « non renseigné n'est pas zéro » était écrite dans le
  service et non appliquée ici. La grandeur est nommée dans le même geste : la
  source déclare une quantité **par dose journalière recommandée**, pas par
  prise — l'écran était le dernier maillon resté muet après le renommage.

- **La recherche corpus cite au plus 8 ingrédients, et le dit.** Deux bornes
  franchies au-delà, la seconde décisive : la limite serveur de 500 caractères,
  qui rendait un bandeau d'erreur là où le praticien attend des claims sourcés ;
  et surtout la **pertinence**, qui se dégrade bien avant — concaténer vingt noms
  produit un embedding centroïde qui ne ressemble à aucun claim, passe sous le
  plancher de similarité et fait afficher « corpus en cours de constitution » sur
  un corpus peuplé. La borne porte sur le **nombre d'ingrédients**, jamais sur la
  chaîne : une troncature couperait « Vitamine B12 » en « Vitamine B1 » et
  enverrait à l'embedding un autre nutriment. Les ingrédients omis sont annoncés,
  sinon le silence du corpus à leur sujet se lit comme une absence de claim.

  La requête est construite **à budget** — un nom n'est ajouté que s'il tient
  entier — et non tronquée après coup. Un garde-fou posé en « filet qui ne doit
  pas mordre » mord dès que l'en-tête est long : le nom commercial est un `TEXT`
  non borné, sans validation de longueur à l'ingestion, et les libellés à
  rallonge sont courants dans la source. Borner le nombre d'ingrédients sans
  borner leur construction rouvrait le défaut qu'on venait de fermer.

### Modifié

- Un critère indisponible est refusé **à l'exécution**, plus seulement au typage.
  La construction du `where` n'itère que sur les facettes servies : une facette
  sortie de cette liste aurait été silencieusement ignorée, et la route aurait
  rendu 200 avec des fiches hors critère en laissant croire que le filtre s'était
  appliqué. Le service est appelé depuis une route qui bâtit ses filtres à partir
  de paramètres d'URL — la garde de type n'y suffit pas.

- Le message des critères indisponibles ne promet plus « après l'import de la
  composition des produits ». L'import a lieu et les critères restent
  indisponibles : ce sont les règles cliniques et les seuils fonctionnels qui
  manquent. Une promesse datée qui ne se réalise pas au terme annoncé use la
  confiance dans toutes les autres.

- Deux gardes anti-dérive ajoutées, sur des valeurs recopiées côté écran faute de
  pouvoir importer un module serveur dans le paquet navigateur : les facettes
  grisées à l'écran contre celles que le service refuse, et la borne de requête
  corpus contre celle du service.

- La borne de requête du rayon corpus quitte son `route.ts` pour le module de
  configuration. Un `route.ts` n'accepte qu'une liste fermée d'exports : y
  exporter une valeur fait échouer `next build`, et **le type-check ne le voit
  pas** — seul le palier qui construit l'attrape. Même défaut, même semaine, que
  celui relevé sur la PR #499.

- Le mécanisme « une seule valeur d'une facette par ailleurs servie est
  refusée » est mis en sommeil (sa table est vide) mais désormais **éprouvé sur
  une table factice** : un mécanisme endormi qu'aucun test n'exerce est rouvert
  non testé. Ses trois consommateurs — service, route, écran — sont vérifiés,
  motif de refus distinct compris.

### Outillage

- La moisson du référentiel Compl'Alim, son ingestion et la projection des
  compositions lisent et écrivent sous `~/.wellneuro/supplements/referentiel`.
  Le défaut était un dossier **dans le worktree** — or une session = un worktree,
  et un worktree se supprime après sa PR : le cache mourait avec lui et la
  moisson suivante repartait de zéro, 25 minutes et ~6 000 requêtes à un service
  public, pour rien.

  Le README de l'outil est corrigé dans le même geste : il prescrivait encore un
  chemin **dans le dépôt**, et le `.gitignore` ne couvre qu'un seul emplacement.
  Suivre la doc depuis la racine y déposait ~6 000 fiches à un chemin non ignoré,
  qu'un `git add -A` aurait indexées — un contenu publié sous aucune licence
  énoncée. Déplacer le défaut hors du dépôt sans corriger la doc qui y ramène ne
  le corrige pas.

**Aucun effet observable en production aujourd'hui**, sauf le retrait d'un filtre
qui ne pouvait rien rendre d'utile : les 140 148 fiches y sont sans composition.
Ce lot est un cliquet — il corrige cinq régressions d'écran **pendant qu'elles
sont encore inertes**, avant que la première ligne de composition n'existe. Sans
migration, sans changement de schéma, sans aucune écriture en base.
