### Corrigé

- **Le drapeau `WN_CB_ENABLED` était déjà posé, et quatre documents
  affirmaient le contraire** (`D-070`) : `D-069` §2, `FEATURE_FLAGS.md`, le
  fragment de changelog du même jour et l'en-tête de `indicationsBiologieV1.ts`
  disaient tous « reste éteint ». Vercel a refusé la création de la variable en
  Production — elle existait déjà, à `true` —, donc antérieurement au
  déploiement du 2026-08-17 (`4b588d1e`, en succès à 09:33 UTC). L'affirmation
  était fausse au moment où elle a été écrite : déduite de la documentation,
  jamais lue dans le panneau. Le registre étant append-only, la phrase de
  `D-069` est conservée et annotée ; les trois autres sites sont corrigés.
  Aucun geste d'exploitation n'est posé ni retiré — la décision constate.

### Documenté

- **Ce que le drapeau ouvre, et ce qu'il n'ouvre pas** (`D-070`) : la surface
  d'**arbitrage** biologique (`CbFeatureProvider` → `ClinicalRuntimeSection`,
  `POST /api/praticien/biologie/arbitrage`, cartes « biologie arbitrée sans
  révision » du fil), où la production compte **zéro arbitrage**. Pas les
  indications : `deriverStatutsBiologie` n'a aucun appelant hors bancs, si
  bien que les quinze règles de `D-069` et le catalogue de `D-068` sont
  signés, en base, et **dormants** — état cohérent, le lot ayant livré la
  matière et non son branchement. Le premier appelant devra honorer le contrat
  M-B : table canonique passée VERBATIM, ni filtre ni tri ni reconstruction.
- **La leçon, de même classe que `D-064`** : un état de production ne se déduit
  pas de la documentation. Les deux fois, une affirmation d'état a été recopiée
  d'un document au lieu d'être lue à la source — panneau Vercel ici, base
  là-bas. La date de pose du drapeau, elle, n'est enregistrée nulle part :
  elle reste inconnue et n'est pas inventée.
