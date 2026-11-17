### Refonte Lien, PAT-7f : plus de défilement horizontal à 195 px sur « Mes 12 besoins » et l'agenda du sommeil ; le titre d'un questionnaire n'est plus tronqué (2026-11-17)

Lot de correction issu du constat des écrans non vus de PAT-7
(`pat7-constat-ecrans-non-vus.md` §3.1), pris par le responsable le
2026-11-17. Même convention que PAT-7e : 195 px CSS pour le zoom 200 % au
téléphone ([[D-506]]). Aucun texte neuf : des classes seules.

Mesure sur fixture, WebKit (iPhone 13), 195 × 422 : U15 détail débordait de
44 px, U16 de 14 px ; 0 px sur U14 à U17 après correctif, à toutes les
largeurs mesurées, axe sans violation.

- **« Mes 12 besoins »** (U15 détail) : la légende du graphe (« Corps »,
  « Ancrage », « Esprit ») passe à la ligne au lieu de sortir de la carte.
  Sous 320 px seulement, la mention « Pas encore de données » passe sous le
  nom du besoin quand les deux ne tiennent plus sur une ligne, avec coupure
  des mots trop longs et césure française. Au-delà de 320 px, les lignes des
  besoins sont inchangées.
- **Agenda du sommeil** (U16) : la liste « heure de mise au lit » ne dépasse
  plus la largeur disponible (elle garde 10 rem quand la place le permet).
- **Titre d'un questionnaire ou d'un agenda** (en-tête commun) : il passe à
  la ligne au lieu d'être coupé par des points de suspension. À 320 px en
  confort de lecture, « Agenda du sommeil — 21 nuits » était tronqué ; il
  s'affiche désormais en entier. Quand le titre et l'état de l'envoi
  (« Transmis au praticien ») ne tiennent plus sur une ligne, l'état passe
  sous le titre au lieu de le réduire à quelques lettres. Aux largeurs où
  ils tenaient, rien ne change.

Hauteurs de page identiques avant et après à toutes les largeurs mesurées
dès 320 px, sauf là où un titre était tronqué ou la légende sortait de la
carte (320 px en confort). Aucune route, garde, drapeau, schéma ni règle
clinique modifiés ; aucun texte de consentement, de droits ni de sécurité
modifié ; aucun décor avant COM-1.
