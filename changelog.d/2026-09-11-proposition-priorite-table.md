### Schéma — la table des propositions de priorité, et la contrainte que l'arbitrage a ajoutée

`D-167` §11 : une proposition produite par le modèle est FIGÉE et resservie tant
que ses sources ne changent pas. Un modèle n'est pas déterministe — sans
stockage, le praticien retrouverait une phrase différente à chaque rechargement.
La table `propositions_priorite_ia` la conserve, classée par ses deux sources et
la version de consigne.

**Elle n'est pas `propositions_objectif` et ne doit jamais le devenir.** Celle-là
est le moteur déterministe de `D-094` §4 — mêmes entrées, mêmes propositions,
même empreinte, ce qui rend sa caducité calculable. Y faire entrer un appel IA
détruirait cette propriété. Les deux portent le mot « proposition » et n'ont pas
la même nature.

**Append-only.** Le bouton « une autre » écrit une ligne de plus, de `rang`
suivant ; rien n'est écrasé. Les tirages précédents restent auditables en base et
ne sont jamais affichés. Un index unique interdit à deux tirages de partager un
rang : sans lui, « resservir la proposition figée » n'aurait pas de réponse
déterministe à horodatage égal.

**La borne de 200 caractères est dans la base**, pas seulement dans la consigne.
Un dépassement se refuse au lieu de se couper (`D-167` §3) ; tronquer serait
l'altération de donnée que `lib/patient/ceQuiCompte.ts` nomme en contre-patron.
Exactement 200 passe — un `< 200` déplacerait la borne d'un cran sans que
personne ne le voie avant un refus en production.

**`modele` et `version_consigne` portent une promesse faite au patient.** La v2
de « L'intelligence artificielle dans Wellneuro » lui dit que le modèle et la
version du procédé sont enregistrés à chaque fois. Vides, la phrase deviendrait
fausse sans que rien ne rougisse : deux CHECK l'empêchent.

**Un cas de contrat a changé de camp.** Le contrat de la provenance affirmait que
le dépôt patient était FACULTATIF, et avertissait que l'exiger « fermerait la
fonction à tout dossier muet ». L'arbitrage du 2026-09-10 au soir a tranché
l'inverse — les deux pièces sont exigées, la parole du patient est une condition.
Le cas descend en négatif, avec la contrainte
`alli_objectif_priorite_source_depot_requis` qui l'oppose. **La conséquence
annoncée est réelle et assumée** : un dossier dont le patient n'a jamais déposé
n'aura pas de proposition. Elle est consignée là où elle avait été prévue, plutôt
qu'effacée avec le cas.

**L'effacement du dossier la couvre**, et la garde de complétude l'a exigé avant
qu'on y pense : toute table portant `id_patient` doit partir avec le dossier. Les
tirages écartés partent aussi — ce qui n'a pas été retenu reste de la matière
tirée de la parole du patient. Aucune tolérance à une table absente : entre le
déploiement de ce code et l'application de la migration, l'effacement échouerait
bruyamment plutôt que de sauter une table en silence. Un effacement qui échoue se
rejoue ; un effacement partiel est un trou.

Migration seule, sans son code consommateur (`D-087`). Purement additive : une table neuve et
une contrainte que l'unique ligne de production satisfait, ses colonnes de
provenance étant à NULL.
