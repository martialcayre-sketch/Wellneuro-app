### D-063 — le verrou biologie devient réel, et révèle que sa signature n'en était pas une (2026-08-16)

`deriverStatutsBiologie` ne testait que `validationExterne` — le plus faible
des cinq verrous du dépôt, sur une table qui venait d'être signée vide. La
fenêtre se refermait à la première règle ajoutée.

- **Cinq termes au lieu d'un** : `signatureIndicationsValide()` exige le
  booléen, une date ISO canonique, des claims non vides, et la concordance de
  `shaPerimetre` avec le SHA de la table. Ce dernier terme — que les quatre
  autres tables n'ont pas — rend la péremption **détectable** : le verrou se
  ferme seul dès qu'une règle bouge sans re-signature.
- **Ce que ça révèle** : la signature posée par `D-061` portait
  `validationExterne: true` mais aucune date et aucun claim. Au standard des
  autres tables, ce n'en était pas une ; elle passait parce que le verrou ne
  regardait que le booléen. Le verrou est donc désormais **fermé** — état juste
  et sans effet observable, la table étant vide et le moteur refusant déjà
  faute de règle. Seul le motif change, et il devient exact.
- **Proposé, non fait** : remonter `shaPerimetre` aux quatre autres tables. La
  plus concernée est celle des priorités, dont `D-062` a agrandi le périmètre
  sans que la signature du 2026-08-15 le couvre.

`npm run check` vert ; banc biologie 18 tests, les deux positions du verrou
éprouvées.
