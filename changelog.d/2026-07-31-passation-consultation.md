### Certification — `actif: false` cesse de vouloir dire deux choses ; le MMSE et le MMT rouvrent en consultation

- **Un drapeau portait deux sens, et le vérificateur les confondait.** `actif: false`
  signifiait à la fois « instrument retiré de la production » et « jamais destiné au
  patient ». Or pour un test **administré par le clinicien**, l'absence du portail
  patient est l'état normal et permanent : c'est ce qui ferme sa route d'assignation.
  Le contrôle « `actif: false` ⟹ état terminal » l'épinglait donc à `suspendu`, et le
  rendait **structurellement incapable de gravir l'échelle de certification, pour
  toujours**. Deux instruments étaient dans ce cas — `Q_GEO_04` (MMSE) et `Q_NEU_06`
  (MMT) — précisément parce que #460 leur avait donné une entrée de catalogue inactive
  pour fermer leur route. Les quatre autres instruments de consultation n'y échappaient
  que faute d'entrée au catalogue, c'est-à-dire par la position « invisible et
  assignable » que #460 avait fermée : l'échappatoire *était* le trou.
- **L'exemption vient avec sa contrepartie**, sans quoi elle rouvrirait ce qu'elle
  ferme — le reproche exact adressé le 2026-07-31 à une exemption écrite pour ce même
  `Q_NEU_06`. Un instrument servi en consultation **ne peut pas** être dans un état
  terminal : inscrire un identifiant dans `PASSATION_PRATICIEN` ne doit pas devenir le
  moyen de le servir tout en le laissant dispensé de source, de droits, de contenu
  verrouillé et de verdict.
- **Le MMT est identifié, et son motif de fermeture tombe.** Il était fermé parce que
  « le registre ne nomme aucun auteur, on ne sait pas dire ce qu'il est » — et l'entrée
  reconnaissait que cette absence était une **non-recherche**. La recherche a été faite :
  le servi correspond au document « MMT ou Mini Mental Test » diffusé par l'**IEDM**
  (Institut Européen de Diététique et Micronutrition, PDF de 2005), dix items dans le
  même ordre, libellés au mot près, mêmes modalités, même cotation 0/1/2 et les mêmes
  quatre bandes, chevauchement à la valeur 1 compris. C'est un exemplaire **indépendant
  et public** du support SIIN, pas son écho.
- **Et il n'est pas le MMSE** — c'est sa propre grille qui le dit : sa bande 5-10 ordonne
  « Faire MMS ». Un instrument qui prescrit le MMSE en aval n'en est pas une
  reproduction, et la réserve « © PAR » ne le vise pas. Le rapprochement de famille
  portait sur des épreuves élémentaires (âge, heure, rappel de trois mots, soustractions
  de 7) qui n'appartiennent en propre à aucune échelle.
- **Ce que l'instruction ne donne pas, et qui reste écrit** : le document IEDM ne nomme
  aucun auteur et ne porte aucune mention de copyright. La réserve conservée ne dit plus
  « on ne sait pas ce que c'est » mais « aucun ayant droit n'est identifiable pour être
  sollicité ». Le contenu reste déclaré `adapte` et non `verbatim` : la consigne de
  passation est réécrite, et le chevauchement de bandes est arbitré.
- **Le MMSE rouvre en consultation, et c'est un renversement assumé** de la décision du
  2026-07-29. Motif : une asymétrie qui ne se défendait pas — six instruments portant la
  même classe de réserve de droits sont, eux, **envoyés au patient**. Afficher une grille
  au praticien qui porte la déclaration d'usage expose strictement moins que de l'adresser
  à un patient. **Sa route d'assignation reste fermée** : les deux gestes de #460 étaient
  indépendants, un seul est repris. L'asymétrie de nature subsiste et reste au registre —
  le MMSE est le seul de cette population dont l'ayant droit (PAR) vend activement la
  licence.
- **L'aperçu cessait d'être une porte.** `api/praticien/bibliotheque/apercu` rendait le
  texte intégral des items et des options de **n'importe quel** instrument porteur d'une
  définition, suspendu ou non : le rayon n'affiche jamais une entrée inactive, mais un
  appel direct avec l'identifiant suffisait. Classe « invisible mais servi », voisine des
  deux « invisible et assignable » déjà corrigées. La route refuse désormais un instrument
  à la fois suspendu **et** hors consultation — c'est la conjonction qui porte le sens
  depuis que `actif: false` a cessé d'en avoir un seul.

Neuf mutations éprouvées, chacune vérifiée échouante puis restaurée : exemption retirée,
contrepartie retirée, extraction rendue muette, prose de commentaire comptée, chaque
instrument retiré de la consultation, ajout non décidé, garde d'aperçu retirée, et sa
conjonction perdue.
