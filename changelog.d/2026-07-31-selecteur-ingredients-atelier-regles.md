### Corrigé

- **Atelier de règles — le sélecteur d'ingrédients tient un référentiel de
  milliers d'entrées** (C4, lot 1c). `GET /api/praticien/regles/vocabulaire`
  servait *tout* le vocabulaire actif, ingrédients compris, chacun avec toutes
  ses formes, sans borne — et `/dashboard/regles` en faisait un `<select>` nu.
  Les tables étant vides en production, l'écran fonctionnait ; l'ingestion du
  référentiel Compl'Alim (~2 000 ingrédients) l'aurait rendu inutilisable, le
  drapeau `WN_C4_ENABLED` étant allumé. Les ingrédients sont désormais cherchés
  côté serveur et bornés à 50 par réponse ; le champ de recherche a remplacé la
  liste déroulante.

  Trois pièges fermés, tous de la même famille — **une liste d'options qui
  rétrécit peut faire mentir un champ déjà rempli** :

  - **Le formulaire de révision n'avait pas d'autre source pour les formes.** Il
    les retrouvait dans le vocabulaire complet ; une règle existante cite un
    ingrédient qui n'a aucune raison de figurer dans les 50 premiers. Sans
    compensation, le `<select>` de forme préférée se serait vidé alors que la
    valeur restait en état : il aurait **affiché autre chose que ce qui aurait
    été soumis**. Les formes sont maintenant chargées à la demande pour le seul
    ingrédient de la règle, et la forme préférée courante reste rendue comme
    option tant qu'elles n'arrivent pas — chargement en cours ou échec.
  - **Le formulaire de création déduisait l'ingrédient choisi de la liste.** La
    liste changeant à chaque frappe, le choix se serait évaporé en silence dès
    qu'une recherche cessait de le contenir, emportant la forme préférée déjà
    sélectionnée. Le choix est désormais tenu comme objet complet.
  - **La troncature était muette.** 50 résultats sur 1 240, sans le dire, se
    lisent « il n'y en a que 50 » : la réponse porte `ingredientsTotal` et
    l'écran l'annonce.

  Seuls les ingrédients sont bornés : intentions, critères et sources sont
  gouvernés à la main, entrée par entrée, et ne reçoivent aucun déversement
  externe.

### Notes

- Ce lot est le verrou qui précédait l'ingestion du référentiel : il n'ingère
  rien lui-même.
