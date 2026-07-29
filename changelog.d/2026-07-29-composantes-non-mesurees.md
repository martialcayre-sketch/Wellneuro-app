### Moteur de scoring — les sept moteurs restants cessent de rendre un axe à zéro

Clôture de la réserve nommée par le lot du 2026-07-29 sur les sous-scores : la garde
« un axe non répondu vaut `null`, jamais zéro » n'y portait que sur les six moteurs
déclarant `scoring.subScores`, plus HAD. Huit instruments rendaient encore un axe à
zéro via **sept autres moteurs** — `idtas_ae` (`parts`), `psqi` (`components`), `qif`,
`francis`, `sigh_sad_sa`, `sum_two_phases` (`phases`) et les `dimensions` de `sum` —
auxquels s'ajoutait le total global de `plaintes_actuelles`.

**Impact sur les passations existantes : nul, et c'est mesuré.** Quinze passations sont
enregistrées sur ces neuf instruments (`Q_MOD_03` 9, `Q_SOM_01` 4, `Q_FIB_02` 2) ; les
quatorze qui portent des réponses brutes les portent **toutes intégralement** — 7/7,
18/18, 20/20. La quinzième n'en porte aucune et n'est pas rejouable. La valeur de ce lot
est **prospective**, comme celle du précédent, et pour la même raison : « Mon équilibre »,
la trajectoire et le panneau « Mode de vie » **rejouent** `calculateScore` à chaque
affichage.

- **Mesuré avant d'écrire une ligne.** En ne renseignant que le PREMIER axe de chaque
  instrument, **25 axes sur 31 sortaient chiffrés**. Dans les deux directions. Vers le
  rassurant : « Pas de trouble du sommeil » sur un PSQI d'un item ; « Valeurs normales »
  (Francis) sur une dimension de cinq ; « Score peu compatible avec le diagnostic de
  fibromyalgie, sauf guérison ou très bonne évolution » sur un QIF non rempli ; « Le
  problème n'est probablement pas saisonnier » sur un score GSS jamais recueilli. Vers
  l'alarmant : « Trouble de la mémoire épisodique — consultation neurologique » sur un
  rappel différé que personne n'avait demandé.
- **`Q_SOM_01` (PSQI) était le pire cas.** Il est source de **poids 2** du besoin 5 de
  « Mon équilibre », en `inverser: true` et en niveau de preuve **A** : un total bas y
  devient une couverture HAUTE du repos. Un item sur dix-huit rendait 2 sur 21, soit
  **0,90 de couverture**. Même forme que le défaut HAD du lot précédent, sur un autre
  besoin.
- **Deux fabrications se cumulaient dans le PSQI.** Les valeurs de repli — coucher à
  23 h, endormissement en 30 min, lever à 7 h, sept heures dormies — qui produisaient une
  durée et une efficacité de sommeil d'un patient n'ayant renseigné aucune des quatre. Et
  le `||` qui appliquait la même valeur de repli à une réponse **légitime valant 0** : un
  coucher à minuit se lisait 23 h, et **zéro heure dormie se lisait sept**. La réponse la
  plus grave de l'échelle rendait donc la plus rassurante. Même défaut sur le `||` de
  `francis`, où une absence de douleur déclarée retombait sur l'identifiant hérité.
- **Les composantes du PSQI exigent désormais TOUS leurs items**, et non un seul. Ce sont
  des lectures de SEUIL, pas des sommes : un sous-ensemble biaise vers le bas, et une
  grille lue par le bas conclut. Doctrine posée sur Karasek au lot précédent, appliquée
  ici à `psqi`, à la bande GSS d'`idtas_ae` et à l'alerte du test des 5 mots.
- **Les deux booléens cliniques de `Q_NEU_12` sont tranchés** — question ouverte depuis le
  2026-07-28. `suicidalIdeation` et `probableMajorDepression` valaient `false` sur un
  dépistage non passé, et partaient tels quels au modèle de synthèse via
  `scoresPourPrompt`. Ils valent `null` quand la question n'a pas été posée. Nouvelle
  règle, `seuilMonotone` : un seuil qui ne peut que MONTER reste affirmable `true` sur un
  comptage incomplet — six « oui » sur neuf dépassent un seuil de cinq quels que soient
  les trois derniers items. C'est le `false` qui exige le comptage complet. Exiger la
  complétude dans les deux sens aurait effacé des dépistages positifs, l'erreur inverse
  et pire.
- **Une dimension reste descriptive.** Les `dimensions` de `sum` passent à `null` quand
  personne n'y a répondu, mais **ne font pas tomber le total global** : elles n'y
  contribuent pas. C'est la différence avec les composantes, et elle est testée —
  `Q_GEO_04` (MMSE) partiel garde son total et perd ses cinq dimensions vides.
- **`composite_multi_parties` reçoit la même garde**, bien qu'aucun instrument du
  catalogue ne le serve aujourd'hui : un moteur qui porte encore ce défaut est à une
  entrée de catalogue de le remettre en production, et sa bande basse est la rassurante.

**Consigne de synthèse `v11`** — la réserve du lot précédent arrivait à échéance, et ce
lot la rendait exigible : il fait arriver au modèle des `null` là où il ne voyait que des
zéros. Trois corrections. La phrase sur le total global n'énonçait que DEUX régimes (« il
exclut l'axe manquant, ou le compte pour zéro ») ; il en existe un troisième — le total
global tombe lui-même à `null` — qui est désormais celui des sept moteurs corrigés. La
dernière ligne confondait « cet instrument n'a pas de score global » (vrai du Karasek) et
« son score global n'a pas pu être établi » : les deux cas sont distingués. Et les
**quatre porteurs de découpages jamais décrits** — `parts`, `components`, `phases`,
`categories` — le sont, avec la règle du `null` et celle des booléens : *un booléen absent
de réponse n'est pas un booléen à faux*. Les décrire supposait d'abord de trancher les
booléens de `Q_NEU_12`, sans quoi la consigne aurait décrit un faux.

Quatorze tests neufs et **douze preuves par mutation** — dont celle qui replace le repli
de 23 h, celle qui rend `seuilMonotone` à `atteint` seul, et celle qui lit la bande GSS
sur une somme partielle.

**Réserve nommée.** Le banc de couplage consigne / charge
(`promptSousScores.guard.test.ts`) déclare encore `parts`, `components` et `categories`
« hors périmètre » de son balayage exhaustif : la consigne v11 les décrit et des tests
ciblés le vérifient, mais le balayage systématique des sept porteurs reste à écrire.
Par ailleurs `Q_GEO_04` et `Q_CAR_01` rendent toujours un total global et une bande sur
une passation partielle — c'est le moteur `sum`, et la question « combien d'items faut-il
pour qu'un instrument soit interprétable » est un arbitrage clinique, pas un lot de code.
