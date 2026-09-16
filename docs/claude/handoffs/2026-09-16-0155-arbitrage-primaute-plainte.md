# Handoff — 2026-09-16 — La primauté de la plainte dominante, arbitrée

## Ce que ce lot fait, et ce qu'il ne fait pas

**Le moteur ne change pas d'une ligne.** Ce lot inscrit un arbitrage clinique qui
était ouvert et que la signature du périmètre excluait explicitement.

## La question a été posée deux fois, et c'est le point

Premier arbitrage rendu : « priorité intrinsèque d'abord, la plainte ne
départageant qu'à priorité égale ».

**Vérification avant écriture** : les quatre règles portent quatre priorités
DISTINCTES (1, 2, 3, 4) — lu dans la table. L'égalité qui donnerait la parole à
la plainte **ne se produit jamais**. Cette option ne la reléguait donc pas au
second rang, elle la **supprimait** : classement fixe, identique pour tout
patient, `PRIO-DIG-01` proposée à chaque déclenchement.

Un terme déclaré actif mais inatteignable est une sur-promesse. Remise au
responsable avec le chiffre, l'option a été retirée.

**L'option était vraie en principe et fausse en fait.** Je ne l'avais pas
vérifiée avant de la proposer ; c'est la leçon du lot.

## Ce qui est tranché

La plainte dominante reste en tête, en connaissance du coût. La priorité
intrinsèque garde le dernier mot partout où la plainte ne dit rien.
`proposedMainPriorityId` reste le rang 1, confirmé dans le même geste.

## Comment c'est tenu

`ARBITRAGE_PRIMAUTE_PLAINTE` entre dans le périmètre haché. Deux bancs :

| Mutation | Résultat |
| --- | --- |
| Permuter les rangs 1 et 2 de `TERMES_DE_CLASSEMENT` (+ réancrage) | 4 cas rouges |
| `PRIO-SOM-01` priorité 3 → 2 (égalité créée) | le banc du motif rougit, message vers le responsable |

Le second garde un FAIT : si l'égalité devient possible, la justification de cet
arbitrage devient fausse sans que personne n'ait touché au périmètre.

## L'attestation, périmée puis rendue le même jour

`9792c12e72db93d8` → `9f17a4a658e4fca6` : l'attestation de `D-202` est tombée, et
elle a été **redemandée et rendue** sur la nouvelle empreinte. Troisième
relecture en deux jours ; troisième fois posée en toutes lettres, jamais déduite
d'un « relu ».

Le classement relu n'a jamais changé. Ce qui s'y ajoute à chaque fois, c'est ce
que la signature dit d'elle-même — d'abord sa portée, puis l'arbitrage que le
signataire a lui-même rendu.
