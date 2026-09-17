### Le rayon Correspondance est lu quarante et une fois, écrit une seule — et la V2 perd son déclencheur (2026-09-17)

Mesure lue en production (`one-off-9328`, lecture seule, agrégats seuls). Étiquetage
`D-125` : ***observé sur un parcours réel***.

**La table `correspondances_medecin` contient UNE ligne.** Elle est ancrée
(`indications-biologie-v1`), donc **générée par la machine** le 2026-09-15. Il n'y a
**aucune ligne sans ancre** : en deux mois d'ouverture, le geste que `FM-1` avait
choisi comme V1 — le praticien transcrit ce qu'il a envoyé ou reçu — **n'a pas été
posé une seule fois**.

**Mais le fil est ouvert 41 fois, sur 11 dossiers**, du 2026-07-23 au 2026-09-16 —
la veille de la mesure. On regarde, on n'écrit pas. Deux lectures sont possibles : il
n'y a rien à consigner, ou le geste ne convient pas. **Aucun agrégat ne les
départage** — c'est une question pour le praticien, pas pour la base.

**La V2 perd son déclencheur.** `D-219` §1 fait de la bascule vers le lien signé un
constat d'usage — « quand le volume le justifiera », jamais une échéance. Le volume
est **1**. La question est close jusqu'à ce qu'un chiffre la rouvre.

**La réserve est levée le jour même, et pas par la base.** L'unique ligne est écrite
le 2026-09-15 **à 23 h 11**, et les dossiers de test sont réels et vivent en
production (`D-075`) : un agrégat ne distingue pas un essai d'un acte clinique.
Interrogé sur cette ligne, le responsable a répondu que **c'était un essai de sa
part**. Donc le geste de courrier de biologie **n'a jamais servi en consultation** :
le « 1 » est un test, et le chiffre réel des deux écrivains est **zéro usage
clinique**. Ce qui a tranché est un souvenir, pas une requête — la prochaine mesure
n'aura pas cette chance, il faudra **marquer les essais**.

**Rien à dire encore de la lettre d'adressage** : zéro appel, et c'est attendu — son
drapeau n'a été posé qu'au matin du 2026-09-17, après cette lecture.

**Deux échecs gardés au dossier, parce qu'ils se rejoueraient** : `prisma db execute`
**n'imprime pas** les lignes d'un `select`, et le client Prisma généré **exige son
adaptateur**. Le chemin qui marche est au protocole.
