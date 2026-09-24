### La biologie des assiettes atteint la carte, sans verdict (2026-09-24)

- `D-247` : sous la carte « Assiettes indiquées », une section cite entiers les
  claims de la table signée et pose à côté le dernier résultat du dossier pour
  chaque marqueur (valeur exacte, unité, date de prélèvement, provenance) — ou
  « aucun résultat au dossier ». Aucune comparaison, aucune couleur, aucun mot
  de verdict écrit par la machine.
- Route `GET /api/praticien/assiettes-indiquees/portes-biologiques` (lecture
  seule, verrou à trois termes avant l'appartenance), service
  `portesBiologiquesService.ts`, élection pure `derniersResultatsParAnalyte`.
- Matrice de consommation : la table y entre, le jour où elle atteint l'écran.
