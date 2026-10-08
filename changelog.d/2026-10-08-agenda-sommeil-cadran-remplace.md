### Agenda du sommeil — le cadran remplacé par des listes d'heures, en trois écrans (2026-10-08)

Campagne `2026-10-07-agenda-sommeil-adhesion`, LOT-03, lancé sans attendre la
re-mesure du LOT-01 (arbitrage du responsable du 2026-10-07). Les retours
patients portaient sur la difficulté de saisie au cadran horaire : jusqu'à
quatre poignées à glisser sur un anneau de 24 heures, minuit en haut, pour
donner une heure que tout le monde sait lire.

- **Chaque heure se choisit dans une liste au quart d'heure** : extinction,
  sortie du lit, et, si le patient le déclare, mise au lit et réveil final. Au
  doigt, le téléphone ouvre sa propre roue ; au clavier, les flèches suffisent ;
  aucun glissement n'est requis (WCAG 2.5.7), aucun champ de texte n'apparaît.
  La liste s'ouvre sur « Choisir », jamais sur une heure : la proposition en
  pointillé du cadran, qui semblait renseignée sans l'être, disparaît.
- **Trois écrans courts** — le soir, pendant la nuit, le matin. « Continuer »
  ne passe que si l'écran est complet et nomme sinon ce qui manque ;
  « Retour » garde les réponses. Un refus d'ordre des heures ramène à l'écran
  qui porte l'heure à corriger.
- **« Comme d'habitude : hh:mm »** remplace « Confirmer ces horaires » : un
  bouton par écran, pour la seule heure que le patient y voit (l'extinction le
  soir, le lever le matin), et seulement quand ces horaires viennent de ses
  propres nuits.
- **Les classes de réveil affichent leur ordre de grandeur** sous chaque tuile
  (« moins de 15 min au total »…), en aide discrète : la classe mesure une
  durée cumulée, pas un nombre de réveils (arbitrage du 2026-10-07).
- Le spec de hit-test du cadran est retiré avec lui ; un spec Playwright note
  désormais une nuit de bout en bout.

Aucun changement de contrat (`agenda-sommeil-v3`), de classe, de seuil, de
fenêtre ni de barème ; aucune migration. Les heures restent au quart d'heure,
comme l'exige la validation serveur. **Comparabilité** : le mode de saisie des
heures change (liste au lieu de cadran) et les bornes des classes de réveil
deviennent visibles ; un déplacement des distributions après ce lot se lira
d'abord comme un effet d'interface. La re-mesure (LOT-02), dernière de
l'ordre arbitré, mesurera l'ensemble des lots sans pouvoir les départager.
