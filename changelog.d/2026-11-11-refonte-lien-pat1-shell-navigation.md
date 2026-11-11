### Refonte Lien, PAT-1 : shell et navigation du portail patient (D-482, D-483, D-488, 2026-11-11)

Premier lot du plan patient de la refonte Lien / Empreinte. Il habille le rail « Mon espace » et règle la navigation du Jardin dès 1 024 px. Aucune migration, aucun drapeau posé ni retiré, aucune route, aucune garde, aucune sonde changée ; aucun texte hors de D-488.

- **Rail en trois états** ([[D-482]]) : déplié (15,75 rem), réduit (13 rem, `w-nav-rail-compact`, libellés gardés et passés à la ligne, jamais un rail d'icônes) et escamoté (hors de la page, du clavier et de l'arbre d'accessibilité, la colonne de contenu reprend sa place). L'état vit dans la mémoire du layout du portail : il suit la navigation entre les pages, pas le rechargement, et rien n'est écrit sur l'appareil (Q56). Au chargement, déplié.
- **Commandes en pied de rail** : « Réduire le menu », « Agrandir le menu », « Masquer le menu » (T-21 à T-23). Rail escamoté, le bouton « Menu » de l'en-tête reparaît dès 1 024 px, reçoit le focus et rouvre le rail déplié ; sous 1 024 px, le seul bouton « Menu » ouvre toujours le panneau. Un seul déclencheur visible à chaque largeur.
- **Plus d'onglets dans l'en-tête** ([[D-483]] §1) : `VuesRapidesPortail` est retiré ; dès 1 024 px, le rail est la seule navigation « Mon espace ».
- **Hub** ([[D-483]] §2) : dès 1 024 px, quand le rail est servi (ou pendant la lecture de sa garde), « Autres espaces » n'est pas rendu ; sous 1 024 px, ou si la garde refuse, il reste. La frise reste.
- **Forme** : fond sauge du thème patient (`bg-rail`, toujours clair), entrée active sur `rail-surface` avec son filet `nav-active`, bord `rail-border`, survol `rail-surface`. Icônes de « Mon espace » et de la barre basse au trait `TRAIT_ICONE` (1,75).
- **T-32** : « Ouvrir mon carnet alimentaire » (minuscule), dans la table des entrées.
