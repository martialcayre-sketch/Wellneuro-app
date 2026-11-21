# Handoff — lot `autonomie-pieges-restes`, partie 11 : garde des importeurs rouge au contrôle de fusion (2026-11-22)

## 1. Branche et état Git

- Branche `chore/autonomie-pieges-partie11`, tirée d'`origin/main` à 9f77744b (#2304, partie 10, mergée le
  2026-11-21 à 19:31Z). Elle vit dans le worktree `.claude/worktrees/orch-ci`. L'ancienne
  `chore/autonomie-pieges-partie10` est périmée et n'a pas été touchée.
- Le commit est fait tard, juste avant le push (D-518).
- Carnet : le lot `autonomie-pieges-restes` (ordre 35) reste pris par cette session. `branche` et `tenu_le` ont été
  mis à jour avec `if_version`, en version 38.
- Boîte D lue au démarrage : un seul message `emis`, le `merge_fait` de #2304, passé à « lu ». Rien de neuf
  d'autre.

## 2. Objectif

La garde `web/src/lib/bibliotheque-options/importeurs.guard.test.ts` rougissait sur `main` dans quatre contrôles de
fusion d'affilée (#2296 à #2299), et passait rejouée seule. L'intégrateur l'a signalé au `merge_fait` de #2301 et
pensait à un délai sous charge.

## 3. Décisions prises

- **Ce n'est pas un délai.** Le cache du contrôle (`.git/wn-controle-fusion/`) dit qu'elle rougit « à l'identique
  sur main seul », c'est-à-dire rejouée seule dans le contrôle. Reproduit avec `materialiser` sur l'arbre
  d'`origin/main` : 1 test rouge sur 10, en 754 ms. C'est l'anti-vacuité « le client Prisma généré est atteint ».
- **Cause** : `materialiser` posait `web/src/generated/prisma` en lien symbolique vers la copie source. Le résolveur
  de la garde suit les liens comme le bundler (`bio-parcours/resolutionImports`) : le client se résolvait hors de
  l'arbre (`../…`) et n'était pas balayé.
- **Gravité** : le test rouge est celui qui refuse un nouveau lecteur de la bibliothèque (D-480 §8). Rouge à
  l'identique sur `main`, il était classé préexistant. Une PR ajoutant un lecteur aurait eu la même signature et
  passé le contrôle ; seul le CI, sur vrai checkout, l'aurait arrêtée.
- **Correctif retenu** : copier le client dans l'arbre extrait (`cpSync` récursif, `COPYFILE_FICLONE` : clone APFS
  ou reflink, sinon copie). Le client fait 23 Mo et ne contient aucun lien. `node_modules` reste relié : aucun banc
  n'y suit d'import, et le copier coûterait cher.
- **Écarté** : modifier la garde, en tolérant un client hors de l'arbre ou en ne suivant plus les liens. Cela
  aurait affaibli un verrou clinique-adjacent (D-480) pour arranger l'outillage. C'est l'outillage qui s'écartait
  d'un vrai checkout.
- **Deux gardes voisines compensaient déjà le lien**, relevé par `wn-reviewer` :
  - `web/src/lib/bio-parcours/outillageBancs.guard.test.ts` ;
  - `web/src/lib/atelier-bibliotheque-options/cockpit.guard.test.ts`.

  Leur `dansLeDepot` ramène le client relié à son chemin dans le dépôt. `importeurs.guard` ne le faisait pas : c'est
  pourquoi elle seule rougissait. Cette compensation devient sans effet, mais reste sans danger. Elle est gardée en
  défense en profondeur ; seuls ses commentaires sont devenus faux (§6).
- **Durcissements de la revue** :
  - `dereference: true`, puis refus d'une copie qui n'est pas un dossier ;
  - les gardes « déjà dans l'arbre », parents compris, passent de `existsSync` à `lstatSync` : un lien cassé suivi
    abattait sinon le processus dans `cpSync`.
- **Risque** : P1. C'est de l'outillage de merge (orchestration, garde-fou), hors liste P0 de `POLITIQUE_REVUE.md`.
  Revue : `wn-reviewer` sur la tête, puis PR-Agent → 0.

## 4. Fichiers modifiés

- `scripts/wn-controle-fusion.mjs` : `materialiser`, client copié au lieu d'être relié ; imports `cpSync`,
  `constants`.
- `scripts/wn-controle-fusion.test.mjs` : un cas neuf, « le client Prisma généré est copié dans l'arbre extrait,
  node_modules relié ».
- `changelog.d/2026-11-22-autonomie-pieges-partie11.md`, ce handoff.

## 5. Validations exécutées

- **Banc du contrôle** (`node --test scripts/wn-controle-fusion.test.mjs`) : 41 sur 41 au premier commit, puis 44
  sur 44 avec les trois cas de la revue.
- **Mutations**, chacune rétablie ensuite :
  - remettre le `symlinkSync` du client fait rougir son seul cas (40 sur 41) ;
  - retirer `dereference` fait rougir un seul cas, celui du client relié ;
  - remettre `existsSync` à la garde du client, ou à celle des parents, fait rougir chaque fois un seul cas, celui
    du lien cassé correspondant.
- **Revue `wn-reviewer`** sur 828e9b24 : GO, sans P0 ni P1. Verdicts sur ses trois P2 :
  - P2-1, client relié : corrigé ;
  - P2-2, lien cassé : corrigé ;
  - P2-3, commentaires : corrigés dans ce diff ; ceux des deux gardes voisines sont routés (§6).
  - Sa remarque « réécriture redondante d'`index.js` dans le cas neuf » est écartée : le cas écrit un contenu non
    vide, que la fixture laisse vide, pour prouver que c'est bien le contenu de la source qui est copié.
- **De bout en bout** : `materialiser` corrigé sur l'arbre de la branche, puis la garde seule passe 10 sur 10.
  Avant, sur `origin/main`, elle était à 9 sur 10.
- **Toutes les gardes du contrôle** (`jouerGardes` sur l'arbre corrigé, même exécuteur que le contrôle) : 189 `ok`
  sur 189, en 27 s. Aucun banc qui parcourt `web/src` n'est gêné par le vrai dossier.
- **T1 complet** (`npm run check`) : vert (code 0), anti-secrets compris.
- T2 n'est pas joué : aucun E2E n'est concerné.

## 6. Problèmes ouverts

- Deux dossiers temporaires de reproduction restent sous `$TMPDIR` (`wn-repro-imp-FTzSkg`, `wn-repro-imp-NGuSPN`).
  Le crochet refuse `rm -rf` depuis la session ; leur préfixe n'est pas celui que purge le contrôle. Ils sont
  sans effet, mais restent à supprimer à la main.
- Les verdicts déjà en cache (`.git/wn-controle-fusion/`, clé incluant la version du script) gardent leur note
  « préexistant ». Le changement de script invalide la clé, ce qui ne demande aucun geste.
- Non vérifié : sur Linux, `COPYFILE_FICLONE` se replie sur une copie simple (23 Mo). Le contrôle ne tourne
  aujourd'hui que sur le Mac de l'intégrateur.
- Routé vers un lot ultérieur, faute de périmètre ici : les commentaires de `dansLeDepot` dans
  `outillageBancs.guard.test.ts` (lignes 39-51 et 187-212) et `cockpit.guard.test.ts` (lignes 168-180) disent encore
  que le contrôle pose le client en lien symbolique. Il faut les corriger, en gardant la compensation.
- Pièges encore à traiter dans le lot :
  - one-off Scalingo recyclé ;
  - réservation WN-SRC ;
  - focus areas de PR-Agent ;
  - SESSION_LOG réordonné ;
  - sessions concurrentes ;
  - crochets de la copie principale en retard ;
  - `wn-attendre-ci` ;
  - statut « transféré » (décision requise) ;
  - lint « objet d'erreur brut ».
- Toujours à arbitrer par le responsable : les deux lots que les passes cloud du 2026-11-21 ont rangés « bloque »
  faute de droits (403 : dépôt hors des sources de la routine). Ces passes sont légitimes, puisque l'interrupteur
  est ouvert (§8). Reste à donner les droits à la routine, ou à la couper.

## 7. Prochaine action exacte

1. Commit, push et PR (`--body-file`), puis `wn-attendre-ci` en fond.
2. `wn-reviewer` sur la tête, puis PR-Agent → 0. Chaque remarque reçoit un verdict.
3. « prête @<sha> » sur la PR et au registre (boîte `integrateur`). Ensuite, plus aucune écriture sur la PR (D-546).
4. Ensuite, le piège suivant : « one-off Scalingo recyclé ».

## 8. Interdits encore actifs

- Ni migration, ni schéma, ni clinique, ni donnée patient. Fixtures neutres seulement. Pas de `prisma format`.
- Rien d'édité dans `web/src/lib/clinical/`. Aucune écriture en production ; aucun `workflow_dispatch` de
  `release-db`.
- Ne pas toucher `tools/corpus/fiches-usage/rediger.mjs`. Ne jamais supprimer une ligne des registres.
- Aucune routine créée, rallumée ni lancée. `orchestrateur/arret` est relu le 2026-11-22 : il vaut `false`. Il a
  été rouvert le 2026-11-21 à 15:12Z par une session de reprise, sur la parole du responsable. Le handoff de la
  partie 10, qui le disait à `true`, était périmé. Cette session n'y touche pas. La phase 3 (pilote) attend le feu
  vert du responsable.
- Ne pas déclarer la porte 24 levée. Aucune adresse de page privée dans le dépôt.
- Horodater en lisant l'heure système.
