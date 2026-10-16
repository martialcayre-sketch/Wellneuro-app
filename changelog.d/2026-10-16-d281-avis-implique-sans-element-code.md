### Sécurité : le praticien peut rendre « impliqué, élément non identifiable » sur un programme illisible (D-281 §5, code consommateur, 2026-10-16)

- **Ce qui change** : quand le programme visé par un signalement sans
  élément désigné ne passe pas le contrôle d'intégrité, l'écran d'avis
  propose « Impliqué, élément non identifiable », avec un aménagement
  obligatoire. Avant, seul « aucun élément n'est en cause » était possible.
  L'historique des avis affiche « élément non identifiable ». Le choix de
  l'avis annonce au lecteur d'écran l'explication affichée.
- **Une seule règle** (`avisSansElementOuvert`) pour la route et pour
  l'écran : un signalement sans élément désigné par le patient, qui vise un
  programme, et dont la liste d'éléments ne se lit pas. Elle refuse un
  programme lisible, même vide, un élément désigné par le patient et un
  signalement délié de son programme. La base admet la même forme depuis la
  migration `20261016110000_saf_ei_avis_implique_sans_element_v1` ; les
  refus de son trigger ne sont pas atteignables par la route.
- **Pause au portail** : dans la règle, un avis « impliqué » sans élément
  MAINTIENT la pause de tous les compléments de la version visée, avec le
  texte signé de l'avis rendu (arbitrage du 2026-10-16, « si un jour » il
  s'ouvrait sur un programme lisible). Aujourd'hui sans effet au portail :
  l'avis ne s'ouvre que sur une version illisible, que le portail ne sert
  pas. Le commentaire de la migration (« aucun élément n'est mis en pause »)
  décrit ce même état de fait, pas la règle. Le formulaire d'avant n'y met
  toujours rien. La garde de diffusion compte l'avis comme rendu. La règle
  `SAF-EI-01` reste non armée.
- **Bancs** : validation de l'avis, écran, route du verdict, pause ; banc de
  cas fictifs D-281 étendu (cas 30 et 31). Aucune migration dans cette PR.
