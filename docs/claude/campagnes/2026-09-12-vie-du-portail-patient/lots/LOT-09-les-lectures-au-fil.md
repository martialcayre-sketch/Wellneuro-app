---
id: "LOT-09"
titre: "les-lectures-au-fil"
statut: "livré — 2026-09-12"
dépend_de: "LOT-08 (la table, appliquée et constatée par conteneur)"
---

# LOT-09 — Les lectures entrent au fil, et en sortent une fois faites

## But

Fermer la dernière pièce du fil du jour : un **nouveau bilan**, une **nouvelle
synthèse de compréhension** deviennent des tâches, et **disparaissent dès que le
patient a ouvert l'écran qui les porte**.

## Ce qui est livré

`lib/portail/lecturesAttendues.ts` — dérivation PURE : ce qui a été remis, moins
ce qui a été lu, de la plus ancienne à la plus récente.

`api/portail/lectures` — `GET` rend les lectures attendues, `POST` en consigne
une.

`components/patient/ConsignerLecturePortail.tsx` — posé sur l'écran du bilan et
sur celui de la synthèse. Ne rend rien ; à l'ouverture, il acquitte.

## Le fil ne peut jamais porter plus de DEUX lectures

Parce que la route emprunte les règles de visibilité des écrans eux-mêmes —
`whereEnvoiVisible`, `syntheseServieAuPatient` — et que **chaque écran ne sert
que le document courant**. Il n'y a donc pas d'empilement possible : au pire un
bilan et une synthèse. Cette borne n'est pas un réglage, c'est une conséquence.

Les règles sont **empruntées, jamais recopiées** : deux surfaces qui
recopieraient la visibilité finiraient par diverger, ce qui est déjà arrivé sur
ce dépôt.

## L'identifiant ne vient jamais de l'écran

Le composant **demande au serveur** quelle lecture est attendue, puis l'acquitte.
`api/portail/bilan` ne transporte même pas l'identifiant de l'envoi, et le faire
remonter à travers trois composants pour finir par le renvoyer au serveur aurait
été un détour qui n'apporte rien.

Le `POST` **revérifie** que l'identifiant est exactement celui qui est servi
(`D-164`). Trois refus, tous voulus : un identifiant d'un autre dossier, une
**version dépassée** — acquitter une synthèse révisée ferait disparaître la
révision que le patient n'a pas lue —, et le cas où le praticien publie entre
l'affichage et l'envoi. Ce dernier rend 404 : la tâche reste. **Mieux vaut
redemander une lecture faite que d'effacer une lecture qui n'a pas eu lieu.**

## Ce que « lu » veut dire, et ce qu'il ne veut pas dire

Une ligne existe pour (ce patient, cette espèce, cette version). Elle est posée
à l'ouverture de l'écran.

**Ce n'est pas une mesure de lecture.** Un patient qui ouvre son bilan trente
secondes sans le lire l'a « fait » aux yeux du portail. Personne ne sait mesurer
une lecture réelle, et ce lot ne le devine pas : il constate une ouverture et
l'appelle par son nom. La contrepartie est acceptée — **le document reste
atteignable indéfiniment** par « Consulter mon bilan », dans les accès
secondaires. Ce qui disparaît est la TÂCHE, jamais le document.

## Place dans l'ordre du fil, et pourquoi

Juste après ce qui périme, et **avant tout le reste**. Un document que le
praticien a REMIS n'est pas un formulaire de plus : c'est quelqu'un qui
s'adresse au patient. Il ne périme pas, donc il ne passe pas devant une nuit à
noter ; mais il passe devant tout ce que le portail DEMANDE.

Et il passe devant l'invitation à dire ce qui compte, délibérément : « voici ce
que j'ai compris de vous », puis « dites-moi ce qui compte pour vous » est une
séquence — **l'inverse fait parler le patient avant de l'avoir écouté**.

## Aucun drapeau neuf, et la conséquence

Un septième drapeau garderait une DEUXIÈME fois des surfaces déjà gardées :
`WN_COMPREHENSION` ferme la synthèse, le bilan n'en a jamais eu. Ce que ce lot
ajoute n'est pas un accès, c'est un **rappel** d'un accès existant.
**Conséquence : il entre en service au déploiement**, comme le fil lui-même.

L'invariant du journal vaut ici mot pour mot : une surface fermée par son propre
drapeau ne produit **aucune** lecture, et deux bancs le tiennent — la table des
synthèses n'est alors **même pas lue**, et consigner une synthèse est refusé.

## CE QU'UNE MUTATION A TROUVÉ, ET QUI N'ÉTAIT PAS UN BANC MANQUANT

Retirer le garde-fou « rien d'attendu, on n'envoie rien » ne faisait **rougir
aucun banc**. Motif : un `catch` unique autour de tout le corps de l'effet
avalait la panne réseau — ce qu'on veut — **et** l'erreur de programmation qui
suivait — ce qu'on ne veut pas. La page rendait toujours rien, aucune requête ne
partait, et le défaut était invisible.

Deux corrections, et aucune n'est cosmétique : chaque `try` ne couvre plus que
son propre appel réseau, et l'identifiant est lu **avant** l'appel, pour qu'un
champ manquant échoue bruyamment au lieu de passer pour une coupure. Le mutant
meurt maintenant — mais c'est le code qui est meilleur, pas le banc qui a été
ajusté.

## Preuve

- T1 vert. T3 complet — le verdict est au commit.
- **18 mutations jouées, 18 tuées.** La seule survivante a désigné le défaut de
  `catch` ci-dessus.
- Le `GET` **n'écrit rien**, et le banc le prouve en balayant sept verbes
  d'écriture sur toutes les tables mockées — pas en vérifiant la forme du mock.
- Le `GET` **ne transporte aucun contenu** : un banc épingle les `select`, pour
  que l'élargir devienne visible.
