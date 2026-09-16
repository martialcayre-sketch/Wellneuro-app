### « Revenir au présent » ne ramenait pas au présent : la lecture datée se rouvrait toute seule (2026-09-15)

Le bandeau de lecture datée porte **deux** sorties : « Retour au présent » en
tête, et « Revenir au présent » en pied. La première prévenait le parent, la
seconde non — et en mode piloté depuis la Spirale, le parent est **seul
propriétaire** de la sélection.

Conséquence : la sortie de pied réinitialisait l'état local, l'effet de
synchronisation voyait aussitôt `repereInitial !== repereActif` et **rouvrait la
lecture qu'on venait de fermer**. Le praticien demande le présent, l'écran lui
réaffirme un état passé — sur la seule surface dont le rôle est d'empêcher
exactement cette confusion, et dont le commentaire écrit « une seule sortie,
explicite — jamais un état daté qui "colle" ».

**L'ÉCHEC ÉTAIT SILENCIEUX** : aucune erreur, aucun état rouge, un bandeau qui
reste. Rien dans la page ne disait que la demande n'avait pas été honorée.

**Corrigé à la racine** : les deux sorties passent par une fonction unique,
`sortirAuPresent`, qui réinitialise ET prévient le parent. Toute sortie future
passe par là.

**Le banc garde la CLASSE, pas l'instance.** Il **découvre** les boutons du
bandeau dont le nom promet le présent — il ne les liste pas en dur — et les
éprouve un à un : une troisième sortie ajoutée demain, qui oublierait le parent,
le fera rougir sans qu'on ait eu à y penser. Il vérifie deux choses par sortie :
le bandeau disparaît, et **aucune relecture datée n'est relancée** — rouvrir
est la forme la plus trompeuse de l'échec.

Reproduit par banc rouge AVANT correctif, puis mutation rejouée après : rendre
au bouton de pied son ancien `onClick` fait rougir le banc en nommant le bouton
fautif. Le vert n'a donc pas été constaté, il a été éprouvé.

**CE QUE CE LOT NE FAIT PAS, ET IL FAUT LE DIRE.** Il ne referme pas l'échec E2E
de `fiche-trajectoire-peuplee` sur iPhone 13, ouvert au journal depuis le
2026-09-07. Ce test-là clique la sortie de TÊTE, qui prévenait déjà le parent.
Le trace Playwright du run du 2026-09-15 montre un clic exécuté, **une seule**
requête `asOf` et aucune seconde : l'hypothèse d'une ré-entrée en boucle est
**réfutée**, et la cause reste à établir. Le défaut corrigé ici a été trouvé en
lisant les deux sorties, pas en cherchant celle-là.
