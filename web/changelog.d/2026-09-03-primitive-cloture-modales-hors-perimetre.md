## 2026-09-03 — docs(ui) : le lot Primitive se clôt — les trois modales de confirmation restent dehors, sur pièces

Le cadrage annonçait onze sites à migrer vers `PanneauSuperpose`. Neuf l'ont
été (`PatientPreview` puis les huit tiroirs). **Les trois dialogues de
confirmation n'y vont pas**, et c'est un constat, pas un renoncement.

Leur anatomie n'est pas celle d'un tiroir :

- **Aucun des trois n'a de bouton de fermeture.** Sur une confirmation, on
  choisit — on ne congédie pas. La primitive rend toujours un X : l'adopter en
  poserait un sur l'écran d'effacement définitif d'un dossier.
- **Leur `Dialog.Description` porte le corps entier** — plusieurs paragraphes,
  parfois une liste, servis par `asChild`. La primitive prend une description
  en `string` : migrer imposerait de la réduire à une ligne et de reléguer le
  reste en `children`. Ce qu'un lecteur d'écran annonce comme description du
  dialogue y perdrait, précisément sur les écrans où il faut comprendre avant
  d'agir.
- `PatientConfirmDialog` ajoute deux écarts à lui seul : un titre délibérément
  `sr-only` que la primitive rendrait visible, et `max-w-sm` contre `max-w-lg`.

Les faire entrer aurait demandé trois échappatoires supplémentaires dans la
primitive, utilisées une fois chacune — c'est-à-dire cesser de factoriser pour
se contorsionner.

La règle est écrite dans `.claude/rules/frontend-ui.md`, avec les six surfaces
exclues et leur motif : **une migration vers la primitive se fait à apparence
constante ; si l'adoption demande de déplacer un panneau, d'ajouter une
affordance ou d'inventer du texte, c'est la migration qui a tort.**
