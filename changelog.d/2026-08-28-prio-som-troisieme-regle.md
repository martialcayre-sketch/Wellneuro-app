### Une troisième règle de priorité : l'axe sommeil, en complément de l'orientation (`D-116`)

La vérification serveur des sources signées (`D-115`) a rendu visible ce que
personne ne mesurait : la table ne publiait que **deux** règles, et la surface
ne pouvait donc jamais proposer plus de deux axes.

**`PRIO-SOM` était écartée depuis le 2026-08-12**, pour deux motifs nommés dans
sa condition de retour. Les deux sont levés.

**Le corpus.** Cinq claims valides de **mécanisme** fondent l'axe, de la même
nature que ceux qui fondent l'axe digestif : `WN-CL-0086-001` — « le sommeil et
l'éveil sont deux composantes indissociables du rythme circadien en
Neuro-Nutrition » —, `WN-CL-0017-015` (portée systémique : métabolisme,
cardiovasculaire, immunitaire), `WN-CL-0025-047` (dette de sommeil,
insulino-résistance validée par HOMA, inflammation de bas grade),
`WN-CL-0006-021` et `WN-CL-0003-013` (versant neurotransmetteurs).

**L'articulation, tranchée par le praticien** : la priorité **complète**
l'orientation, elle ne la remplace pas. `R2-SOM-02` déclenche déjà sur le PSQI
en bande `>= 7` ; les deux tables lisent le même axe mais n'énoncent pas la même
chose — l'orientation propose d'**objectiver** la plainte par un instrument,
la priorité propose de **regarder** l'axe. C'est le partage déjà écrit dans
`BESOIN_SOURCES` entre l'agenda et le PSQI. Il est inscrit en `limitations` de
la règle, donc **servi avec elle** plutôt que laissé à l'interprétation.

**Trois exclusions délibérées, écrites dans le fichier.** `WN-CL-0030-001` et
`WN-CL-0045-001` sont des modèles de **causalité** : les citer ferait dire à la
règle qu'une plainte de sommeil cause le reste du tableau (`DC-27`) — même
arbitrage que l'exclusion de `WN-CL-0023-005` pour le digestif.
`WN-CL-0086-007` (privation de sommeil comme chronothérapie) est une
**conduite**, et cette table désigne des axes.

**Les 39 claims de l'agenda de sommeil restent hors de la règle** : ils
décrivent comment tenir un agenda — une procédure d'**exploration**. C'est
exactement ce que la condition de retour demandait de distinguer de ce qui fonde
un axe de travail.

**Aucun seuil inventé.** Le déclencheur est `Q_MOD_03` domaine `sommeil` `>= 7`,
la bande déjà employée par les deux règles publiées. Aucune cadence, dose ni
borne n'est touchée. Rattachement au besoin 5 « Bouger et se reposer », dont le
groupe `repos` porte le PSQI et l'agenda.

**Re-signature.** Ajouter la règle change `PRIORITY_RULES_SHA256` : le verrou
s'est **refermé seul**, comme il doit. La signature a été posée après
attestation explicite du praticien — périmètre figé, date au 2026-08-28, cinq
claims ajoutés à `claimsSource` et au contrat de fraîcheur. C'est la première
re-signature dont le périmètre s'agrandit d'une **règle** et non d'un texte.

**Ce qui reste écarté, et ce n'est pas au même stade.** `PRIO-STR` et
`PRIO-FAT` exigent un instrument que le produit ne lit pas (PSS-10, DASS-21) :
aucun arbitrage ne les lève. `PRIO-DOU` est, comme `PRIO-SOM` l'était, à un
arbitrage praticien près.
