### Le champ qui exigeait un accusé n'était lu par personne (2026-09-16)

`requiresAcknowledgement` existait depuis TRUST LOT-01 : déclaré au type, posé
sur les treize documents du registre, asséré par un banc. **Aucun code ne le
lisait.** La porte du portail ne regardait qu'une chose, écrite en dur — la
version courante de `cadre_accompagnement`. Un document qui réclamait un accusé
ne le réclamait qu'en paroles.

Le défaut s'est vu en voulant publier la **v8** de « Vos données personnelles »,
qui déclare trois renseignements NOUVEAUX — adresse postale, numéro de sécurité
sociale, nom et coordonnées du médecin traitant, saisis par le praticien. Poser
le drapeau n'aurait interrompu personne.

**LA PORTE ET LA SÉQUENCE LISENT DÉSORMAIS LA MÊME LISTE**, et c'est tout
l'enjeu du module. Si la porte exige un accusé que la séquence n'enregistre pas,
le patient **boucle sans fin** : quatre écrans, une validation, un retour, et
les quatre écrans à nouveau. Ce n'est pas une gêne d'affichage, c'est un portail
inaccessible sur la surface où le patient dépose ses réponses. Deux listes
recopiées à deux endroits produisaient exactement cela à la première
divergence ; il n'y en a plus qu'une, et un banc éprouve la **terminaison** —
poser les accusés que la séquence enregistre doit SUFFIRE à fermer la porte.

**LA LISTE N'EST PAS LE REGISTRE ENTIER.** `usage_ia`, `droits_patient` et
`consentement_suivi` en sont absents parce que la séquence **ne les présente
pas** : exiger la reconnaissance d'un texte qu'on ne montre pas demanderait au
patient de reconnaître ce qu'il n'a pas vu. Ajouter une clé oblige à ajouter un
écran, et un banc le dit.

**L'ÉCRAN MONTRE CE QUI CHANGE.** Un accusé sur un texte qui ne dit pas ce qui
change n'est qu'une formalité : le troisième écran nomme désormais les trois
renseignements, dit qu'**aucun n'est obligatoire**, et dit que noter le nom d'un
médecin traitant **ne veut pas dire lui écrire**.

**CE QUE CE LOT COÛTE, ET IL FAUT LE SAVOIR.** La séquence REMPLACE la page :
chaque patient en cours la reverra à sa prochaine connexion — y compris celui
qui note sa quatorzième nuit sur vingt et une. C'est la raison pour laquelle les
v3 à v7 s'en dispensaient toutes, et un banc garde ce motif. L'exception est
assumée ici parce que ce qui change n'est pas la description du traitement mais
son **assiette**.

**VINGT TESTS E2E SONT TOMBÉS D'UN COUP, ET ILS AVAIENT RAISON.** Trois
fixtures du portail posaient `cadre_accompagnement` et lui seul, parce que la
porte ne regardait que lui. La porte a changé d'avis ; les fixtures, non — et
dix specs se sont retrouvés devant « Avant de commencer » au lieu de l'écran
qu'ils testaient. Elles **lisent** maintenant la même liste que la porte, au
lieu d'en recopier la règle : le défaut corrigé en code vivait aussi dans les
bancs qui devaient le surveiller. Leurs noms disaient « cadre » alors qu'elles
franchissent une porte — ils le disent désormais.
