### Release DB — les deux façons d'échouer sont mesurées, et plus confondues (2026-09-13)

La borne du résumé repose sur `status=success` : un run qui n'a pas abouti ne doit
pas pouvoir la porter, sans quoi elle sauterait en avant et le résumé sous-listerait
**sans le dire** — seul sens dangereux, puisqu'il fait approuver.

Le commentaire qui justifiait ce filtre citait un fait **mal attribué** : il donnait
pour preuve qu'« un rejet conclut `cancelled` », en désignant un run qui avait en
réalité été tué par le déplacement de la tête de `main`. Les deux mécanismes sont
maintenant mesurés séparément, chacun sur un run réel du 2026-09-13 :

- **rejet par un relecteur → `failure`** (run 34756482049, rejeté avec motif écrit) ;
- **tête de `main` qui bouge pendant l'attente d'approbation → `cancelled`**
  (runs 34758433177 et 34759307017).

La conclusion qui compte ne changeait pas — `failure` comme `cancelled` sont écartés
par le filtre, donc la borne était sûre. Ce qui changeait, c'est qu'un lecteur
vérifiant la justification serait tombé sur un run dont la conclusion ne prouvait pas
ce qu'on lui faisait dire.

**Le workflow corrigé a fait son premier passage complet en production le même jour**
(run 34768736644, sur `0d85a412`) : le résumé a trouvé sa borne du premier coup, sans
aucun repli — ni « borne inconnue », ni « liste illisible » —, la garde du drapeau a
constaté `1`, le report du SHA et la garde qui le lit ont passé, et `migrate deploy`
a été vérifié par `migrate status` sur conteneur. Aucune étape en échec.
