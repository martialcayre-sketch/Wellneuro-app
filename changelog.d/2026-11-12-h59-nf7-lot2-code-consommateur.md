### J2-base : NF-7 lot 2, la déclaration « question sur le suicide » des instruments du cabinet, derrière un drapeau éteint (H59, 2026-11-12)

Code consommateur, sans migration, file A, sur demande explicite du
responsable. Tout passe derrière `WN_ENABLE_DECLARATION_SUICIDE_CAB`, neuf et
éteint. Éteint, la publication, l'envoi et les écrans patient restent ceux
d'avant NF-7 : les bancs le tiennent à l'identique. Aucune D-xxx : D-303,
amendée par D-493, et les réponses 20261111-0027-a à 0030-a font foi.

- **Publication.** L'écran « Relire la grille » demande : « Ce questionnaire
  pose-t-il une question sur le suicide ou les idées de mort ? ».
  - Sans réponse, rien ne se publie.
  - « Oui » demande la question concernée et sa réponse « non ». Le serveur
    les vérifie contre la définition relue en base : la question existe,
    propose des réponses au choix, et la valeur est l'une d'elles.
  - Une désignation vide est refusée ici, pas en base.
- **Modification.** Modifier les questions ou la grille efface la déclaration,
  et la publication suivante la redemande. Modifier le titre seul la garde.
- **Envoi.** La déclaration de l'instrument est copiée sur l'assignation,
  dans la transaction d'envoi de la file. C'est le seul chemin qui envoie un
  instrument du cabinet.
- **Écran patient.** Quand la copie vaut « oui », le serveur le dit, et
  l'encart d'urgence signé (D-275) s'affiche, mot pour mot, sur chaque écran
  du questionnaire : consentement, période terminée, saisie, résumé,
  transmis, « Mon équilibre » et son détail. Rien ne se replie sur la
  déclaration courante de l'instrument.
- **Rien de D-277** (D-493) : ni message sur réponse positive, ni constat, ni
  courriel au praticien. Un banc le tient, et il devra changer avec la
  décision du lot à part.
- **Banc de D-303 §4.** L'action `publier` reste le seul passage vers
  « publié », et elle exige la déclaration une fois le drapeau allumé. La base
  le tiendra par la troisième migration, après l'allumage.
