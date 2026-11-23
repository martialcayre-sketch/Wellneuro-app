### Refonte Lien, PAT-7i : boutons et rayons du portail patient à la forme des planches validées (2026-11-21)

Premier lot de la forme transverse. Le responsable l'a tranchée en bloc le 2026-11-21
(question `20261121-1633-d`, « F1a à F7a ») ; ce lot applique F1 et F2. Planche de
décision : inventaire relu à `main@288e1b24`, d'après la comparaison aux prototypes (#2249).

- **Boutons (F1 a)** :
  - le bouton bordé (`ghost`) prend la forme secondaire des planches : bord de contrôle
    perceptible (`control-border`, 3,35:1, au lieu d'environ 1,5:1) sur fond surface ;
  - le bouton neutre passe au même bord, en 8 px de rayon ;
  - une forme « fantôme », sans bord et soulignée (`link`), est posée aux seuls emplacements
    que montrent les planches : « Annuler » des trois formulaires de signalement (U40) et
    « Sauvegarder le brouillon » des questionnaires et des plaintes (U11, U12) ;
  - les deux boutons écrits à la main de Mon équilibre suivent la même forme.
- **Rayons (F2 a)** :
  - boutons principal et secondaire en 18 px (12 px auparavant) ;
  - éléments intérieurs passés de 12 à 14 px (`rounded`) dans le portail patient : cartes du
    protocole, voix du dossier, avis daté, encarts et commandes des agendas, champ d'heure.

Les rayons des champs, des messages et des accordéons, encore à 18 px, suivent avec leurs
familles (PAT-7j, PAT-7k). Les jetons existaient déjà ; aucun fichier de COM-0 ni composant
praticien n'est modifié. Aucun texte, aucune route, garde, drapeau, schéma ni règle clinique
modifiés ; aucun décor.
