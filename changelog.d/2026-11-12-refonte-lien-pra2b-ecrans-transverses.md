### Refonte Lien, PRA-2b : Fil du jour, fiches, Comptes, Correspondance, Confiance & droits, Paramètres, et « Réessayer » (D-481 §4, D-488, 2026-11-12)

Second temps du lot PRA-2 du plan praticien, sur le prototype validé par écrit (Q1 a à Q11 a, avec Q4 b, Q9 b et Q10 b, inscrits dans [[D-481]] par DOC-6). Les textes neufs sont T-17 à T-19, inscrits dans [[D-488]] par DOC-6. Aucun autre texte ne change. Aucune route, garde, drapeau, règle clinique, schéma ni migration ne change.

- **Titres** : le titre du Fil du jour, de Fiche-trajectoire, des Comptes du cabinet, de la Correspondance, de Confiance & droits et des Paramètres devient un `h1`. Leurs titres de zone deviennent des `h2`, panneaux du rail du Fil compris (Q2). Le texte ne change pas.
- **Icônes** au trait `TRAIT_ICONE` (1,75) sur ces écrans : type de carte du Fil, repli des panneaux, fermeture de la lecture des questionnaires, titres des Paramètres (18 px). Aucune icône n'est ajoutée, sauf celles de « Réessayer » et de « Retour à la file ».
- **Fil du jour.**
  - Une action principale par carte : le bouton plein est réservé à la carte « Maintenant », et ailleurs l'action est un lien pétrole. « Écarter » devient discret.
  - La cible de chaque carte ne change pas. Un banc le vérifie type par type, sur une liste exhaustive des quinze types.
  - **T-18 « Météo d'adhésion indisponible »** (Q9 b) : quand la Météo d'adhésion n'a pas pu être lue (panne réseau, réponse non-ok ou `unavailable`), chaque carte porte ce badge neutre au lieu de rien. Il ne qualifie pas l'adhésion. Le panneau « Météo d'adhésion » garde son propre état d'échec.
- **Confiance & droits : file compacte et détail** (Q10 b).
  - La file donne, pour chaque dépôt, le statut, le patient, la date et le résumé servi. Elle ajoute « En attente de votre avis. » quand un avis est attendu. La ligne entière ouvre le dépôt.
  - Le dépôt choisi passe dans l'adresse (`?depot=`), sur la même route.
  - Au bureau, la file et le détail sont côte à côte, et le premier dépôt est montré d'office.
  - À la tablette et au téléphone, le détail occupe la vue, avec **T-19 « Retour à la file »**. Ce lien rend la file et pose le focus sur la ligne quittée. Le précédent du navigateur fait de même.
  - L'avis sur un effet indésirable reste toujours déplié dans le détail, jamais sous un accordéon. Son bloc a un filet de contrôle et un bandeau brume qui dit son état.
  - Les brouillons sont tenus par le panneau : la réponse d'une demande de droit, comme avant, et désormais l'avis, remonté de `ValidationEffetIndesirable`. Quitter un détail ne perd rien et n'enregistre rien.
  - L'échec de lecture de la file est annoncé (`role="alert"`).
- **Correspondance** : « Ouvrir un dossier » devient l'action pleine de sa zone. Les deux zones sont côte à côte au bureau.
- **Comptes du cabinet** : comptes en chiffres à chasse fixe. **Paramètres** : versions en chiffres à chasse fixe, deux cartes côte à côte au bureau.
- **T-17 « Réessayer »** sous l'échec de lecture du tableau Patients et de la liste de l'Agenda (Q4 b). Il relit la seule lecture en échec. La recherche, le tri, la page et la saisie du formulaire « Planifier » sont gardés. Le focus passe au titre de la zone pendant la relecture.
- Bancs Vitest pour T-17, T-18, la cible des cartes du Fil type par type, la file et le détail de Confiance & droits, et les brouillons gardés d'un dépôt à l'autre. Contrôle à l'écran à 1 440, 1 280, 1 100, 834 et 390 px.
