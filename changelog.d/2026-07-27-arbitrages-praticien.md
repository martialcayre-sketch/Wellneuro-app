### Onze arbitrages praticien tranchés en une passe (2026-07-27)

Les questions restées ouvertes dans trois campagnes — certification des
questionnaires, rayon compléments C4, rayon biologie fonctionnelle CB — sont
tranchées et consignées dans
`docs/claude/propositions/2026-07-27-arbitrages-praticien/README.md`. Les
documents de cadrage pointent désormais vers les réponses à l'endroit exact où
chaque question était posée.

**La décision structurante** : quand le PDF du cabinet et la publication
d'origine divergent, **la publication primaire fait foi**. Elle décide Tinetti,
`Q_FIB_03` et `Q_NEU_12` sans nouvel arbitrage.

Une première rédaction lui en attribuait sept ; la revue adversariale a montré
que quatre relevaient d'autre chose et les a fait ressortir. IPSS est un défaut
de scoring sans ambiguïté clinique, pas un conflit de source. QLQ-BR23 **reste
ouvert** — dire « la règle EORTC fait foi » sans l'avoir lue reporte la décision
en la déguisant. `Q_GEO_04` relève du même arbitrage que `Q_CAR_01` et les
rejoint. Berlin est **retiré de la passe** : son constat est antérieur à la
correction du comparateur et sa version d'instrument n'est pas établie — on ne
corrige pas un dépistage d'apnée sur une mesure non rejouée.

**Quatre constats de terrain ont changé une réponse attendue** — les trois
derniers viennent d'une revue adversariale qui a rendu NO-GO sur la première
rédaction de ce dossier.

`LOT_006` n'était pas orphelin mais **à moitié exécuté** : ses 140 chunks sont
106 des 116 instruments du cabinet, et la décision A du 2026-07-26 prévoyait
leurs claims, jamais produits. Un **pilote de 10 sources** précédera les 106 —
sur le `LOT_007`, les deux seuls chunks de nature questionnaire avaient vu 14
claims sur 14 exclus pour infidélité.

Le **rayon corpus C4 filtrait à zéro** pour tous les rayons, parce qu'il
sélectionne sur `metadata.rayon` qu'aucun des 2 993 claims ne porte — alors que
**305 des 618 claims validés** (comptage direct, aucune ligne `REJETE`)
proviennent de sources dont le registre donne le notebook 10 « Micronutrition et
compléments », ingéré depuis le 2026-07-24. Le filtre bascule sur le notebook :
`match_wellneuro_rag_claims` retourne déjà `source_id`, donc ni migration ni
backfill. Le lot devra apporter un **garde de divergence** registre ↔ base, le
notebook se retrouvant porté à deux endroits.

Le champ `protocol` concerne **12 instruments et non 11** — `Q_NEU_06` manquait
aux listes antérieures alors qu'il porte « Orientation neurologue ou gériatre —
bilan approfondi urgent ». Et le correctif de catalogue **ne suffisait pas** :
`scores_json` fige l'objet d'interprétation à la soumission et la synthèse le
repasse entier au modèle, si bien que toutes les passations déjà enregistrées
auraient continué d'envoyer `protocol` indéfiniment. Un **filtre en lecture** est
décidé — sans écriture en base, effet immédiat sur l'historique.

La **voie lente** existe bel et bien, clée sur la typologie du claim ; c'est la
**prémisse** du cadrage biologie qui est infirmée — 563 des 758 claims (74 %)
sont étiquetés non prescriptifs, donc éligibles à la voie rapide. Régime commun
retenu, assorti d'un **audit d'une trentaine de ces claims** : l'étiquetage est
produit par le LLM rédacteur, et ces 74 % ne disent pas encore si les claims ne
sont pas prescriptifs ou s'ils sont sous-étiquetés.

**Une réserve posée pour plus tard.** Le questionnaire alimentaire `Q_ALI_01`,
restauré à ses 57 items, sera d'abord soumis aux patients test : c'est de ces
passations que viendra l'affinage du barème, et l'occasion de produire des
sous-scores catégoriels adossés à la boussole alimentaire (campagne C5).
L'ordre est fixé — implantation d'abord, affinage ensuite — pour ne pas mesurer
avec un barème qui bouge.

**Un arbitrage n'est pas exécutable en l'état.** Le rescorage rétroactif des
passations antérieures modifie des données patient en production, dont des
scores déjà restitués : il passera par une migration relue, précédée d'une revue
adversariale, et sous un go explicite et séparé. La direction est fixée,
l'autorisation d'écrire ne l'est pas.

Documentation seule : aucun changement applicatif, aucune migration, aucune
écriture en base.
