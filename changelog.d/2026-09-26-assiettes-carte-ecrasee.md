### La carte des assiettes indiquées redevient visible au cockpit praticien (2026-09-26)

- **Défaut constaté en production** : en phase Actions, sous-vue Protocole, la
  carte « Assiettes indiquées » était réduite à un trait. La route servait
  pourtant sept assiettes indiquées sur un dossier réel. Cause : la carte est un
  enfant direct de la zone focale (colonne flex défilante de hauteur
  contrainte) et porte `overflow-hidden`, ce qui ramène sa hauteur minimale à
  zéro ; dès que la phase dépassait l'écran, toute la compression retombait sur
  elle. Visible sur ordinateur seulement.
- **Correctif** : `shrink-0` sur la carte. Mécanisme reproduit dans Chromium :
  2 px sans, 195 px avec. Aucun changement de route, de données ni de règle.
