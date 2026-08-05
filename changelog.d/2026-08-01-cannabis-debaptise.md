### Certification — le repérage cannabis débaptisé, et ses bandes empruntées retirées

- **La source est identifiée, et cela ferme l'instrument au lieu de l'ouvrir.** La
  condition posée à sa suspension — « réactivation à l'identification de la
  source » — est remplie : c'est le **Know Cannabis Test** de la clinique Jellinek
  (Amsterdam), que l'OFDT publie dans son guide des outils de repérage. Lu à
  l'image sur les six pages du support du cabinet, et recoupé à l'original anglais.
- ~~**Mais le servi ne partage qu'un item avec elle.**~~ **RECTIFIÉ le même jour, voir
  l'entrée « la source du cannabis avait un nom, pas une pièce » plus bas** : le relevé
  item par item donne **zéro** item partagé au sens strict et **neuf** au sens du
  construit, et « le manque » — cité ci-dessous comme propre au servi — est l'item 13 de
  la source. La conclusion du lot ne bouge pas ; c'est le zéro strict qui la porte. Le
  texte d'origine est conservé tel quel ci-dessous parce qu'il date l'état de la
  connaissance au moment du geste.
- **~~Mais le servi ne partage qu'un item avec elle.~~** La source demande la somme
  dépensée par semaine, la fréquence d'ivresse cannabique, avec qui l'on fume, les
  raisons de consommer ; le servi demande l'âge de début, la tolérance, le manque,
  les symptômes respiratoires. C'est le cas `Q_PED_02` à l'identique — 16 items des
  deux côtés, /36 des deux côtés, mêmes trois bandes, **zéro divergence critique**,
  et un autre instrument : le seul cas que le compteur déclare conforme.
- **La reconstruction, arbitrée le 2026-07-31, a été abandonnée sur pièce.** La
  source porte ses 16 items avec leurs modalités, puis « Résultats : De 0 à 5
  points… » à sa dernière page — et **aucun point par option entre les deux**. La
  reconstruire exigeait donc d'inventer la cotation menant à ce /36, c'est-à-dire
  d'ajouter un barème qu'aucune source ne porte. Cette campagne le refuse partout
  ailleurs ; il n'y avait pas de raison d'en faire ici la première exception.
- **Les bandes de #497 sont retirées, et ce lot supersède cet arbitrage.** Elles
  étaient exactes — 0-5 / 6-15 / 16-36 se lisent bien à la dernière page de
  `WN-SRC-0495` — mais appliquées à des items qui ne sont pas ceux pour lesquels
  elles ont été établies. **Une grille de lecture validée sur un instrument, posée
  sur un autre, ne mesure rien.** Les quatre conduites du cabinet qu'elles
  portaient partent avec elles.
- **Un drapeau ne faisait rien sur la moitié des moteurs.** `sansTotalGlobal`
  n'était honoré que par la branche `subscore`. Posé sur ce moteur `sum`, il
  laissait le total partir — on le pose, on croit avoir agi. C'est en le mesurant
  ici qu'on l'a vu ; il vaut désormais dans les deux moteurs. Sans lui, un « 24 »
  nu se serait affiché « Score brut » à la fiche, sans dénominateur ni lecture,
  c'est-à-dire une sévérité qu'aucun barème ne définit.
- **La réserve est levée, et c'est la première depuis que le mécanisme existe.**
  Son plafond était `source_obtenue`, son motif « on ne dégage pas des droits sur
  une source qu'on ne sait pas nommer ». La source est nommée : la ligne est
  retirée de la liste épinglée dans le même diff que le registre, comme le
  mécanisme l'exige. Ce que la levée ne dit pas : que le servi soit fidèle à cette
  source — c'est l'inverse, et c'est ce qui le fait débaptiser.
- **Le banc rend désormais deux divergences que ce lot a créées exprès**, et le
  registre les requalifie plutôt que de les nier : `total_numerique_absent` et
  `seuil_non_represente` sont la conséquence voulue de la débaptisation. La
  requalification vaut **parce que** le servi ne peut plus rien rendre qui se lise
  comme un verdict ; le jour où une bande y serait réintroduite, ces deux codes
  redeviendraient des divergences réelles. Un banc épingle cette absence.
- **Le rayon annonçait encore `/36`, et le moteur ne le servait plus.** Relevé en
  revue adversariale sur ce lot même. Le rayon et l'aperçu lisent le dénominateur
  dans la **définition**, jamais dans le retour du moteur : retirer le total sans
  toucher `maxTotal` laissait le praticien lire « · /36 », assigner, et ne rien
  recevoir — donc refaire à la main la somme que ce lot déclare non
  reconstructible. `scoreMax()` honore désormais `sansTotalGlobal`, la branche
  « passation vide » cesse de rendre un dénominateur que la branche pleine ne rend
  pas, et la bande tombe **avec** le total plutôt qu'à côté. C'est la clause de
  validité de la requalification ci-dessus : elle ne valait qu'à condition que le
  servi ne puisse plus rien rendre qui se lise comme un verdict.
- **La moitié de la correction moteur n'était tenue par rien** : remettre
  `maxTotal: sc.maxTotal` dans la branche `sum` laissait passer les 3 229 tests de
  la suite. Deux bancs l'épinglent maintenant, l'un nominatif sur l'instrument,
  l'autre **générique** sur tout porteur de `sansTotalGlobal` — mutations vérifiées
  rouges avant restauration.
- **Réactivé à l'assignation**, contrairement au MMSE et au repérage TDAH
  enseignant fermés à la route le même mois : celui-ci est **auto-administré**,
  rempli par le patient à la première personne.
- **Production lue avant le geste** : zéro assignation, zéro réponse, zéro pack.
  Aucun score enregistré n'est relu par la grille modifiée, aucune passation ne
  perd sa bande.

La campagne passe à **60 sur 64**.
