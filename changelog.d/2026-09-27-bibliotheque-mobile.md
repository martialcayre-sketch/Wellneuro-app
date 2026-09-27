### Bibliothèque : la page ne défile plus en largeur sur téléphone (2026-09-27)

- **Deux causes, deux correctifs d'une ligne.**
  - Le formulaire « Nouveau pack de questionnaires » posait sur une seule
    ligne, sans retour, ses deux sélecteurs de catégories et leurs libellés. La
    ligne passe désormais à la ligne, comme celle du formulaire d'édition, et
    ses sélecteurs sont bornés à la largeur disponible.
  - Sous le point de rupture `xl`, la grille du rayon Questionnaires n'avait
    pas de colonnes explicites : sa piste prenait la largeur du contenu, dont
    la rangée de filtres pourtant en défilement horizontal. Elle porte
    désormais `grid-cols-1`.
- **Nouveau banc E2E** (`bibliotheque-mobile.spec.ts`) : la page entière tient
  dans la largeur de l'écran, sur iPhone 13 comme sur Desktop. Retirer l'un ou
  l'autre correctif le fait rougir, avec le nom des éléments fautifs.
- Le défaut avait été révélé par l'E2E du rayon « Fiches conseils » (lot 6b de
  `D-251`).
