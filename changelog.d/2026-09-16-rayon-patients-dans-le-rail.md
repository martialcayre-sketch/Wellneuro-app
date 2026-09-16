### Le dossier patient quitte l'héritage 4.0, et devient un rayon à lui (2026-09-16)

`/dashboard/patients` s'intitulait « Questionnaires & packs » et réunissait
**deux métiers sans rapport** : la gestion des dossiers — création, coordonnées,
accès au portail, fin de parcours — et l'assignation de questionnaires avec les
packs. L'URL disait « patients », le titre disait « questionnaires », et la
fiche d'un dossier vivait en sous-route d'une page qui ne la listait pas.

**LE RAYON PATIENTS ENTRE DANS « LA SPIRALE »**, juste sous « Le Fil du jour ».
Assignations et packs deviennent un rayon de la **Bibliothèque**, où les
instruments sont déjà catalogués, prévisualisés et composés en file d'envoi.
L'entrée d'héritage disparaît du rail — et de son **jumeau mobile**, la feuille
« Plus », qu'il aurait été facile d'oublier.

**DEUX ITEMS DU RAIL PARTAGENT DÉSORMAIS UN PRÉFIXE D'URL**, et c'est le seul
point délicat de ce lot : la LISTE (`/dashboard/patients`) allume « Patients »,
une FICHE (`/dashboard/patients/PAT007`) allume « Fiche-trajectoire », qui
pointe pourtant ailleurs. `matiere: 'exact'` sépare les deux, et un banc vérifie
qu'**un seul item est actif** sur chacun des trois chemins.

**PREMIER BANC DU RAIL, et il comble un trou daté.** Ni `SidebarRail` ni
`MobileBottomNav` n'avaient de test unitaire : leur unique filet était un E2E
qui ne tourne que sur Desktop Chromium et n'assérait qu'un seul item. Deux
changements de navigation seraient passés sans qu'aucun banc ne bouge.

**LE COMPORTEMENT NE CHANGE PAS.** Les deux panneaux sont l'ancien code,
déplacé : mêmes routes, même filtre de statut serveur, même prédicat
d'annulabilité, mêmes libellés. Les 70 bancs de `PatientsPanel.test.tsx` se
répartissent sans qu'aucun cas se perde, et le harnais de `fetch` est **extrait
plutôt que dupliqué** — deux copies auraient dérivé, et un banc serait resté
vert sur une route qui ne répond plus comme la vraie.

**UN TEXTE VISIBLE RENVOYAIT VERS UN ÉCRAN QUI DISPARAÎT** : l'état vide de la
liste des trajectoires disait « Créez un patient depuis "Questionnaires &
packs" ». Aucun test ne le couvrait — il se corrigeait à la main, ou il mentait.

Aucune route API n'a bougé : `GET /api/praticien/patients` servait **déjà** les
deux formes dont la scission avait besoin — liste complète pour les sélecteurs,
tableau paginé pour l'écran.
