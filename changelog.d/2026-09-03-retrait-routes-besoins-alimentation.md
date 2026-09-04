## 2026-09-03 — chore(dashboard) : les deux sous-vues pleine page du dossier sont retirées

`/dashboard/patients/[id]/besoins` et `/dashboard/patients/[id]/alimentation`
étaient deux enveloppes de cinq lignes montant exactement les composants que la
fiche patient monte déjà dans ses onglets « Les 12 besoins » et
« Alimentation ». La refonte UX 5.0 du 2026-07-19 les avait explicitement
remplacées par ces onglets — la seconde route avait été créée la veille de cette
décision. Elles y ont survécu sept semaines sans qu'aucun lien de l'application
n'y mène : ni rail, ni navigation mobile, ni menu, ni fil d'Ariane, ni e-mail.

**Ce n'est pas seulement du code mort.** Le dossier `[idPatient]` pose
`key={params.idPatient}` sur la fiche (`D-072` §4) pour qu'un changement de
patient démonte l'arbre au lieu de le réconcilier — « du contenu clinique sous
le mauvais nom, même une seconde, ne se rattrape pas ». Les deux routes vivaient
sous ce dossier sans aucune `key`, et `PractitionerFoodObservationPanel` sème
quatre morceaux de la décision du praticien — traces, mode, code d'assiette,
note — depuis un initialiseur paresseux de `useState`, qui ne s'exécute qu'au
montage. Passer de l'URL d'un patient à celle d'un autre y laissait donc le
brouillon du premier sous le nom du second, sans état de chargement pour le
masquer. `DetailBesoinsPanel` se protégeait seul, par sa barrière de chargement.

Deux redirections 307 ramènent ces adresses vers `?onglet=besoins` et
`?onglet=alimentation` : un favori continue de fonctionner, et il repasse
désormais par la page gardée. Le banc E2E part toujours de l'ancienne URL — c'est
ce qui prouve la redirection.

Aucun composant n'est orphelin : les deux panneaux restent montés par la fiche.
