### Refonte Lien, PRA-5 PR 2 : la consultation copilote a son h1 et un panneau de contexte repliable (P34) (2026-11-17)

Avant, la consultation copilote empilait ses trois panneaux à toute largeur,
sous un titre de page en h2. Désormais, dès 1 024 px, elle a deux colonnes,
et le contexte se replie comme celui de la fiche (D-481, complément DOC-15,
Q1 à Q3 et amendement B ; T-15 de D-488, emplacement neuf).

- Titres : « Consultation copilote » passe en h1, de même classe que les
  écrans de PRA-2 et de PRA-4 ; les panneaux passent en h2, sans saut.
  `LectureEtatPassePanel` prend son niveau de titre de l'appelant : le
  copilote le passe en h2, la fiche garde h3.
- Mise en page : au centre, le pré-vol puis la lecture datée ; en contexte,
  la minute d'après puis « Discordances et objets cliniques ». Sous
  1 024 px, tout s'empile, sans commande.
- Repli : « Masquer le contexte » / « Afficher le contexte » (T-15), avec la
  forme et le comportement de la fiche. Le repli ne démonte ni ne relit aucun
  panneau, garde la note en cours et rend le focus à la commande opposée.
  L'état est propre au copilote : il vaut pour la session, rien n'est écrit
  sur l'appareil, aucun identifiant patient n'est gardé. Sans choix de la
  session, le contexte est escamoté d'office de 1 024 à 1 279 px. Les deux
  commandes ne s'impriment pas.
- Rien de critique dans le contexte replié : la zone de travail garde alors
  l'échec de lecture de la minute d'après, avec « Réessayer », qui ne relance
  que cette lecture, ou « Rien ne peut être diffusé en l'état. » et ses
  blocages. Ce sont l'état et les textes du panneau, remontés tels quels.
- « Réessayer » passe à 44 px, sur le pré-vol et la minute d'après (Q7).
- Aucun texte neuf hors T-15, aucun score, aucun export, aucune route ;
  lecture seule tenue.
- Bancs : `CopiloteConsultation.test.tsx` (titres, escamotage d'office,
  repli sans démontage ni relecture, focus, blocages et échec gardés au
  centre, état de session) ; `e2e/copilote-prevol.spec.ts`, trois tests P34
  (repli à 1 280 px, escamotage à 1 100 px, téléphone sans commande).
