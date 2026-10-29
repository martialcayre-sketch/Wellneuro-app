# Handoff — 2026-10-29 — D/55 : deux actions en double se refusent (D-394)

## Branche et état du dépôt

- Branche `lot/file-d-d55-doublon-actions`, partie de `origin/main` b2b45a9a
  (contient #1780) ; worktree `file-d1-suite`, session concurrente, cycle en
  `git`/`gh` direct.
- Code seul : ni migration, ni drapeau, ni release-db ; aucun fichier sous
  `web/src/lib/clinical/`, ni `indicationsBiologieV1.ts`.

## Objectif

File D, ligne sans rang D/55 (question `20261028-2247-d` de la liste commune) :
que fait l'enregistrement d'une version de protocole qui porte deux actions
identiques ? Arbitrer, puis livrer la garde.

## Décisions prises

**D-394** (réservée par `wn-reserver-decision.mjs`), trois arbitrages du
responsable du 2026-10-29, sur questions à options :
- **Refuser** (400 `draft_invalid`). Le régime confirmable était proposé en
  recommandation et a été écarté, tout comme « laisser passer ».
- **Critère** : même type et même intitulé (sans casse ni espaces), OU même
  fiche d'assiette (`recommendedPlateRef.plateCode`).
- **Textes** validés mot pour mot (D-394 §3). Les actions y sont nommées par
  leur intitulé, pas par leur rang, parce que l'action d'orientation est
  placée en tête par le constructeur.

Choix d'exécution : la garde est jugée juste après « au moins une action »,
donc avant les références C5 et la garde de registre. Pas de changement
client : le cockpit affiche déjà l'`error` d'un 400 (`setSaveError`).

## Fichiers modifiés

- Nouveaux : `web/src/lib/protocol/actionsEnDouble.ts` et
  `actionsEnDouble.test.ts`.
- Modifiés : `web/src/app/api/praticien/protocoles/versions/route.ts` (import
  et branchement, 8 lignes) ; `route.test.ts` (bloc « actions en double »,
  quatre cas).
- Clôture : `docs/DECISIONS.md` (D-394),
  `changelog.d/2026-10-29-d55-actions-en-double.md`, ce handoff.

## Validations exécutées

- Bancs du module (8 cas, dont NFD) et de la route (4 cas neufs) verts.
- T1 (`check:rapide`) vert, 16 étapes ; T1 complet (`npm run check`) vert
  avant le commit.
- T2 (`test:worktree -- --fast`, sortie redirigée) : la première passe a été
  rouge sur le seul cas NFD, parce qu'elle avait lu le banc neuf avant que
  le module corrigé ne soit écrit (édition pendant la suite). La seconde
  passe, sur l'arbre final, est verte : Vitest 15 431 passés et 30 sautés ;
  E2E 303 passés et 7 sautés ; 6 min 59 s.
- `/code-review medium` sur le diff, 7 remarques :
  - **corrigée** : normalisation NFC de l'intitulé, avec son banc ;
  - **écartées avec motif** :
    - le statut d'intervention : les régimes « en attente » et « pause » sont
      servis en carte (D-392 §1), et l'arbitrage ne les excepte pas ;
    - les autres écrivains : le seul autre `protocolDraft.create` est
      l'épisode JA (`food-observation/persistence.ts`), qui n'a pas d'actions
      saisies par le praticien ;
    - le texte qui ne désigne pas la seconde action : le texte est validé mot
      pour mot ;
    - `catalogVersion` : le serveur re-dérive la référence d'assiette, et le
      `plateCode` est la fiche ;
    - les cas de paire non couverts : ils le sont au banc du module ;
    - le coût O(n²) : la version compte au plus quelques actions.

## Problèmes ouverts

- Les versions déjà enregistrées avec un doublon (dont celle du constat du
  2026-10-28, un dossier de test) restent telles quelles. Une simple relecture
  ou ré-édition de cette version sera désormais refusée tant que le doublon
  n'est pas retiré. C'est l'effet voulu de « refuser ».
- La garde de registre numérote toujours « l'action N » au rang serveur, donc
  décalé d'un cran quand une action d'orientation est présente. C'est un fait
  préexistant, hors périmètre, non corrigé.

## Prochaine action exacte

PR ouverte avec `--body-file`, puis CI attendu par `wn-attendre-ci.mjs` en
fond, puis revue CodeRabbit (`@coderabbitai review`) ou PR-Agent prouvée
(`wn-revue-pr-agent.mjs`), avec un verdict par commentaire. Pendant l'essai de
D-373 : poster « prête @<sha de tête> » avec le chemin de ce handoff, sans
merger, puis /clear. Au merge, l'intégrateur passe la question
`20261028-2247-d` en `close` (`pr`, `merge_le`).

## Interdits encore actifs

- Rien sous `web/src/lib/clinical/`, ni `indicationsBiologieV1.ts` (D-044,
  D-389 §5) ; aucun seuil inventé.
- Aucun identifiant ni nom de dossier réel dans le dépôt. Le dossier du
  constat se lit par conteneur seulement.
- Pas de merge par cette session pendant l'essai de D-373.
