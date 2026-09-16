### Le cockpit patient porte enfin son dossier (2026-09-17)

La phase « 1. Patient » du cockpit affichait **deux lignes** : un nom, un e-mail.
Tout le reste du dossier — identité complète, adresse, numéro de sécurité
sociale, médecin traitant — et **les neuf gestes qui le pilotent** vivaient sur
une page d'héritage 4.0, « Questionnaires & packs ». Le praticien ouvrait le
cockpit d'un patient et devait en **sortir** pour corriger une date de naissance
ou renvoyer un lien d'accès.

La fiche administrative et le menu « Gérer le dossier » sont désormais dans la
phase Patient, avec l'état du dossier — actif, suivi clôturé, accès révoqué —
dit en toutes lettres, les trois se cumulant sans jamais se déduire l'un de
l'autre.

**UNE SEULE IMPLÉMENTATION DES GESTES IRRÉVERSIBLES.** Les neuf actions
comprennent la révocation d'accès et **l'effacement définitif**. Recopier leur
code dans le cockpit aurait suffi à les faire diverger — une confirmation
ajoutée d'un côté, absente de l'autre ; un refus rendu dans le dialogue ici,
derrière l'overlay là-bas. Sur des gestes qui coupent l'accès d'un patient ou
détruisent son dossier, ce n'est pas une dette de style : c'est la promesse
faite au praticien qui cesse d'être tenue **selon l'écran d'où il a cliqué**.
Rayon et cockpit lisent le même hook, et les mêmes règles d'activation du menu.

La preuve est mécanique : retirer la confirmation de l'effacement fait rougir
**six bancs sur les deux surfaces** — celui du cockpit et cinq du rayon, qui
existaient déjà.

**`idPatient` RESTREINT AUSSI LA LISTE DES DOSSIERS.** Ce paramètre ne filtrait
que les assignations : un appelant qui demandait UN dossier recevait la fiche de
**tous** les patients du praticien. Anodin tant que le DTO portait un nom et un
e-mail ; depuis que la fiche administrative s'écrit, cette charge emporte
l'adresse postale et le NIR de toute la patientèle — et le cockpit est
exactement cet appelant. Vérifié appelant par appelant avant d'écrire : aucun ne
dépendait de l'ancien comportement.

**LE DOSSIER VIENT D'UNE REQUÊTE DÉJÀ ÉMISE.** La lecture des passations porte
`?idPatient=` et rien d'autre : une lecture dédiée aurait envoyé la requête
**identique** une seconde fois à chaque ouverture du cockpit.

**UNE LECTURE EN ÉCHEC N'EST JAMAIS RENDUE COMME UN DOSSIER VIDE.** Des champs
vides feraient conclure au praticien que rien n'a été saisi — il ressaisirait
par-dessus, ou écrirait un courrier sans adresse. L'échec se dit en alerte, et
le nom et l'e-mail restent lisibles : ils viennent d'une autre lecture, qui n'a
pas échoué.

**Un texte qui pointait vers rien.** Le panneau disait que l'état du dossier « se
change au menu de la ligne ». Vrai dans le rayon ; faux dans le cockpit, qui n'a
pas de ligne de tableau. Il renvoie désormais vers « Gérer le dossier », libellé
identique aux deux endroits.
