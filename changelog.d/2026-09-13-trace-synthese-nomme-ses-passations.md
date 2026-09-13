### Synthèse IA — la trace nomme les passations sur lesquelles elle a été écrite, et le prompt continue de les ignorer

`donneesEntree.reponses` portait `idQuestionnaire` et `date`. Ce couple désigne
**presque** toujours la ligne source — et « presque » cesse de suffire dès qu'un
instrument porte deux passations le même jour, c'est-à-dire exactement le cas
que `passationCourante` existe pour arbitrer. Six mois plus tard, dire « cette
synthèse a été écrite sur CES passations » ne doit pas dépendre d'une unicité
que rien ne garantit. `ReponseInput` porte donc désormais `idReponse`.

**L'identifiant reste hors du prompt, et c'est le point du lot.**
`buildUserMessage` ne sérialise pas cet objet : il en reprojette les clés une à
une, par deux littéraux exhaustifs. Une clé ajoutée au type n'atteint donc le
modèle que si quelqu'un l'ajoute **aussi** à la projection — un geste silencieux,
qu'aucune empreinte existante ne verrait, puisque les gardes de version ne
hachent que la consigne système, jamais le message utilisateur. Un nouveau banc,
`traceIdReponse.guard.test.ts`, tient les deux bouts : l'identifiant est dans la
trace enregistrée, il n'est ni dans les clés transmises ni nulle part dans le
texte du message. Le banc a été éprouvé par mutation — ajouter la clé à la
projection le fait rougir.

Pourquoi le tenir dehors plutôt que de le laisser passer : un identifiant que le
modèle voit est un identifiant qu'il peut recopier, et une citation recopiée
n'est pas une provenance. `D-168` §6 a tranché la question voisine le
2026-09-11 — un texte reformulé ne se constate pas par comparaison, et mesurer
une ressemblance pour y suppléer poserait un seuil sans provenance.

**Ce que ce lot n'achète pas, et qu'il ne faut pas lui prêter.** Aucune
provenance *par argument* : les `arguments` d'un axe restent des chaînes nues,
et rien ici ne les rattache à une passation. C'est une provenance **d'ensemble**,
au niveau du document — la seule que la forme actuelle du brouillon autorise.
Son intérêt à terme est l'espace de valeurs : `idReponse` est celui que
`ClinicalFindingProvenance.responseIds` emploie déjà côté chaîne C1, si bien
qu'une jointure ultérieure lira les mêmes identifiants des deux côtés.

Aucune migration, aucun changement de contrat de sortie, aucune version de
prompt ni de schéma incrémentée : la colonne `donnees_entree` est un `Json`
existant, et sa forme n'est gardée par aucun contrat SQL.
