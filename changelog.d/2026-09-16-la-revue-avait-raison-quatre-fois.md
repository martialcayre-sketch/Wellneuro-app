### La revue avait raison quatre fois, et le compteur cesse de lire tout l'historique (2026-09-16)

Quatre PR de la campagne Correspondance ont été mergées le même jour sur CI vert,
**sans que la revue de Copilot soit lue**. Elle portait six constats ; quatre
tiennent après vérification, et deux d'entre eux sont des défauts dans du code
déjà en production. Aucun n'aurait pu être vu par un CI.

**Le compteur du rail ramenait tout l'historique du praticien.** La première
écriture de `D-210` remplaçait un `count` borné à sept jours par un `findMany`
sur **toutes** les lignes, trié et dédupliqué en Node. La requête n'était bornée
par rien : elle croissait avec chaque ligne d'historique, et le rail la déclenche
à chaque montage — deux instances par page. La déduplication se fait désormais en
base (`DISTINCT ON (id_patient)`), et une seule ligne traverse le réseau.

La sémantique ne change pas d'un iota. Ce qui change est où elle s'exécute, et
**comment elle se prouve**.

**Le banc de ce compteur était creux, et c'est le plus gênant des quatre.** Il
prétendait éprouver « la dernière ligne du dossier décide » en servant à un mock
une liste **déjà dédupliquée** : il simulait la déduplication au lieu de la
prouver, et serait resté vert si une ligne plus ancienne du même dossier avait
été comptée. La mutation jouée à l'époque portait sur le filtre de sens, pas sur
la sélection — la couverture annoncée dépassait donc ce qui était tenu.

La sélection s'éprouve maintenant contre un vrai PostgreSQL, dans
`prisma/checks/c3_correspondance_attente_v1.sql` : une réponse transcrite après
un envoi referme l'attente, un envoi sans retour de plus de sept jours compte, un
envoi récent ne compte pas, un sens hors vocabulaire n'invente aucune attente, et
le compteur d'un autre praticien ne voit rien. Le banc unitaire, lui, ne prétend
plus qu'aux gardes et à la forme de la requête, et le dit.

**Un espace dans le champ médecin coinçait le praticien.** L'offre « Reprendre »
testait `length === 0` là où la validation fait `trim()` : un espace laissé dans
le champ désactivait « Consigner » **et** faisait disparaître la reprise. Le
dernier médecin n'était plus reprenable sans effacer l'espace à la main.

Le compteur de caractères, lui, ne trime toujours pas — et c'est voulu :
`maxLength` tronque sur la longueur brute, et le faire trimer annoncerait de la
marge là où le navigateur coupe déjà. La revue proposait de l'aligner ; c'est le
seul de ses six constats qui aurait introduit un défaut.

**Deux contrats périmés.** Le commentaire de `NavItem` décrivait encore le badge
comme « le nombre de consignations des 7 derniers jours », ce que `D-210` avait
cessé d'être vrai. Et le handoff de session ne portait ni état Git, ni fichiers
touchés, ni validations exécutées, ni interdits actifs, que
`docs/claude/handoffs/README.md` exige.

**Le comportement introduit par `D-212` n'était gardé par rien** : le banc voisin
ne vérifiait que l'apparition du panneau au premier clic, alors que c'est le
**démontage** qui perdait le brouillon. Un banc le couvre désormais, comptage des
requêtes compris — garder le panneau monté ne doit pas se payer d'une seconde
lecture du dossier, qui écrirait une ligne de plus au journal d'accès.

Aucune décision nouvelle : la sémantique de `D-210` et `D-212` est inchangée.
