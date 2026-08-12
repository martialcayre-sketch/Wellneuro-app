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
  que le Cungi soit au « Niveau de stress très bas ». Elle éteint alors les
  **trois** règles d'exploration qui partent d'un dépistage. Les deux qui partent
  d'un PSS-10 défavorable ne sont pas éteintes : les taire sans lire le PSS-10
  aurait supprimé une discordance et servi au praticien un motif faux.
- **L'extinction est relisible, jamais destructrice.** La recommandation reste
  servie avec ses motifs d'origine et porte en plus son motif d'arrêt — au
  cockpit, dans la synthèse, et dans le bloc déterministe transmis au modèle.
  Une passation nouvelle qui sort de la zone rassurante la rallume, sans
  persistance ni migration : tout l'étage d'orientation est recalculé à chaque
  lecture.
- **`dejaRepondu` devient excluant**, et seulement sur une passation
  **exploitable et `VALID`**. Un objet de score n'est pas une mesure : une
  passation vide rend `{scored:false, total:null}` et un recueil partiel un total
  sans bande — ni l'un ni l'autre n'exclut. Une passation `INVALID`,
  `SUPERSEDED`, `AMBIGUOUS` ou non interprétable n'exclut pas non plus : le
  praticien qui invalide attend une re-passation, et `AMBIGUOUS` n'est jamais
  écarté en silence. Le badge « déjà renseigné » continue de dire le fait
  administratif.
- **Un instrument qui ne publie pas ses comptes de recueil ne peut pas
  éteindre.** `group_majority` (`Q_STR_01`) est dans ce cas, et un total y existe
  dès un item par groupe : sans cette garde, trois réponses sur vingt et une
  auraient suffi à éteindre. **Conséquence assumée et écrite : STOP-STR ne peut
  pas mordre tant que ce moteur ne publie pas ses comptes — signer la table ne
  suffira pas.**
- **Traçabilité** : la version et le SHA de la table d'arrêt sont persistés avec
  les métadonnées de synthèse, comme ceux de la table d'orientation. Deux
  synthèses rédigées sous deux tables d'arrêt différentes seraient autrement
  indiscernables à l'audit.
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

### Ce que la revue a refermé

Quatre défauts trouvés en revue adversariale, tous réels, tous corrigés avant la
PR : le test d'exploitabilité confondait « un objet de score existe » et « une
mesure existe » (le piège du LOT-02, reposé à l'identique) ; le déclencheur
porteur de STOP-STR était le seul instrument non gardé contre le recueil
partiel ; deux règles déclenchées par un PSS-10 défavorable étaient éteintes
sans que le PSS-10 soit lu ; et un composant client importait une **valeur** de
`lib/clinical`, ce qui aurait embarqué `crypto` et l'instantané du corpus
clinique dans le bundle navigateur — un banc ferme désormais cette classe
entière. Le badge d'extinction, vert, est passé au neutre : une extinction n'est
pas un résultat rassurant.

### Rien ne change en production

La table est **livrée non signée** (`validationExterne: false`), comme la table
de contradictions avant elle. Le verrou `tableArretSignee()` commande les deux
effets — extinction et exclusion — depuis un seul endroit : tant que le
praticien n'a pas signé, l'orientation servie est identique à celle d'hier.
