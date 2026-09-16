### Le champ qui exigeait un accusé n'était lu par personne (2026-09-16)

`requiresAcknowledgement` existait depuis TRUST LOT-01 : déclaré au type, posé
sur les treize documents du registre, asséré par un banc. **Aucun code ne le
lisait.** La porte du portail ne regardait qu'une chose, écrite en dur — la
version courante de `cadre_accompagnement`. Un document qui réclamait un accusé
ne le réclamait qu'en paroles, et `limites_securite` était exactement dans ce
cas depuis l'origine.

**LA PORTE ET LA SÉQUENCE LISENT DÉSORMAIS LA MÊME LISTE**, et c'est tout
l'enjeu du module. Si la porte exige un accusé que la séquence n'enregistre pas,
le patient **boucle sans fin** : quatre écrans, une validation, un retour, et
les quatre écrans à nouveau. Ce n'est pas une gêne d'affichage, c'est un portail
inaccessible sur la surface où le patient dépose ses réponses. Deux listes
recopiées à deux endroits produisaient exactement cela à la première
divergence — et ce n'était pas une hypothèse : la séquence en posait **deux**
quand la porte n'en regardait qu'**un**. Il n'y en a plus qu'une, et un banc
éprouve la **terminaison** : poser les accusés que la séquence enregistre doit
SUFFIRE à fermer la porte.

**CE CÂBLAGE N'INTERROMPT PERSONNE**, et le fait se constate plutôt qu'il ne se
suppose : la séquence pose `limites_securite` **depuis son tout premier
commit**, si bien que tout patient l'ayant franchie possède déjà les deux
accusés que la porte exige maintenant.

**LA LISTE N'EST PAS LE REGISTRE ENTIER.** `usage_ia`, `droits_patient` et
`consentement_suivi` en sont absents parce que la séquence **ne les présente
pas** : exiger la reconnaissance d'un texte qu'on ne montre pas demanderait au
patient de reconnaître ce qu'il n'a pas vu. Ajouter une clé oblige à ajouter un
écran, et un banc le dit.

**UN DOCUMENT PRÉSENTÉ N'EST PAS UN DOCUMENT EXIGÉ.** « Vos données
personnelles » est dans la liste — l'écran 3 le montre — mais sa version
courante ne réclame aucun accusé, et le filtre l'écarte tout seul. C'est le
mécanisme qui permettra de l'exiger le jour où il recueillera vraiment du neuf,
sans toucher à la liste.

**ET CE JOUR-LÀ, UN BANC VÉRIFIERA QUE LA PHRASE EST VRAIE.** Une version de ce
document qui exige un accusé en annonçant l'adresse postale, le NIR et le
médecin traitant ne peut pas être publiée tant que le modèle `Patient` ne porte
pas ces colonnes **et** que la route praticien ne sait pas les écrire. Sans
quoi on ferait accuser réception, à chaque patient, d'un traitement qui n'existe
pas encore — constat de revue, transformé en garde plutôt qu'en note, parce
qu'une note ne bloque personne.

**VINGT TESTS E2E SONT TOMBÉS D'UN COUP, ET ILS AVAIENT RAISON.** Trois
fixtures du portail posaient `cadre_accompagnement` et lui seul, parce que la
porte ne regardait que lui. Elles **lisent** maintenant la même liste que la
porte au lieu d'en recopier la règle : le défaut corrigé en code vivait aussi
dans les bancs qui devaient le surveiller. Elles écrivent aussi le hash du
registre au lieu d'une sentinelle — `contentHash` atteste quel texte a été
présenté, et une fixture qui ment là-dessus laisse passer ce qu'elle garde.
