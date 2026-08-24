# LOT-08 — La clôture : six règles fermées, tout le reste nommé

- Date : 2026-08-25
- Campagne : `2026-08-18-doctrine-executable`, LOT-08 — **terminale**
- Décision : `D-109`
- Branche : `doctrine/lot08-cloture`

## Le lot vérifie, il n'enregistre pas

Sa fiche l'interdit en toutes lettres. Les six bascules citent chacune une
décision existante **et** un banc dont j'ai vérifié la présence au dépôt :
`promptAssociationPreuve`, `seuilsLitterauxMotives`, `natureIndiceGlobal`,
`safetyFindings`, `conflitsSourcesV1`.

## Deux mesures qui ont changé ce qui allait être écrit

**Les déclencheurs des quatre règles non armées, vérifiés structurellement.**
La vérification précédente datait de la veille et reposait sur un comptage.
`rag_corpus_claims` ne porte **aucune colonne de claim parent** ni **aucune
colonne de niveau d'exécution**, et aucune `ALTER` ultérieure n'en ajoute : le
déclencheur ne peut pas être franchi, il n'est pas seulement « non franchi ».

**« PNNS 4 » figure bien au dépôt** — et un grep pressé aurait conclu que le
déclencheur de `DC-52` était franchi. C'est le **libellé d'un item de
questionnaire** (`mode-de-vie.ts`) : on demande au patient s'il suit ces
recommandations, le système ne les référence pas.

## La fiche du lot était périmée, et je ne l'ai pas suivie

Son §2 annonce les dix orphelines comme « dettes nommées sans véhicule ». C'est
l'option que `D-107` a **écartée** la veille, au profit d'une **campagne
dédiée** — et pour ce motif exact : « dettes nommées » est le régime qui les
avait rendues orphelines. La fiche n'est pas réécrite ; elle est amendée en
tête, et le lot prend acte.

C'est le troisième document de la campagne trouvé en retard sur son propre
arbitrage. Le motif est toujours le même : une fiche cadrée avant une décision
qui la traverse.

## Le jour a tourné pendant le lot

Les décisions `D-095` à `D-108` sont du 2026-08-24 et le restent. Les actes du
LOT-08 — recompte au grep, vérification des déclencheurs, amendements — ont été
produits après minuit : ils portent le **2026-08-25**. Treize ancres ont été
redatées après coup. Dater un constat du jour d'avant est exactement ce que
cette campagne interdit.

## Ce que la clôture refuse d'écrire comme fermé

`DC-20` (nature en prose, pas dans la donnée) · `DC-26` (compilateur inexistant,
ni sur le disque ni dans l'historique Git) · `DC-42` (**signature reportée au
2026-08-30**) · `DC-43` (mécanisme complet et relu, **sans sujet**) · `DC-58`
(instruite, sans méthode fondée) · les quatre non armées · les **onze statuts
orphelins**, recomptés au grep : **13** occurrences, dont deux en en-tête,
inchangé depuis le LOT-11.

`DC-50`/`DC-51` sont **renvoyées** à la chaîne alimentaire. Un renvoi est un
routage, pas une fermeture — la fiche l'interdit explicitement.

## Validation

- **T1**, **T2** : voir la PR.
- Les cinq bancs cités vérifiés présents au dépôt, un par un.
- L'audit du 2026-08-11 amendé **ligne par ligne et daté** : huit lignes
  changent de sort dans leur colonne « Porteur », aucune n'est supprimée.

## Ouvert — et qui appartient au responsable

- La signature **`SAFETY_EI_METADATA`**, revue au **2026-08-30**. Inhibition
  totale, non graduée.
- Le cadrage des **deux campagnes routées** : curation des exclusions, dix
  orphelines.
- L'arbitrage de la **gate sur un état INCONNU** — à rendre « avec les
  exclusions sous les yeux », donc à la curation.
- Le **seuil de significativité du momentum** (`delta > 0` déclenche sur `+0,01`).
- Le créneau primaire s'ouvre. Prochaine en file : **Curation signée** (rang 4,
  déjà en parallèle continu) — l'ouverture reste un geste du responsable.
