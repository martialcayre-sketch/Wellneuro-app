# Handoff — lot `autonomie-pieges-restes`, partie 9 : listes jumelles (2026-11-21)

## 1. Branche et état Git

- Branche `chore/autonomie-pieges-partie9`, tirée d'`origin/main` après #2296 (e2033a9f), puis avancée par
  `--ff-only` jusqu'à d1238af4 (#2299). Elle vit dans le worktree `.claude/worktrees/orch-ci`. L'ancienne
  `chore/autonomie-pieges-partie8` est périmée et n'a pas été touchée.
- Le commit est fait tard, juste avant le push (D-518).
- Carnet : le lot `autonomie-pieges-restes` (ordre 35) reste pris par cette session. `branche` et `tenu_le` ont été
  mis à jour avec `if_version`, en version 32.
- Boîte D lue au démarrage, quatre messages :
  - `merge_fait` de #2296 : passé à « traité » ;
  - `merge_fait` de #2297 : passé à « lu » ;
  - deux messages de l'orchestrateur cloud : hygiène, et lot `registres-reponses-controle` non pris faute
    d'accès (403). Les deux sont passés à « lu » ; aucun ne demande de geste à la file D dans ce lot.

## 2. Objectif

Le piège « listes jumelles » (mémoire `gardes-listes-mots-langue-amont`) : quand une garde par liste de mots est
corrigée, sa sœur ne l'est pas. Le contrôle attendu est un banc qui prouve l'inclusion d'une liste dans l'autre.

## 3. Décisions prises

- **Risque P2** : des tests seulement. Rien de clinique, aucun crochet, aucune route, aucun schéma. Revue :
  `/code-review medium`, puis PR-Agent.
- **Recensement fermé par nom** : toute déclaration `RACINES_INTERDITES` de `web/src` doit être inscrite au banc,
  avec sa famille et son motif. J'en ai trouvé quatre ; avec `CLES_INTERDITES`, aucune autre liste ne porte ces
  racines (`git grep` sur `web/src`, `scripts` et `tools`).
- **Deux familles et leurs socles** :
  - « mesure ordonnée » : `propositionObjectif`, `objectifNegocie` et `comprehensionAppendOnly` ;
  - « certitude » : `contradictionFinding`, lue sous `clinical/`, non éditée.
- **Égalité stricte** pour la seule paire de jumelles exactes (moteur et panneau, même amont `decisionCard.ts`).
  `comprehensionAppendOnly` garde ses racines propres (moyenne, taux…), sans égalité imposée.
- **`CLES_INTERDITES` ⊇ mots entiers du socle**. Les deux listes restent distinctes par décision (arbitrage 1 du
  2026-08-23 : égalité exacte contre sous-chaîne).
- **Défaut corrigé** dans `comprehensionAppendOnly` : quatre racines anglaises ajoutées. La garde balaye quatre
  fichiers et reste verte : aucun nom anglais de mesure n'y est déclaré.

## 4. Fichiers modifiés

- `web/src/lib/racinesInterditesJumelles.guard.test.ts` (nouveau)
- `web/src/lib/comprehensionAppendOnly.guard.test.ts`
- `changelog.d/2026-11-21-autonomie-pieges-partie9.md`, ce handoff

## 5. Validations exécutées

- Avant correctif, le banc rougit sur le seul défaut réel : il manque `rank`, `confidence`, `threshold` et
  `weight` dans `comprehensionAppendOnly`.
- Après correctif : le banc et les quatre gardes sœurs sont verts, 5 fichiers et 103 tests.
- Mutations, chacune rouge sur la règle attendue puis rétablie ; le banc revient au vert après :
  - `rank` retiré du panneau ;
  - `ordinal` ajouté d'un seul côté ;
  - sœur non inscrite ;
  - `confidence` retiré de `CLES_INTERDITES`.
- `/code-review medium` : cinq constats, aucun bloquant.
  - Corrigés :
    - 1 : un `]` cité dans un commentaire tronquait la liste. La capture s'arrête désormais au `];`, et un cas le
      prouve.
    - 2 : les guillemets doubles étaient lus comme une liste vide. Ils sont désormais acceptés.
    - 5 : les mots entiers étaient recopiés à la main. Ils se dérivent maintenant du socle, avec des exemptions
      motivées `HORS_BLOB` : `severit` et `gravit` parce que ce sont des racines tronquées ; `poids` parce qu'il
      est absent de l'arbitrage 1 et que l'ajouter au blob serait une décision.
  - Écartés :
    - 3 : aucune égalité n'est imposée à `comprehensionAppendOnly`. C'est voulu : ses racines sont propres, et
      l'invariant partagé est le socle.
    - 4 : `rank` et `weight` pourraient produire des faux positifs en sous-chaîne. Ce sont les racines des deux
      jumelles depuis le LOT-03, sans faux positif ; un cas réel se traiterait par renommage (précédent
      `marqueurPrisma`).
  - Après corrections, les quatre mutations ont été rejouées : toutes rouges, puis le banc revient au vert.
- T1 complet (`npm run check`) : vert avant les corrections de la revue, puis rejoué vert sur l'état final.
- T2 n'a pas été joué : aucun E2E n'est concerné, et le CI rejoue Vitest.

## 6. Problèmes ouverts

- Trous assumés du banc : une liste sœur nommée autrement, une racine bâtie par calcul, et la suffisance d'un socle,
  qui n'est pas jugée.
- Pièges encore à traiter dans le lot :
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

## 7. Prochaine action exacte

1. T1 complet, commit, push et PR (`--body-file`). Ensuite `wn-attendre-ci` en fond.
2. `/code-review medium` et PR-Agent → 0, puis un verdict pour chaque remarque.
3. « prête @<sha> » sur la PR et au registre (boîte `integrateur`). Ensuite, plus aucune écriture sur la PR
   (D-546).
4. Ensuite, le piège suivant de la liste : « release-db sur 504 ».

## 8. Interdits encore actifs

- Ni migration, ni schéma, ni clinique, ni donnée patient. Fixtures neutres seulement. Pas de `prisma format`.
- Rien d'édité dans `web/src/lib/clinical/`. Aucune écriture en production.
- Ne pas toucher `tools/corpus/fiches-usage/rediger.mjs`. Ne jamais supprimer une ligne des registres.
- Aucune routine créée, rallumée ni lancée. `orchestrateur/arret` reste à `true`. La phase 3 (pilote) attend le
  feu vert du responsable.
- Ne pas déclarer la porte 24 levée. Aucune adresse de page privée dans le dépôt.
- Horodater en lisant l'heure système.
