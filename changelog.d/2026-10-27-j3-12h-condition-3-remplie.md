### J3-12h : la condition (3) du drapeau du courrier complément est remplie (2026-10-27)

- `WN_FICHES_ASSIETTE` est posé en production depuis le 2026-09-28 ; relu
  `true` sur Scalingo le 2026-10-27. `docs/FEATURE_FLAGS.md` compte deux
  conditions levées sur quatre, et la ligne J3-12h du plan ne la range plus
  parmi ce qui reste.
- Restent `WN_PHYSIO_TRAITEMENTS` (conditions de D-335 §9), puis le passage
  de bout en bout sur un dossier de test. `WN_COURRIER_COMPLEMENT` reste
  éteint. Documentation seule.
