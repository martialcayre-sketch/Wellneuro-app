### Ajouté

- Le badge « Scoring vérifié » de la fiche patient est désormais **relié au
  barreau `scoring_verifie` du registre** : `verifierRegistreInstruments` compare
  le `certification.status` du catalogue servi au `statutCertification` du
  dossier, et refuse qu'un instrument affiche une vérification que le registre ne
  porte pas. Joué à chaque `npm run check` et en CI, dans les deux positions de
  `WN_ALI_01_SIIN57`.
- Le même garde imprime un **inventaire non bloquant** : les 22 instruments que
  le registre déclare au moins `scoring_verifie` et dont le catalogue ne dit pas
  « certifié » (18 sans certification, 4 ambigus au 2026-08-09). C'est la mesure
  sur laquelle la décision produit du badge muet sera arbitrée, plutôt qu'un
  chiffre relevé une fois à la main.

### Modifié

- Le seed de développement porte enfin la clé `certification` que tous les
  moteurs de scoring produisent — 13 blocs sur 15. La colonne « Qualité » de la
  fiche patient ne retombe plus systématiquement sur « Historique » en
  développement. Les deux blocs restants restent nus **pour deux raisons
  différentes**, désormais écrites : le PSQI parce que le catalogue ne déclare
  rien, le MFI-20 parce que sa passation est antérieure à la reconstruction de
  l'instrument et que la fiche l'affiche « Non interprétable ».

### Tests

- Banc du validateur de registre : 8 cas de plus, sept mutations jouées et
  consignées. Un premier jet portait une branche `ETATS_TERMINAUX` redondante
  qu'aucune mutation ne tuait — retirée, avec le commentaire qui désignait la
  mauvaise pièce.
- Nouveau parcours Playwright sur le tiroir « Détail des réponses » : trois
  badges lus dans le tableau, dont deux qui interdisent à un futur seed
  d'affirmer une certification que le catalogue ne porte pas.
