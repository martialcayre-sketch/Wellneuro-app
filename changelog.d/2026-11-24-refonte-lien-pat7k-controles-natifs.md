### Refonte Lien, PAT-7k : contrôles natifs du portail patient habillés à la forme des planches validées (2026-11-24)

Troisième lot de la forme transverse (question `20261121-1633-d`, « F1a à F7a ») ; ce lot
applique F5. Les éléments natifs restent dessous : clavier, dépliage et restitution sont
ceux du navigateur.

- **Volets à chevron** : un volet patient commun (`PatientVolet`) habille le `<details>`
  natif comme l'accordéon de la planche — cadre de 14 px, en-tête de 48 px en graisse 600,
  chevron à droite qui suit l'ouverture. Il sert aux sections des conditions et des
  informations, aux choix (U39), au volet « Mon accompagnement » et aux sections
  secondaires du hub (« Transmis au praticien » quitte les capitales de 14 px et le
  triangle à gauche).
- **Catégories du dépôt de documents (U33)** : options en cartes de 48 px à bord de
  contrôle ; la carte choisie prend un bord pétrole de 2 px sur fond teinté. Le radio
  natif reste dans la carte.
- **Choix de l'anamnèse (U07)** : tuiles de 48 px, 15 px, rayon 14 px, à bord de contrôle ;
  pressée, bord pétrole de 2 px sur fond teinté au lieu du fond plein.

Le champ fichier reste natif (l'habiller imposerait des textes neufs). Aucun texte, aucune
route, garde, drapeau, schéma ni règle clinique modifiés ; aucun composant praticien ni
fichier de COM-0.
