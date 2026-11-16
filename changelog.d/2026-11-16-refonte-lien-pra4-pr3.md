### Refonte Lien, PRA-4 PR 3 : compléments, fiches conseils, connaissances — titres sans saut, cibles à 44 px, surtitre T-73 (2026-11-16)

Troisième des quatre PR de PRA-4 (Bibliothèque et ateliers), fiches P44 à
P46, selon les réponses (a) Q1, Q5, Q10 et Q12 du complément DOC-13 de
D-481. Seul texte neuf : T-73 (D-488).

- Titres (Q1) : « Fiches » du rayon compléments passe en h2 sous le h1 du
  rayon ; le tiroir de la fiche justificative était déjà en cascade. Le rayon
  Fiches conseils passe par l'en-tête commun des rayons (`EnTeteRayon`), au
  niveau des autres, avec le même surtitre, le même titre et la même phrase.
  Cet en-tête reste au-dessus de la relecture d'une fiche, dont le titre passe
  en h2 et les rubriques 1 à 6 en h3. Le focus revient toujours au titre du
  rayon au retour de la relecture.
- Cibles (Q5) : les champs et sélecteurs des compléments et de Connaissances
  passent par `ui/Input` et `ui/Select`, à 44 px avec l'anneau de focus
  clavier. Les chips de facettes et les cartes de fiche font aussi 44 px, avec
  le même anneau. Les chips voisines sont espacées de 8 px. Le motif de retrait
  d'une fiche conseil prend le même anneau de focus.
- Couleurs (Q10) : la chip de facette active passe des couleurs `indigo-600`
  aux jetons du socle, comme dans la PR 1.
- Surtitre (Q12) : Connaissances affiche « Bibliothèque · claims validés du
  corpus » (T-73) au lieu des trois domaines nommés sur huit.

La validation et le retrait d'une fiche conseil gardent leur logique, leurs
confirmations et leurs textes. Aucune route, garde, drapeau, schéma ni règle
clinique modifiés ; aucun décor avant COM-1.
