### Agenda du sommeil — le cadran de la nuit redevient manipulable au doigt (2026-07-29)

Le cadran livré avec la refonte de l'agenda (#427) était « laborieux à la souris,
quasi impossible au doigt » à l'essai sur téléphone. Le principe n'était pas en
cause : chaque poignée avait un **centre inerte**.

- **La cible morte** (`CadranNuit.tsx`) : chaque poignée était faite de deux
  cercles **frères** — une cible de saisie transparente `r=18` portant les
  gestionnaires, puis le cercle visible `r=13` peint **par-dessus**, sans aucun
  gestionnaire. Le hit-test SVG suit l'ordre de peinture : tout appui à moins de
  13 unités du centre atterrissait sur le cercle visible, et l'événement ne
  pouvait pas remonter vers un **frère**. Seul l'anneau 13→18 déclenchait un
  glissement, soit **6 px** à l'écran autour d'un centre inerte de 34 px —
  précisément là où l'on appuie. À la souris on accrochait l'anneau une fois sur
  deux ; au doigt, jamais. Les gestionnaires passent sur la racine `<svg>` :
  l'ordre de peinture ne décide plus de rien, l'événement remonte quel que soit
  l'élément touché.
- **Prise par proximité, non par contact** : un appui accroche la poignée la plus
  proche tant qu'il tombe dans le disque de 26 unités (~34 px) qui l'entoure. La
  cible utile passe d'un anneau de 6 px à un disque plein de ~68 px. La distance
  est **euclidienne**, et non un écart d'angle : un seuil angulaire n'aurait
  borné la prise que par le bas, laissant tout le secteur saisissable jusqu'au
  coin du cadran — un balayage de défilement posé là aurait écrit une heure de
  coucher jamais donnée (le cadran coiffe un formulaire long, avec
  `touch-action: none` sur toute sa boîte). Deux poignées voisines (mise au lit
  ouverte 30 min avant l'extinction) restent départageables — la plus proche
  gagne ; à égalité **stricte** de distance, la première dans l'ordre d'affichage
  répond.
- **L'écart de prise est conservé** : la poignée ne saute plus sous le doigt au
  premier mouvement. Personne n'appuie au centre exact d'une cible, et la pulpe
  d'un doigt couvre à elle seule une heure de cadran.
- **Zone morte centrale (25 unités)** : `atan2` près du centre balaie l'heure
  entière au moindre tremblement. Un doigt qui dérive vers le centre fige la
  valeur au lieu de la disperser.
- **Capture de pointeur sur un nœud stable** (la racine) au lieu de la cible d'une
  poignée, qui se déplace à chaque rendu ; un second doigt ne vole plus la prise
  en cours ; `releasePointerCapture` n'est appelé que si la capture tient encore.

Le chemin clavier est inchangé (flèches ±15 min, Page ±1 h, `role="slider"`), et
le focus est désormais posé explicitement à la prise — `preventDefault` supprimait
le focus implicite.

**Couverture du geste, qui n'existait pas.** Le glissement n'était testé nulle
part : le banc de `SaisieNuitForm` note lui-même que « jsdom ne calcule aucune
géométrie » et ne vérifiait que le clavier. Deux bancs s'ajoutent, et ce qui rend
le premier possible est exactement ce qui corrige le défaut — sur la racine, le
comportement ne dépend plus d'un hit-test.

- `CadranNuit.test.tsx` (16 tests, jsdom avec géométrie posée à la main) : **5
  échouent sur le code de production**, dont « un appui au centre de la poignée
  démarre le glissement ». Les deux rayons sont pinés par des tests de frontière
  (25 accroche / 27 non ; mouvement à 26 du centre appliqué / à 24 ignoré) :
  quatre mutations de constante sont tuées. Le départage à égalité **stricte**
  entre deux poignées superposées reste non couvert — le geste est récupérable
  (déplacer la gagnante, ou Tab + flèches) et le correctif est différé.
- `e2e/agenda-sommeil-cadran.spec.ts` (Playwright, projets Chromium et
  iPhone 13) : on presse à des **coordonnées**, et c'est le moteur de rendu qui
  choisit la cible — le seul angle qu'un banc jsdom ne couvrira jamais. Le geste
  y est produit par l'API pointeur de Playwright, qui n'offre pas de glissement
  tactile : ce spec couvre le hit-test, **pas** `touch-action`, le multi-touch ni
  le conflit défilement/glissement.

Aucun changement de barème, de seuil ni de donnée recueillie : `Q_SOM_09` mesure
exactement la même chose qu'avant.
