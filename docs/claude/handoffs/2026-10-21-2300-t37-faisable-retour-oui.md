# Handoff — t37 : « C'était faisable ? » n'est plus rempli à la place du patient (D-340)

## Branche et état du dépôt

- Branche `lot/t37-faisable-retour-oui`, worktree `d281-lot3-portail`,
  partie de `origin/main` (50e0e622, merge de t34). Sans migration, sans
  drapeau.

## Objectif

t37 (file A) : dans le panneau patient du journal, après « Non » puis « Oui »
à l'occasion, `faisable` restait « sans objet » ; la trace partait avec
`faisable: false` et comptait comme « bloquée ».

## Décisions prises

- Deux arbitrages du responsable du 2026-10-21, transcrits en `D-340`
  (numéro libre sur main au 50e0e622) : vide au retour sur « Oui », refus sans
  choix, erreur reliée au champ ; « Sans objet » retiré sous « Oui ».
- L'ouverture du formulaire reste sur « Oui » (écart avec le harnais assumé).
- Refus porté aussi par `createTrialTrace` (occasion sans booléen).

## Fichiers modifiés

- `web/src/components/food-observation/PatientFoodObservationPanel.tsx` (+ test).
- `web/src/lib/food-observation/trace.ts` (+ test).
- `docs/DECISIONS.md` (D-340), `docs/claude/PLAN_WELLNEURO.md` (ligne
  D-JA-03 du §8), `changelog.d/2026-10-21-t37-faisable-retour-oui.md`,
  SESSION_LOG.

## Validations exécutées

- Vitest ciblé (food-observation, deux dossiers de composants) : 181 tests
  verts ; T1 rapide vert ; T1 complet et T2 `--fast` avant la PR (résultat
  dans la PR).

## Problèmes ouverts

- Les traces déjà transmises avec `faisable: false` après un retour à « Oui »
  restent comptées « bloquées » (D-340 §4).
- Après un enregistrement, `faisable` garde la dernière réponse du patient
  (comportement antérieur, hors arbitrage).

## Prochaine action exacte

CI, CodeRabbit sur la tête, merge, déploiement constaté ; t37 → « fait » au
suivi. Restent au responsable : M-2, t36, m38.

## Interdits encore actifs

- Un merge à la fois ; aucun auto-merge ; aucune image antérieure à 257807e3
  redéployée ; rien de clinique sans D-xxx ; revérifier D-340 libre sur main
  au merge ; #1622 et #1626 appartiennent à d'autres sessions.
