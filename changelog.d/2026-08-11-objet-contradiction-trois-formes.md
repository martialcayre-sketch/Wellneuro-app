### Ajouté

- **Le moteur de contradictions a son objet : un seul, à trois formes**
  (`DISCORDANCE`, `CONVERGENCE`, `CONFLIT_SOURCES`), et non trois objets voisins
  ([[D-041]]). Les trois ont la même forme — des sources, une description, une
  importance, des hypothèses, une action suggérée, un état résolu ou non — et ne
  diffèrent que par la matière confrontée : des instruments, un faisceau, le
  corpus. Trois objets auraient produit trois vocabulaires de vigilance sur le
  même écran et, à terme, trois moteurs. Seule `DISCORDANCE` sera peuplée par ce
  lot ; les deux autres sont **prévues par le type et vides à la livraison** —
  la structure évite d'avoir à écrire un second moteur, elle n'anticipe aucune
  règle clinique.
- **Aucun champ de certitude, de probabilité, de score ou de confiance, sous
  quelque nom que ce soit.** Réunir convergence et discordance dans un objet
  portant une importance invite précisément à lire la convergence comme une
  certitude, ce que `DC-29` interdit. La graduation de la forme `CONVERGENCE`
  compte des **sources indépendantes** ; elle ne mesure pas une vraisemblance,
  et elle vit sur cette forme seule — la porter sur l'objet en aurait fait un
  degré applicable à une discordance, c'est-à-dire un champ de confiance
  déguisé. L'importance est une **priorité**, dans le vocabulaire déjà en
  service : elle ordonne ce que le praticien regarde d'abord, elle ne dit pas ce
  qui est vrai.
- **Le garde ne repose pas sur une liste de noms interdits**, qui se contourne
  en choisissant un nom qui n'y figure pas. La liste des clés de l'objet est
  **épinglée** : tout champ ajouté cesse de compiler, quel que soit son nom.
  Vérifié par mutation — un champ `degreDeSolidite`, qu'aucun lexique
  raisonnable n'aurait prévu, fait rougir le type-check. Le lexique de noms
  interdits ne garde que les types imbriqués, que le `keyof` ne voit pas.

### Modifié

- Le type est **propre au moteur** : `DiscordanceFinding` n'est pas réutilisé
  ([[D-044]]). Il hérite de `ClinicalFindingBase`, qui porte
  `confidence: QualitativeConfidence` — le champ que le garde ci-dessus
  interdit, et que `clinicalReview.ts` valide à l'exécution. Le banc de
  [[D-041]] aurait échoué le premier jour. `DiscordanceFinding` reste en place,
  inchangé et non utilisé par ce moteur ; l'injection cockpit convertira, c'est
  le coût assumé de la coexistence de deux familles de constats voisines.
