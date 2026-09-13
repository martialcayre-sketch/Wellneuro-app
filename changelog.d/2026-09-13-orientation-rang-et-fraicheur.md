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

**LE VERROU A FAIT SON TRAVAIL, PUIS LA SIGNATURE A ÉTÉ REPRISE.** Le contenu
ayant changé, `ORIENTATION_RULES_SHA256` est passé à
`e2f087d6c75199a94cf1fde0c76651ee365c0893841d318e74e86acf197e427e` tandis que
`shaPerimetre` portait encore l'empreinte du 2026-08-06 : les deux bancs de
concordance ont rougi, `tableSignee()` est devenu faux, et l'orientation serait
restée fail-closed en production. C'est exactement ce qu'ils existent pour faire,
et la trace en est gardée ici plutôt que effacée par le commit qui la répare.

**LA SIGNATURE EST CELLE DU PRATICIEN, PAS CELLE DE L'OUTIL.** Les deux lignes
n'ont été posées qu'après que le praticien a attesté, le 2026-09-13, la relecture
du contenu modifié : le rang du Cungi sur `R-SOM-01`, et la fenêtre de 365 jours
sur les vingt règles. `dateValidation` porte ce jour, `shaPerimetre` l'empreinte
relue, et l'ancienne est conservée en commentaire dans la table comme dans le
banc. L'ordre prescrit par `D-018` a été tenu : contenu, bancs, claims relus en
base, date, **et le sha en dernier**.

Le reste de la barrière est vert : `tsc --noEmit`, `next lint`, et 8968 bancs sur
539 fichiers.

**LES 23 CLAIMS ONT ÉTÉ RELUS EN BASE DE PRODUCTION LE 2026-09-13**, comme la
re-signature du 2026-08-06 l'exige et comme `D-067` l'a nommé le maillon que
l'automatisation ne couvre pas — aucun test unitaire n'ouvre `rag_corpus_claims`,
si bien qu'un identifiant inventé passerait les bancs. Lecture par one-off
détaché (`one-off-4974`) : **23 lignes sur 23**, toutes `statut = 'VALIDE'`,
`prescriptif = true`, `active = true`, `version_claim = 'v1.0'`, aucune
`superseded_at`.

Un point que cette lecture tranche au passage : `WN-CL-0323-001`, le second claim
de `R-SOM-01`, **existe et il est valide**. Ce qui manque n'est pas le claim,
c'est son VERBATIM — son texte n'est reproduit nulle part dans le dépôt, là où
celui de `WN-CL-0323-013` l'est en commentaire. La moitié de la justification de
la carte reste donc illisible depuis le code, mais elle n'est pas fantôme.

**CE QUE CETTE SIGNATURE NE COUVRE TOUJOURS PAS.** `BANDES_PSQI` vit dans
`questions.ts`, hors des deux périmètres signés, et les zones de la table citent
des COULEURS. Déplacer une borne de la grille change donc le point d'allumage des
règles sans faire bouger un seul sha — c'est précisément ce qui s'est produit le
même jour sur la borne 4/5, et la conséquence n'est pas restée dans
l'orientation : `BIO-SOM-01`, règle `publiee` d'une table **elle aussi signée**,
lit la même zone couleur sur le même instrument et a cessé de prescrire
`PANEL_SOMMEIL_1` à 5 sans avoir été éditée. Le trou est nommé en commentaire à
côté de la signature, et refermé dans un lot séparé qui fait entrer la grille
dans les deux périmètres.
