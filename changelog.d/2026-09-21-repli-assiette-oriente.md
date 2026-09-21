### Le repli d'assiette devient une relation orientée — et la table qui le porte est vide (2026-09-21)

**Une famille était une clique complète, et le mécanisme la trahissait en
l'élargissant.** `substitutionFamily` est une étiquette d'appartenance comparée
par égalité : si deux assiettes la partagent, la substitution est attestée dans
les DEUX sens, et par transitivité sur toute la clique. Déclarer une famille de
trois assiettes, c'était attester six substitutions. Or un repli est presque
toujours asymétrique.

**La relation sort du catalogue, et c'est d'abord une contrainte d'empreinte.**
`substitutionFamily` est l'un des quatre champs du `contentHash` d'une entrée ;
poser la relation là aurait périmé des références déjà consignées — et depuis
`D-240`, des protocoles en portent. La table vit dehors : aucune entrée ne bouge,
ni `contentHash`, ni `refHash`, ni le hachage de catalogue.

**Trois qualités deviennent des champs** — la direction, l'indication visée, le
degré — et une quatrième est obligatoire : le raccourci assumé. Aucun claim ne
fondant une substitution, il n'existe pas de ligne dont la justification irait
de soi.

**La garde d'axe est posée aux deux bouts.** Un repère de moment de repas ne se
prescrit pas : il ne se replie ni ne sert de repli. Sans ce terme, la
substitution aurait été le seul chemin du dépôt produisant une référence
d'assiette sans passer par la garde d'indication.

**On ne signe pas une absence** : le verrou refuse la table vide même sous une
signature valide, sans quoi la première ligne écrite entrerait sous une
attestation acquise. L'absence de repli se sert par le point de service, qui
rend une liste vide sans rien attester.

**Le chemin est ouvert, et il reste vide pour une autre raison qu'avant.**
`alternatives` était un tuple vide littéral — une liste que le contrat
interdisait de remplir. Elle porte désormais les replis attestés des assiettes
prescrites du protocole actif ; « prescrite » se lit sur les actions, pas au
catalogue.

**AUCUNE FAMILLE N'EST DÉCLARÉE, et ce n'est pas un inachèvement.** Le corpus
décrit l'inclusion, l'association et la parenté de modèle — les trois sont
l'inverse logique de l'échange. Une ligne écrite ici serait une affirmation
clinique nouvelle, qui appartient au praticien.

**LA REVUE A TROUVÉ LE MÊME DÉFAUT UN CRAN PLUS LOIN.** `indication` était un
champ obligatoire de la ligne — un repli n'est jamais valable « en général » —
mais elle tombait partout en aval : la décision cherchait sur le seul couple
`depuis`/`vers`, et la projection de la route la supprimait. Deux replis attestés
pour des raisons différentes devenaient donc interchangeables. C'est
l'élargissement silencieux que la clique produisait, rejoué sur la condition au
lieu de la direction. Elle descend désormais dans le type partagé et voyage
jusqu'au client. Et le verrou n'exigeait de sa date d'attestation que « non
nulle », là où ses deux tables sœurs vérifient l'ISO canonique.

**Deux affirmations de `D-240` étaient fausses, et elles sont corrigées à leur
place.** Le coût d'une famille déclarée n'est pas un écran patient qui s'éteint
mais un protocole qu'on ne peut plus réviser — la relecture avait justement été
immunisée. Et ce n'est pas `resolvePatientFoodCompassView` qui exige le contrat
V2, mais `buildPatientFoodCompassView`, dont le refus est de surcroît avalé :
la Boussole disparaît en silence au lieu d'échouer.
