### La page ne saute plus sous le doigt — et la mesure qui l'a établie réfute sa propre hypothèse (2026-09-16)

Le flake `fiche-trajectoire-peuplee` (iPhone 13) était ouvert depuis le
2026-09-07, décrit comme « dépendant de la charge ». Une contre-analyse Codex a
proposé un mécanisme ; **vérifié un par un, puis mesuré, il tient à moitié** — et
la moitié qui tombe est celle qui comptait.

**CE QUE LA CONTRE-ANALYSE ÉTABLIT, ET QUI A ÉTÉ VÉRIFIÉ AU TRACE.** La requête
`/api/praticien/ce-qui-compte` démarre à `12:21:50.526` et dure **607,208 ms** :
sa réponse tombe à `12:21:51.133`, soit **entre l'appui (.132) et le relâchement
(.138)** du geste visant « Retour au présent ». `CeQuiComptePanel` est rendu
**au-dessus** de la fiche-trajectoire, et sa ligne « Chargement des dépôts… »
(22 caractères) cède la place à un paragraphe de cent caractères qui se replie.
La mise en page grandit pendant le geste.

**ET LA MESURE A RÉFUTÉ LA CONCLUSION.** Un banc E2E instrumenté enregistre
désormais, en phase de capture au niveau `document`, la cible native de
`pointerdown`, `pointerup` et `click`, en libérant `/ce-qui-compte` **à la main**
entre l'appui et le relâchement. Résultat, en WebKit iPhone 13 :

```
pointerdown  scrollY=1222  haut du bouton=310
pointerup    scrollY=1272  haut du bouton=309
click        → BUTTON:Retour au présent
```

Les cinquante pixels sont là. Mais **l'ancrage de défilement du navigateur les
compense** : la page glisse, le bouton reste à la même place à l'écran, et le
clic atteint sa cible. Le mécanisme proposé — `pointerup` égaré sur le `DIV` —
**ne se reproduit pas dans l'application réelle**, quel que soit ce que montre un
prototype isolé. **La cause de l'échec CI reste donc ouverte.**

**MAIS LE DÉFAUT MESURÉ EST RÉEL, ET IL N'EST PAS UN DÉFAUT DE TEST.** Un
praticien qui vise du doigt pendant que la page glisse de cinquante pixels ne
tape pas forcément ce qu'il voulait. Sur la fiche d'un patient, un appui qui
atterrit ailleurs n'est pas un désagrément — et rien ne garantit que l'ancrage
compense toujours. La place est donc réservée en amont : le plancher de hauteur
est posé **des deux côtés**, chargement et état résolu.

**TROIS RÉDACTIONS, ET LES DEUX PREMIÈRES ÉTAIENT FAUSSES.**

1. Réserver par le **texte de l'état résolu rendu invisible** : hauteur juste à
   toute largeur — mais « Aucun dépôt à ce jour » entrait dans le DOM **pendant
   le chargement**. Le banc de `CeQuiComptePanel` a rougi, et il avait raison :
   il garde que le chargement ne soit « ni absence, ni alerte ». **Rendre un
   texte invisible ne le rend pas absent.** Le garde n'a pas été touché ; c'est
   la réserve qui a changé.
2. Poser le plancher **du seul côté du chargement** : le saut tombe de 50 px à
   **2 px**, puis se rejoue dans l'autre sens à la résolution. Une réserve posée
   d'un seul côté ne réserve rien.
3. Plancher des deux côtés : **0 px**.

**LE BANC GARDE SA PROPRE PRÉCONDITION.** Sans elle il passerait à vide — il
suffirait que le panneau se résolve avant l'appui pour qu'il verdisse sans rien
éprouver. Il exige donc d'avoir enregistré un appui ET un relâchement sur la
sortie, avant de mesurer quoi que ce soit. Un banc qui ne peut pas prouver qu'il
a produit la situation qu'il teste est muet — c'est la troisième fois en deux
jours que ce motif se paie.

**Ce qui reste ouvert** : la cause de l'échec CI du 2026-09-15. Ce lot supprime
une course réelle qui en était la meilleure candidate, sans démontrer qu'elle en
était la cause. Le harnais de reproduction locale, lui, fonctionne désormais de
bout en bout — base jetable, migrations, `NEXTAUTH_URL` aligné — et les deux
tests de `fiche-trajectoire-peuplee` passent en local.

**LA RÉFÉRENCE VISUELLE A ÉTÉ REGÉNÉRÉE, ET ELLE DIT LE PRIX.** Réserver une
hauteur déplace tout ce qui suit : `fiche-trajectoire-onglet` a rougi sur les
deux projets (29 778 px et 16 154 px, seuil 100). Les huit baselines ont été
reproduites dans l'environnement de référence ; **six reviennent octet pour
octet identiques** alors que `--update-snapshots=all` les réécrit sans juger —
le changement n'a donc fui nulle part ailleurs. Sur les deux qui bougent, la
bande de lignes touchées commence **juste sous le message de la carte « Ce qui
compte »** et court jusqu'en bas : la signature d'un bloc qui grandit, et non
d'un écart dispersé qui l'aurait contredite.

**Ce que la nouvelle référence montre, et qu'il faut dire** : à 1 440 px le
message d'absence tient sur une ligne, la réserve en vaut trois — la carte porte
désormais une quarantaine de pixels de blanc sous son texte. À 390 px, la
largeur où le saut a été mesuré, les trois lignes sont pleines et la carte est
juste. Le blanc du bureau est le prix du plancher unique ; le régler par
paliers de largeur reviendrait à deviner une hauteur par point de rupture —
exactement la sélection qui se périme en silence que ce dépôt paie déjà ailleurs.
