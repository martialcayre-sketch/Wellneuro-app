### Clinique

- **Le questionnaire `Q_SOM_07` cesse d'être proposé : l'instrument servi sous le
  nom « MFI-20 » n'est pas le MFI-20.** Confrontation au PDF source du cabinet
  (2026-07-27) : l'échelle d'accord 1→5 de la source est servie en fréquence
  0→4 ; aucune des 10 inversions d'items n'est appliquée ; les 5 sous-échelles
  publiées sont servies en 2 sections ; et 3 bandes d'interprétation sur /80 y
  figurent alors que la source écrit, en toutes lettres, qu'il n'existe pas de
  barème. Les libellés ne se recoupent qu'à moitié. Ce n'est donc pas un défaut
  de scoring à corriger, mais un **autre instrument** portant le même nom.
  `actif: false` suspend l'assignation sans attendre la reconstruction.
- **Les 4 passations déjà enregistrées restent intactes et lisibles**, et ce
  n'est pas un effet de bord : c'est la propriété qui rend la suspension
  acceptable. Vérifié à la ligne — les deux routes de lecture
  (`api/praticien/reponses`, `api/portail/assignations`) interrogent la base sur
  le patient, jamais sur le catalogue ; `calculateScore` ne consulte pas `actif`.
  Le champ n'agit que sur trois surfaces d'entrée : le sélecteur praticien
  (`api/praticien/questionnaires`), `IDS_ASSIGNABLES` et `listeBibliotheque()`.
  **Aucune de ces passations n'est recalculable** — les réponses existent, mais
  portent sur d'autres items et sur une autre échelle. Rien n'est réécrit.
- **Un banc verrouille les deux moitiés** (`src/lib/bibliotheque.test.ts`), parce
  qu'elles se tiennent : couper l'assignation sans préserver la lecture ferait
  disparaître des données cliniques ; préserver sans couper laisserait proposer
  un instrument retiré. La garde est formulée en **invariant sur tous les
  instruments suspendus**, pas sur un identifiant nommé — elle vaudra pour la
  prochaine suspension. Un contrôle négatif l'accompagne (« il en existe au
  moins un ») : sans lui, les deux assertions passeraient au vert sur un
  ensemble vide. Falsifiée par trois mutations, chacune attrapée : retrait du
  filtre dans `listeBibliotheque()`, retrait dans `IDS_ASSIGNABLES`, et
  exclusion des suspendus du catalogue de scoring.
- **Rien n'est écrit en base.** La colonne `questionnaires.actif` existe, mais
  elle n'a qu'un écrivain — le backfill manuel `backfill:pack-registry:apply`,
  qui recopie la valeur depuis ce catalogue — et **aucun lecteur** : son unique
  lecteur applicatif (`consultation/packRegistry.ts`) ne sélectionne pas ce
  champ. C'est un miroir aval, pas une seconde source de vérité ; le catalogue
  TypeScript reste le seul point de décision. Aucune migration, et le backfill
  n'est lancé par aucun build.
- **Limite connue, laissée telle quelle.** Une assignation déjà envoyée et non
  encore remplie resterait remplissable après suspension : le portail patient ne
  filtre pas sur `actif`. Le cas est vide aujourd'hui — les 3 assignations de
  `Q_SOM_07` en production sont `Complété` / `verrouillé`. Fermer ce trou
  toucherait le parcours patient de tous les instruments et relève d'un lot
  distinct.
- La description affichée annonce toujours « 5 dimensions » là où le scoring en
  sert 2. Elle n'est plus visible (l'entrée quitte la bibliothèque) et sera
  corrigée à la réactivation, avec la grille reconstruite depuis la source.
