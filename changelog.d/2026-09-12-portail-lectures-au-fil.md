### Les lectures entrent au fil du jour, et en sortent une fois faites (2026-09-12)

Dernière pièce du fil du jour : un **nouveau bilan**, une **nouvelle synthèse de
compréhension** deviennent des tâches, et **disparaissent dès que le patient a
ouvert l'écran qui les porte**.

**Le fil ne peut jamais porter plus de deux lectures.** Ce n'est pas un réglage :
la route emprunte les règles de visibilité des écrans eux-mêmes
(`whereEnvoiVisible`, `syntheseServieAuPatient`), et chaque écran ne sert que le
document COURANT. Les règles sont empruntées, jamais recopiées — deux surfaces
qui recopieraient la visibilité finiraient par diverger, ce qui est déjà arrivé
ici.

**L'identifiant ne vient jamais de l'écran.** Le composant demande au serveur
quelle lecture est attendue, puis l'acquitte ; le `POST` revérifie que
l'identifiant est exactement celui qui est servi (`D-164`). Une **version
dépassée** est refusée — acquitter une synthèse révisée ferait disparaître du
fil la révision que le patient n'a pas lue. Si le praticien publie entre
l'affichage et l'envoi, le `POST` rend 404 et la tâche reste : **mieux vaut
redemander une lecture faite que d'effacer une lecture qui n'a pas eu lieu.**

**Ce que « lu » veut dire, et ce qu'il ne veut pas dire.** Une ligne existe pour
(ce patient, cette espèce, cette version), posée à l'ouverture de l'écran. Ce
n'est **pas** une mesure de lecture : un patient qui ouvre son bilan trente
secondes sans le lire l'a « fait » aux yeux du portail. Personne ne sait mesurer
une lecture réelle, et ce lot ne le devine pas. La contrepartie est acceptée — le
document reste atteignable indéfiniment par « Consulter mon bilan ». Ce qui
disparaît est la tâche, jamais le document.

**Place dans l'ordre.** Juste après ce qui périme, avant tout le reste. Un
document REMIS n'est pas un formulaire de plus : c'est quelqu'un qui s'adresse au
patient. Et il passe devant l'invitation à dire ce qui compte, délibérément —
« voici ce que j'ai compris de vous » puis « dites-moi ce qui compte pour vous »
est une séquence ; l'inverse fait parler le patient avant de l'avoir écouté.

**Aucun drapeau neuf.** Un septième garderait une deuxième fois des surfaces déjà
gardées. Conséquence à connaître : la surface entre en service au déploiement.
L'invariant tient malgré tout — une surface fermée par son propre drapeau ne
produit AUCUNE lecture, et la table des synthèses n'est alors même pas lue.

**Ce qu'une mutation a trouvé, et qui n'était pas un banc manquant.** Retirer le
garde-fou « rien d'attendu, on n'envoie rien » ne faisait rougir aucun banc : un
`catch` unique autour de tout l'effet avalait la panne réseau — ce qu'on veut —
et l'erreur de programmation qui suivait — ce qu'on ne veut pas. Deux
corrections, aucune cosmétique : chaque `try` ne couvre plus que son propre appel
réseau, et l'identifiant est lu AVANT l'appel, pour qu'un champ manquant échoue
bruyamment au lieu de passer pour une coupure. **C'est le code qui est meilleur,
pas le banc qui a été ajusté.**
