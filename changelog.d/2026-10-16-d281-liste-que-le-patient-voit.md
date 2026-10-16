### Sécurité : le patient ne désigne plus que ce qu'il voit — interventions fermes d'un programme servi, sinon désignation sans liste (D-281 §2, sans migration, 2026-10-16)

- **Le défaut** : la liste des éléments désignables au signalement d'un
  effet indésirable venait du programme diffusé, contrôlé pour son
  intégrité seule. Le patient pouvait y choisir un élément d'un programme
  que le portail lui affichait « indisponible » (carte rejouée dérivée,
  contrat patient refusé), ou une intervention qu'il lit sur la même page
  comme différée, écartée, pas indiquée ou en attente de son bilan.
- **Le correctif** (arbitrages du responsable du 2026-10-16, consignés en
  D-281 §2) : la liste ne porte que les interventions fermes d'un programme
  servi au portail — les deux marches du portail, rejeu de la carte puis
  contrat patient. Programme non servi, ou aucune intervention ferme :
  désignation sans liste, « Je ne sais pas » ou « Un autre produit », qui
  rattachent au programme diffusé comme avant. Un élément choisi hors de
  cette liste est refusé au dépôt (400, « Cet élément ne figure plus dans
  votre programme »).
- **Inchangé** : la liste du praticien dans son avis (il peut désigner une
  intervention non ferme) ; la pause des compléments, qui couvre encore un
  complément non ferme ; la garde de diffusion, toujours inerte jusqu'à la
  signature de `SAF-EI-01` ; les compteurs du panneau, du Fil et du prévol
  (un signalement sans liste est rattaché, il attend l'avis comme les
  autres). Un programme réduit à l'orientation et à la prise de sang garde
  le formulaire d'avant.
- **Coût borné** : savoir si le programme est servi demande le rejeu de la
  carte. `GET /api/portail/trust/etat` ne calcule donc la désignation que sur
  demande (`?designation=1`), envoyée par la seule page des informations ;
  l'accueil et les questionnaires, qui lisent aussi cette route, n'en paient
  pas le prix.
- `pauseEffetIndesirable.ts` (`elementsDesignablesParLePatient`),
  `pauseEffetIndesirableServeur.ts` (`programmeDiffuse` dit si le programme
  est servi, `designationPour`), routes `POST /api/portail/trust/signalement` et
  `GET /api/portail/trust/etat`, page des informations, formulaire
  `SignalerProbleme` ; aucune migration, `schema.prisma`
  inchangé, aucun texte patient neuf.
