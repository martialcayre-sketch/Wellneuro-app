### Agenda du sommeil — solde des constats non bloquants du cadran (2026-07-30)

Suite de #459. La revue adversariale y avait relevé huit constats non bloquants
(N1-N8) laissés ouverts au merge. Deux étaient déjà fermés par le correctif du
constat bloquant ; les six autres le sont ici.

**Déjà fermés, vérifiés avant d'agir.** `RAYON_PRISE` était critiqué comme « pas
un rayon » — un seuil de longueur d'arc portant un nom de rayon (N2) ; il est
comparé depuis #459 à une distance euclidienne à la poignée, donc c'en est un.
L'indentation des blocs de props (N8) est à +2 de leur élément partout. Rien à
faire, et surtout rien à inventer.

**N1 — une poignée superposée était inatteignable au doigt.** Deux poignées de
même valeur sont à la même distance de *tout* appui, et tout se cale sur la grille
de 15 min : il n'y a qu'un cran à franchir pour les superposer. Le départage `<`
strict donnait alors toujours la première dans l'ordre d'affichage — le patient
voyait « la mauvaise poignée bouge » sans explication, et la seconde ne répondait
plus jamais.

Deux règles : un **filtre** — s'il existe des poignées non confirmées parmi les
ex-aequo, la réponse se cherche parmi elles seules, car c'est le geste qui les fera
exister que la doctrine du composant réclame — puis une **rotation** dans le groupe
retenu, qui désigne celle suivant la dernière prise. Des appuis successifs au même
endroit parcourent donc **tout** le groupe.

La rotation porte sur le groupe et non sur un duo : une première rédaction
préférait deux à deux, ce qui ne sait permuter qu'entre deux éléments et laissait la
**troisième** d'un groupe de trois définitivement injoignable. La configuration est
cliniquement absurde — trois repères de la nuit à la même minute —, mais une règle
qui ne tient que pour deux ne se décrit pas comme close.

L'**ordre** des deux règles n'est pinné par aucun test, et ce n'est pas un oubli :
filtre et rotation ne peuvent pas se contredire tant que le parent applique les
valeurs qu'on lui remonte, ce que fait la seule surface existante. Les séparer
exigerait un parent non appliquant — un test du harnais, pas du composant.

**N3 — la projection écran → cadran supposait une boîte carrée sans le vérifier.**
Elle divisait `x` par la largeur et `y` par la hauteur, indépendamment : la
projection d'un `preserveAspectRatio="none"`, alors que le défaut SVG est
`xMidYMid meet` (échelle uniforme puis centrage). Les deux formules coïncident
tant que la boîte est carrée — elle l'est aujourd'hui —, mais la prémisse n'était
nulle part vérifiée et décide désormais aussi de la zone morte et de la distance
aux poignées. La projection réelle du navigateur est maintenant reproduite.

**N4 — un `pointerup` perdu condamnait la saisie.** Onglet masqué, geste
interrompu par le système : sans `pointerup`, le pointeur actif restait armé et
refusait *toute* prise ultérieure pour la durée du montage, sans chemin de
réinitialisation. Le navigateur émet `lostpointercapture` dans tous les cas ; il
sert désormais de filet. Après un relâchement normal l'appel est inerte.

Le filet ne relâche que si la capture **n'est plus à nous**. Sans ce filtre il
pourrait couper le geste qu'il est censé protéger : sur tactile la capture
implicite appartient d'abord au cercle touché, et la poser sur la racine fait
émettre `lostpointercapture` sur l'**ancienne** cible — d'où l'événement remonte
jusqu'à la racine avec le pointeur en cours. Le tap confirmerait alors l'heure
suggérée et le glissement ne ferait plus rien, sur le doigt, sur le geste le plus
courant. Chromium ne produit pas cette séquence (mesuré) ; WebKit, le moteur de
l'iPhone, n'est pas mesuré — le filtre rend la question sans objet.

**N5 — `onChange` remontait chaque `pointermove`.** Le pas étant de 15 min
(~9 unités d'arc), la plupart des mouvements retombent sur la valeur déjà
affichée. Seuls les changements sont remontés : le parent, qui écrit dans son état
à chaque appel, ne porte plus le rythme du doigt.

**N6/N7 — couverture.** Un troisième test E2E ajouté : un balayage parti dans
l'axe d'une poignée mais **loin de l'anneau**. C'est le seul des trois qui échoue
sur la première version du correctif de #459, où la prise n'était bornée qu'en
angle. Les deux autres passaient aussi sur le code d'avant — ils gardent l'excès
de prise, pas la correction. Reste non couvert, et assumé : `touch-action`, le
multi-touch et le conflit défilement/glissement, que l'API pointeur de Playwright
ne sait pas produire.

**23 tests** au banc jsdom (16 avant). Sept mutations, sept tuées : départage `<`
strict, préférence deux-à-deux au lieu de la rotation de groupe, retrait du filtre
« non confirmée », ancienne projection, retrait de `onLostPointerCapture`, filet de
capture indiscriminé, retrait de la garde d'égalité.

Deux tests ont été **écartés à la rédaction**, parce qu'ils passaient avec le défaut
qu'ils prétendaient garder — un test qui passe avec le défaut ne garde rien :

- « on accroche encore la poignée sur une boîte 400 × 300 » : l'erreur de projection
  y est de ~17 unités, sous le rayon de prise de 26, donc l'appui réussit quand
  même. Seule la valeur produite par le glissement est fausse, et c'est elle que
  mesure le test conservé.
- « la mise à l'échelle prend le plus petit rapport » (`meet` contre `slice`) : les
  deux projections sont uniformes et centrées symétriquement, donc **toutes deux
  préservent l'angle** depuis le centre. L'heure ne dérivant que de l'angle, les
  échanger ne change aucune valeur — seul le rayon effectif de prise se met à
  l'échelle. Il faudrait une boîte deux fois plus haute que large pour rendre la
  différence observable, ce qu'un viewBox carré en `w-full` ne produit jamais.

Un troisième a été écarté pour une autre raison : l'**ordre** des deux règles de
départage ne peut être séparé qu'avec un parent non appliquant (voir N1).

Aucun changement de barème, de seuil ni de donnée recueillie.
