# Handoff — H59, lot `h59-journal-violation-check` : une erreur technique du PATCH des instruments du cabinet est journalisée sans être traduite (D-533, amende D-528 §3, 2026-11-16)

## 1. Branche et état Git

- Branche `h59-journal-violation-check`, tirée d'`origin/main` a3abf821 dans le worktree `.claude/worktrees/h59-nf7-retrait-drapeau-cadrage`, puis avancée par `--ff-only` jusqu'à a449c1fe (#2173 à #2176, sans recouvrement ; #2176 est le lot 1, `h59-signaux-or-test`). Une première avance avait échoué en silence : `D-531.md`, non suivi, aurait été écrasé par la D-531 de #2174. Elle a réussi après la renumérotation.
- Carnet : ligne `h59-journal-violation-check` (file A, ordre 65), `pret` → `pris` le 2026-11-16.
- Sans migration, sans release-db, aucun fichier de `web/src/lib/clinical/`.

## 2. Objectif

P2-1 de la revue `wn-reviewer` de #2166 : le `catch` du PATCH de `api/praticien/instruments` ne journalisait rien. Une violation du CHECK `cabinet_instruments_valide_declare`, ou toute autre erreur technique, répondait 500 sans laisser de trace. Le but est de la rendre observable sans la traduire, conformément à `20261116-0827-a` (aucun filet).

## 3. Décisions prises

- **[[D-533]]** (amende [[D-528]] §3) :
  - `logger.error`, domaine `PRATICIEN`, contexte par `createRequestContext` ;
  - deux codes d'événement : `PRATICIEN.INSTRUMENTS_CABINET.CHECK_VALIDE_DECLARE_VIOLE` (la contrainte du CHECK) et `PRATICIEN.INSTRUMENTS_CABINET.PATCH_ECHEC` (tout le reste) ;
  - métadonnées : `codePrisma` (forme `Pnnnn`) et `contrainte` (identifiant SQL extrait du message Postgres) ;
  - aucun champ `error` ; une panne du journal est avalée.
- **Pourquoi pas l'objet d'erreur** : lu dans `@prisma/adapter-pg` 7.8, un 23514 remonte en `P2039`, et `meta.driverAdapterError.cause.detail` recopie la ligne refusée entière (grille, e-mail du praticien).
- **Pourquoi un code d'événement propre au CHECK** : `sanitizeLogData` masque en `[id]` tout identifiant de 24 caractères ou plus. `cabinet_instruments_valide_declare` sort donc en `[id]` dans les métadonnées ; le sanitizer n'est pas touché.
- **Réponse inchangée** : 500 « Erreur inattendue. », sans `withCorrelationHeader`. Le 409 `conflit_statut` reste un 409, non journalisé.
- **Numéro** : D-531 avait été réservée, mais #2174 a mergé une autre D-531 entre-temps. Renumérotation en D-533, D-532 étant réservée ailleurs. D-528 n'est pas réécrite : D-533 l'amende, selon la convention des décisions mergées.

## 4. Fichiers modifiés

- `web/src/app/api/praticien/instruments/route.ts`
- `web/src/app/api/praticien/instruments/route.test.ts`
- `web/src/lib/observability/eventCodes.ts`
- `docs/FEATURE_FLAGS.md`
- `docs/decisions/D-533.md`
- `changelog.d/2026-11-16-h59-journal-violation-check.md`
- `docs/claude/plan-journal/H59/2026-11-16-03-journal-violation-check.md` (rang 03 : le 02 est celui de #2176)
- ce handoff

## 5. Validations exécutées

- `route.test.ts` : 68 verts. Le bloc D-533 couvre :
  - P2039/23514, P2002 et P2003, avec la `meta` de l'adaptateur pg ;
  - la ligne émise par le vrai logger (contrainte `[id]`) ;
  - une erreur hors Prisma ;
  - un journal en panne ;
  - le 409 ;
  - une assertion d'absence : ni valeur de ligne, ni message, ni e-mail, ni libellé de grille, ni champ `error`.
- **Mutations jouées puis annulées** : objet d'erreur passé au logger (4 tests rouges), appel au journal retiré (5 tests rouges).
- T1 complet (`npm run check`) : 0, sur a3abf821 puis sur a449c1fe avec D-533.
- T2 (`npm run test:worktree -- --fast`) : 0 sur a3abf821 plus le lot avant les correctifs de revue. Vitest : 18 004 tests. E2E : 412. Depuis, seuls ont changé les tests (`route.test.ts`, 68 verts), les textes et le numéro de décision, ainsi que la base, avancée sans recouvrement. T2 n'a pas été rejoué.
- **`wn-reviewer`**, mission « aucune donnée de ligne ne peut atteindre le journal » : **GO**, aucun P0 ni P1.
  - P3-1 (le nom de la contrainte sort en `[id]` dans la ligne réelle) : textes précisés, et test ajouté sur la ligne émise.
  - P3-2 (`kind` de P2002 et P2003) : corrigé.
  - P3-3 (`durationMs` ≈ 0) : écarté, car le contexte est créé dans la garde qui protège la réponse ; D-533 le dit.
  - Test de la branche `contenuChange` : écarté, elle passe par le même `catch`.

## 6. Problèmes ouverts

- `durationMs` de l'entrée de journal sans signification (P3-3, écarté).
- Message `20261116-1329-c` de la file C, accusé `lu` : la D-xxx de plan qui amenderait la porte 24 (réponse du 2026-11-13 à `20261109-1354-c`) n'est inscrite nulle part au carnet de la file A. À inscrire sur décision du responsable.
- Défaut de `PluginLicencesTierces` dans un worktree sans installation propre : signalé à la file D (`20261116-1330-a`).

## 7. Prochaine action exacte

1. Commit, push, PR (`--body-file`), `wn-attendre-ci` en fond, `wn-revue-pr-agent`.
2. Un verdict sur chaque commentaire, puis « prête @<sha> » sur la PR et dans le registre (boîte `integrateur`), et `pr` au carnet.
3. Traiter le `merge_fait` de #2176 quand l'intégrateur l'écrit.

## 8. Interdits encore actifs

- Ne toucher aucun fichier de `web/src/lib/clinical/` (`safetyQuestionnaireCabinetV1.ts`, SHA `67b9ef54…`). SAF-QUEST-01 et 02, D-275 et D-277 : identiques à l'octet.
- Ne changer ni statut HTTP ni message visible ; ne traduire aucune erreur en 4xx (`0827-a`).
- Aucun SQL manuel en production ; pas de `prisma format`.
- Ne pas reposer D-303, D-493, D-515, D-522, D-524, D-528, ni les réponses `20261116-0825-a`, `0826-a` et `0827-a`.
