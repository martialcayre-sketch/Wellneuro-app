### Orientation — le rang suit le claim cité, et une cible mesurée cesse de l'être pour toujours (2026-09-13)

Deux arbitrages praticien du même jour, livrés ensemble parce qu'ils touchent la
même table signée et qu'une seule re-signature vaut mieux que deux.

**LE RANG SUIT LA SOURCE.** Sur `R-SOM-01`, le Cungi passe en priorité 1 et le
HAD en 2. Le claim `WN-CL-0323-013`, recopié en clair dans la règle, porte les
deux seuls comparatifs de la source : le Cungi « plus pertinent et sensible »
pour le stress **dans les troubles du sommeil**, le HAD qui « suffit » pour
l'humeur. La règle se déclenche précisément sur une bande de PSQI — donc dans le
contexte exact où la source privilégie le Cungi — et elle le rangeait second,
tout en affirmant quatre lignes plus bas « aucune substitution, la règle propose
exactement ce que le claim désigne ». Elle suivait la source sur l'identité des
instruments et la contredisait sur leur rang.

**Ce que l'inversion ne change pas, et un banc le tient désormais.** `Q_NEU_11`
est posé en priorité 1 par quatre autres règles, et la fusion garde le MINIMUM :
dès qu'une seule d'entre elles s'allume, le HAD repasse premier. L'arbitrage ne
se voit que sur un dossier où `R-SOM-01` est SEULE à motiver ces deux cibles.
Le banc du rang ne tenait d'ailleurs rien avant : il s'intitulait « propose HAD
puis Cungi » et n'assertait que deux appartenances — inverser les `priorite`
l'aurait laissé vert. Il assère maintenant le rang déclaré ET la position servie.

**Ce qui reste non sourcé est écrit comme tel.** Le HAD exclut par construction
tout item somatique, ce qui en fait l'instrument d'humeur le moins contaminé chez
un mauvais dormeur, et la littérature insomnie → dépression est massive. Cet
argument plaide pour le rang inverse — il n'est adossé à AUCUN claim du corpus,
et un rang ne se fonde pas sur un raisonnement qui ne vit que dans un
commentaire. Si un claim vient le porter, ce rang se rediscute.

**UNE FENÊTRE DE FRAÎCHEUR, 365 JOURS, SUR LES VINGT RÈGLES.** Sans elle,
l'exclusion `dejaRepondu` fermait une cible **sans horizon** : aucun filtre de
date à la requête, la dernière passation retenue quelle que soit son ancienneté,
et déclarée couvrante. Une mesure de deux ans fermait la cible — sans badge et
sans motif, la ligne n'étant pas produite. La table sœur rouvrait déjà un panel
de biologie documenté au-delà d'un an : la mesure la plus périssable était la
mieux protégée.

Le chiffre est un **arbitrage WellNeuro**, nommé comme tel. Côté biologie le 365
entre au périmètre signé adossé à deux claims ; ici aucun claim ne fonde une
périodicité de re-passation des questionnaires. Le champ vit sur la RÈGLE et non
dans une constante globale, précisément pour qu'un affinage instrument par
instrument reste une édition locale.

**L'horloge est dans le service, jamais dans le moteur** — même partage que la
table sœur. Un moteur qui appellerait `Date.now()` cesserait d'être rejouable :
deux évaluations du même dossier ne seraient plus comparables, et un banc
changerait de verdict selon le jour où il tourne. Absence d'horloge = aucune
péremption, sens fail-closed.

**UN GARDE ÉCRIT PUIS RETIRÉ, PARCE QU'IL ÉTAIT MORT.** La première rédaction
gardait ici la `dateReponse` illisible, en croyant tenir un repli de plus. Le
banc l'a réfuté : une réponse dont la date ne se parse pas est écartée EN AMONT
par `derniereReponseParQuestionnaire`, donc elle n'atteint jamais le prédicat de
fraîcheur. La cible est alors proposée parce qu'aucune passation n'est vue — un
comportement qui précède ce lot, désormais tenu par un banc qui le nomme, pour
qu'on ne l'attribue pas plus tard à la fenêtre.

**LA TABLE N'EST PAS SIGNÉE, ET LES DEUX BANCS ROUGES SONT LE VERROU.** Le
contenu a changé : `ORIENTATION_RULES_SHA256` vaut désormais
`e2f087d6c75199a94cf1fde0c76651ee365c0893841d318e74e86acf197e427e`, et
`shaPerimetre` porte encore l'empreinte du 2026-08-06. Les deux bancs de
concordance échouent, et c'est exactement ce qu'ils existent pour faire —
`tableSignee()` est faux, donc l'orientation resterait fail-closed en production.
**Rien ici ne pose le sha.** Signer est un acte clinique : il demande la
relecture du contenu modifié par le praticien et celle des 23 claims en base. Les
deux bancs repassent au vert à la seule condition que ces deux gestes aient eu
lieu.

Le reste de la barrière est vert : `tsc --noEmit`, `next lint`, et 8968 bancs sur
539 fichiers.
