### Cadrage — les trois champs de l'objectif arrivent remplis (`D-167`)

Décision de cadrage, sans code : l'énoncé se pré-remplit par citation du dernier
dépôt « ce qui compte », la reformulation par citation de `narratif_patient`
d'une synthèse **validée**, et la priorité par une **proposition de la machine,
marquée comme telle**.

Trois points que la décision fixe et qui ne sont pas des détails :

- la borne de 200 caractères de la priorité **ne bouge pas** — mesuré, aucune
  source ne tient dedans (682 à 2 282 caractères en production), c'est l'appel
  qui s'y plie et un dépassement se refuse au lieu de se couper ;
- `D-003` n'est pas amendée mais **satisfaite** : la marque est ce qui fait que
  le LLM propose sans décider ;
- `D-094` §4 n'est pas amendée non plus — l'appel vit **hors** du moteur de
  proposition, qui reste déterministe et dont la caducité doit rester calculable.

« Non traité pour l'instant » reste vide : aucune source ne dit ce qui est mis de
côté ni pourquoi.
