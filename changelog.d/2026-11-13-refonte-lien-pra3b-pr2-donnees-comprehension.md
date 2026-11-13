### Refonte Lien, PRA-3b PR 2 : Données et Compréhension — un échec de lecture n'est plus lu comme un dossier vide (2026-11-13)

- Fiche-trajectoire, phase « Données fiables » et tiroir « Détail des
  réponses » : quand la lecture des questionnaires reçus échoue, la fiche dit
  « Les questionnaires reçus n’ont pas pu être lus. Ce n’est pas un dossier
  sans réponse. » (T-60, D-488) avec « Réessayer » (T-17), au lieu de
  « Aucun questionnaire complété pour ce patient. ». La route répondait
  `reponses: []` avec un statut d'erreur, que la liste vide confondait avec
  un dossier sans réponse. La comparaison des passations se tait derrière ce
  message ; « Réessayer » relit la seule lecture des réponses et rend le
  focus au contenu relu.
- Compréhension : l'échec de lecture du panneau « Ce que j’ai compris de
  vous » s'affiche dans la couleur de danger (la classe `text-status-error`
  n'existait pas) et propose « Réessayer » ; « Enregistrer en brouillon »
  devient bordé, « Publier au patient » reste la seule action pleine (Q3a).
- Niveaux de titres (Q2a) : « Données manquantes », « Objectif négocié » et
  « Ce que j’ai compris de vous » passent en h4 sous le titre de phase, leurs
  sous-parties d'un niveau plus bas.
- Gestes de Compréhension et de l'objectif négocié à 44 px au moins, avec
  anneau de focus.

Aucun texte hors de D-488, aucune règle clinique, aucun drapeau, aucun
séparateur des deux voix (Q7a, après COM-1).
