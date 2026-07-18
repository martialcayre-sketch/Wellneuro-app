# C5 — Handoff (LOT-07)

> Passation de la tranche C5 « Boussole alimentaire slice v1 » à la clôture du
> LOT-07 (2026-07-18, base `81fad26`). Voir aussi `docs/claude/templates/HANDOFF_TEMPLATE.md`.

## Ce qui est livré

- **C5A** — référentiel Ciqual borné + profils intrinsèques chiffrés, versionnés,
  déterministes (LOT-00→03). Migration + import appliqués et intègres (LOT-02).
- **C5B praticien** — Observatoire en lecture seule (LOT-04), catalogue d'assiettes
  C5B versionné + pont faisabilité JA lecture seule (LOT-06), insertion manuelle et
  doublement explicite dans le protocole.
- **C5B patient** — Jardin qualitatif isolé (LOT-05), restitution sans score
  numérique, accès borné au protocole diffusé.
- Le tout **derrière `WN_C5_ENABLED`** (fail-closed) : rien n'est visible tant que
  le flag n'est pas `true` en production.

## Interrupteur unique

`web/src/lib/food-compass/featureFlag.ts` — `isC5Enabled(process.env.WN_C5_ENABLED)`,
seul `'true'` active. Surfaces gardées : `api/praticien/boussole`,
`api/portail/boussole/[foodRef]`, page `portail/[token]/alimentation/boussole/[foodRef]`,
enrichissement `api/portail/protocole`, soumission `api/praticien/protocoles/versions`,
cockpit `dashboard/patients/[idPatient]` (via `C5FeatureProvider`).

## Activation et rollback

- **Activation** : définir `WN_C5_ENABLED=true` dans Vercel Production + redéployer.
  Procédure détaillée et smoke test : `ACTIVATION_RUNBOOK_C5.md`.
- **Rollback applicatif** : remettre `WN_C5_ENABLED=false` (ou supprimer la variable)
  + redéployer. Effet immédiat : toutes les surfaces C5 repassent en 404 / vues vides.
- **Interdit** : aucun `DROP`, `DELETE`, `TRUNCATE` ni `supabase db push` dans une
  procédure de rollback. Le référentiel importé reste en base, inerte, quand le flag
  est `false`.

## État de validation

- Verdicts : `VALIDATION_FINALE_C5.md` — **C5A GO**, **C5B praticien GO**,
  **C5B patient GO conditionnel** (dettes D-C5-01→04).
- Matrice et preuves : `MATRICE_CONFORMITE_ET_TESTS_C5.md` (573 tests verts,
  advisors sans alerte bloquante).
- Dettes ouvertes : `DETTE_C5.md`.

## Points de vigilance pour la suite

- Lever les dettes humaines du volet patient (accessibilité, E2E boussole des
  3 fixtures, vocabulaire) avant tout élargissement multi-praticien.
- La faisabilité JA historique dépend de la version de catalogue C5B ; un futur
  `c5b-plate-catalog-v2` doit prévoir la rétro-compatibilité des références
  (constat de revue LOT-06).
- Advisors performance INFO (FK non indexées C5A) à revoir si volumétrie.
