### Sécurité — garde du dossier de la page étendue aux routes d'écriture restantes du portail (D-481 et D-488, DOC-14)

La garde de #2125 s'étend à onze routes d'écriture du portail. Elle couvrait déjà les cinq routes de DOC-12. Ces onze routes prenaient le dossier dans la seule session :

- consentement, fiche, valider, date-naissance ;
- point de suivi du protocole, « ce qui compte », réévaluation ;
- observation alimentaire ;
- lecture datée, accusés de lecture ;
- téléchargement « Pour votre médecin ».

Chacune refuse en 409, sans rien écrire, un envoi dont l'en-tête `x-wn-dossier-page` ne désigne pas le dossier de la session. Un en-tête absent est refusé de même. Les refus 401 et 403 passent avant.

- **Ce que voit le patient.** Sur les douze écrans à geste, T-51 prend la place du message d'erreur existant, sous le geste. Sur U34 (accusé), U38 et U41, il remplace le texte fixe pour ce seul refus. Les trois écritures sans geste refusent en silence : la trace « présenté », la lecture datée et la lecture du protocole. Après un refus, rien n'est relu et la saisie reste.
- **Routes écartées.** Elles sont protégées par leur identifiant cible, ou elles n'écrivent aucune donnée de dossier : `patient/consentement`, `patient/submit`, les agendas, `comprehension`, `dossier`, `session`, `deconnexion`, `lien/demande`.
- **Lecture du segment.** Un composant sans prop lit le segment par le crochet `useSegmentPage`, qui ne sert jamais de clé de stockage local.

Aucune migration, aucun drapeau, aucun schéma. Aucune règle clinique, d'orientation ou de consentement ne change. Arbitrages : `20261114-1951-d` (option a), `20261115-1110-d` et `20261115-1111-d`.
