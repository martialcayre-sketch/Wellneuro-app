### Ajouté

- Le badge « Scoring vérifié » de la fiche patient est désormais **relié au
  barreau `scoring_verifie` du registre** : `verifierRegistreInstruments` compare
  le `certification.status` du catalogue servi au `statutCertification` du
  dossier, et refuse qu'un instrument affiche une vérification que le registre ne
  porte pas. Joué à chaque `npm run check` et en CI, dans les deux positions de
  `WN_ALI_01_SIIN57`.
- Le même garde imprime un **inventaire non bloquant** : les 22 instruments que
  le registre déclare au moins `scoring_verifie` et dont le catalogue ne dit pas
  « certifié », **regroupés par ce que l'écran en fait** — 18 qu'il tait, et
  4 pour lesquels il affirme un doute contre un registre qui déclare le scoring
  vérifié. Les deux familles ne se valent pas, et l'inventaire les sépare : c'est
  la mesure sur laquelle la décision produit sera arbitrée, plutôt qu'un chiffre
  relevé une fois à la main.

### Modifié

- Le seed de développement porte enfin la clé `certification` que tous les
  moteurs de scoring produisent — 13 blocs sur 15. La colonne « Qualité » de la
  fiche patient ne retombe plus systématiquement sur « Historique » en
  développement. Les deux blocs restants restent nus **pour deux raisons
  différentes**, désormais écrites : le PSQI parce que le catalogue ne déclare
  rien, le MFI-20 parce que sa passation est antérieure à la reconstruction de
  l'instrument et que la fiche l'affiche « Non interprétable ».

### Tests

- Banc du validateur de registre : 10 cas de plus, neuf mutations jouées et
  consignées. Un premier jet portait une branche `ETATS_TERMINAUX` redondante
  qu'aucune mutation ne tuait — retirée, avec le commentaire qui désignait la
  mauvaise pièce.
- **Le seed ne peut plus déclarer une certification que le catalogue n'accorde
  pas**, ni taire celle qu'il déclare : un banc compare chaque bloc au catalogue
  servi, dans les deux sens. Sans lui, un `certification.status` qui bougerait
  laissait le seed répéter l'ancienne valeur et le parcours Playwright rester
  vert — il assère ce que le seed dit, pas ce que le catalogue accorde. Les
  données de réponses vivent pour cela dans un module pur (`seedReponses.ts`),
  `seed.ts` s'exécutant au chargement.
- Nouveau parcours Playwright sur le tiroir « Détail des réponses » : trois
  badges lus dans le tableau, dont celui du PSQI qui interdit à un futur seed
  d'affirmer une certification que le catalogue ne porte pas.
