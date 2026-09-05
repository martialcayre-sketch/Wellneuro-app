### Le seuil de comparaison visuelle passe de supposé à mesuré (2026-09-05)

La comparaison au pixel tolérait `maxDiffPixelRatio: 0.02`. Personne n'avait
mesuré le bruit qu'elle était censée absorber : on le déduisait des baselines
qui passent, ce qui donne un **majorant**, pas une mesure.

**La mesure a été prise en se servant du CI comme d'un instrument.** Une passe à
`maxDiffPixels: 0` — dont le rouge était le but, jamais destinée à être fusionnée
— a fait dire à Playwright le nombre exact de pixels séparant l'image produite
par `visual-baselines` (seed vierge, `visual.spec.ts` seul) de celle que rend
`verify` (base écrite par les 21 autres specs). Run 33923782703 :

| écran | Chromium | WebKit | ancien budget à 2 % |
|---|---|---|---|
| `fiche-cockpit` | 31 px | 0 | 48 960 px |
| `fiche-tiroir-besoins` | 17 px | 0 | 25 920 px |
| `fiche-trajectoire-onglet` | 33 px | 0 | 30 470 px |
| `portail-connexion` | 0 | 0 | 7 560 px |

**Cinq comparaisons sur huit sont identiques au bit près.** L'écart maximal entre
le monde où une baseline naît et celui où elle est jugée est de **33 pixels**,
soit un tiers de caractère. Le seuil en tolérait 1 483 fois plus.

C'est ce qui explique #872 sans rien invoquer d'autre : une baseline périmée
pouvait rester verte en photographiant un état que le code ne produisait plus.

**Le seuil devient `maxDiffPixels: 100`**, borné des deux côtés et les deux
bornes calculées : trois fois le maximum observé pour plancher, et sous les
196 px de boîte d'une icône de statut de 14 px pour plafond — le plus petit
élément dont le changement doit rougir.

**Absolu et non ratio.** Le tableau montre le défaut en passant : les mêmes 2 %
achetaient 48 960 px au cockpit contre 7 560 à `portail-connexion`. L'indulgence
suivait la taille de l'image, pas l'importance de l'écran — et des pixels morts
gonflaient le dénominateur (`#871`).

**Une garde, parce que le mode de défaillance ici n'est pas l'erreur mais la
facilité** : desserrer le seuil pour faire taire un rouge ne laisse dans le diff
qu'un chiffre qui grandit. `scripts/seuil-visuel.test.mjs` exige un seuil absolu
sous 196 px, et lit la source privée de ses commentaires — un seuil cité en prose
n'est pas un réglage. Prouvée rouge sur quatre mutations : `500`, `197` (un pixel
au-dessus de la borne), le retour au ratio, et le cas où le seuil ne survit qu'en
commentaire.
