# Handoff — 2026-10-11 — Lots 11A : EI « incertain », DASS-21 dépression, commentaires du laboratoire (D-278)

## Branche et état Git

`feat/securite-11a-commentaires-releve`, dans le worktree
`.claude/worktrees/bio-ingest-cloture`, rebasée sur `origin/main` après le
merge de #1398 (`351f9379`). La copie principale n'a pas été touchée. Hors
campagne (BIO-PARCOURS en pause, `D-276`) : lots de sécurité issus de BP-26.
Cette PR est la dernière des lots 11A et porte leur clôture.

## Objectif

Les trois lots de sécurité 11A, une PR par paragraphe de `D-278` :
§1 effet indésirable « incertain », §2 dépression du DASS-21 dans l'extinction
du stress, §3 commentaires du laboratoire (migration, texte patient, relevé).

## Décisions prises

- **`D-278`** (arbitrages du responsable du 2026-10-10, posés sur scénario) :
  - §1 : orientation `urgence_ou_contact_conseille`, texte **signé** (15/112,
    médecin traitant, ne pas modifier un traitement). Règle passée en v2.
  - §2 : `STOP-STR` exige `Q_STR_04.D` en « Normal » ; table d'arrêt
    **re-signée** le 2026-10-10, nouveau SHA `1db9a002…`.
  - §3 : commentaires recopiés tels qu'imprimés, vus à la validation,
    conservés après la purge ; jamais tronqués (signal « non transcrit »).
- `usage_ia` v7 : texte **validé** par le responsable le 2026-10-11, publié
  et déployé AVANT `bio-extraction-v4` (patron de `D-267` §8).
- Revue `wn-reviewer` du relevé : GO sous réserve d'un P1. Le P1 et trois P2
  sont corrigés : commentaire portant sur plusieurs résultats rangé avec ceux
  du compte rendu ; interdiction d'écrire un commentaire non imprimé ;
  technique et identités exclues ; renvoi à « l'original du laboratoire » sur
  un document effacé.
- La sentinelle E2E exempte désormais `data-fait-laboratoire="commentaire"`,
  au même régime que la marque et l'intervalle.
- Copilot #1396 (la signature de la table d'arrêt ne couvre pas les grilles
  citées) : routé dans `docs/claude/campagnes/FILE_ATTENTE.md`.

## Fichiers modifiés

- §1 (#1395) : `web/src/lib/trust/securite.ts`, `types.ts` (+ bancs).
- §2 (#1396) : `web/src/lib/clinical/stopRulesV1.ts` (+ banc),
  `docs/FEATURE_FLAGS.md`, `FILE_ATTENTE.md`.
- §3 migration (#1397) : `20261010220000_bio_ingest_commentaires_laboratoire_v1`,
  `schema.prisma`, contrat SQL négatif, `ci.yml`, `DOSSIER_RGPD.md`.
- §3 texte (#1398) : `web/src/lib/trust/contenus/registre.ts` (+ banc).
- §3 relevé (cette PR) : `extraction.ts`, `lancerExtraction.ts`, `lecture.ts`
  (+ `lecture.test.ts`), `ImportCompteRenduPanel.tsx`,
  `FaitsDuLaboratoire.tsx`, `e2e/helpers/sentinelle.ts`,
  `e2e/sentinelle-marquage.spec.ts`, gardes `lecteursResultatBiologique` et
  `appelantsLlmBiologie`, bancs associés.
- `docs/DECISIONS.md` (`D-278`), fragments `changelog.d/2026-10-1*-securite-11a-*`.

## Validations exécutées

- T3 complet vert pour la migration (5 min 21 s, contrats SQL compris).
- Migration appliquée en production le 2026-10-11 par `release-db` approuvée
  (sentinelle `WN_RELEASE_DB_OK id=38137220504-1`) ; constat par conteneur
  indépendant : « Database schema is up to date! » (102 migrations).
- #1395 et #1396 déployés (8e6bc732), release-db verte.
- Relevé : `npm run check` vert ; T2 `--fast` vert (4 min 42 s) après
  correction de la spec de sentinelle ; modules biologie et cockpit
  1 568 tests verts.

## Problèmes ouverts

- Le message « trop long pour être transcrit » de l'intervalle et de la
  marque renvoie au compte rendu même effacé (défaut antérieur à 11A).
- Le texte de l'acte de lecture (`LectureImportBiologique.tsx`, `D-268`) ne
  nomme pas les commentaires : à faire arbitrer par le responsable.
- Les commentaires ne sont visibles qu'à l'écran d'import, pas dans la série
  des mesures — conforme à `D-278` (« à la validation »).
- Constater après déploiement, en agrégats, les premiers imports
  `bio-extraction-v4` (commentaires relevés, signaux, aucun échec nouveau).

## Prochaine action exacte

Merger cette PR une fois son CI vert et ses commentaires traités ; constater
le déploiement ; puis les lots suivants de BP-26 (5A, puis 8B).

## Interdits encore actifs

- `bio-extraction-v4` ne se déploie qu'avec `usage_ia` v7 en ligne (fait :
  351f9379).
- Commentaires du laboratoire : jamais journalisés, jamais servis au portail
  ni repris dans un courriel ou un export ; tout module neuf qui les lit
  s'inscrit dans la garde `COMMENTAIRES_ADMIS`.
- Aucun rattrapage des imports antérieurs : leurs commentaires restent
  « non relevés ».
- release-db reste un geste du responsable.
