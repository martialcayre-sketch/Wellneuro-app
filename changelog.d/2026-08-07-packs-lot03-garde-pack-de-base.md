### Le pack de base ne peut plus être désactivé par mégarde (LOT-03, 2026-08-07)

Prépare le retrait des packs de questionnaires figés : ne laisser qu'un seul pack
actif, « Base de consultation ». Le retrait lui-même est un geste praticien dans
l'UI ; ce lot pose les gardes **avant** ce geste.

**Le défaut central.** `DELETE /api/praticien/packs` ne consultait jamais
`parDefaut`, et l'écran affichait le bouton rouge « Désactiver » sur
« Base de consultation » à l'identique des autres packs. Or ce pack — et lui seul —
est assigné à chaque nouveau patient à l'onboarding : le désactiver, ou lui retirer
sa marque, faisait rendre 404 « Pack de base introuvable » à **tous** les
onboardings, sans réparation possible depuis l'UI (les boutons de secours ne
s'affichent que sur un pack actif). Cinq chemins y menaient, dont deux qu'aucun
contrôle champ par champ ne voit : `PATCH { parDefaut: true, actif: false }` en un
seul appel, et `PATCH { parDefaut: true }` sur un pack déjà inactif — qui ne
mentionne même pas `actif`. Le garde se lit donc sur l'**état résultant**, refuse en
409, et tombe avant la transaction qui démarque l'ancien porteur. Côté écran,
« Retirer par défaut » disparaît du pack de base et « Désactiver » y est désactivé
avec une infobulle qui nomme le seul geste possible.

**Un second garde, et le piège qu'il a failli poser.** `POST` et `PATCH` refusent
désormais un instrument suspendu à la composition d'un pack (409, comme les deux
refus voisins du dépôt). Mais le refus ne porte que sur les instruments **ajoutés** :
l'écran d'édition renvoie toujours l'état stocké, et un instrument suspendu n'y a pas
de case à décocher. Refuser sur l'ensemble fourni aurait verrouillé tout pack en
portant déjà un — à commencer par le pack de base en production, qui contient
`Q_ALI_09` tant que l'agenda alimentaire est éteint — avec un message demandant de
retirer un questionnaire qu'aucun geste ne permet d'enlever.

**Autres corrections.** Le repli par nom de `resoudrePackBase` était **mort** :
la constante était en capitales, le pack s'appelle « Base de consultation », et
l'égalité PostgreSQL est sensible à la casse — le pack `parDefaut` actif était en
pratique l'unique chemin de résolution. Réparé, insensible à la casse et avec un
ordre déterministe. Le bloc « Packs suggérés » de la fiche patient, qui aurait cité
des packs désactivés après le retrait, est retiré. Enfin, la journalisation de perte
de cible d'orientation prévue au lot est remplacée par un **banc d'invariant** :
depuis le re-ciblage des règles, plus aucune ne vise un pack, et ce journal aurait
été vert en test et muet à vie en production.

Aucune migration, aucune écriture SQL, aucun changement de schéma.
