### Deux tables cliniques passent du mécanisme à la règle : le praticien a attesté, l'outil a transcrit (2026-09-17)

Les deux verrous livrés éteints la veille sont armés. Ce n'est pas un changement
de code qui les ouvre : c'est une relecture, puis une déclaration de conformité
en séance. **La recopie des quatre champs est mécanique et ne vaut que portée
par elle** (`D-195` §1).

**La table du repli** (`D-223`). Les trois constats `REPLI-01` à `REPLI-03` ont
été relus mot à mot et déclarés conformes. Leurs bornes n'ont aucune source
clinique — rien au dépôt ne traite du repli thérapeutique — et n'ont pas pu être
calibrées sur l'observé, la production ne portant aucune action de protocole.
**La ratification EST leur provenance, la seule qu'elles auront jamais**, et le
module le dit en clair.

**Le catalogue de conduites** (`D-224`) reçoit sa première ligne :
`insomnie_jambes_sans_repos`, la mieux fondée des trois proposées. Les deux
autres sont retenues, pas écartées — le périmètre se hache en entier, donc elles
arriveront par une nouvelle attestation sur un périmètre élargi.

**Une désignation de claim était fausse, et seule la lecture du texte le
montrait.** La surface de relecture citait `WN-CL-0320-002` en claim
d'instrument pour les trois lignes. Lu en production, ce claim fonde le **HAD** ;
la ligne signée se déclenche sur l'**IRLS**. Rien dans la chaîne n'aurait vu
l'écart : le sha atteste le contenu relu, pas sa pertinence ; le registre des
sources est dense sans trou, donc une vérification d'existence passe ; le CI
n'atteint que la forme. Le champ est désormais **vide, et ce vide est une
déclaration**. Deux claims prescriptifs indépendants — `WN-CL-0320-003` et
`WN-CL-0318-020`, issus de deux documents distincts — fondent l'indication.

**Le raccourci de la ligne est nommé dans le périmètre haché.** Les claims
fondent la conduite sur le syndrome constaté ; le déclencheur lit une bande de
score. Le pas de l'un à l'autre est assumé, écrit dans `raccourciAssume`, donc
dans le sha — le reformuler périme l'attestation, et un banc le prouve plutôt
que de le promettre.

**Le contrat SQL de fraîcheur n'exige pas `prescriptif` du catalogue de
conduites**, et l'intuition va dans l'autre sens. La table range ses claims en
trois catégories, et `claimsInstrument` fonde l'instrument dont le déclencheur
lit le score : un claim de cette forme décrit et ne prescrit rien — ce n'est pas
une hypothèse, `WN-CL-0320-002` est `prescriptif = false` en production.
L'exigence rejetterait une désignation valide dès la deuxième ligne (`DC-14`,
`D-046`).

**Une table qui entre au contrat SQL entre aussi à son test négatif.** Les deux
paires `conduites` n'étaient d'abord exercées que par le cas « corpus sain » :
un prédicat qui aurait exempté `table_signee = 'conduites'` de `statut`,
`active` et `superseded_at` serait resté vert sur les dix cas. Le cas **`N10`**
ferme cette porte, comme `N7`, `N8` et `N9` l'avaient fait pour les trois tables
précédentes. Constat de revue, et il portait.

**Les deux modules sont enrôlés au banc du SHA littéral le jour même** : `D-067`
puis `D-084` ont eu à rattraper ce retard deux fois, il ne se rattrape pas une
troisième. Un banc neuf vérifie qu'une reformulation de constat **éteint** la
table — un texte réécrit n'a pas été relu, et demande une nouvelle attestation,
jamais un ajustement du littéral.

**Ce que ces deux signatures ne font pas** : aucun écran ne change. Personne
n'appelle encore `lignesRepliServables` ni `lignesConduitesServables`. Les tables
servent, mais rien ne les interroge — l'attestation **arme** le mécanisme, elle
ne le branche pas.
