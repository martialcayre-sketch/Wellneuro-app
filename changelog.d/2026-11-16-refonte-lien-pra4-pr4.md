### Refonte Lien, PRA-4 PR 4 : ateliers — revue en lot confirmée, onglets et marques sans aplat, voie rapide en dialogue (2026-11-16)

Dernière des quatre PR de PRA-4 (Bibliothèque et ateliers), fiches P47 à
P50, selon les réponses (a) Q1, Q5, Q6, Q7, Q8, Q9, Q10 et Q11 du complément
DOC-13 de D-481. Textes neufs : T-71 et T-72 seulement (D-488).

- Revue en lot de l'Atelier corpus (Q7) : « Soumettre les décisions (N) »
  ouvre une confirmation, « Soumettre {N} décisions ({X} validations, {Y}
  rejets) ? Chaque décision est enregistrée séparément. » (T-71, variantes
  comprises), puis « Confirmer les décisions » (T-72) ou « Annuler ». Elle
  précède la soumission sans la changer : même route, même garde
  `statutAttendu`, une décision par claim, même résumé du résultat, mêmes
  marques gardées pour reprise.
- Onglets et marques (Q6) : les onglets « En attente / Validés / Rejetés » de
  l'Atelier corpus et ceux de l'atelier de règles prennent la forme des
  sous-vues de la fiche patient (surface, gras, sans aplat). Les marques
  « À valider » / « À rejeter » et les verdicts « Conforme » / « Non conforme »
  de la voie rapide deviennent des boutons pressés bordés.
- Voie rapide (Q11) : elle s'ouvre dans le panneau superposé commun
  (`PanneauSuperpose`) : focus contenu, Échap, croix nommée. Le focus revient
  au bouton « Voie rapide » de la source. La fermer ne clôt toujours pas le
  tirage.
- Titres (Q1) : Atelier corpus et Atelier de règles passent par l'en-tête
  commun des rayons, en h1 ; les sections dessous sont en h2, puis h3, sans
  saut, Positions d'expert compris.
- Cibles (Q5) : onglets, marques, champs, sélecteurs, « Changer », lignes
  d'ingrédient, sections dépliables, cases et boutons radio (par leur
  libellé) à 44 px avec l'anneau de focus clavier.
- Téléphone (Q8) : la table des sources en revue passe en blocs empilés.
- Couleurs (Q10) : `bg-card` et `destructive` remplacés par les jetons du
  socle.
- Menu (Q9) : ni Règles ni Positions d'expert n'ont d'entrée ; leurs drapeaux
  ne changent pas.
- Confirmation en ligne commune (`GesteConfirme`, qui sert aussi l'envoi et la
  désactivation de la Bibliothèque) : à la fermeture, elle ne rend le focus au
  bouton déclencheur que s'il était perdu. Elle ne le reprend plus à un champ
  où l'on est allé saisir entre-temps.

Règles et Positions d'expert : habillage seul ; leurs signatures,
confirmations et textes sont inchangés. Aucune route, garde serveur, drapeau,
schéma, migration ni règle clinique modifiés ; aucun décor avant COM-1.
