### Corrigé

- Le banc E2E du lien magique préchauffe la route de redemande avant de
  chronométrer. Sous `next dev` (T2 `--fast`), la compilation à la demande de
  la première requête faisait franchir un palier de quantification
  supplémentaire à l'adresse connue — le test dénonçait un écart de durée là
  où il n'y avait qu'une compilation. La garde anti-énumération est inchangée.
