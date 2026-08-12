### Modifié

- **La consigne système explique enfin le repère de passation courante**
  (`synthese-v20`, LOT-01 étape 3). Depuis l'étape 6, chaque ligne du bloc
  transmis au modèle porte `passationCourante` — et la consigne n'en disait
  rien. Une donnée présente et inexpliquée est pire qu'absente : le modèle
  pouvait l'ignorer, ou lui prêter un sens qu'elle n'a pas, un degré de
  fiabilité au lieu d'un repère de récence.

### Ce que la nouvelle section autorise

- **Décrire l'écart entre deux passations d'un même instrument**, en le datant
  explicitement. C'est souvent la matière la plus utile au praticien, et c'est
  la raison pour laquelle les passations antérieures sont transmises.

### Ce qu'elle interdit — et c'est le cœur

- **Qualifier cet écart de progrès, d'aggravation ou d'effet d'une prise en
  charge.** Deux mesures qui diffèrent disent qu'elles diffèrent ; elles ne
  disent ni pourquoi, ni ce qui l'a causé. Sans cet interdit, la comparaison
  entre deux passations fabrique de la causalité à chaque synthèse (`DC-27`).
- **Moyenner deux passations, les additionner, fabriquer une valeur
  intermédiaire.** Si elles se contredisent, la divergence se dit : elle ne se
  lisse pas (`DC-30`) — la même règle que le moteur de contradictions applique
  côté déterministe. Les deux surfaces disent désormais la même chose.
- **Lire `passationCourante: true` comme un gage d'exploitabilité sur une
  passation non interprétable.** Le repère dit laquelle est la plus récente, pas
  laquelle est valable : la section précédente de la consigne continue de
  s'appliquer intégralement.
- **Prêter un sens à un `true` isolé.** Un instrument passé une seule fois porte
  `true` sans que cela signifie quoi que ce soit de plus.

### Détails

- `false` est présenté comme une **information**, pas comme une absence : la
  passation a été remplacée, elle n'est pas devenue douteuse (`DC-24`).
- **Le couple version/empreinte est reporté ensemble**, comme le verrou
  l'exige : `synthese-v20` et `c67522b7b1207c39`. Un bump de l'un sans l'autre
  fait rougir le garde.
- Un banc dédié garde le contenu de la section — nom exact du champ, motif de la
  transmission des antérieures, et chacun des interdits. Retirer la section fait
  rougir huit de ses neuf cas.

### Ajouté — visibilité

- **La matrice de consommation du savoir connaît la table de contradictions.**
  Ses sources sont déclarées à la main : sans cette entrée, la source de savoir
  clinique la plus récente du dépôt aurait été la seule que l'instrument censé
  les recenser ne voyait pas. Elle y figure avec son drapeau, ses deux verrous
  et sa signature — **« non »**, l'état réel.
