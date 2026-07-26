### Corrigé

- **IPSS (`Q_URO_01`) — deux défauts établis par le banc de certification,
  arbitrés le 2026-07-26.** Le score total valait 42, soit la somme des
  symptômes (36) et de la question de qualité de vie (6) : l'instrument publié
  rapporte celle-ci **séparément**, et 42 n'existe dans aucun barème. Par
  ailleurs l'item `U2` était coté `0,2,3,4,5,6` — la valeur 1 manquait et le
  plafond montait à 6 — quand les six autres items vont de 0 à 5, ce qui portait
  le score de symptômes à 36, hors de la bande d'interprétation la plus haute
  (20-35). `U2` reprend le jeu d'options partagé `O_IPSS`, dont les libellés
  étaient déjà identiques ; le score de symptômes va désormais de **0 à 35**,
  conforme à l'IPSS publié, et la qualité de vie reste calculée et interprétée à
  part. **Aucune passation `Q_URO_01` n'existait en base** au moment du
  changement (vérifié) : aucune réponse enregistrée n'est réinterprétée.

### Ajouté

- **Dimensions déclarées sur deux instruments dont le score global masquait un
  profil** (arbitrage du 2026-07-26). Le questionnaire cardio-métabolique
  (`Q_CAR_01`) expose ses trois dimensions — antécédents familiaux /2, facteurs
  personnels /10, mode de vie /13 — dont la dernière est la seule modifiable.
  Le MMSE GRECO (`Q_GEO_04`) expose ses six domaines : un 24/30 par déficit de
  rappel et un 24/30 par déficit d'orientation n'orientent pas vers le même
  bilan, et le total seul les confondait.
  Le découpage est **descriptif** : les totaux (0-25 et 0-30) et toutes les
  bandes d'interprétation sont inchangés. Il sort sous une clé `dimensions`
  **distincte de `subScores`** : un sous-score porte sa propre interprétation
  et remplace le score global à l'affichage, une dimension ne fait que
  détailler un total qui reste la mesure. Les confondre aurait effacé de la
  fiche patient le total du MMSE et son interprétation, remplacés par autant de
  tirets qu'il y a de domaines. La fiche affiche donc le total, puis les
  dimensions sous lui. Un instrument `sum` qui n'en déclare pas garde
  exactement sa sortie d'avant.
  Trois gardes verrouillent le découpage, chacune vérifiée en échec : aucun item
  servi hors dimension et aucun doublon, somme des maxima égale au maximum
  total, somme des dimensions égale au total (jeux complet et partiel) — et
  l'interdiction d'émettre sous `subScores`.
