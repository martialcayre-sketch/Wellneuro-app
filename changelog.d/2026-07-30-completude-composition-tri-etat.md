### Sécurité clinique

- **Ce que l'on sait de la composition d'une fiche n'est plus un oui/non.** Une
  fiche n'a plus « une composition » ou « pas de composition » : elle a une
  composition **absente**, **partiellement résolue** ou **intègre**. La
  distinction commande désormais tout ce que l'écran ose conclure.

  Elle n'est pas théorique. La résolution des ingrédients se fera par vagues, et
  la mesure du corpus source (141 388 fiches, 580 892 lignes de composition,
  1 809 libellés distincts) donne le prix de chacune : une vague de 289 libellés
  laisse **30,8 % des fiches partiellement résolues**, une vague de 453 en laisse
  **18,5 %**. Or une fiche partiellement résolue **a** des compositions. Lue par
  le simple test « la fiche a-t-elle des compositions ? », elle repassait
  « connue » et rendait de nouveau « Compatible » et « Aucun cumul » alors qu'un
  ingrédient sur cinq lui restait invisible — le feu vert tiré du vide corrigé la
  semaine dernière, rouvert par la porte de l'import.

- **Un signal trouvé survit ; un feu vert exige une composition intègre.**
  L'asymétrie est délibérée et vaut pour les trois lectures qui croisent la
  composition. « Cumul signalé », « interactions signalées », « vigilance
  requise » sont **conservés** même sur une composition incomplète : un signal
  trouvé ne dépend pas de ce qu'on ignore, et le taire masquerait un risque réel.
  « Aucun cumul », « aucune interaction connue » et « Compatible » deviennent
  **non évalués** : c'est l'ignorance qui produit l'intersection vide, jamais
  l'absence de conflit. Non renseigné n'est pas zéro, et l'absence de signal ne
  vaut pas absence de risque.

- **Le filtre « Aucune interaction connue » est refusé, faute d'être fiable.**
  Il se lit sur les ingrédients résolus : sur une fiche partielle, l'ingrédient
  porteur du signal peut être précisément celui qui manque. Un faux vert dans un
  filtre est pire qu'à l'affichage — il décide de ce que le praticien voit. La
  valeur est montrée à l'écran, désactivée et expliquée ; l'API répond 400 si le
  paramètre arrive quand même, avec un motif distinct de celui des critères sans
  donnée : ici la donnée existe, c'est sa complétude qui n'est pas prouvée. Les
  deux autres valeurs restent servies : « signalées » est un vrai positif,
  « non évaluée » est déjà l'abstention.

- **La liste des ingrédients dit quand elle est incomplète.** Sans cette mention,
  elle se lit comme la composition entière, et un ingrédient non résolu passe
  pour un ingrédient absent du produit.

### Modifié

- Contrat du catalogue en `c4-catalogue-v3` : chaque fiche servie porte l'état de
  sa composition, à lire avant ses dimensions — c'est lui qui dit ce que vaut le
  compteur de règles correspondantes et toute absence de signal.

**Aucun effet observable en production aujourd'hui** : les 140 148 fiches y sont
sans composition, donc toutes « absente », et se comportent exactement comme
avant. Ce lot est un cliquet — il rend l'import des compositions incapable de
livrer un verdict positif infondé, avant que la première ligne n'existe.
`integre` restera d'ailleurs inatteignable tant que la preuve de complétude
(le nombre de lignes attendu par la source) n'aura pas été ajoutée avec le
résolveur : fiche partielle par défaut, dans le sens de l'abstention.

Sans migration, sans changement de schéma. La barrière D-003, le rayon corpus,
les gardes de session et le drapeau `WN_C4_ENABLED` sont inchangés.
