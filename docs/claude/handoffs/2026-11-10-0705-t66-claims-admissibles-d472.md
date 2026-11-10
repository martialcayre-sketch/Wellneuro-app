# Handoff — t66 : claims admissibles au service de la proposition de bilan (D-472)

## Branche et état Git

- `feat/t66-indications-claims-non-signes`, créée depuis `origin/main` `2d4a3172`.
- Commits : `c157a1c0` (code, bancs, D-472, fragment, §8), puis les suites de la
  revue (banc clé corpus ↔ moteur, banc d'écran, D-472 §8) et ce handoff.
  Aucune PR ouverte au moment d'écrire.

## Objectif

Dette t66 (§8) : taire une règle d'indication biologique dont un claim n'est plus
admissible au corpus, et dire au praticien pourquoi elle est indisponible.

## Décisions prises

- D-472 (réservée par `wn-reserver-decision.mjs`). Cadrage validé par le
  responsable le 2026-11-10 :
  - filtre dans le moteur, après l'empreinte et après les discordances ;
  - admissible = valide ET non supplanté, couple identifiant + version, tous
    les claims de chaque règle ;
  - Bibliothèque incluse, motif et citation suspendus ensemble ;
  - textes corrigés par le responsable, visibles hors du bloc replié.
- Corpus illisible ⇒ aucune proposition (`ok:false`, motif validé).
- Trois dettes versées au §8, sans rien trancher :
  - t71 : orientation, priorités ;
  - t72 : arrêts, contradictions, conflits ;
  - t73 : supplantation non constatée par les portes et les assiettes.
- Revue `wn-reviewer` : GO, aucun P0 ni P1. Verdicts en D-472 §8 :
  - P2-3 corrigé ;
  - P2-4 écarté ;
  - P2-1 et P2-2 (deux textes non validés) soumis au responsable.

## Fichiers modifiés

- `web/src/lib/biology-library/statuts.ts`, `propositionService.ts`,
  `nonIndiquesBibliotheque.ts`, `catalogue.ts`, et leurs `.test.ts`.
- `web/src/components/patient-cockpit/PropositionBilanPanel.tsx` (+ test),
  `web/src/components/biologie/FicheAnalytePanel.tsx`,
  `RayonBiologiePanel.test.tsx`.
- `docs/claude/MATRICE_CONSOMMATION.md` (régénéré : la route du catalogue
  atteint désormais le moteur, 6 surfaces) et `scripts/wn-matrice-consommation.mjs`
  (`process.exitCode` au lieu de `process.exit()`, qui tronquait le JSON à
  64 Kio sur un tube — défaut latent révélé par la surface en plus).
- `statuts.ts` exporte `cleClaimAdmissible` : aucun importeur neuf de
  `catalogueConduitesV1` (garde D-266 §6).
- `web/e2e/helpers/db.ts` (fixture des claims admissibles).
- `docs/decisions/D-472.md`,
  `changelog.d/2026-11-10-t66-indications-claims-admissibles.md`,
  `docs/claude/PLAN_WELLNEURO.md` (lignes t71-t73 du §8).

## Validations exécutées

- T1 complet (`npm run check`) vert sur `c157a1c0`.
- T3 complet (`npm run test:worktree`) **vert sur `c9fdaf27`** : Vitest 16 657
  passés, E2E 357 passés et 23 sautés, code 0. Les passages précédents étaient
  rouges, chaque fois pour une seule cause, chacune corrigée :
  - un type implicite dans un banc ;
  - la garde D-266 §6 (importeur neuf de `catalogueConduitesV1`) ;
  - la matrice de consommation périmée, avec la troncature à 64 Kio du
    script ;
  - six E2E biologie : base éphémère sans corpus, donc proposition vide. La
    fixture `poserClaimsIndicationsAdmissibles` (`web/e2e/helpers/db.ts`) pose
    les 29 couples, marqués `E2E_BIO_IND_`, avec `ON CONFLICT DO NOTHING`, et
    ne les supprime jamais.

## Problèmes ouverts

- P2-1 et P2-2 attendent la réponse du responsable. Les deux textes sont
  inatteignable pour l'un, exact pour l'autre.
- Aucune occurrence en production : les 29 couples sont admissibles
  (préflight vert de la release de `2d4a3172`).

## Prochaine action exacte

1. T3 complet sur la tête finale, sortie redirigée.
2. Push, puis PR (`--body-file`) ; `@coderabbitai review` sur la tête, chaque
   constat reçoit un verdict.
3. Commentaire « prête @<sha> ».
4. Après le merge par l'intégrateur : `release-db` à approuver, puis constat
   par conteneur. Grepper dans `.next/server` des fragments ASCII, par exemple
   `panelsIndisponibles`, `claimsAdmissibles` et `panel_indisponible`.
5. t66 → « fait » sur la page. Ensuite : t65, cadrage soumis avant le code.

## Interdits encore actifs

- Une seule `release-db` en attente, toutes files confondues.
- Ne pas toucher #1958 (t61, autre session).
- Aucun merge par cette session : arrêt à « prête @<sha> ».
- Aucune modification de `INDICATIONS_BIOLOGIE_V1` ni de sa signature.
- Aucune extinction d'arrêt ou de conflit déduite de D-472.
