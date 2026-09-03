## 2026-09-03 — refactor(ui) : les huit tiroirs du cockpit adoptent la primitive

Étape 2 du lot Primitive. Les **huit** panneaux latéraux du dashboard passent de
Radix Dialog recâblé à la main à `PanneauSuperpose` :

- Bibliothèque ×3 — créer un questionnaire, importer, relire la grille ;
- Patients ×3 — nouveau patient, nouvelle consultation, nouvelle assignation ;
- rayon biologie — fiche analyte ;
- rayon compléments — fiche justificative.

Deux composants locaux disparaissent, `TiroirBibliotheque` et `TiroirAction`,
qui étaient déjà copie l'un de l'autre — le commentaire de `TiroirBibliotheque`
le disait en toutes lettres : « patron TiroirAction de PatientsPanel ». Avec eux
s'en vont huit overlays, huit correctifs `data-theme` et huit boutons de
fermeture identiques.

**Migration à apparence constante.** Les huit tiroirs gardent leur `max-w-xl`
(`largeur="standard"`, ajoutée à l'étape 1 précisément pour eux), et les quatre
qui n'avaient pas de sous-titre visible n'en gagnent pas : leur description
reste dans le DOM pour `aria-describedby` et hors de la vue
(`descriptionMasquee`), exactement comme leur implémentation locale la repliait
en `sr-only`. Inventer quatre phrases pour l'écran aurait ajouté du texte au nom
d'un lot qui existe pour en retirer.

Deux détails changent, et ils convergent : le titre passe de `text-lg
font-semibold` à la fonte d'affichage de la primitive, et le libellé du bouton
de fermeture perd ses guillemets — « Fermer Créer un questionnaire » au lieu de
« Fermer « Créer un questionnaire » ». Aucun banc ne s'appuyait sur ce libellé.

Restent hors de ce diff les trois **modales** de confirmation
(`DossierConfirmDialog`, `AnnulationAssignationDialog`, `PatientConfirmDialog`) :
l'E2E de l'effacement définitif y est dense, et la troisième est la seule
surface `theme="patient"` du lot — celle que la garde de l'étape 1 protège.
