### Audit des claims biologie non prescriptifs : au moins 55 seuils cachés (2026-07-27)

La décision 8 des arbitrages du 2026-07-27 demandait de relire une trentaine des
563 claims du notebook 08 étiquetés `déclaré` ou `observé` non prescriptifs, pour
savoir si des plages de référence s'y cachaient. Le rapport est dans
`docs/claude/propositions/2026-07-27-audit-claims-non-prescriptifs/README.md`.

**Un échantillon de trente n'aurait pas tranché** — à ce n, un phénomène touchant
10 % de la population est vu trois fois. Le recensement a donc été mené sur les
**245 claims porteurs d'un chiffre** (88 capturés par motifs, 157 de résidu), lus
un par un ; les 318 sans aucun chiffre sont exclus par une hypothèse explicite, et
restent la zone non lue de l'audit.

**Résultat : au moins 55 claims sur 563 portent un seuil ou une plage** — 36
biologiques (la grille ferritine en cinq bandes, les trois seuils d'homocystéine,
zinc, magnésium érythrocytaire, GABA, glutamate, mélatonine) et 19 bandes de
scores cliniques (HAD, DASS21, Beck, Pichot, Conners). Le cœur de la biologie
fonctionnelle est dans la liste, dont les 55 identifiants sont annexés au rapport.

**La question posée n'a pas de réponse mesurable, et c'est le vrai constat.** Le
LLM n'est pas pris en défaut sur `prescriptif` : une plage de référence ne
recommande ni action, ni dose, ni conduite, conformément à la définition qu'on lui
donne. Mais la frontière `déclaré` / `interprété` ne tient pas — une grille
ferritine dont les bandes s'appellent « carence profonde » et « zone de confort »
se lit des deux façons. Que les étiquettes soient justes ou fausses, la conclusion
est la même : **la voie rapide fait dépendre une borne de décision clinique d'un
arbitrage typologique que personne ne sait appliquer de façon reproductible.**

**Aucun lot n'a été signé** — les 758 claims sont `EN_ATTENTE_VALIDATION`. Le
constat est préventif. Chiffré sur `WN-SRC-0041` : 49 éligibles, 15 tirés à 30 %,
**34 claims validés sans lecture individuelle, dont ≈ 17 plages de référence**.

**Recommandation bloquante** : ne pas ouvrir la voie rapide sur le notebook 08
sans un garde clé sur le **contenu** — motifs fournis, rappel 100 % et précision
62 % sur la population lue. À poser sur les **six** sites d'allowlist, l'`UPDATE`
d'écriture compris. Le garde par destination reste pertinent mais prospectif :
`orientationBiologieRulesV1.ts` n'existe pas encore.

Trois passes de revue adversariale ont rendu NO-GO sur ce rapport et corrigé, à
chaque fois, des assertions fausses : un rapprochement abusif avec le garde de la
décision 7, une typologie jamais examinée, deux énumérations données pour
exhaustives (quatre sites d'allowlist au lieu de six, deux formes de bloc
`interpretation` au lieu de trois).

Documentation seule : aucun changement applicatif, aucune migration, aucune
écriture en base.
