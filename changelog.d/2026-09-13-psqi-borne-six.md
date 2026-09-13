### PSQI — la bande d'entrée s'aligne sur le cut-off strict, et la borne cesse d'être sans garde (2026-09-13)

`R-SOM-01` s'allumait dès un PSQI de 5. **Arbitrage praticien du 2026-09-13 :
elle s'aligne sur le cut-off publié et ne s'allume plus qu'à partir de 6.**

**Le geste a eu lieu dans la GRILLE, pas dans la règle, et ce n'est pas un
détour.** La zone de `R-SOM-01` cite des COULEURS, jamais des nombres : le seul
endroit où le point d'allumage se règle est `BANDES_PSQI` (`questions.ts`), dont
la première bande couvre désormais 0-5 et `info` 6-10. Les deux autres voies ont
été écartées sur pièces. Un déclencheur en `plage` ou en `comparaison ≥ 6` aurait
tué le **plancher garanti** — `zoneGarantieParLePlancher` refuse toute plage en
toutes lettres, « un plancher borne par le BAS ; une plage exige aussi une borne
HAUTE, que les items sans réponse peuvent franchir » — et la règle aurait cessé
de voir les recueils partiels que `D-021` avait délibérément ouverts. Elle aurait
en outre désaccordé deux tables signées sur le même instrument, `BIO-SOM-01`
recopiant la même zone couleur.

**Aucun sha ne bouge, et aucune signature n'est touchée.** La grille vit hors du
périmètre signé : `ORIENTATION_RULES_SHA256` porte sur le littéral des vingt
règles, qui n'a pas changé d'un caractère. Les bancs de concordance des deux
tables sont verts. **C'est aussi un constat sur le périmètre lui-même** : la
signature couvre les règles, pas la grille qu'elles lisent — un déplacement de
borne clinique passe donc sans re-signature. Nommé ici, pas refermé.

**Ce que 5 devient, et personne ne peut le dire à sa place.** Buysse ne classe
PAS un total de 5 : sa feuille de cotation écrit « TOTAL < 5 » bon et
« TOTAL > 5 » mauvais, et laisse la valeur exacte sans case. Le ranger en « Pas
de trouble du sommeil » est un choix WellNeuro, au même titre que le ranger en
« légers » l'était avant. L'arbitrage tranche pour la spécificité.

**La borne n'était gardée par rien, et c'est le vrai défaut découvert ici.** La
suite entière — 539 fichiers, 8961 bancs — est passée au VERT quand la grille a
bougé, parce qu'aucun banc n'exerçait un total de 5. Un déplacement de borne
clinique se faisait sans bruit. Le banc ajouté tient les DEUX moitiés du couple —
la grille qui mappe un total sur une couleur, et la règle qui cite des couleurs —
sur des fixtures relues du vrai moteur de scoring. Contre-épreuve par mutation :
rétablir l'ancienne grille le fait rougir (`expected 'info' to be 'success'`).

**Ce qui en découle et n'est pas tranché ici.** `D-177` a refusé d'écrire
`STOP-SOM` parce que la spécification l'énonçait sur « PSQI 5 », valeur à
laquelle la règle signée s'allumait. Elle ne s'y allume plus : **la contradiction
qui fondait ce refus a disparu**. Le motif de `STOP-SOM` le dit désormais sur
place, et sa condition de retour se relit à neuf — c'est un arbitrage, il n'est
pas pris ici. `BIO-SOM-01` suit le déplacement sans avoir été éditée.

**Et les deux drapeaux de l'orientation sont enfin attestés sur la plateforme
courante.** `scalingo --app wellneuro env` rend `WN_ENABLE_ORIENTATION_NNPP2=1`
et `WN_ENABLE_CONTRADICTIONS_NNPP2=1`. La preuve d'origine du premier était
antérieure à la bascule du 2026-08-22 et constatée sur Vercel ; sa ligne au
registre ne portait aucune mention de relecture, là où dix autres en portent une.
Ce que cette lecture tranche au-delà des drapeaux : `tableArretExploitable()`
étant vrai, **l'exclusion `dejaRepondu` mord réellement en production** — une
cible couverte par une passation exploitable et `VALID` n'est pas produite du
tout. Ce n'était jusqu'ici qu'une lecture de code.
