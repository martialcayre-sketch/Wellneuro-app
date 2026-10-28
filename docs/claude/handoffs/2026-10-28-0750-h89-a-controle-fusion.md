# Handoff — 2026-10-28 — H89, PR (a) : contrôle sur l'arbre fusionné et signal de chevauchement (D-373 §4)

## Branche et état du dépôt

- Branche `lot/h89-integrateur-a`, worktree `.claude/worktrees/h89-integrateur-a`
  (session concurrente, cycle en `git` et `gh` directs).
- Partie de a2043078. Avancée en `--ff-only` sur `origin/main` 43244742
  (#1750) avant la première écriture : la branche ne portait encore aucun
  commit.
- Ni migration, ni chemin clinique, ni authentification, ni
  `.coderabbit.yaml` : PR ordinaire, libération dès le merge.

## Objectif

Livrer la PR (a) de la fiche H89 (D-373 §4) : deux scripts en lecture seule
et leurs bancs.
- Le contrôle conditionnel sur l'arbre fusionné.
- Le signal de chevauchement.

Les PR (b) à (d) et l'essai de sept jours relèvent des sessions suivantes.

## Décisions prises

Aucune décision nouvelle. Lectures de mise en œuvre, toutes plus strictes que
la lettre de D-373 §4 :
- **Base du dernier vert.** C'est l'ancêtre commun de la tête et de
  `origin/main`. « Non requis » exige donc que `main` soit un ancêtre de la
  tête. Le contrôle peut jouer sans nécessité, jamais manquer un cas.
- **Empreinte.**
  - Verrou de l'arbre comparé à `node_modules/.package-lock.json`, paquet par
    paquet (optionnelles absentes admises).
  - Oid du schéma de l'arbre comparé au `hash-object` du schéma de la source.
  - Client généré pas plus ancien que le schéma de la source (date du
    fichier).
  - La comparaison au schéma embarqué dans le client n'a pas été retenue :
    sa vérification, en lecture dans la copie principale, a été refusée en
    séance. La date sert donc d'heuristique (M11 de la revue).
- **Arbre extrait.** `git archive` dans un dossier temporaire, `git init`,
  puis `git add -A -f`. Ce n'est pas un checkout, et quelques bancs lisent
  `git ls-files` ou `git grep`. Les liens vers `node_modules` et le client
  Prisma de la source sont posés après l'index.
- **Gardes de la liste explicite.**
  - `decisions-numerotation.mjs` en mode local : la vérification « décision
    supprimée » du CI n'y joue pas.
  - `wn-matrice-consommation.test.mjs`, `ci-invariants.test.mjs`.
  - Tous les `*.guard.test.*` collectés par Vitest.
  - Douze bancs de balayage, tenus à jour par un banc de parité.
- **Un rouge ne suffit pas.**
  - Il est confirmé seul sur l'arbre fusionné ; s'il repasse au vert, il est
    instable et rend « indéterminé ».
  - Il est ensuite rejoué seul sur `main`.
  - Défaut s'il y est vert ou absent, ou s'il porte un test ou une violation
    de plus ; sinon préexistant, et une PR de réparation passe.
- **Conflits.** `mergeable` à faux côté GitHub est aussi un défaut, hors
  cache : `merge-tree` applique `merge=union`, GitHub non.

## Fichiers modifiés

- `scripts/wn-controle-fusion.mjs` et `scripts/wn-controle-fusion.test.mjs`
  (nouveaux).
- `scripts/wn-chevauchement.mjs` et `scripts/wn-chevauchement.test.mjs`
  (nouveaux).
- `web/package.json` : les deux bancs ajoutés à `bancs-outillage-check`.
- `docs/claude/PLAN_WELLNEURO.md` : mise à jour datée de la fiche H89.
- Clôture : `changelog.d/2026-10-28-h89-a-controle-fusion-chevauchement.md`,
  ce handoff.

## Validations exécutées

- Bancs `node --test` : 48 sur 48 (38 contrôle, 10 signal).
- Mutations : 28 jouées, 28 tuées. Elles couvrent notamment :
  - non requis toujours sauté, conflit lu comme sain, empreinte ignorée ;
  - confirmation, code de Vitest et signatures retirés ;
  - code 2 compté rouge, `mergeable` ignoré, absent de `main` ignoré ;
  - fetch de la tête retiré, client périmé accepté, index sans `-f` ;
  - un banc de balayage retiré de la liste ;
  - signal qui refuse, ancien nom ignoré.
- Contrôle réel en lecture, emprunt de `node_modules` de la copie principale :
  - #1751 : non requis, 1,4 s ;
  - #1749 : 159 gardes vertes en 27,4 s, puis 19,4 s après correctifs ;
  - #1749 de nouveau : 1,5 s en cache ;
  - usage invalide : 3.
- Signal réel sur #1751 et #1749 : documents communs seuls, code 0.
- T1 `npm run check:rapide` vert, puis `npm run check` avant le commit final.
- Revue `wn-reviewer` : GO, aucun bloquant.
  - Corrigés :
    - C1, rouge de charge confirmé seul ;
    - C2, code de sortie de Vitest lu ;
    - C3, comparaison par test et par violation ;
    - C4, code 2 de la numérotation et compte des préexistants ;
    - mineurs M1, M2, M3, M5 à M10, M12 et M13.
  - M4 traité par `--no-cache` de Vitest (accepté au run réel).
  - M11 laissé (heuristique de date, voir « Décisions prises »).

## Problèmes ouverts

- **`wn-merge` n'appelle pas encore les scripts** : c'est la PR (b).
- **Questions de la revue pour la PR (b) :**
  - Merge par `--match-head-commit` sur la tête contrôlée.
  - Conduite sur le code 2 : une PR qui change le verrou ou le schéma rend
    toujours « indéterminé » avec la copie principale comme source.
  - Le `fetch` d'`origin/main`, partagé par les worktrees, avance le garde
    de fraîcheur des sessions concurrentes. Ce n'est pas nouveau : la sonde
    H88 le fait déjà.
- **Limites connues :**
  - Banc de parité : un balayage hors `readdirSync`, `opendirSync`, `glob`
    ou `readdir`, ou caché dans un module d'aide, n'est pas vu. Aucun cas
    aujourd'hui.
  - Un `.package-lock.json` caché périmé (installation interrompue) passerait
    l'empreinte.

## Prochaine action exacte

1. Ouvrir la PR.
2. CI en fond : `node scripts/wn-attendre-ci.mjs <N>`.
3. CodeRabbit sur la tête, un verdict par remarque.
4. `node scripts/wn-sonde-release-db.mjs <N>` à 0.
5. Merge : `gh pr merge <N> --squash --delete-branch --match-head-commit <sha>`,
   hors du dépôt.

Puis H89 PR (b) dans une session neuve.

## Interdits encore actifs

- Aucun merge sans la sonde release-db à 0.
- Jamais d'auto-merge.
- Approbation et déclenchement de release-db : gestes humains.
- Aucune migration sans demande.
- Production en lecture seule, par conteneur.
- Dépôt public : aucun lien d'artefact, aucun identifiant interne de page,
  aucune identité réelle.
- Jamais de rebase ni de `git stash` nu dans ce worktree.
- Une fusion de `origin/main` est permise si `main` avance.
