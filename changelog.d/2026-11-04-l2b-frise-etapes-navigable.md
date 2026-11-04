### Portail patient : la frise des étapes devient navigable, livrée éteinte (2026-11-04)

Lot L2b de l'audit « rails et menus » ([[D-423]] §8), ouvert après la réponse du
responsable au constat de L2 : la hauteur du bloc « Autres espaces » est gardée.

- Sous `WN_PORTAIL_FRISE_NAVIGABLE` (neuf, éteint), la frise des six étapes du hub
  devient `<nav aria-label="Étapes de votre parcours">`, distincte de « Autres
  espaces » : un seul `aria-current="step"`, cibles de 44 px au moins en `rem`,
  libellés inchangés, sans rang.
- Cibles existantes seulement, aucune route : « Questionnaires » vise la liste des
  questionnaires du hub, ou « Mon parcours » quand elle n'est pas rendue ;
  « Analyse du praticien », étape courante, ouvre « Votre praticien prépare votre
  restitution à partir des éléments transmis. Vous la retrouverez ici dès qu’elle
  sera prête. » en `analyse_en_cours`, et « Vos éléments ont été transmis. » en
  `elements_transmis` ; « Restitution », étape courante, mène au bilan quand il est
  consultable. Les autres étapes restent annoncées, non cliquables.
- À 390 px, la frise amène l'étape courante dans son champ à l'affichage : au
  constat, « Analyse du praticien » restait hors champ, à droite.
- Servie au seul dossier majeur ([[D-283]] §5) ; un mineur garde la frise d'avant.
  Le drapeau est lu côté serveur par `questionnaires/layout.tsx` et servi au hub
  par contexte.
- Sans drapeau : la frise ne fait plus déborder la page à 390 px (son `sr-only`
  sortait du défilement), sur le hub comme sur les écrans d'entrée.

Aucune route, aucune migration ; `[token]/page.tsx` et `/api/portail/session` ne
sont pas touchés.
