# Handoff — 2026-11-13 — dossier de preuve du besoin 1, étape 2 : lecture du corpus (D-312, H15), lot 5 de la file B

## Branche et état Git

- Branche `docs/besoin1-dossier-etape2`, créée sur `origin/main` 23231f85 (merge de #2049 ; #2048 est mergée en
  daab41a5), dans le worktree `.claude/worktrees/b-bp17-cadre`.
- Session concurrente (file B) : `git` et `gh` en direct, pas de `/wn-*`.

## Objectif

Lot 5 de la file B : étape 2 du dossier du besoin 1, après les arbitrages T1 à T3 du 2026-11-13. Reporter ces
arbitrages au dossier privé, lire le corpus en production par conteneur sur quatre axes, inventorier hors dépôt,
poser chaque manque en question, puis s'arrêter pour arbitrage.

## Décisions prises

- Arbitrages du responsable du 2026-11-13, à ne pas rouvrir : `20261112-2330-b` = A, `20261112-2331-b` = B,
  `20261112-2332-b` = B (statut `repondue`, à passer à `close` au merge de ce lot). Ils sont reportés au dossier privé :
  colonne de réponse, portée de la limite `D-455` §2.6, section de la mesure dérivée avec les six champs de `D-312` §1.
- Boîte B du registre des messages (`D-503`) : une ligne `emis`, `20261112-2342-integrateur` (`merge_fait` de #2048),
  sans suite ; passée à `traite`. Carnet de lots (`D-510`) : ligne `besoin1-dossier-etape2` inscrite à l'état `pris`.
- Lecture du corpus en production, en lecture seule (transaction annulée), par deux conteneurs : one-off-4149 et
  one-off-6384. Inventaire au dossier privé (section de lecture du corpus, quatre axes), hors dépôt.
- Six manques posés en questions cliniques (liste commune, file B, `ouverte`) : `20261113-1030-b` à `20261113-1035-b`
  (M1 à M6). Une option est recommandée pour chacune. Les conséquences sont écrites, dont celle-ci : avec les poids du
  barème source (M2, option A) et toutes les dimensions hors rythme (M3, option A), la mesure rejoint le total moins
  les quatre items du besoin 3.
- Constat noté au dossier sans être posé en question : le commentaire pro de la pièce de l'instrument laisse deux
  valeurs du total hors de toute bande, et le code les range. Cela relève du barème existant, pas de ce dossier.

## Fichiers modifiés

- `docs/claude/plan-journal/H15/2026-11-13-01-dossier-besoin-1-lecture-corpus.md` (nouveau).
- `changelog.d/2026-11-13-dossier-besoin-1-lecture-corpus.md` (nouveau) ; ce handoff.
- Hors dépôt : le dossier privé du besoin 1 (Claude Doc, lien hors dépôt) ; la liste commune, le registre des messages
  et le carnet de lots (page de suivi de la file D) ; la mémoire de session
  (`arbitrages-codex-sept-questions-2026-11-12.md`).

## Validations exécutées

- `node scripts/wn-plan-journal-rubriques.mjs` : `exit=0`.
- `bash scripts/check_no_secrets.sh` : `exit=0`.
- T1 complet (`npm run check`) : `exit=0`. Pas de T2 : lot de documentation, sans code.

## Problèmes ouverts

- M1 à M6 attendent l'arbitrage du responsable ; toutes sont cliniques.
- La règle de décision du guide pour le besoin 1 reste sans source (M6).
- `20261111-0008-b` (garde des libellés d'hypothèse) est toujours `repondue` à la liste commune : elle relève de la
  file C, hors de ce lot.

## Prochaine action exacte

1. CI de la tête (`wn-attendre-ci.mjs`, seul `0` vaut) ; revue PR-Agent prouvée, sinon `wn-reviewer` (`D-448`) ;
   un verdict par remarque.
2. Relire la boîte B, puis déclarer « prête @<sha> » ; l'intégrateur merge. Au merge, passer T1 à T3 à `close`.
3. Après l'arbitrage de M1 à M6 : réunir les sources manquantes (ingestion sur accord, envoi par envoi, collision
  WN-SRC vérifiée sur `main` et les PR ouvertes), puis étiquetage et positions.

## Interdits encore actifs

- Aucun texte de claim, aucune dose, aucun seuil, aucun nom de rubrique au dépôt, ni dans les tests, ni dans les
  messages de commit (`D-325` §5, banc de #2043).
- Aucune règle, aucun seuil, aucun poids, aucune borne inventés ; aucun code clinique : la mesure dérivée et la lecture
  biologique partent avec J3-12f, après la signature et la décision clinique (`D-312` §3).
- Aucune ingestion, aucun étiquetage, aucune signature sans accord. Aucune migration, aucune écriture en base ;
  pas de `prisma format`. La production se lit par conteneur `scalingo run -d`, par identifiant. L'URL du dossier
  privé reste hors dépôt.
