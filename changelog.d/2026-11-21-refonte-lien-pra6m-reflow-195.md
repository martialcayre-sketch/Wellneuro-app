### Refonte Lien, PRA-6m : les écrans praticien tiennent à 195 px (zoom 200 % sur un téléphone de 390 px) (2026-11-21)

Lot « 195 px » du constat à l'écran de PRA-6 (`pra6-constat.md`, §3.7), sur la
convention du dépôt déjà appliquée au portail patient (PAT-7e, PAT-7f). Des
classes de mise en page seulement : aucun texte, aucun décor, ni route, ni
garde, ni drapeau, ni schéma. Presque tout est borné à `max-[319px]:` : au-delà
de 320 px, la mise en page ne change pas.

- **Titres de page** (`text-3xl`) : un mot long (« Consultation »,
  « Correspondance », « Connaissances »…) dépassait l'écran. Le titre commun des
  rayons (`EnTeteRayon`) et les titres de page du tableau de bord reçoivent,
  d'un seul geste, `[overflow-wrap:anywhere]` et la césure sous 320 px, le
  patron du portail.
- **Champs de formulaire** : sous 320 px, un champ du praticien ne dépasse
  plus son conteneur (`max-width: 100%`, spécificité nulle, `globals.css`), et
  une liste `<select>` rogne son contenu interne (`contain: paint`). Sous
  WebKit, le texte de l'option choisie dépassait de la liste et faisait
  défiler la page sans qu'aucun élément ne dépasse (P51, P52). Sous WebKit
  Linux, la liste garde son apparence native et `overflow` y est forcé à
  `visible` : seule la containment rogne partout. Là où le
  conteneur prenait la largeur native des champs, la grille reçoit
  `grid-cols-1` (Agenda, Correspondance, Paramètres, Atelier des règles) et les
  libellés `max-w-full` (Compléments, Corpus).
- **Fil du jour** : les colonnes de l'heure et de la pastille ne laissaient à la
  carte qu'une cinquantaine de pixels. Sous 320 px, la carte passe sous elles,
  sur toute la largeur, et l'axe vertical s'efface.
- Au cas par cas : en-têtes de panneau du rail et du catalogue en `flex-wrap` ;
  résumé replié du rail, libellés d'analyte, codes de population, lignes du
  tableau du cabinet et adresse des Paramètres qui se replient ; compteurs de
  l'Atelier des règles empilés ; choix d'analyte de la saisie d'un bilan sur sa
  propre ligne ; actions d'un pack (« Modifier », « Désactiver ») sous son nom.

Mesure sous WebKit (iPhone 13), 195 × 332, fixtures seules : les seize écrans
passent à 0. Banc : `bibliotheque-mobile.spec.ts` reçoit un test par écran à
195 px, joué sous Chromium et WebKit ; quand rien ne dépasse et que la page
défile pourtant, son détecteur nomme le coupable par retrait.
