### Portail patient : libellés reliés, cibles de 44 px, modale d'édition de pack accessible (2026-11-06)

Lot d'accessibilité issu de l'audit UI du 2026-11-05 (grille WCAG 2.1 A/AA,
sur `main` @ 8673a4b). Finalité unique : accessibilité, à apparence constante.
Aucune logique clinique, aucun seuil, aucune donnée collectée ne change.

- **Libellés reliés aux champs** (WCAG 1.3.1 / 4.1.2). `PatientField` relie son
  libellé au premier champ natif de ses enfants (`useId()`, `htmlFor`, `id`
  existant respecté) — ses 35 usages en héritent sans retouche. Prop `erreur`
  optionnelle : message sous le champ, `aria-describedby` et `aria-invalid`.
  Prop `groupe` : `fieldset`/`legend` pour les groupes de choix de l'anamnèse
  (puces et cases), dont les puces annoncent désormais leur état
  (`aria-pressed`). Liés aussi hors composant : les lignes des groupes de
  l'anamnèse et la demande de correction de `ConsultationScreen`.
- **Curseurs de `PlaintesForm` nommés** : `aria-labelledby` sur le libellé de
  la plainte, `aria-valuetext` « n sur 10 » ; l'emoji passe en `aria-hidden`.
- **Cibles tactiles de 44 px** (WCAG 2.5.8) : les 18 liens de retour du
  portail, les puces de choix de l'anamnèse, les cases de consentement, de
  mentions, de choix multiple et d'« Avant de commencer ».
- **Modale d'édition de pack** (`PacksPanel`, cockpit) migrée vers
  `PanneauSuperpose` (variante `modale`) : rôle `dialog`, Échap, piège et
  retour du focus, bouton de fermeture de 44 px. Pour la garder à sa largeur,
  la primitive accepte `largeur` sur une `modale` (défaut inchangé :
  `max-w-lg`) et gagne une largeur `ample` (`max-w-4xl`), relevée sur cet écran.
- **Garde** : `web/e2e/portail-accessibilite-saisie.spec.ts` passe axe
  (WCAG 2.1 A/AA) sur la fiche de renseignements et sur `PlaintesForm`, patient
  fictif Michel Dogné ; tests Vitest de `PatientField` et de la largeur de
  modale.

Hors périmètre, laissés à leur propre lot : relèvement des paliers
`text-2xs`/`text-3xs`, soupçon sur `text-muted-foreground/70`, défilement
clavier des frises `FriseJournees`/`FriseNuits`.
