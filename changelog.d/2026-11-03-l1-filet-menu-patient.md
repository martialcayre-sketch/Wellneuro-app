### Portail patient : filet de tests de « Autres espaces », sans changement visible (2026-11-03)

- Lot L1 de l'audit « rails et menus » (`docs/claude/propositions/2026-11-01-portail-rails-et-menus/`,
  chapitre 11). Le hub rend la même ligne de liens, dans le même ordre, avec
  les mêmes libellés, classes et routes ; aucun drapeau, aucune migration.
- Les treize entrées de « Autres espaces » sont déclarées une fois, dans un
  module patient séparé (`components/patient/autres-espaces/entreesAutresEspaces.ts`) :
  libellé, segment, groupe de D-423 §2 (porté, pas encore rendu) et condition.
- Les dix composants `Lien*` acceptent une prop de rappel optionnelle
  `onSonde`, qui remonte au hub le verdict de leur sonde ; chaque sonde reste
  fail-closed et n'est appelée qu'une fois.
- Bancs : liste exacte (sondes ouvertes, puis fermées), exclusion fiches /
  bibliothèque, matrice majeur, mineur et dossier clos, table fail-closed des
  dix `Lien*` (404, 409, 200 partiel, 500, réseau, corps illisible), bancs
  propres de `LienPourVotreMedecin`, `LienFicheRenseignements` et
  `LienDossierDeuxVoix`, trois liens écrits dans le JSX, garde fs « chaque
  segment a un `page.tsx` », `aria-label="Autres espaces"`.
