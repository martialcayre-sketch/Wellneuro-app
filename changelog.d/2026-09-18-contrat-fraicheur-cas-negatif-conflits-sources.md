### La dernière table du contrat de fraîcheur exercée seulement à l'état sain reçoit son cas négatif (2026-09-18)

Le registre des conflits de sources est entré au contrat de fraîcheur le
2026-08-24, et ses deux paires n'avaient jamais été exercées que par le cas de
corpus **sain**. Un prédicat qui aurait exempté cette table de *toutes* les
propriétés — et pas seulement de `prescriptif`, seule exemption que `D-046`
autorise — serait resté vert sur les dix cas existants.

Le trou avait été trouvé la veille en écrivant `N10` pour le catalogue de
conduites, nommé avec son correctif et routé en file d'attente plutôt que corrigé
dans un lot dont ce n'était pas la finalité (`D-227`). `N11` l'acquitte
(`D-228`).

**La mutation choisie ajoute une couverture que la seule table ne donnait pas.**
`N7`, `N8` et `N9` mutent `active`, `N10` mute `statut` : la troisième propriété
commune, `superseded_at`, n'était éprouvée que sur un claim d'orientation. Un
prédicat qui aurait restreint son contrôle à cette seule table passait les dix
cas. `N11` ferme la combinaison restante.

Chaque table signée du contrat a désormais son cas négatif — affirmation
vérifiable table par table, et non tenue par un banc : l'automatiser demanderait
de dériver les cas SQL de la liste TypeScript, ce qui est un lot en soi.

Aucun changement en production : le fichier négatif ne tourne qu'en CI, et
n'est jamais joué contre la base réelle.
