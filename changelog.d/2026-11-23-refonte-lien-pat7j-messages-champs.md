### Refonte Lien, PAT-7j : messages, états et champs du portail patient à la forme des planches validées (2026-11-23)

Deuxième lot de la forme transverse (question `20261121-1633-d`, « F1a à F7a ») ; ce lot
applique F3 et F4.

- **Messages et états (F3 a)** :
  - le message d'erreur en ligne devient un bloc à bord rouge de 2 px, texte rouge gras
    (#b91c1c, 6,3:1) ; l'information passe sur fond sauge ;
  - le succès passe en vert gras (#166534, 5,99:1 sur son fond) : l'arbitrage du 2026-10-10
    qui le gardait en texte courant tenait à l'ancien vert (4,39:1) ;
  - les échecs de lecture sont encadrés partout : la forme simple, sans cadre, est retirée.
    Sans forme explicite, un état qui propose « Réessayer » est une erreur (filet rouge), un
    refus définitif est un constat (filet neutre). L'agenda du sommeil indisponible est une
    erreur ;
  - l'erreur d'enregistrement de la proposition de réévaluation (U41) passe du paragraphe
    orange isolé au message d'erreur cadré ;
  - la consigne « journée incomplète » de l'agenda alimentaire (U17) n'est plus une erreur
    rouge en alerte : consigne à bord de contrôle sur fond sauge, annoncée poliment par une
    région `role="status"` présente avant elle.
- **Champs (F4 a)** : 48 px de haut, texte 16 px, bord de contrôle (`control-border`,
  3,35:1 au lieu de 1,37:1), rayon 14 px ; libellé 15 px en couleur du texte. Suivent la
  même forme les champs écrits à la main : liste et nombre des questionnaires, commentaire
  de correction, trois zones du dossier à deux voix, sélecteur d'heure du sommeil.

Le formulaire de traitements de U35 (fichier gelé de COM-0, partagé avec le praticien) reste
en 44 px. Les aperçus praticien qui rendent un composant patient (questionnaire de la
Bibliothèque, aperçu du portail) en suivent la forme. Aucun texte, aucune route, garde,
drapeau, schéma ni règle clinique modifiés ; aucun composant praticien ni fichier de COM-0.
