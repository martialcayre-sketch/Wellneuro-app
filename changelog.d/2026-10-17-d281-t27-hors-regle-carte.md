### Moteur clinique : un signalement d'effet indésirable hors règle ne fait plus dériver la carte servie (D-281 §5, fiche t27, sans migration, 2026-10-17)

- **Le défaut** (démontré dans le code, sans occurrence : la règle n'est pas
  signée) : une fois SAF-EI-01 signée, un signalement ouvert sans programme ni
  rattachement (« non » au programme, aucun programme diffusé, capture sans
  programme) ajoutait à la revue clinique une phrase qui les comptait. Cette
  phrase entrait dans l'empreinte de la carte. Un tel signalement, ou son
  passage à « traité », faisait donc dériver la carte servie. Au portail, le
  programme devenait « indisponible », les pauses d'un autre signalement
  n'étaient plus servies, et la désignation se faisait sans liste. Un
  signalement rattaché, lui, ne touche déjà plus la carte.
- **L'arbitrage du responsable du 2026-10-17** : le programme reste servi. La
  phrase quitte la carte. Ces signalements restent comptés par leur statut au
  panneau des signalements, au Fil du jour et au prévol (`effetsNonTraites`),
  hors de l'empreinte.
- **Le changement** : le second producteur de l'objet de sécurité
  (`construireFindingsEffetIndesirable`) ne rend plus que sa règle, selon la
  signature, et ne lit plus les signalements. `STATUTS_EI_NON_TRAITES` sort du
  périmètre signé de SAF-EI-01 (`SAFETY_EI_SHA256` change, la table n'est pas
  signée). Le banc vérifie maintenant que la sortie est identique avec ou sans
  signalement, quels que soient leur nombre et leur statut.
- **Reste, au §8 du plan** : le cockpit, le vérificateur et le rejeu lisent
  encore les signalements pour les passer à la chaîne, qui les ignore. Ce
  retrait est laissé hors du lot pour le garder minimal.
- Aucune migration, `schema.prisma` inchangé. Aucun effet avant la signature
  (M-1) : tant que la table n'est pas signée, aucune empreinte ne change.
