### Bibliothèque — quatre rayons de corpus s'ouvrent à la recherche clinique

La recherche corpus du tableau de bord servait **trois** étagères : cognition,
douleur, intestin. Quatre autres — **sommeil, stress, humeur, nutrition** — avaient
leur notebook ingéré et validé, leur mécanisme en production depuis le 2026-08-22
(`WN_RECHERCHE_CORPUS_ENABLED`, [[D-081]]), et un verdict `dormante` au registre
dont le **réexamen était daté au 2026-09-01** — dépassé. La raison écrite à côté de
chacun disait elle-même qu'élargir l'allowlist « est une décision praticien ».

**Ce que la liste blanche retenait, mesuré** (registre des sources d'intervention,
instantané du 2026-08-03, sources de conduite seules) : les trois rayons ouverts
exposaient **60 claims validés**, les quatre fermés en retenaient **986** — sommeil
297, humeur 283, nutrition 291, stress 115. Le dossier qui a retenu l'axe sommeil
le 2026-09-12 avait donc 297 claims de conduite validés fermés par une liste de
trois mots.

**Ouvrir un rayon met des claims sous les yeux du praticien ; cela n'en fait entrer
aucun dans un protocole.** La barrière [[D-003]] est inchangée — la seule voie de
récupération reste `match_wellneuro_rag_claims`, qui n'expose qu'un claim signé
praticien, et le filtrage par notebook reste appliqué au niveau SQL. Aucun claim
n'est validé, invalidé ni recoté.

**Ce qui reste fermé garde sa raison.** `micronutrition` n'entre pas dans cette
allowlist : il a son navigateur de catalogue et son propre drapeau, que l'y ajouter
contournerait. `rayon:biologie` reste dormant — réexamen au 2026-10-01, non échu,
et navigateur dédié depuis CB-08 ; il est désormais le seul verdict du registre.
L'allowlist reste **plus étroite** que la carte rayon → notebook, et son banc reste
**littéral** : le dériver de la carte validerait silencieusement tout ajout futur.

**Une règle de tenue du registre de dormance, posée avec :** un verdict ne se
retire pas parce qu'il a expiré, mais parce que **sa source a reçu un appelant**.
Un rayon qui redeviendrait inerte redemanderait le sien.

**Réserve consignée** : le panneau vit dans la Bibliothèque, pas dans le
constructeur de protocole. Les claims sont à portée, dans un autre onglet — pas
sous les yeux pendant la saisie. Rapprocher les deux n'est pas fait ici.

Voir [[D-187]].
