---
paths:
  - "web/src/app/**"
  - "web/src/components/**"
  - "web/src/**/*.css"
---

# Frontend et UI

- Tous les textes visibles sont en français (labels, messages d'erreur,
  placeholders).
- Respecter le design system WellNeuro existant et ses tokens sémantiques ;
  ne pas créer un nouveau composant si un composant `web/src/components/ui`
  répond déjà au besoin.
- Concevoir tactile et mobile avant les interactions dépendant du survol.
- Préserver accessibilité clavier, focus visible, contrastes et libellés
  explicites.
- Données d'exemple : uniquement Sophie Nicola, Jennifer Martin, Michel Dogné.
- Ne pas modifier l'API, le scoring ou Prisma pour résoudre un problème
  purement visuel.
- Un changement d'UI se vérifie en rejouant les E2E (T2 :
  `npm run test:worktree -- --fast`) — une suite Vitest verte ne prouve rien
  sur les parcours.

## Superposition : `PanneauSuperpose`, et ce qui reste dehors

Tout panneau qui se superpose à la page passe par `components/ui/
PanneauSuperpose` — trois variantes (`tiroir`, `modale`, `feuille`), trois
largeurs (`focale` 440 px, `standard` `max-w-xl`, `large` `max-w-2xl`).
Elle porte l'overlay, le bouton de fermeture et surtout le correctif
`data-theme` : **Radix portale vers `document.body`**, hors du
`[data-theme="praticien"]` du layout, et sans re-pose le panneau retombe sur
les tokens par défaut — qui sont ceux du portail PATIENT. Une surface patient
doit passer `theme="patient"` ; `PanneauSuperpose.guard.test.ts` refuse
l'oubli.

**Six surfaces restent volontairement hors de la primitive.** La question a été
tranchée le 2026-09-03, sur pièces — ne pas la rouvrir sans fait nouveau :

- `NavBar`, `MobileBottomNav`, `InboxQuestionnaires` — navigation, pas densité.
- Les trois dialogues de confirmation — `DossierConfirmDialog`,
  `AnnulationAssignationDialog`, `PatientConfirmDialog`. **Leur anatomie n'est
  pas celle d'un tiroir** : aucun des trois n'a de bouton de fermeture (on
  choisit, on ne congédie pas), et leur `Dialog.Description` porte le corps
  entier — plusieurs paragraphes, parfois une liste. La primitive imposerait un
  X à l'écran d'effacement définitif d'un dossier, et réduirait ces
  descriptions à une ligne, le reste passant en `children` : ce qu'un lecteur
  d'écran annonce comme description du dialogue y perdrait. `PatientConfirmDialog`
  ajoute deux écarts à lui seul — titre délibérément `sr-only` et `max-w-sm`.

La règle qui a produit ces six exclusions vaut pour les suivantes : **une
migration vers la primitive se fait à apparence constante.** Si l'adoption
demande de déplacer un panneau, d'ajouter une affordance ou d'inventer du
texte, c'est la migration qui a tort, pas l'écran.
