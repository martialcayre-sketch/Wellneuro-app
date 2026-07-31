### Corrigé

- **Agenda du sommeil — la page de saisie défile de nouveau sous le cadran.** Sur
  téléphone, un balayage vertical posé n'importe où sur le cadran des heures ne
  faisait rien défiler : le `<svg>` portait `touch-action: none` sur toute sa
  boîte, soit environ 300 × 300 px, alors que les zones où le geste sert
  réellement à quelque chose — les disques de prise, rayon `RAYON_PRISE` — n'en
  couvrent que 8 à 15 % selon le nombre de poignées visibles. Le formulaire est
  long et le cadran le coiffe : un patient dont le pouce tombait sur le cadran
  était bloqué.

  Le correctif de prise (#459, #467) avait déjà borné la **saisie** par distance
  euclidienne : un balayage hors des poignées n'écrivait plus d'heure fausse. Il
  restait pourtant **avalé** — le geste ne faisait rien du tout, ni écrire ni
  défiler. C'est cette seconde moitié que ferme ce lot.

  Le blocage se décide désormais **geste par geste**, en JavaScript, et non plus
  par une zone CSS figée au premier contact : un écouteur `touchmove` non passif
  n'appelle `preventDefault()` que si une poignée est effectivement tenue. La
  prise étant déjà tranchée au `pointerdown`, le premier `touchmove` sait déjà si
  le geste sert à quelque chose. La racine passe de `touch-none` à
  `touch-manipulation` : le pincement pour zoomer redevient possible tant
  qu'aucune poignée n'est tenue, seul le zoom au double-tapotement disparaît —
  qu'un patient confirmant deux poignées voisines coup sur coup déclenchait sans
  le vouloir.

  Trois voies ont été écartées, et le code dit pourquoi (`CadranNuit.tsx`) :
  `touch-action: none` sur la racine — l'état antérieur —, le basculer en JS au
  `pointerdown` (sans effet, la valeur est lue au premier contact), et `pan-y`
  sur la racine (aux flancs du cadran la poignée se déplace précisément vers le
  haut ou le bas ; le navigateur reprendrait le geste en plein glissement).

  **Ce qui reste à éprouver sur un iPhone réel.** Le correctif suppose que WebKit
  diffère l'engagement du défilement jusqu'à l'exécution de l'écouteur non
  passif. S'il s'engageait avant, le premier `touchmove` arriverait déjà non
  annulable et le glissement serait repris par la page — dégradation propre
  (`pointercancel` coupe la prise), jamais corruption : l'erreur résiduelle est
  bornée au *touch slop*, soit au plus un cran de 15 minutes, là où l'état
  antérieur laissait la poignée suivre tout le balayage. jsdom ne modélise pas le
  compositeur, et les E2E existants pilotent le cadran à la souris — insensibles
  à `touch-action`. Les bancs prouvent le prédicat, pas la tenue du geste au
  doigt.
