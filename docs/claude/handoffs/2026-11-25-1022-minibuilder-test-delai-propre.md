# Handoff — 2026-11-25 — ProtocolMiniBuilder : un délai propre pour les cas lents

Lot `miniBuilder-test-delai-propre` (file A, ordre 116, P2, ordinaire, lieu
`cloud`), pris en local sur ordre du responsable, dans le worktree
`h59-nf7-retrait-drapeau-cadrage`.

## Branche et état Git

- Branche `a-minibuilder-test-delai-propre`, tirée d'`origin/main` à
  `68c0d494` (avance `--ff-only`, sans commit propre auparavant).
- Un commit de lot (test, fragment de changelog, ce handoff), commit tardif
  ([[D-518]]).

## Objectif

`web/src/components/patient-cockpit/ProtocolMiniBuilder.test.tsx` dépasse
5 s par test dans la suite entière locale (`PLAN_WELLNEURO.md` §8, « T3 local
rouge sur des délais minutés »). Donner un délai propre aux seuls cas lents,
sans changer ce qu'ils assèrent.

## Décisions prises

- Mesure, fichier seul : les cas lents sont ceux qui saisissent sept actions
  une à une — « 4 typées + 3 vierges » 388 ms, « 4 typées + 3 suspendues »
  323 ms, « 7 typées » 250 ms, « 1 typée + 6 vierges » 180 ms ; les autres
  restent sous 190 ms.
- Délai explicite de 20 s (troisième argument de `it`) quand le brouillon
  compte au moins sept actions, dans les deux boucles paramétrées
  (« le comptage pendant la composition », « actions vierges supprimées ») ;
  `undefined` sinon, donc le délai par défaut. Convention reprise de
  `FichePatientPanel.test.tsx` (20 s, commentaire d'une ligne).
- Écarté : alléger les cas (moins d'actions changerait ce qu'ils prouvent :
  le seuil « Chargé » et la limite de sept actions).

## Fichiers modifiés

- `web/src/components/patient-cockpit/ProtocolMiniBuilder.test.tsx` (deux
  boucles, lignes 1145-1151 et 1196-1212)
- `changelog.d/2026-11-25-minibuilder-test-delai-propre.md`
- `docs/claude/handoffs/2026-11-25-1022-minibuilder-test-delai-propre.md`
  (exigé par le contrôle de clôture, en plus des deux fichiers de la fiche)

## Validations exécutées

- `npx vitest run src/components/patient-cockpit/ProtocolMiniBuilder.test.tsx`
  → 102/102 verts.
- `npm run check` (T1 complet) → 0 (test:changed : 1742 verts, 21 sautés ;
  le fichier modifié 102/102 ; anti-secrets OK).
- T2/T3 non joués : test seul, ni UI ni API. Le dépassement sous charge n'a
  pas été rejoué : le délai de 20 s laisse une marge de plus de cinquante fois
  la durée mesurée seule.

## Problèmes ouverts

- Aucun dans le lot. Hors lot : d'autres bancs jsdom de la suite peuvent
  dépasser 5 s sous charge ; non constatés ici, non touchés.

## Prochaine action exacte

Push, PR (`--body-file`), `node scripts/wn-attendre-ci.mjs <N>` en fond,
revue PR-Agent (`node scripts/wn-revue-pr-agent.mjs <N>` → 0, sinon
`wn-reviewer`, [[D-448]]), un verdict par remarque, merge, lot `fait` au
carnet.

## Interdits encore actifs

- Aucun code servi, ni `vitest.config.ts`, ni autre fichier de test, ni la
  borne de `masquage.test.ts`.
- Aucun assouplissement d'assertion.
- Ne pas prendre `h59-of2-planche-a` (porte OF-1, CF-0a).
