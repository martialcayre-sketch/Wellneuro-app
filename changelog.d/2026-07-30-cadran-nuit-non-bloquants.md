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
plus jamais. Deux règles la rendent joignable : la poignée **non confirmée**
d'abord (celle qui attend encore le geste qui la fera exister), puis, à statut
égal, celle qui **n'a pas été prise au coup précédent** — deux appuis successifs
au même endroit alternent donc entre les superposées. À défaut, l'ordre
d'affichage tranche, comme avant.

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

**22 tests** au banc jsdom (16 avant). Chaque correctif ci-dessus est prouvé par
mutation : rétablir le départage `<`, l'ancienne projection, retirer
`onLostPointerCapture` ou la garde d'égalité fait rougir le test correspondant.

Un test a été **retiré** plutôt qu'ajouté : vérifier qu'on accroche encore la
poignée sur une boîte 400 × 300 passait *avec* le défaut de projection — l'erreur
de ~17 unités reste sous le rayon de prise de 26, donc l'appui réussit quand même.
Seule la valeur produite par le glissement est fausse, et c'est elle qu'on mesure.
Un test qui passe avec le défaut ne garde rien.

Aucun changement de barème, de seuil ni de donnée recueillie.
