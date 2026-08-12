### Corrigé

- **Le repère de passation courante ne désigne plus une passation sous un
  identifiant qui a servi à deux questionnaires différents** (`D-051`).
  `Q_ALI_01` résout vers le dépistage court à 14 items (total /42) ou l'Enquête
  alimentaire SIIN à 57 items (total /90) selon `WN_ALI_01_SIIN57` : deux
  instruments distincts, pas deux versions du même — le banc de certification a
  comparé les libellés position par position et trouve des similarités de 0,00 à
  0,33. Le repère répond « laquelle fait foi », question sans objet entre deux
  instruments : à l'allumage du drapeau, une passation sur 90 aurait été
  présentée comme l'état actuel à la place d'une passation sur 42, et l'écart de
  total se serait lu comme une évolution clinique.

### Le défaut est antérieur, la capacité qui l'active ne l'était pas

- **Rien de ce lot n'a créé cette ambiguïté** : elle vit dans le catalogue
  depuis que la forme 57 y coexiste avec la forme 14, et le drapeau est éteint.
  Ce qui change est qu'un repère livré à l'étape 6 l'aurait rendue **active** au
  premier allumage. Corriger ici plutôt que le noter au handoff, c'est refuser
  de publier en connaissance de cause.
- Cette correction **ne répare pas le fond** : un identifiant qui désigne deux
  instruments reste une ambiguïté du catalogue. Elle empêche un raisonnement
  faux ; elle ne rend pas les deux formes comparables (`DC-25`).
- **Portée nommée** : le repère de la synthèse IA seulement. L'orientation
  groupe par le même identifiant, et `R2-ALI-01` cible bien `Q_ALI_01` — mais
  une garde existante la protège, et elle nomme ce cas : `calculateScore` rend
  `scored: false, interpretation: null` dès qu'aucune réponse ne correspond aux
  items de la définition servie, « c'est le cas des 8 passations de la forme
  courte à 14 items ». Une passation de la mauvaise époque ne peut donc pas
  déclencher une règle qui porte sur l'interprétation. Ce qui reste ouvert : un
  moteur qui déclencherait sur autre chose — un compte, une date — retrouverait
  le piège intact.

### Détails de conception

- **Marquer, pas taire.** Retirer le repère sans rien dire aurait été lu comme
  le cas « aucune passation exploitable » que la consigne décrit déjà : un motif
  faux à la place d'un motif vrai, c'est-à-dire une dimension mesurée présentée
  comme non mesurée. Le motif arrive donc sur la ligne
  (`formeInstrumentAmbigue`), au patron d'`ecarteeDuRaisonnement`.
- **Le seuil est deux passations EXPLOITABLES.** Avec une seule, il n'y a rien à
  départager et le repère reste vrai ; s'en abstenir coûterait un repère juste.
  Compté sur les passations non écartées, pas sur tout ce qui est transmis : une
  paire dont l'une est invalidée n'a qu'une mesure, et la ligne écartée ne porte
  jamais les deux marqueurs à la fois.
- **L'abstention ne lit pas le drapeau.** Le risque naît de la coexistence de
  passations des deux époques dans un dossier — un état que le drapeau éteint
  n'exclut plus une fois qu'il a été allumé une fois. Un banc joue les deux
  positions et attend le même verdict.
- Écarté : **déduire la forme depuis les identifiants d'items** (`AL1`…`AL14`).
  Plus fin, mais cela ferait dépendre un repère clinique d'une heuristique sur
  des clés de réponses brutes, pour une précision nulle tant qu'aucun dossier ne
  mélange les deux formes.

### Consigne système

- **`synthese-v24`**. La section « Plusieurs passations » distingue désormais
  les **deux causes** d'une absence de repère — « rien d'exploitable » et
  « exploitable mais incomparable » —, et interdit de lire deux barèmes
  différents comme une discordance : signaler une divergence est un devoir entre
  deux mesures du même instrument (`DC-30`), une erreur entre deux instruments
  différents.
- **La v23 avait refait la faute qu'elle corrigeait**, et la revue l'a vue : le
  nouveau cas était décrit en tête de section, mais la puce qui **autorise**
  l'écart n'excluait toujours que les passations écartées. Le modèle lisait « ne
  les compare jamais » en haut, puis une permission explicite de dater l'écart
  plus bas. C'est mot pour mot le défaut de la v21, sur une autre phrase. La
  puce porte désormais les deux exclusions — v24.
