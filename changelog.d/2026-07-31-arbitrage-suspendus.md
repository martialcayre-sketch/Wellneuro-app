### Les suspendus tranchés, et la règle du nombre d'items enfin écrite

Sur demande du praticien — « trancher le reste » —, les huit instruments suspendus
reçoivent chacun une décision motivée sur pièce, et la règle qui manquait à la
campagne depuis le 2026-07-30 est posée :
`docs/claude/propositions/2026-07-31-arbitrage-suspendus/`.

**Le compteur d'items ne voulait rien dire.** Il cachait trois classes sans rapport.
Le Tinetti sert 20 items pour 16 à la source : c'est une **décomposition**
canonique du POMA — mêmes axes, mêmes maximums (16 et 12), même total /28 — et les
neuf libellés à similarité 0,00 sont un **artefact d'alignement**, le banc
comparant par position après un éclatement d'item. Divergence annulée sur preuve,
sans toucher au servi. L'IDTAS-AE sert 48 items pour 36 et ressemble au même cas :
c'en est un autre. La source pose **six énoncés** par liste mensuelle, cochés sur
les mois ; le servi pose **un item par mois** et écrase les six énoncés en une
notation unique. Divergence réelle, jusqu'ici inconnue du dossier.

> Le nombre d'items ne se compare pas. Ce qui se compare, ce sont les **axes, leur
> composition et le total** — ce par quoi le nombre d'items atteint le score. Un
> écart de comptage à axes et total identiques est une mise en forme ; un comptage
> **identique** à contenus différents est une substitution, et c'est le cas
> dangereux, parce que c'est le seul que le compteur déclare conforme.

`Q_PED_02` en est la preuve : 28 items des deux côtés, cotés 0-3, zéro divergence
critique — et un instrument entièrement différent.

**Les décisions** : reconstruire le MFI-20 (priorité — trois critiques, aucune des
dix inversions appliquée, un total enregistré qui n'est pas une mesure) et le
Monnier (10 items servis sur 39) ; **débaptiser** le Conners enseignant plutôt que
le reconstruire, le servi étant une grille DSM cohérente dont les droits sont
dégagés, là où le reconstruire en Conners fabriquerait un instrument sous licence
MHS ; réactiver le VQ11 (zéro divergence, sous la déclaration du 2026-07-29), le
MMSE (en passation praticien, la surface existant depuis ce lot) et le cannabis ;
relancer le banc du Conners 3 parent en lecture découpée ; laisser l'ELFE fermé,
seul instrument dont la fermeture ne coûte aucun usage.

**Deux défauts trouvés au passage, sur un instrument déclaré « 0 critique »** : le
questionnaire cannabis déclare `maxTotal: 32` quand ses items en autorisent **36**
— un patient à 33-36 ne reçoit **aucune bande** et sa fiche afficherait « 34/32 » —
et sa grille d'interprétation n'est pas celle de la source (quatre bandes contre
trois, à des coupures différentes).

**Deux obstacles techniques nommés pour le lot MFI-20** : le moteur `subscore`
appelle `totalSousScore(sub.items, [])` — liste d'inversions **vide, en dur** :
aucune sous-échelle du catalogue ne peut aujourd'hui inverser un item. Et
`MOTIFS_PASSATION_NON_INTERPRETABLE` est indexé par instrument, pas par passation :
reconstruire puis réactiver marquerait à tort les passations neuves.
