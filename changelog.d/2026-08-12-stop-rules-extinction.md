### Ajouté — règles d'arrêt et extinction d'orientation (LOT-03, `D-053`)

- **Une table de règles d'arrêt** (`web/src/lib/clinical/stopRulesV1.ts`), sur le
  patron de la table d'orientation : métadonnées, claims épinglés, SHA-256 et
  littéral de banc. Une règle d'arrêt éteint des **règles d'orientation
  nommées** — jamais des cibles : le Cungi est proposé aussi bien par l'axe
  stress que par l'axe sommeil, et éteindre par cible l'aurait fait disparaître
  d'un axe qui n'a rien demandé.
- **`STOP-STR`, seule règle de la V1.** Elle demande que le questionnaire SIIN
  (`Q_STR_01`) soit dans sa bande « Oriente vers les conseils de vie
  antistress », que le DASS-21 soit `Normal` sur ses axes anxiété et stress, et
  que le Cungi soit au « Niveau de stress très bas ». Elle éteint alors les cinq
  règles d'exploration de l'axe stress.
- **L'extinction est relisible, jamais destructrice.** La recommandation reste
  servie avec ses motifs d'origine et porte en plus son motif d'arrêt — au
  cockpit, dans la synthèse, et dans le bloc déterministe transmis au modèle.
  Une passation nouvelle qui sort de la zone rassurante la rallume, sans
  persistance ni migration : tout l'étage d'orientation est recalculé à chaque
  lecture.
- **`dejaRepondu` devient excluant**, et seulement sur une passation
  **exploitable**. Une passation `INVALID`, `SUPERSEDED`, non interprétable ou
  sans réponses brutes n'exclut pas : le praticien qui invalide attend une
  re-passation, et l'exclure lui retirerait la recommandation qu'il vient de
  provoquer. Le badge « déjà renseigné » continue de dire le fait administratif.
- **Consigne de synthèse `synthese-v25`** : le modèle apprend à lire une ligne
  éteinte. Deux fermetures y sont posées — une extinction ne clôt pas un axe
  (une passation nouvelle la lève) et n'est pas une conclusion clinique : elle
  porte sur ce qu'il est utile de mesurer, pas sur ce que le patient a.

### Non livré — et pourquoi c'est écrit dans la table

- **`STOP-SOM`** aurait éteint `R-SOM-01` à la valeur de PSQI où la table
  d'orientation **signée** dit qu'elle doit s'allumer.
- **`STOP-APN`** repose sur un prédicat « absence de symptômes » que le
  vocabulaire de déclencheurs ne sait pas exprimer — et lire une absence comme
  une normalité est ce que `DC-24` interdit.
- L'ajout du **SCOFF** à la table d'orientation est différé : il exige un claim
  validé en base et une re-signature praticien de la table.

Les deux règles écartées vivent dans `STOP_RULES_ECARTEES_V1` avec leur motif et
leur condition de retour, plutôt que dans un ticket que personne ne rouvre.

### Rien ne change en production

La table est **livrée non signée** (`validationExterne: false`), comme la table
de contradictions avant elle. Le verrou `tableArretSignee()` commande les deux
effets — extinction et exclusion — depuis un seul endroit : tant que le
praticien n'a pas signé, l'orientation servie est identique à celle d'hier.
