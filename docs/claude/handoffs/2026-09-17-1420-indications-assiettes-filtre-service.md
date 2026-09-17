# Handoff — 2026-09-17 — Le filtre de service des indications d'assiette, livré avant la première ligne

## 1. Branche et état Git

- Worktree `.claude/worktrees/phases-hash-2026-09-16`, branche
  `wn-assiettes-statut-service-2026-09-17`, prise **depuis `origin/main`**
  (`866e33fe`) — la tête portait déjà `D-223`/`D-224`, mergés plus tôt le jour
  même par la PR #1178.

## 2. Objectif de la session

Le premier des cinq chantiers que `D-216` laisse devant l'attestation du
catalogue d'assiettes : le champ `statut` sur la ligne d'indication **et** le
filtre de service. Sans lui, signer les huit indications proposées ferait sortir
un brouillon comme une ligne publiée.

## 3. Décisions prises

- **`D-225`** — mécanisme livré, table **VIDE**, verrou **ÉTEINT**.
- **Le `statut` est sur la LIGNE, pas sur l'entrée du catalogue** : la
  psychobiotique porte une porte à publier et une à garder en brouillon, sur la
  même assiette.
- **Le déclencheur est `OrientationDeclencheur`**, déjà signé par deux tables —
  pas un troisième vocabulaire de porte.
- **Un septième terme de verrou** : le `plateCode` doit exister au catalogue C5B.

## 4. Ce que ce lot ferme, et ce qu'il n'atteint pas

Il ferme **le chemin**, pas un défaut observé : aucune ligne d'indication
n'existe encore, donc rien ne fuyait. C'est délibéré — un filtre livré après les
lignes se serait trouvé à valider un périmètre déjà attesté.

Il n'atteint **ni l'évaluation** (dire si un dossier franchit une porte : c'est
`orientationEngine`), **ni l'exposition** (aucun appelant de production). Si le
lot d'exposition ne vient pas, `lignesIndicationAssietteServables` se supprime —
elle ne se reconduit pas. Le dépôt a déjà supprimé une fonction de ce profil
(`suggererCharge` serveur).

## 5. Fichiers modifiés

**Neufs** — `web/src/lib/clinical/indicationsAssiettesV1.ts` (forme d'une ligne,
verrou à sept termes, point de sortie unique) · son banc de garde (18 tests) ·
`changelog.d/2026-09-17-indications-assiettes-filtre-de-service.md`.

**Modifiés** — `docs/DECISIONS.md` (`D-225` en tête) · `docs/FEATURE_FLAGS.md`
(ligne d'état du verrou) · `claimsEpinglesFraicheur.guard.test.ts`
(`FICHIER_VERS_TABLE`) · `docs/claude/SESSION_LOG.md`.

## 6. Validations exécutées

- **T1** : `T1-EXIT=0`.
- **Banc de garde** : 18 tests, chaque terme du verrou falsifié séparément, plus
  le cas de la psychobiotique — verrou ouvert sur une table qui contient un
  brouillon, brouillon absent du service, et signature **rompue** si on retire le
  brouillon de la table.
- **Bancs de cohérence** : 45 tests (contrat de fraîcheur, sha littéral, état
  documenté des verrous, catalogue d'assiettes) — verts.
- **T2 `--fast`** : voir §8.

## 7. Problèmes ouverts

- **Trois des huit indications proposées ne sont pas constructibles** : elles
  dépendent d'une borne d'âge que `D-216` a rendue légitime mais qu'aucun
  déclencheur ne sait porter. C'est le chantier 3.
- **`TABLE_EXIGE_PRESCRIPTIF` n'a pas d'entrée** pour cette table, et ne doit pas
  en avoir tant qu'elle est vide — lui en donner une rougirait. L'arbitrage
  `D-046` se rend **le jour de la première signature**.
- **`shaPerimetreLitteral` n'est pas enrôlé** : le banc exige un littéral de 64
  hex, `shaPerimetre` vaut `null`. Enrôlement le jour de la signature — `D-067`
  puis `D-084` ont eu à rattraper ce retard deux fois.
- **Le champ d'indication et ses claims restent à confronter au texte lu en
  production** (chantier 2). `D-224` a montré qu'une désignation sur trois
  pouvait être fausse, et que rien dans la chaîne ne l'attrape.
- **`conflits_sources` n'a pas de cas négatif** au contrat de fraîcheur — dette
  routée le 2026-09-17 dans `FILE_ATTENTE.md`, correctif décrit.
- `D-049` n'est toujours pas refermée.

## 8. Prochaine action exacte

1. Lire la revue Copilot **avant** de merger, `.reviews[].body` compris, puis
   comparer le `head=` du SNAPSHOT à la tête réelle de la PR.
2. Ensuite, chantier 2 : le champ d'indication et ses claims — et **lire chaque
   claim sur pièce en production** avant de l'écrire, jamais depuis la surface.
3. Puis chantier 3 (déclencheur d'âge et revisite de `DC-43`), chantier 4
   (mécanisme orienté des familles) et chantier 5 (`suggererDepuisLignes` et son
   motif, côté barème).

## 9. Interdits encore actifs

- **Aucune identité réelle dans le dépôt** — code, seeds, tests, docs, commits.
- **Aucune signature clinique posée par l'outil.** Ce lot n'en pose aucune : la
  table est vide et le verrou éteint.
- **Aucun contenu clinique du corpus dans le dépôt** tant que G6 est fermée : une
  ligne **désigne** ses claims, elle ne les recopie jamais.
- **Base de production : lecture seule** par conteneur `scalingo run -d`.
- **Pas de migration Prisma ni de modification de `schema.prisma`** sans demande
  explicite. Ce lot n'en porte aucune.
- **Force-push, production et arbitrages** restent à demander. Autorisation Git
  prolongée jusqu'au **2026-09-24**.
