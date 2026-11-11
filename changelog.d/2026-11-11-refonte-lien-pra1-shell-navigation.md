### Refonte Lien, PRA-1 : shell et navigation du portail praticien (D-484 à D-488, 2026-11-11)

Premier lot du plan praticien. Il habille et réorganise la navigation globale de l'Observatoire (`/dashboard`), sans route, garde, drapeau ni migration. Aucun texte hors de [[D-488]].

- **Une déclaration des destinations** ([[D-485]]). `web/src/lib/navigation/destinationsPraticien.ts` porte, pour chaque entrée, libellé, route, groupe, icône et règle d'activation (`prefixesActifs` compris). Le rail, le tiroir tablette, la barre basse et la feuille « Plus » en dérivent ; plus aucune liste n'est recopiée à la main.
- **Quatre groupes** ([[D-487]]) : Travail, Bibliothèque, Ateliers, Cabinet (T-01 à T-04). « Comptes du cabinet » rejoint « Paramètres » dans Cabinet ; « Atelier corpus » passe dans Ateliers. La feuille « Plus » du téléphone reçoit les mêmes intertitres.
- **Rail en trois états** ([[D-486]]) : déplié, réduit en icônes, escamoté.
  - « Masquer la navigation » au pied du rail (T-12), « Afficher la navigation » dans l'en-tête (T-13) ; le focus suit la commande.
  - Escamoté, le rail quitte la page, le clavier et l'arbre d'accessibilité. Le choix est mémorisé sur l'appareil sous `wn-rail-escamote-praticien`, sans donnée ni identifiant patient ; `wn-rail-expanded` est inchangée.
  - Réduit, chaque entrée garde son nom accessible ; son libellé paraît au survol, au focus clavier et pendant l'appui du doigt, et Échap le masque.
  - Déplié, le rail défile si sa hauteur ne suffit pas (zoom).
- **Vues rapides retirées** de l'en-tête, à toute largeur, montage compris ([[D-484]]) : `VuesRapides.tsx` et son banc sont supprimés.
- **Habillage Lien.** Entrée active en `rail-surface` avec une barre `rail-accent` (champagne), au rail, sur la barre basse et dans la feuille ; la pastille pétrole de la barre basse (1,5:1) disparaît. Marque Empreinte (`EmpreinteMarque tone="night"`) à la place de « Wellneuro / Horizon 5.0 » et des initiales « WN ». Icônes au trait `TRAIT_ICONE`. En-tête et barre basse opaques, contours des commandes de l'en-tête en `control-border`.
- **Nom accessible** du rail : « Navigation principale » (T-10).
- **Bancs par couche** : déclaration (groupes, ordre, une entrée active au plus par route servie, une fiche allume « Fiche-trajectoire », aucune entrée pour Documents, Règles, Positions d'expert), rail, barre et feuille, en-tête et trois états ; E2E de l'escamotage (clavier, rechargement, 200 %).
