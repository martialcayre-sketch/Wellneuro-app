### La fiche patient cesse d'être incorrigible (2026-09-16)

`PATCH /api/praticien/patients` n'acceptait que **deux champs** : `telephone` et
`actif`. Prénom, nom, date de naissance et e-mail étaient saisis à la création
et ne se corrigeaient **plus jamais** — une faute de frappe sur un nom était
définitive, et le seul recours du praticien était de recréer un dossier,
c'est-à-dire d'en abandonner l'historique. Le formulaire « Modifier » du rayon
ne portait, lui, qu'un seul champ.

Neuf champs se corrigent désormais, dont les **quatre renseignements** ouverts
par la migration du dossier administratif : adresse postale, numéro de sécurité
sociale, nom et coordonnées du médecin traitant.

**LE NIR EST REFUSÉ SUR SA CLÉ, PAS SEULEMENT SUR SA FORME.** La base garde la
forme — quinze caractères, départements corses admis. Un numéro **bien formé et
faux** la satisfait, se recopie sans que rien ne bronche, et finit sur un
courrier ou une demande de prise en charge. La clé de contrôle
(`97 − n mod 97`, `2A` → 19, `2B` → 18) attrape la majorité des transpositions
et des chiffres substitués. Le refus dit **ce qui** ne va pas : mal compté les
chiffres, ou mal recopié la clé.

**CHANGER L'E-MAIL RÉÉCRIT QUATRE TABLES, DANS LA MÊME TRANSACTION.** L'adresse
est recopiée dans cinq tables, et `GET /api/praticien/reponses` interroge
`questionnaire_reponses` **par elle**. Changer l'adresse du dossier sans
réécrire les copies rendrait **muettes toutes les réponses déjà reçues** : le
praticien verrait une liste vide, et rien ne lui dirait que ses données sont là
mais introuvables. `consultations`, `assignations`, `questionnaire_reponses` et
`syntheses_ia` se réécrivent donc avec le dossier, d'un seul commit — entre deux
écritures séparées, une lecture verrait le dossier sur la nouvelle adresse et
ses réponses sur l'ancienne.

**`booklet_envois.email_patient_masque` N'EST PAS TOUCHÉ**, et ce n'est pas un
oubli. Cette colonne atteste qu'un livret est **réellement parti** à cette
adresse-là, à cette date-là. La réécrire falsifierait une trace : le livret est
parti à l'ancienne adresse, et c'est ce qui s'est passé.

**UN CHAMP ABSENT DU PAYLOAD N'EST PAS UN CHAMP VIDE.** `undefined` veut dire
« ne touche pas », `''` veut dire « efface ». Sans cette distinction, enregistrer
une désactivation — dont le formulaire n'envoie qu'`actif` — aurait effacé
l'adresse, le NIR et le médecin traitant au passage, sans un mot.

**LA v8 DE « VOS DONNÉES PERSONNELLES » PART AVEC CE LOT**, et pas avec le
précédent. Elle dit que le praticien **saisit lui-même** ces renseignements :
publiée après la seule migration, la phrase aurait été fausse, puisque aucune
route ne savait les écrire. Le banc de dépendance posé au lot précédent a tenu
cette porte fermée jusqu'ici — et c'est lui qui la rouvre, en constatant les
colonnes **et** la route. L'écran nomme les trois renseignements, dit
qu'**aucun n'est obligatoire**, et dit que noter un médecin traitant **ne veut
pas dire lui écrire** ; trois bancs le vérifient sur le rendu, là où ceux du
registre restaient verts quand le paragraphe disparaissait.

**Ce que ce lot coûte :** la séquence « Avant de commencer » REMPLACE la page.
Chaque patient en cours la reverra une fois à sa prochaine connexion.
