### Décision D-031 — une porte posée par une règle ne se contourne pas par une cible ajoutée ailleurs (2026-08-07)

Documentation seule, aucune modification de code. Promotion en registre du
principe clinique sorti du LOT-02 de la campagne `2026-08-06-packs-personnalises`,
qui n'existait jusqu'ici que dans le fichier de lot — destiné à l'archivage — et
dans un commentaire de `web/src/lib/clinical/orientationRulesV1.ts`.

Le principe : quand le critère d'une règle d'orientation est ce qui **rend
l'instrument indiqué** — et non l'une de plusieurs voies d'entrée suffisantes
vers lui —, ce critère est une porte, et l'instrument ne s'atteint pas ailleurs
sans elle. Le cas : `R2-SOM-04` conditionne le dépistage d'apnées (questionnaire
de Berlin) à un antécédent respiratoire déclaré **et** à un sommeil contextuel
dégradé ; proposer Berlin depuis `R2-SOM-05` élargissait l'indication sans
qu'aucune ligne de code ne soit fausse. Le corollaire est du même ordre : une
composition de remplacement se choisit sur ce que les claims de la règle
nomment, pas sur ce que le pack remplacé contenait.

La décision distingue explicitement ce cas d'une **voie d'entrée légitime** :
`R2-SOM-01` et `R2-SOM-02` proposent toutes deux le PSQI par des versants
cliniques disjoints, et le moteur les agrège en une recommandation à deux
motifs. Sans cette distinction, l'énoncé condamnait l'arbitrage qu'il valide.

Ce que D-031 ne fait pas, et qu'il écrit : ce n'est pas une garde exécutable.
Hors le cas de Berlin, épinglé nommément par deux bancs, aucun mécanisme ne
signale au re-signataire d'une table d'orientation qu'une porte vient d'être
franchie — le sha épinglé rougit pour toute édition sans rien dire de la porte,
et `dateValidation` est épinglé par un littéral indépendant qu'aucun banc ne lui
relie. La garde générale exige d'abord de marquer, sur la règle elle-même, quel
déclencheur est constitutif de l'indication : elle reste à porter par un lot
nommé, non encore ouvert.

Renvois inverses posés et datés dans D-030 et D-018, l'écart à la pratique
append-only de D-028 étant nommé dans D-031. Rattrape également une entrée de
`docs/claude/SESSION_LOG.md` du 2026-08-05 (clôture de la campagne « reprise des
chantiers en suspens ») jamais committée.
