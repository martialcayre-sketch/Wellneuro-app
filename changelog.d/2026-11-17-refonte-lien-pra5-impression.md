### Refonte Lien, PRA-5 PR 1 : le tableau de bord s'imprime sans rail ni menu (X06) (2026-11-17)

Avant, imprimer une page `/dashboard/**` imprimait aussi l'en-tête collant, le
rail, « Afficher la navigation », le menu de compte, l'étiquette de version et
la barre basse du téléphone. Désormais, seul le contenu sort, sur toute la
largeur de la feuille (D-481, complément DOC-15, Q9 a).

- `NavBar` : l'en-tête, le rail, le tiroir de tablette et son voile portent
  `print:hidden`. La colonne de contenu perd à l'impression sa largeur bornée
  et ses marges, et `main` perd la marge réservée à la barre basse.
- `MobileBottomNav` : la barre basse, sa feuille « Plus » et son voile portent
  `print:hidden`.
- Fiche patient : les quatre commandes de repli (« Masquer / Afficher les
  phases », « Masquer / Afficher le contexte ») ne s'impriment pas. Les
  colonnes des phases et du contexte, qui sont du contenu, restent imprimées.
- Aucune règle d'impression globale, aucun bouton « Imprimer » ajouté, aucun
  texte neuf. À l'écran, rien ne change. « Imprimer cet aperçu » (P52)
  imprime toujours le document de son iframe, avec sa propre composition.
- Dans Tailwind 3.4, la variante `print` est émise après les variantes de
  largeur : `print:hidden` l'emporte sur `lg:flex`, même sur une feuille en
  paysage.
- Bancs : `NavBar.test.tsx` (chrome, contenu, tiroir ouvert) et
  `FichePatientPanel.test.tsx` (quatre commandes de repli, colonnes gardées).
