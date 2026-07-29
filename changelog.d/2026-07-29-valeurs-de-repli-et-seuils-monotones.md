### Moteur de scoring — une donnée absente cesse d'être lue comme une donnée basse

Suite immédiate du lot « un axe non mesuré vaut `null` sur les neuf moteurs restants ».
Cette garde-là répond à « **cet axe a-t-il été mesuré ?** ». Quatre résidus vivaient
ailleurs, et lui échappaient par construction : dans un axe **mesuré** dont une réponse
légitime est écrasée par une valeur de repli, et dans une **grille** lue sur un comptage
incomplet. Tous mesurés sur `c1d44b9`, aucun introduit par ce lot.

- **PSQI — `0` est falsy, et les quatre items d'horaires admettent `0` comme réponse.**
  Les valeurs de repli (23 h, 30 min, 7 h) devaient compléter une composante
  *partiellement* renseignée ; en `||`, elles écrasaient aussi celles qui l'étaient.
  **Zéro heure de sommeil déclarée se lisait sept** : `C3` sortait à 1 (« 6 à 7 h ») au
  lieu de 3, `C4` à 0 — la meilleure efficacité possible — et le total à 2 sur 21. La
  réponse la plus grave de l'échelle rendait la plus rassurante. Un coucher à minuit se
  lisait 23 h (efficacité 75 % au lieu de 86 %), un endormissement immédiat 30 minutes.
  Corrigé en `??` : le repli ne remplace plus qu'une **absence**, ce qu'il annonçait.
- **Francis — même classe sur la chaîne d'identifiants.** `getVal('FR_Q002') || getVal('FR1') || 0`
  : une intensité déclarée à `0` — « aucune douleur » — retombait sur l'identifiant
  hérité et pouvait ressortir sous *sa* valeur.
- **Seuils monotones — `true` s'affirme tôt, `false` exige le complet.** `probableMajorDepression`
  rendait `false` dès que la partie était mesurée, c'est-à-dire dès **un** item : deux
  « oui » sur neuf sortaient « pas de dépression majeure probable », d'un patient à qui
  sept questions n'avaient pas été posées. Idem pour `winterPatternLikely` sur un
  instrument saisonnier. Un comptage ne peut que **monter** : le franchissement observé
  est définitif — six « oui » dépassent un seuil de cinq quels que soient les trois
  derniers items — mais le **non**-franchissement ne vaut que sur un comptage complet.
  L'asymétrie est le point : exiger la complétude dans les deux sens effacerait un
  dépistage **positif**, l'erreur symétrique et la plus coûteuse.
- **QIF — la bande du zéro est une lecture de PLANCHER.** Une réponse dans chacun des
  quatre blocs, toutes au minimum — **quatre sur vingt** — rendait les quatre composantes
  *mesurées*, le total à 0, et « Score peu compatible avec le diagnostic de fibromyalgie,
  sauf guérison ou très bonne évolution ». La garde des axes ne pouvait pas l'attraper :
  aucun axe n'est vide dans ce cas. Le plancher exige désormais la passation entière ;
  une passation partielle **non nulle** garde sa bande.
- **`composite_multi_parties`** — sa grille n'exigeait que « le score existe », là où
  celle d'`idtas_ae` exige le comptage complet. « La même garde » n'en était pas une.
  Moteur non servi par le catalogue, mais à une entrée de catalogue d'y revenir.

Nouveau helper `estComplet`, à côté d'`aUneMesure` et **sans la remplacer** : la première
dit si un axe est *mesuré*, la seconde si une *grille* peut y être lue. C'est la doctrine
posée sur le Karasek — « un seuil ne se lit que sur un axe complet » — étendue aux
moteurs dont le découpage est codé en dur.

Neuf tests neufs et **huit preuves par mutation**, dont celle qui replace `|| 7` sur les
heures dormies, celle qui rend `seuilMonotone` à `atteint` seul, et celle qui fait passer
`estComplet` pour vrai sur une liste vide — un axe déclaré sans items rendrait alors un
verdict négatif.

**Non retenu, et nommé plutôt qu'appliqué en silence.** Sur SIGH-SAD-SA, la charnière
15-17 appartient aux deux groupes et suffit à les déclarer mesurés tous les deux : le seul
`SIGH_Q015` renseigné rend A à 1, B à 1 et un total de 2 sur vingt-cinq items. C'est une
conséquence assumée du contrat « un axe est mesuré dès qu'un de ses items l'est », posé et
testé au lot précédent — le changer est un **arbitrage clinique** et non un correctif, et
il n'est pas pris ici.
