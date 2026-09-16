### Clôture — le rayon Patients, huit lots (2026-09-17)

La campagne « Le rayon Patients — le dossier rendu au praticien » se clôt sur
huit lots, sept PR mergées, et deux décisions : **D-220** (la gestion du dossier
quitte l'héritage 4.0, le cockpit porte son dossier) et **D-221** (le NIR
déclaré entre au dossier, en clair, sa clé vérifiée côté application).

**LE BANC QUI MANQUAIT, ET QUE LA CONTRE-REVUE A TROUVÉ.** Le plan promettait de
prouver qu'après un changement d'e-mail, une réponse déjà déposée reste lisible.
Deux moitiés étaient gardées — les quatre réécritures d'un côté, la lecture par
`emailPatient` de l'autre — et **rien ne reliait les deux bouts**. « Donc les
réponses restent lisibles » était une inférence d'une ligne, juste, mais
qu'aucun banc ne tenait. Les deux routes partagent désormais un magasin en
mémoire dans `changementEmailChaine.guard.test.ts` : le `PATCH` y écrit, le
`GET` y lit, et le banc tombe si une seule réécriture disparaît — là où les deux
autres restent verts.

**DEUX AFFIRMATIONS DU CADRAGE RÉFUTÉES.** « Trois baselines visuelles vont
rougir, et trois seulement » : exact pour le LOT-01, et juste par accident —
l'analyse n'avait pas envisagé les lots suivants, qui n'en ont fait bouger
aucune. « Le LOT-04 dépend du LOT-03 » : insuffisant, puisque la v8 dit que le
praticien *saisit lui-même* ces renseignements, ce qui n'est vrai qu'après le
LOT-05.

**LA RECETTE MANUELLE POINTAIT DES ÉCRANS DÉMÉNAGÉS.** L'assignation d'un
questionnaire se fait désormais depuis la Bibliothèque, et la phase Patient du
cockpit entre à la checklist — avec sa règle : une lecture en échec s'y dit en
alerte, jamais en champs vides.

**LA LIGNE DE BASE EST LUE EN PRODUCTION, ET ELLE ÉTABLIT UN FAIT QUE LE CADRAGE
SUPPOSAIT.** Comptages seuls, au conteneur, le 2026-09-17 : **29 dossiers, 36
consultations, 22 fiches signalétiques, 21 anamnèses**. Ces renseignements
existaient — écrits par des patients, conservés depuis des mois — et **aucune
surface praticien ne les lisait**. Le manque portait sur 21 dossiers sur 29 ; il
n'était pas théorique.

**Et trois zéros** : aucune adresse, aucun NIR, aucun médecin traitant. Ce n'est
pas un échec, c'est l'instant d'avant — les colonnes ont huit heures et le code
qui les écrit n'est pas encore en ligne. La requête est conservée telle quelle :
la rejouer **à l'identique** est la seule façon d'en tirer un constat, et la
reformuler déplacerait la question (`D-112`).
