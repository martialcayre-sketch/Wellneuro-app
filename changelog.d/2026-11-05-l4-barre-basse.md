### Portail patient : la barre basse, livrée éteinte (2026-11-05)

Lot L4 de l'audit « rails et menus », sous [[D-444]], acceptée mot pour mot par
le responsable le 2026-11-05 avant tout code.

- Sous `WN_PORTAIL_BARRE_BASSE` (neuf, éteint, sans effet tant que
  `WN_PORTAIL_MENU` est fermé), une barre fixée en bas de l'écran, sous 768 px
  seulement, nommée « Accès rapides » : « Accueil », « Carnet », « Suivi »,
  puis « Bibliothèque » ou « Fiches » quand une fiche a été remise ; un seul
  `aria-current="page"`.
- Mêmes pages et même garde que le bouton « Menu » (majeurs seuls, murs
  franchis, fail-closed), sauf le questionnaire en cours. Pas de case « Menu » :
  le panneau « Mon espace » reste ouvert par le seul bouton de l'en-tête.
- Le pied d'urgence n'est jamais recouvert en fin de défilement : le conteneur
  réserve la hauteur de la barre plus la zone sûre ; `viewport-fit=cover` est
  posé par `portail/layout.tsx`, drapeau ouvert seulement.
- La barre ne s'imprime pas ; cibles de 44 px au moins, y compris en confort
  de lecture agrandi.
- A6-R1 reçoit une précision côté patient ; `.claude/rules/frontend-ui.md`
  range la barre parmi les navigations hors de `PanneauSuperpose`.

Aucune route, aucune sonde neuve, aucune migration ; `[token]/page.tsx` et
`/api/portail/session` ne sont pas touchés ; le layout ne lit toujours que la
signature du cookie.
