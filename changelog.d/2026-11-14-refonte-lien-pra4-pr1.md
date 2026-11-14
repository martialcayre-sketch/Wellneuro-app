### Refonte Lien, PRA-4 PR 1 : questionnaires et envoi — file en échec dite, envoi et désactivation confirmés (2026-11-14)

Première des quatre PR de PRA-4 (Bibliothèque et ateliers), fiches P37 à
P39, selon les réponses (a) du complément DOC-13 de D-481. Textes repris mot
pour mot de D-488 (amendement DOC-13).

- File d'envoi de la Bibliothèque : un échec de lecture affiche « La file
  d'envoi n'a pas pu être lue. » (T-67) et « Réessayer » (T-17), qui relit la
  seule file. Le message de file vide et le compte ne paraissent plus que sur
  une réponse saine, ni pendant le chargement (Q2).
- « Envoyer (N) — un seul mail » ouvre une confirmation (T-68, variante à un
  élément comprise, puis « Confirmer l'envoi », T-69, et « Annuler ») dans ses
  deux entrées, Bibliothèque et Fil du jour ; elle nomme le destinataire, le
  nombre et les titres. D-030 inchangée : même route, un seul mail (Q3).
- « Désactiver » un instrument du cabinet ouvre une confirmation (T-70, puis
  « Confirmer la désactivation » et « Annuler ») (Q4).
- Titres : le titre de chaque rayon de la Bibliothèque devient le h1 de la
  page (`EnTeteRayon`), la page Questionnaires suit en h2 et h3 sans saut (Q1).
- Questionnaires, assignations et packs : commandes à 44 px avec focus visible
  par `ui/Button` et `ui/Input`, cases à zone de clic de 44 px, croix de
  retrait devenue l'icône `x` nommée (Q5) ; aucun aplat hors de l'action
  principale de chaque zone (Q6) ; assignations récentes en blocs empilés au
  téléphone (Q8) ; plus de couleur `indigo-600`, jetons du socle (Q10).

Aucun texte hors de D-488, aucune route, garde, drapeau, schéma ni règle
clinique modifiés ; aucun décor avant COM-1.
