### Refonte Lien, PRA-3a : structure de la fiche-trajectoire (D-484, D-486 §3, D-488, 2026-11-12)

Premier temps du lot PRA-3 du plan praticien, sur le prototype de l'étape 3 validé par le responsable ([[D-481]] §4, réponses proposées Q1 à Q5 retenues). Il touche la structure du poste de pilotage, pas le contenu de ses panneaux (PRA-3b). Aucune route, garde, drapeau, lecture ni migration ; aucun texte hors de [[D-488]].

- **Rail des sept phases repliable** (T-14). « Masquer les phases » au pied du rail, « Afficher les phases » dans le bandeau du poste de pilotage. Replié, le rail disparaît entièrement (Q1) : hors page, hors clavier, hors arbre d'accessibilité, mais toujours monté.
- **Panneau de contexte escamotable** (T-15). « Masquer le contexte » en tête de la colonne « Instruments », « Afficher le contexte » dans le bandeau. Tant que rien n'est choisi dans la session, le contexte est escamoté d'office de 1 024 à 1 279 px, avant de comprimer la zone de travail.
- **Information critique gardée** quand le contexte est fermé (Q3) : les instruments « Données physiologiques et traitements » et « Décisions de parcours », sous leurs drapeaux, passent dans la zone de travail, sans intitulé neuf. Comme dans la colonne, leur contenu ne se lit qu'à l'ouverture.
- **Focus** : il suit la commande et ne reste jamais sur un bouton qui vient de disparaître. Masquer le pose sur la commande de réouverture ; afficher le rend à « Masquer … » du panneau rouvert (Q5).
- **Mémoire** (Q2) : les deux replis passent d'un dossier à l'autre pendant la session et se perdent au rechargement. Rien n'est écrit sur l'appareil ; l'état ne porte aucune donnée ni identifiant patient. La fiche reste remontée par dossier ([[D-072]] §4) : aucun contenu du dossier précédent.
- **Rien n'est démonté** : le brouillon du protocole (P15) garde sa saisie, le runtime clinique reste monté, les approbations sont conservées ; replier n'émet aucune requête.
- **Bandeau** : le nom du dossier n'y est plus répété (Q4), l'en-tête de fiche le porte juste au-dessus avec ses actions (« Voir ce que recevra le patient », « Exporter en PDF », « Mode consultation », retour), inchangées.
- **Sous 1 024 px**, rien ne change : colonnes empilées, sans commande de repli.
- Bancs Vitest (focus, montage, mémoire de session, aucune écriture sur l'appareil, aucune requête au repli) et e2e au bureau (clavier, rechargement, escamotage d'office à 1 100 px).
