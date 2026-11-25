### Refonte Lien, COM-2 : bandeau du hub patient dans `LienDecor` (2026-11-25)

Micro-lot commun ouvert par le responsable le 2026-11-25 (« C, 76/88 px, DOC+COM », puis « 52/64 comme dessiné »), selon le complément DOC-21 de [[D-481]] §1 bis.

- **Nouvel emplacement** `hub-patient` (U10, lot PAT-3b) : il n'accepte que le bandeau `ornaments/quiet-sweep.svg`. Le bandeau prend toute la largeur de son parent, dans le flux, à hauteur fixe (52 px, 64 px dès `md`), recadré par la gauche sans être étiré (`cover`, aucun rapport d'aspect imposé). L'appelant le pose bord à bord en tête de sa carte.
- **Règles de COM-1 inchangées** : `aria-hidden`, sans pointeur ni sélection, masqué à l'impression, aucun mouvement.
- **Refus** : tout autre élément au hub et le bandeau à tout autre emplacement sont refusés au typage et ne rendent rien à l'exécution.
- **Banc** (`LienDecor.test.tsx`) : le nouvel emplacement entre dans la réception de COM-1 ; le SVG servi est relu statique et sans texte.

Aucun écran ne l'emploie encore : PAT-3b le pose. Aucun texte, aucune route, garde, drapeau, schéma ni règle clinique.
