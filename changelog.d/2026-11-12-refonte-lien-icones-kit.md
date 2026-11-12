### Refonte Lien : icônes du menu praticien alignées sur la table du kit v2 (2026-11-12)

Décision écrite du responsable : « Aligner sur le kit ». Trois entrées de
`lib/navigation/destinationsPraticien.ts` changent d'icône, au même trait
(`TRAIT_ICONE`, 1,75 px) :

- Le Fil du jour : `LayoutDashboard` → `House` (table `icon-map.fr.json`) ;
- Patients : `ContactRound` → `Users` (table) ;
- Fiche-trajectoire : `Users` → `Route`, absente de la table, pour ne pas
  partager l'icône de Patients.

Le rail, le tiroir, la feuille « Plus » et la barre basse du téléphone
(« Le Fil », « Fiches ») en dérivent. Aucun libellé, route, garde ni
activation modifié ; le menu patient n'est pas touché.
