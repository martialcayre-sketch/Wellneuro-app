### Outillage — la matrice de consommation indexe aussi les fichiers non suivis

- **Un piège de méthode est fermé structurellement.**
  `chargerIndexSources` listait les seuls fichiers **suivis** par Git.
  Régénérer `MATRICE_CONSOMMATION.md` avant un `git add` produisait donc un
  Markdown sous-compté : vert en local, **rouge en CI**, où tout est commité.
  Le banc de fraîcheur passait pour une raison fausse — pire qu'un banc absent.
- `--others --exclude-standard` fait entrer les fichiers non encore suivis et
  garde les ignorés dehors (`node_modules`, `.next`, client Prisma généré) :
  c'est Git qui le garantit, pas une liste à maintenir.
- **Deux bancs le tiennent** : un fichier écrit mais pas ajouté est indexé ; un
  fichier ignoré ne l'est pas. Le premier rougissait avant ce correctif.
- Rappel écrit dans `.claude/rules/db-prisma.md` pour l'autre piège de la même
  famille — `prisma format` réaligne tout le schéma —, qui n'a pas de
  correctif structurel acceptable : le reformater entièrement serait un diff de
  bruit contre la règle « changements minimaux ».
