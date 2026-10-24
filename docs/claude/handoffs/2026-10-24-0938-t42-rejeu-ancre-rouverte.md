# Handoff — t42 : un T1 confirmé ne redevient plus « à confirmer »

## Branche et état du dépôt

- Branche `lot/t42-rejeu-ancre-rouverte`, worktree `d281-lot3-portail`, partie
  de `origin/main` à 5389dd98 (t41 mergé, #1670). Session concurrente de la
  file A, cycle en `git`/`gh` direct.
- Deux commits de code (84067b24, 4e9437f5), puis la clôture. Aucune
  migration, donc aucune release-db.

## Objectif

Corriger le défaut que `wn-reviewer` a relevé en P1 sur #1670, routé par le
responsable le 2026-10-24 avec une correction immédiate. Une ancre de cycle
rouvert (`T1`, `T2`…) se datait sur la réponse la plus récente du dossier.
Toute passation reçue après sa confirmation cassait donc le rejeu (D-118) :
l'écran redemandait de confirmer le `T1`, et la re-passation du deuxième
cycle perdait sa cible.

## Décisions prises

- **Arbitrage du responsable (2026-10-24)**, par une question à options :
  corriger maintenant en lot t42. Les options écartées étaient d'ouvrir une
  ligne sans coder et d'accepter la limite.
- **Le correctif** : une ancre de rang 1 ou plus déjà posée se date sur le
  `targetAt` de sa ligne, que D-129 interdit de réécrire
  (`proposeRuntimeEpisode`, paramètre `ancrePosee`). La route le lit par
  `ancrePoseeDe`, avec `findUnique` sur `identifiantAncre`, pour le GET, le
  POST et la cible de re-passation. En lecture datée, une ligne confirmée
  après la date lue est ignorée.
- **Écarté** :
  - toucher `lireAncresPersistees`, lu aussi par le portail, les objectifs
    et les check-ins ;
  - dater aussi le `T0` sur sa ligne, puisque sa première réponse ne bouge
    pas.
- **D-350** : l'arbitrage du responsable est transcrit, à la demande de
  CodeRabbit sur #1673 (chemin clinique : la date commande la fenêtre des
  réponses proposées). `wn-reviewer` jugeait la D-xxx inutile, puisqu'il
  s'agit d'une correction d'identité d'acte sous D-118 et D-129. Aucune
  règle, aucun seuil ni aucun mode d'inclusion. Le fragment `changelog.d/`
  est posé.

## Fichiers modifiés

- `web/src/lib/clinical-engine/runtimeFromPrisma.ts` et son test (deux bancs).
- `web/src/app/api/praticien/cockpit/route.ts` et `route.test.ts` : le banc de
  limite de t41 est inversé, et cinq bancs sont ajoutés.
- `changelog.d/2026-10-24-t42-rejeu-ancre-rouverte.md`, ce handoff,
  `SESSION_LOG`.

## Validations exécutées

- **T1** rapide et complet : verts.
- **Vitest ciblé** : route et runtime, 104/104.
- **Contre-épreuves** :
  - sans la ligne du correctif, six bancs rougissent ;
  - sans la garde de lecture datée, un banc rougit.
- **T3** : vert en 8 min 5 s sur 4e9437f5, 282 E2E compris.
- **`wn-reviewer`** : GO avec réserves, sans P0 ni P1. Ses quatre P2
  portaient sur les bancs :
  - la re-confirmation ne passait pas par la branche réelle de D-129 ;
  - l'assertion `not 409` était trop lâche ;
  - la passation de test tombait hors de la fenêtre ;
  - les cas de lecture datée et le banc unitaire manquaient.
  Tous sont corrigés dans 4e9437f5.
- **Constats par conteneur**, en lecture seule (one-off-7948, one-off-4458) :
  ancres `T1+`, passations postérieures et concordance colonne/payload ;
  effectif inférieur à cinq dossiers, répartition masquée (D-298 §3).

## Problèmes ouverts

- Aucun dans le périmètre.
- Le fragment de t41 (déjà sur `main`) décrit encore la limite comme
  ouverte. Ce fragment-ci la dit levée. Le premier ne se réécrit pas,
  puisque les fragments sont historiques.

## Prochaine action exacte

1. CI : `node scripts/wn-attendre-ci.mjs <N>`.
2. Revue CodeRabbit sur le sha de tête.
3. Vérifier qu'aucune release-db n'attend.
4. Merge avec `--match-head-commit`.
5. Observer le déploiement.
6. Au suivi de la file A : t42 « fait », et la réserve de t41 marquée
   « levée par t42 ».

## Interdits encore actifs

- Un merge à la fois, aucun auto-merge.
- Ne jamais redéployer une image antérieure à 257807e3.
- Ne pas toucher aux branches `lot/file-a-suivant`,
  `j3-12d-badges-preuve-masques` et `lot/t23-restes-verificateur`, ni aux PR
  ou release-db des autres sessions.
- Hors périmètre : t36, m38, et l'allumage de `WN_CONSTAT_BESOIN`.
