### Compréhension — l'appel qui propose un résumé global, et la barre qui l'ouvre

« Ce que j'ai compris de vous » arrivait vide. Un bouton « Proposer un résumé »
le remplira désormais — à la demande, jamais à l'ouverture de la fiche.

**L'appel RELIE, il ne reformule pas.** Le mot vient de l'arbitrage : « appel
borné à lier, un résumé hiérarchisé du matériel à disposition », précisément
pour éviter « le risque d'une reformulation qui s'éloignerait des synthèses
établies ». Le module reçoit des textes déjà validés par un praticien et n'a le
droit que de les articuler. La consigne le lui dit dix fois, et un banc vérifie
qu'elle le dit : elle doit nommer l'ordre, la hiérarchie, le rang, la liste, la
numérotation, le diagnostic, le score, le seuil et la bande.

**La hiérarchie ne vient pas du modèle.** L'ordre des axes lui est **donné**,
repris de celui qu'un praticien a validé. Et il arrive **sans numérotation** :
numéroter dans le message d'entrée réintroduirait par la porte de service le
rang que la consigne interdit — le modèle recopierait les numéros. L'ordre suffit
à porter l'ordre, et la mutation qui numérote tue le banc.

**La barre d'ouverture, au sens de `D-158`.** La règle du responsable — « deux
rideaux de questionnaires et deux synthèses minimum » — se compte au sens que le
dépôt a **déjà écrit** : le second rideau se compte depuis la première synthèse
validée du dossier. Aucun seuil n'est inventé ; deux règles existantes sont lues
ensemble. Deux booléens et non un, parce que les deux manques ne se confondent
pas et que l'écran doit pouvoir dire lequel.

**Sans date de validation, le rideau ne se constate pas — mais les synthèses se
comptent quand même.** Les confondre ferait dire « il manque une synthèse » à un
dossier qui en a deux, dont les dates sont absentes (`DC-24`).

**Aucun décompte ne sort.** Ni le nombre de synthèses, ni celui des
assignations : deux booléens suffisent à ouvrir ou fermer, et un nombre servi à
l'écran finirait par y être affiché comme une mesure du dossier.

**`GET` lit, `POST` produit.** Ouvrir la phase 3 d'un dossier ne dépense pas un
appel et ne fait pas parler la machine la première. Le bouton « une autre » écrit
une ligne de plus, de rang suivant : la route ne connaît ni `update`, ni
`delete`, et la garde l'énumère verbe par verbe.

**L'identifiant du tirage remonte à l'écran, et ce n'est pas un détail
d'implémentation.** C'est lui qui sera renvoyé comme `source_id` à la
publication ; sans lui, la provenance ne pourrait pas s'écrire du tout.

**Un dépassement se refuse, il ne se coupe pas.** La borne est celle du champ
que ce tirage pré-remplit, importée et non redéclarée. La longueur **visée** —
1 500 caractères — est dite au modèle comme une cible et ne fait rien respecter :
couper à 1 500 rendrait un texte que le modèle n'a pas écrit.

Le modèle se règle par `WN_MODELE_PROPOSITION_COMPREHENSION`, par défaut sur
`CLAUDE_MODEL`.

Dix mutations, dix mutants tués.
