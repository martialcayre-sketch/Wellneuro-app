### Une primitive de superposition, et la navigation cesse de perdre le praticien (2026-09-03)

Lot 2 de l'audit du cockpit. `PanneauSuperpose` (components/ui) factorise en
une primitive les trois « peaux » Radix Dialog éprouvées en production mais
recopiées à la main dans onze fichiers — tiroir latéral plein écran, modale
centrée, feuille du bas — avec le correctif `data-theme` et le bouton de
fermeture uniformes ; elle ne porte aucun contenu clinique, comme
TwoLevelReading. Trois continuités réparées : `/dashboard/documents` accepte
`?idPatient=` (même contrat que la page Synthèse — le patient transmis est
pré-sélectionné seulement s'il appartient à la liste du praticien, jamais sur
la foi du paramètre) ; la feuille « Plus » de la navigation mobile couvre
désormais tout le produit (sept destinations sur quatorze n'avaient aucun
point d'entrée sous 768 px — copilote, correspondance, bibliothèque, corpus,
agenda, biologie s'ajoutent, `/dashboard/regles` reste volontairement non
liée) ; et la liste héritage n'offre plus qu'un lien par ligne patient — les
deux destinations vers la même fiche se lisaient comme deux objets.
