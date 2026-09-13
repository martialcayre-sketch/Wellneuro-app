### Règles d'arrêt — STOP-SOM reste écartée, et sa condition de retour cesse d'attendre un arbitre

`D-053` avait écarté STOP-SOM en nommant sa condition de retour : « un arbitrage
praticien qui tranche la valeur de PSQI où l'exploration du sommeil cesse d'être
justifiée ». Cet arbitrage a eu lieu le 2026-09-13. Il a répondu **non**.

La contradiction était nette : la spécification énonçait l'extinction sur
« PSQI 5 », qui est exactement la valeur où la table d'orientation **signée** dit
que `R-SOM-01` doit s'allumer — sa zone couvre la bande `info` (5-10), choisie
délibérément au-dessus du seuil de 4 que l'instrument publie, « pour ne pas
laisser dehors des patients que le PSQI considère déjà comme mauvais dormeurs ».

Trois issues étaient sur la table, et deux ont été refusées. Écrire STOP-SOM sur
la seule bande rassurante dissolvait la contradiction sans re-signature — mais
n'était écrivable que si un claim attache une CONDUITE à cette bande, ce que le
corpus ne garantit pas : il publie des bandes. Remonter l'entrée de `R-SOM-01` à
`warning` coûtait la bande d'entrée délibérée de la règle, ses recueils partiels
fermés en `info`, et une nouvelle signature de la table d'orientation.

**Aucun sha ne bouge, et c'est vérifié plutôt que supposé.**
`STOP_RULES_SHA256 = sha256(JSON.stringify(STOP_RULES_V1))` — la constante ne
couvre que la table PUBLIÉE. Modifier `STOP_RULES_ECARTEES_V1` ne rouvre donc ni
la signature de `D-061` ni le verrou de `D-065` : l'extinction de STOP-STR et
l'exclusion `dejaRepondu` restent exactement où elles étaient.

Ce qui change vraiment tient dans la condition de retour réécrite : elle ne nomme
plus une décision, elle nomme une **source**. Une règle qui attend un avis se
rouvre à chaque session ; une règle qui attend un claim prescriptif attend
quelque chose de vérifiable.

STOP-APN n'est pas concernée — son motif est d'une autre nature (`DC-24` :
un prédicat d'absence n'est pas exprimable), et sa condition de retour reste
ouverte, inchangée.
