# Handoff — lot `autonomie-pieges-restes`, partie 8 : un lot de claims plafonné à 10 (2026-11-21)

## 1. Branche et état Git

- Branche `chore/autonomie-pieges-partie8`, tirée d'`origin/main` 85ea2501 (après #2294), dans le worktree
  `.claude/worktrees/orch-ci`. L'ancienne `chore/autonomie-pieges-partie7` est périmée (#2293 mergée en
  f99a90d5) et n'a pas été touchée.
- Commit tardif (D-518).
- Carnet : le lot `autonomie-pieges-restes` (ordre 35) reste pris par cette session. `branche` et `tenu_le` sont
  mis à jour avec `if_version` (version 29).
- Boîte D lue au démarrage : vide.

## 2. Objectif

Convertir en contrôle le piège « lot d'ingestion de plus de 10 claims » (mémoire `ingestion-corpus-paquets-et-argv`).
La route des claims écrit tout le lot dans une transaction Prisma de 5 s. Le contrat acceptait 64 claims ; 50 ont
fait expirer la transaction en production (500, rien d'écrit) ; 10 passent. `tools/corpus/claims/ingest.mjs`
envoyait 64 par défaut.

## 3. Décisions prises

- **Risque P1** : le contrat d'une route interne de production devient plus strict. Aucun crochet, rien de
  clinique, aucune migration, pas de schéma. La revue est celle de `wn-reviewer` (P1), avec PR-Agent.
- **Le plafond se juge au contrat, pas dans l'outil** : seul le serveur voit aussi les scripts hors du dépôt (le
  `envoyer.sh` du bloc-notes, par exemple). `RAG_MAX_CLAIMS_BATCH_SIZE = 10` est exporté par
  `web/src/lib/rag/claims/validation.ts`, et le refus est un 422 qui donne la taille reçue et la consigne.
- **10, et pas 16** : 10 est la taille constatée en production à plusieurs reprises (besoins 2 et 4). Le « 16 tient
  large » de l'ancien commentaire d'`ingest.mjs` n'a pas de constat daté. Ce n'est pas un seuil clinique : une
  borne de débit, qu'on remonte si un constat le justifie.
- **Les chunks gardent 64** (`RAG_MAX_BATCH_SIZE`) : leur route n'a pas montré ce piège.
- **Les trois outils** (`ingest.mjs`, `ingest-devlocal.mjs`, `draft.mjs`) lisent la constante. Le banc textuel
  rougit sur une taille en chiffres (constante, pas de boucle, tranche).

## 4. Fichiers modifiés

- `web/src/lib/rag/claims/validation.ts`, `web/src/lib/rag/claims/validation.test.ts`
- `tools/corpus/claims/ingest.mjs`, `tools/corpus/claims/ingest-devlocal.mjs`, `tools/corpus/claims/draft.mjs`
- `changelog.d/2026-11-21-autonomie-pieges-partie8.md`, ce handoff

## 5. Validations exécutées

- `validation.test.ts` : 21 tests sur 21.
- Mutation : `const RAG_MAX_BATCH = 64` remis dans `ingest.mjs`. Le banc rougit et nomme le fichier. Après
  rétablissement, tout revient au vert.
- Seconde mutation : `lot: 64` en dur dans `parseArgs` d'`ingest.mjs`. Le banc rougit, puis revient au vert.
- `wn-reviewer` (P1) : GO avec réserves, aucun P0 ni P1. P2-1 (README des outils périmé) : corrigé. P2-3 (le banc
  exigeait la constante en dernier dans la déstructuration) : corrigé. P2-2 (faux négatifs du banc) : le défaut
  `lot:` en dur est ajouté ; le reste est écarté, car `--lot` est borné par la constante et le serveur répond 422.
  P2-4 (doublons cherchés par tranche dans `draft.mjs` et `ingest-devlocal.mjs`) : écarté, la limite est antérieure
  au lot. Sans risque de donnée, puisque le serveur fait un no-op ou répond `CLAIM_IMMUABLE`.
- `ingest.mjs` lancé localement, sans réseau : l'import de la constante se résout ; `--lot 11` est refusé
  (« entre 1 et 10 »).
- T1 (`check:rapide`) : 16 étapes vertes, 3 sautées. T1 complet (`check`) : vert.
- Aucun E2E n'appelle la route (`git grep` sur `web/e2e`). T2 n'a pas été joué : il ne joue rien qui passe par ce
  contrat. Le CI rejoue Vitest.
- Rien n'a été envoyé en production. L'effet du 422 sur la route déployée n'est pas constaté.

## 6. Problèmes ouverts

- Non couvert : un script hors du dépôt qui découpe lui-même ses paquets. Il reçoit désormais un 422 explicite,
  et non plus un 500 après 5 s.
- Aucun test de route ne prouve le 422 à 11 claims, ni l'absence d'appel à `createEmbeddings`. Seul le contrat est
  testé ; l'ordre « parse puis embeddings » de la route se lit dans le code (`route.ts`).
- La marge de 10 n'est pas mesurée en temps. Le correctif de fond, un `timeout` explicite sur la
  `prisma.$transaction` de `store.ts`, reste hors du lot ; à reprendre seulement sur un constat.
- Pièges encore à traiter dans le lot :
  - listes jumelles ;
  - release-db sur 504 ;
  - one-off Scalingo recyclé ;
  - réservation WN-SRC ;
  - focus areas de PR-Agent ;
  - SESSION_LOG réordonné ;
  - sessions concurrentes ;
  - crochets de la copie principale en retard ;
  - `wn-attendre-ci` ;
  - statut « transféré » (décision requise) ;
  - lint « objet d'erreur brut ».
- Les P3 assumés des crochets ne se reprennent que sur un cas réel.

## 7. Prochaine action exacte

1. Commit, push et PR (`--body-file`). Ensuite `wn-attendre-ci` en fond, sous la forme sûre.
2. PR-Agent → 0 (`wn-revue-pr-agent.mjs`), plus le verdict de `wn-reviewer` (P1). Puis un verdict pour chaque
   remarque.
3. « prête @<sha> » sur la PR et au registre (boîte `integrateur`). Ensuite, plus aucune écriture sur la PR
   (D-546).
4. Ensuite, le piège suivant de la liste : « listes jumelles ».

## 8. Interdits encore actifs

- Ni migration, ni schéma, ni clinique, ni donnée patient. Fixtures neutres seulement. Pas de `prisma format`.
- Rien dans `web/src/lib/clinical/`. Aucune écriture en production.
- Ne pas toucher `tools/corpus/fiches-usage/rediger.mjs`. Ne jamais supprimer une ligne des registres.
- Aucune routine créée, rallumée ni lancée. `orchestrateur/arret` reste à `true`. La phase 3 (pilote) attend le
  feu vert du responsable.
- Ne pas déclarer la porte 24 levée. Aucune adresse de page privée dans le dépôt.
- Horodater en lisant l'heure système.
