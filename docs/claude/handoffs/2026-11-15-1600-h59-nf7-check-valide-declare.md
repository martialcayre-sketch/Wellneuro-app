# Handoff — H59, lot `h59-nf7-check-valide-declare` : troisième migration, le CHECK « valide ⇒ déclaré » sur `cabinet_instruments` (NF-7, D-515 §6 étape 4, 2026-11-15)

## 1. Branche et état Git

- Branche `h59-nf7-check-valide-declare`, dans le worktree `.claude/worktrees/h59-d515-deverrouillage`, avancée par `--ff-only` jusqu'à `origin/main` e9a421c0 (merge de #2154).
- Ligne de carnet : `h59-nf7-check-valide-declare`, file A, passée à `pris` au début du lot (reprise de la session file A).
- Migration : chemin de la release-db. La file merge elle-même et suit jusqu'au constat (lot gardé).

## 2. Objectif

Poser, après l'allumage de `WN_ENABLE_DECLARATION_SUICIDE_CAB` (#2154), la troisième migration de H59 prévue par les réponses `20261111-0028-a` et `0029-a` : repasser en `grille_a_relire` les instruments `valide` non déclarés, puis refuser en base tout instrument `valide` sans déclaration. Migration seule, aucun code de l'application.

## 3. Décisions prises

- **Migration** `20261115160000_nf7_valide_declare_v1` : `UPDATE … WHERE statut_relecture = 'valide' AND pose_question_suicide IS NULL`, puis `ADD CONSTRAINT cabinet_instruments_valide_declare CHECK (statut_relecture <> 'valide' OR pose_question_suicide IS NOT NULL)`. Non destructive (`D-523`).
- **Écrivains relus** (`api/praticien/instruments`) : drapeau allumé, `publier` exige la déclaration, la modification des questions repasse en brouillon et efface la déclaration, `declarer` n'écrit que la déclaration. Tous satisfont le CHECK. Drapeau éteint, la publication d'un instrument jamais déclaré échoue en base (500) : conséquence acceptée par `0029-a` (« le drapeau se retire ensuite »).
- **Contrats** : `nf7_valide_declare_v1_negatif.sql` neuf, en CI ; le contrat NF-7 du lot 1 exclut nommément la nouvelle contrainte de son compte, et sa promesse 4 (« pas de CHECK ») est levée.
- **Banc de l'envoi** : la course 7 (déclaration d'un publié non déclaré) est retirée, car son état initial est refusé par la base ; la course 8 garde le refus de « Déclarer » sur la ligne tenue, sans l'instrument X. Le geste « Déclarer » reste servi, sans objet en base.
- **#2154** (consignation de l'allumage, sans lot) : déclarée « prête @523a7649 » à la reprise, deux remarques de PR-Agent écartées avec motif ; mergée par l'intégrateur (e9a421c0).

## 4. Fichiers modifiés

- `web/prisma/migrations/20261115160000_nf7_valide_declare_v1/migration.sql` (neuf) ;
- `web/prisma/checks/nf7_valide_declare_v1_negatif.sql` (neuf) et `web/prisma/checks/nf7_declaration_suicide_cabinet_v1_negatif.sql` ;
- `.github/workflows/ci.yml` (étape du contrat neuf) ;
- `web/prisma/schema.prisma` (commentaire seul) ;
- `web/scripts/banc-envoi-cabinet-deux-sessions.test.ts` ;
- `docs/FEATURE_FLAGS.md`, `changelog.d/2026-11-15-h59-nf7-check-valide-declare.md`, `docs/claude/plan-journal/H59/2026-11-15-05-nf7-check-valide-declare.md`, ce handoff.

## 5. Validations exécutées

- `bash scripts/wn-dev-db.sh --migrate` : migration appliquée sur la base locale du worktree.
- Les trois contrats SQL (neuf, NF-7, D-515) : verts sur cette base.
- Banc de l'envoi, sur cette base : 11 courses vertes (1 à 6, 8 à 12).
- `npx prisma validate` : 0. T1 complet (`npm run check`) : 0.
- `wn-reviewer` sur le diff : GO, aucun P0 à P2. P3-1 (reprise non éprouvée par un contrat) : routé au constat par conteneur, élargi aux agrégats (§7). P3-2 (course 8 sans portée sur les verrous) : course gardée, son en-tête ne prétend plus rien sur l'attente. P3-3 (deux formulations de `FEATURE_FLAGS.md`) : corrigé. P3-4 (`now()` sur une colonne sans fuseau) : identique au lot 1, sans changement.
- T3, Codex P0, CI et PR-Agent : voir la PR.

## 6. Problèmes ouverts

- **Retrait du drapeau** (`0029-a`) : lot à inscrire au carnet après le constat de cette migration. Il retire la branche « drapeau éteint » de la publication (500 en base sinon), le geste « Déclarer » devenu sans objet, et les gardes `declarationSuicideCabinetActive()`.
- Résidus notés au handoff du recomptage, non traités ici : le gel du contenu drapeau éteint ([[D-522]]), le déverrouillage d'un `CAB_` « non » ou NULL, la comparaison à la milliseconde de la garde de #2130.

## 7. Prochaine action exacte

1. T3 vert, GO de `wn-reviewer`, commit, push, PR (`--body-file`), avis Codex P0 (`node scripts/wn-codex-avis.mjs --mode revue`) déposé, CI (`wn-attendre-ci`) et PR-Agent (`wn-revue-pr-agent`) à 0.
2. Avant le merge : `wn-sonde-release-db` à 0 ; un merge à la fois.
3. Après le merge : suivre la release-db, puis constater par conteneur (contrainte présente et validée, migration appliquée ; en agrégats : total des instruments du cabinet, `valide` déclarés, `valide` non déclarés — attendu 0, 0, 0 d'après le recomptage du 2026-11-15 ; un total non nul ou des `valide` déclarés repassés en relecture trahiraient une reprise trop large, P3-1 de `wn-reviewer`), poster `WN_CONSTAT_RELEASE_DB run=<id>` sur la PR, puis carnet à `fait`.

## 8. Interdits encore actifs

- Ne retoucher aucun texte ni code du périmètre du SHA de `SAF-QUEST-02` (`67b9ef54…`, `lib/clinical/safetyQuestionnaireCabinetV1.ts`) : la moindre retouche referme le verrou.
- `SAF-QUEST-01` et ses textes : identiques à l'octet. D-275 et D-277 : mot pour mot. Ne pas toucher au trigger de `adressages_signal_alerte`.
- Ne pas éteindre le drapeau (geste du responsable, et pas un geste prudent : [[D-515]] §6, [[D-522]]).
- Ne pas reposer D-303, D-493, D-515, D-522, D-524, ni les questions tranchées de H59. Ne pas trancher `20261109-1354-c`.
- Pas de `prisma format`. Pas de SQL manuel en production. Production en lecture seule, par conteneur, en agrégats.
