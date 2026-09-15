### Protocole 21 jours — la charge redevient lisible, et un barème peut la suggérer (2026-09-15)

La charge thérapeutique était **obligatoire, hachée, et relue par personne**. Le seul
écran qui l'affichait recevait toujours `null` en usage normal et sortait aussitôt :
le praticien déclarait une charge qu'il ne revoyait jamais. Elle s'affiche désormais à
côté du champ de saisie, avec sa justification — même geste que la décision remontée
sous les yeux du praticien au lot précédent.

**Le barème propose, le praticien déclare.** Quand une ligne signée s'applique,
l'écran affiche le niveau suggéré et le motif écrit par le praticien ; un bouton
recopie la valeur dans le champ. Rien ne s'enregistre par ce clic, et aucune
déclaration n'est refusée parce qu'elle s'écarte de la suggestion : la source de la
charge reste le praticien, posée en dur au contrat.

**Ce que le barème compte est arbitré ; où passent les bornes ne l'est pas.** Quatre
termes, tous dérivés du protocole donc recalculés à chaque lecture : le nombre
d'actions, le nombre d'actions réellement engagées — une action en attente de bilan
n'en est pas —, le nombre de types distincts, et le nombre d'actions dont le plan
idéal diffère du plan minimal. Ce dernier est le seul des quatre qui parle de
l'effort et non du volume : c'est l'écart que le patient vit les jours difficiles.
La durée et la fréquence ne sont **pas** mesurables — elles vivent en texte libre, et
les compter supposerait de lire de la prose.

**Le verrou de signature reste au serveur, en un seul point.** La suggestion s'affiche
pendant la composition, donc dans le navigateur, qui ne peut pas lire une table
signée. Le serveur ne sert que des lignes déjà vérifiées, ou rien : l'écran ne peut
pas se signer un barème à lui-même, et la vérification n'est pas dupliquée.

**La forme retenue est une échelle sur un seul terme, et « sans recouvrement » est
une garde plutôt qu'une consigne.** Deux lignes publiées qui mordent la même plage du
même terme ne sont pas un cas clinique : c'est une table mal écrite, et la servir
produirait une discordance silencieuse sur toute la plage commune — le praticien
lirait « rien » sans savoir que son barème se contredit. La table entière est alors
refusée, et le refus est journalisé.

**Un niveau « excessif » se lit en avertissement**, les trois autres en note discrète.
Le contrat exige déjà une justification écrite quand le praticien déclare ce niveau ;
la suggestion le signale du même registre, sans rien bloquer et sans ouvrir d'avance
le champ de justification — ce qui pousserait vers un choix qu'il n'a pas fait.

**La première échelle est signée : trois bandes sur le nombre d'actions engagées** —
une seule action est légère, deux modérée, trois chargée. Contiguë, sans trou ni
recouvrement.

**Ces bornes n'ont aucune source clinique, et la table le dit d'elle-même.** Rien au
dépôt ne traite de la charge thérapeutique et aucun claim ne les porte : ce sont une
convention d'organisation, proposée parmi trois échelles, relue en entier, puis
ratifiée par le praticien. C'est cette ratification qui fait leur provenance. Un
lecteur qui les prendrait pour une règle sourcée se tromperait, et un banc textuel
garde cette distinction.

**Ce qui les contraint est structurel** : le protocole accepte au plus trois actions,
donc chaque terme mesuré est borné à 0–3 et une échelle sur un terme n'a que quatre
valeurs possibles.

**« Excessif » n'est atteignable par aucune ligne, et c'est voulu.** Un comptage ne
peut pas savoir qu'un protocole de deux actions est excessif pour quelqu'un qui
traverse un déménagement. Ce niveau reste un jugement du praticien sur ce patient-là,
avec la justification écrite que le contrat exige déjà.

**Un banc qui ne mordait pas, trouvé par mutation.** Le banc du verrou l'exerçait sur
la table réelle, donc vide : neutraliser la garde ne le faisait pas rougir. Il prouve
désormais le verrou, pas le vide.

Voir [[D-195]].
