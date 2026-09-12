### Ce que le patient a déjà lu : un accusé par version, sans jamais dire quand (2026-09-12)

Le fil du jour doit porter les **lectures** — un nouveau bilan, une nouvelle
synthèse — et elles doivent **disparaître une fois lues**. Le repère de
fraîcheur ne pouvait pas le faire : il porte **un seul instant par dossier**
(`id_patient` en clé primaire), ce qui répond à « jusqu'où ce patient a vu »,
jamais à « a-t-il ouvert CELUI-CI ».

La piste sans migration a été posée devant le responsable **avec son coût** :
lister du plus ancien au plus récent et avancer le repère à la date ouverte,
donc **faire disparaître les précédents si le patient lit le plus récent
d'abord** — sans qu'il l'ait demandé ni su. Un document remis qui s'efface tout
seul est exactement ce qu'un dossier de santé ne doit pas faire. Migration
demandée, et accordée.

`portail_lectures_patient` porte **trois colonnes et aucune date** :
`(id_patient, espece, id_objet)`, la clé primaire étant le triplet. Le fil ne
consulte que l'EXISTENCE de la ligne — « quand ce patient a-t-il ouvert son
bilan » reste **structurellement sans réponse**. Un `lu_le` n'aurait rien servi
au fil, et aurait servi à autre chose.

**Pas de colonne de version, parce que l'identifiant l'est déjà** — vérifié, non
supposé : `syntheses_comprehension` ne connaît que `create`, une republication
est une ligne neuve portant `supersedes_synthese_id` ; chaque envoi de bilan est
une ligne. Une version remplacée porte un autre `id_objet`, la lecture ancienne
ne l'acquitte pas, la tâche reparaît au fil.

**Cette prémisse est fragile, et elle est gardée.** Si une publication se faisait
un jour EN PLACE, la table mentirait en silence : elle ferait disparaître un
texte que le patient n'a jamais lu, et aucun test de la table ne pourrait le
voir — le défaut serait dans l'autre modèle. `syntheseComprehension` était déjà
gardé pour ses propres raisons ; **`bookletEnvoi` ne l'était pas**. Les deux le
sont maintenant, au motif de cette migration.

**CE QUE CETTE TABLE NE PROMET PAS.** Le repère rendait un décompte
d'assiduité impossible ; celle-ci **ne le rend pas** — plusieurs lignes par
dossier, `count(*)` répond. Le contrat SQL éprouve explicitement ce cas positif,
pour qu'aucun lecteur ne la croie mono-ligne comme sa voisine. Ce qui borne le
risque : le compte ne peut pas dépasser ce que le cabinet a REMIS, ne dit rien
des connexions, et aucun instant n'est conservé. Qu'aucune surface praticien ne
la lise est tenu par un **banc du dépôt**, pas par le schéma — une garde de
dépôt protège la relecture, pas les données, et il faut la citer comme telle.

Le contrat SQL éprouve huit promesses, dont deux qu'aucun autre ne porte :
l'absence d'horodatage **vérifiée sur le TYPE** — et non sur des noms devinés,
pour garder l'interdit et non la forme — et l'acceptation de plusieurs accusés
par dossier.

**Migration SEULE** (`D-087`) : aucun code ne consomme encore la table. Le fil
des lectures viendra après l'application constatée par conteneur.

**Une conséquence à trancher.** Avec un accusé par document,
`portail_journal_reperes` n'a plus de consommateur dès que le journal
rétrospectif partira : il devient orphelin. Il n'est pas supprimé — détruire une
table se demande.
