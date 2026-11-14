### J2-base : les libellés qu'une lettre d'adressage citera sont jugés à la publication d'un instrument du cabinet (H59, lot D-277, 2026-11-14)

Réponse du responsable `20261114-1217-a` (option 1). Derrière
`WN_ENABLE_DECLARATION_SUICIDE_CAB`, éteint ; sans migration. Drapeau éteint,
rien ne change.

- **La garde** : sous une déclaration « oui », le nom de l'instrument,
  l'énoncé de la question désignée et les libellés de ses options passent
  `contientTermePrescriptif` (`lib/documents/vocabulaire.ts`). C'est la
  fonction même qui fait refuser au rendu médecin une lettre d'adressage
  en `terme_prescriptif`. Elle s'applique à la publication, au geste
  « Déclarer » et à l'édition d'un instrument publié déclaré « oui »
  (`api/praticien/instruments`, `libellesCitablesRefuses`). Pas de liste
  parallèle, aucun terme ajouté. La garde de la lettre reste active.
- **Le refus** nomme chaque champ fautif, en français, et s'affiche dans le
  tiroir ouvert (« Relire la grille », « Déclarer »), et non plus seulement
  sous son overlay.
- **L'édition des métadonnées**, drapeau allumé, écrit sous garde de la date
  relue. Une publication ou une déclaration concurrente ne reçoit donc
  jamais un nom que la garde n'a pas jugé (409).
- **Bancs** :
  - `libellesCitables.guard.test.ts` suit, pour chaque racine et chaque
    champ citable, l'instrument, la copie à l'envoi et la lettre, et tient
    l'équivalence « publication refusée ⇔ lettre refusée » ; il est vu
    rouge au débranchement ;
  - la route est couverte en publication, en déclaration et en modification ;
  - l'écran est couvert dans les deux tiroirs.
- **Constat en production** (lecture seule, conteneur, agrégats) : 0
  instrument du cabinet actif le 2026-11-14, donc aucun libellé déjà publié à
  reprendre.
