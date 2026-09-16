### Une ligne de catalogue cite trois familles de claims, et un claim retiré retire la ligne (2026-09-16)

La lecture des claims en production, autorisée le jour même, a réfuté la forme
livrée la veille : **elle ne pouvait pas citer le claim le plus important**. La
ligne `insomnie_depression` doit être signée en premier parce que sa source porte
une règle de sécurité — et le champ `fonde` n'admettait que `'indication'`. Le
premier usage réel a cassé la forme, ce qui est le meilleur moment pour qu'il le
fasse : aucune ligne n'était signée.

**Trois champs remplacent le discriminant** : `claimsIndication` (au moins un),
`claimsInstrument`, `claimsSecurite`. Dès que chaque catégorie a son champ,
l'énumération devient redondante — un nom qui se lit vaut mieux qu'une valeur à
maintenir. Et cela gagne quelque chose sur les cinq tables signées existantes :
aucune ne porte de discriminant, ce que chaque claim fonde y vit **en prose**,
hors du périmètre haché. Ces trois champs le ramènent dans le sha.

**Un claim de sécurité s'affiche, il ne bloque pas.** La ligne se propose et sa
règle se lit avec elle ; le praticien décide. Bloquer aurait demandé un prédicat
de « levée », donc un second moteur de règles à côté de celui qui existe.

**Une ligne dont un claim passe à `REJETE` cesse d'être servie.** Le point de
sortie reçoit désormais, en premier paramètre, les claims valides — la table est
un paramètre, jamais une lecture de base dans le module. Les trois catégories
comptent : une sécurité retirée pèse autant qu'une indication retirée. Et
`null`, « je n'ai pas pu lire », n'est pas `new Set()`, « aucun n'est valide » :
les deux ferment, un banc le prouve séparément, et l'appelant peut dire lequel.

**Les trois lignes ont désormais leurs claims désignés** dans la surface de
relecture — identifiants lus en production, comptes du registre vérifiés exacts à
l'unité. Ce qui reste à attester n'est plus leur existence, c'est ce que chacun
fonde.

**Et un défaut silencieux rattrapé en revue.** La clé d'un claim s'écrivait
`claimId@versionClaim` — séparateur du contrat de fraîcheur, mais **pas celui du
module de validité**, qui produit justement l'ensemble consommé ici. Chaque
recherche aurait manqué : le catalogue n'aurait plus rien servi, en silence et
pour toujours, sans qu'aucun test ne rougisse. Un banc de source épingle
désormais la clé dans les deux modules.
