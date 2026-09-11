### Schéma — le rang du tirage retenu, et la réserve du §11 levée

`D-167` §11 consignait une réserve sans la lever : « un praticien qui relance
jusqu'à retrouver la phrase qu'il avait en tête fait décider la machine par
**sélection**, ce que la marque ne dit pas ». La marque disait « proposé par la
machine » aussi bien pour un premier jet accepté que pour un dixième.

`priorite_source_rang` distingue les deux. Il **compte des tirages, jamais des
priorités** : ce nombre ordonne des écritures dans `propositions_priorite_ia`,
il ne hiérarchise aucun objectif et n'est comparable à aucun seuil
(`DC-19`/`DC-20`, `D-094` §3).

**Il tombe avec la marque**, et c'est l'arbitrage du 2026-09-11. Un texte
réécrit par le praticien « redevient ses mots » (`D-167` §6) : lui laisser un
rang de tirage garderait une mention de machine sur une phrase qu'elle n'a pas
écrite — le faux que §6 nomme. Une contrainte le tient : pas de rang sans source
de priorité.

Migration seule, sans son code (`D-087`). Purement additive : une colonne
nullable et deux contraintes que les lignes existantes satisfont.

La liste blanche de colonnes d'`alli_dossier_deux_voix_v1_negatif.sql` est
étendue — elle reste **la seule** pour cette table, leçon du 2026-09-10.
