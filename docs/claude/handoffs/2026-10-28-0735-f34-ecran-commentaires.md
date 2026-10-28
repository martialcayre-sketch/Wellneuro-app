# Handoff — 2026-10-28 — F34 : la fiche d'analyte sépare le motif signé du claim cité (D-389 §3)

## Branche et état du dépôt

- Branche `f34-ecran-commentaires`, worktree `f34-ecran-commentaires`, partie
  d'`origin/main` 43244742 (H90 PR 1). Session concurrente : `git`/`gh`
  direct, sans `/wn-*`. Aucune migration, aucun schéma, aucune règle
  d'indication touchée ; l'empreinte et la signature de la table sont
  inchangées.

## Objectif

Livrer D-389 §3 : sur la fiche d'analyte, le motif d'une exploration non
indiquée n'est plus présenté comme une citation du claim ; les commentaires
« verbatim des claims » sont corrigés.

## Décisions prises

- Aucune décision nouvelle : D-389 §3 fait foi, étiquettes au caractère près.
- Commentaire §D gardé dans ce lot, bien que le fichier de la table soit chemin
  déclencheur depuis #1744 (recommandation acceptée par le responsable en
  ouverture de session) : le merge déclenche une release-db sans migration,
  approuvée sous la délégation du 2026-10-16.
- Forme du claim : « Claim cité : WN-CL-… (v1.0) », alignée sur celle que le
  même panneau donne déjà aux liens analyte-axe (`claimId (versionClaim)`).
- Le motif s'affiche sans guillemets : les guillemets en faisaient une
  citation.
- Un claim sans version dans la table n'affiche rien, comme un claim absent
  (fail-closed, cohérent avec le reste du module).
- Les tests qui disent « verbatim de la table signée » gardent leur nom ; seul
  le test d'écran, qui épingle les étiquettes, est renommé.

## Fichiers modifiés

- `web/src/components/biologie/FicheAnalytePanel.tsx` (bloc « Exploration non
  indiquée » et son commentaire).
- `web/src/lib/biology-library/nonIndiquesBibliotheque.ts` (en-tête, type
  `ExplorationNonIndiquee` + `versionClaim`, lecture dans la table).
- `web/src/lib/biology-library/indicationsBiologieV1.ts` : commentaire §D seul.
- Bancs : `RayonBiologiePanel.test.tsx` (fixture et épinglage),
  `nonIndiquesBibliotheque.test.ts`, `catalogue.test.ts`.
- Doc : `docs/claude/PLAN_WELLNEURO.md` (F34, en ligne : la bascule de H90
  n'est pas jouée), `changelog.d/2026-10-28-f34-ecran-commentaires.md`, ce
  handoff.

## Validations exécutées

- Bancs ciblés (exclusions, catalogue, écran, verrou de la table, BP-01) :
  47/47. Mutation de l'étiquette « (lecture du responsable) » : le banc de
  l'écran rougit, puis le fichier est restauré.
- `npm run check:rapide` et `npm run check` verts (rc 0).
- T2 (`npm run test:worktree -- --fast`) : rc 0 — Vitest 905 fichiers, 15 278 cas verts (27 sautés) ; E2E 300 verts.
- `/code-review medium` : aucun défaut.

## Problèmes ouverts

- Hérités de #1744, inchangés : run `push` obsolète qui continue ses étapes
  (plan §8) ; `.coderabbit.yaml` n'applique pas les instructions cliniques au
  fichier de la table (inventaire des tables signées hors `clinical/`).

## Prochaine action exacte

1. PR (`--body-file`), `wn-attendre-ci` en fond, revue CodeRabbit sur la tête,
   un verdict par commentaire en ligne.
2. Lister les release-db en attente, sonde `wn-sonde-release-db <N>` à `0`,
   merge.
3. Approuver le run release-db du commit de merge (tête de `main`, CI vert,
   aucune migration dans la plage), sonde à `0`, suivre jusqu'au déploiement
   constaté dans `scalingo deployments`, puis `/clear`.
4. Lot suivant sous F34 : la migration de la colonne « objectif » (D-389 §4).

## Interdits encore actifs

- Aucun texte clinique nouveau ; motif et claim lus dans la table, jamais
  recopiés dans le code.
- Aucune règle, empreinte, signature, migration ni `schema.prisma` dans ce lot.
- Ne réécrire ni la migration d'août, ni la proposition validée, ni D-068, ni
  D-069.
- Production en lecture seule par `scalingo run -d` ; aucun dossier patient lu.
- Un merge à la fois ; pas de merge sans revue CodeRabbit sur le sha de tête.
