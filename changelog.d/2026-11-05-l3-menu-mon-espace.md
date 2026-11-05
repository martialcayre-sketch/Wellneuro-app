### Portail patient : le menu « Mon espace », livré éteint (2026-11-05)

Lot L3 de l'audit « rails et menus », sous [[D-442]], acceptée mot pour mot par
le responsable le 2026-11-04 avant tout code.

- Sous `WN_PORTAIL_MENU` (neuf, éteint), un bouton « Menu » dans l'en-tête du
  portail ouvre un tiroir titré « Mon espace » : l'ancre « Mon parcours » puis
  les quatre groupes du hub, même source et même ordre, un seul
  `aria-current="page"`.
- Sur toutes les pages de session, hub et écrans de saisie compris ; jamais sur
  la connexion, `lien/indisponible`, les écrans d'entrée, ni avant « Avant de
  commencer » et la date de naissance. Servi au seul dossier majeur
  ([[D-283]] §5) ; fail-closed.
- Le tiroir se ferme par son bouton, Échap, le voile, au changement de page et
  avant l'impression ; le focus revient au bouton.
- Le même drapeau fait du mot-symbole « Wellneuro » un lien d'accueil et ouvre
  chaque page par le lien d'évitement « Aller au contenu ».
- Les dix sondes des espaces sont montées une fois au layout et partagées avec
  le bloc « Autres espaces » du hub : aucune requête doublée.
- A6-R1 reçoit sa précision côté patient, et `.claude/rules/frontend-ui.md` admet
  le menu comme seule navigation servie par `PanneauSuperpose`.

Aucune route, aucune sonde neuve, aucune migration ; `[token]/page.tsx` et
`/api/portail/session` ne sont pas touchés ; le layout ne lit toujours que la
signature du cookie.
