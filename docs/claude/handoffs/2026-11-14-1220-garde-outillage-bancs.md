# Handoff — 2026-11-14 — file C, lot `garde-outillage-bancs` : garde de l'outillage des bancs, contre-épreuves reportées par #2092

## Branche et état Git

- Branche `feat/garde-outillage-bancs`, worktree `bp17-garde`, créée depuis
  `origin/main` (`424025e9`). Avancée en `--ff-only` sur `b5ac3bac` (#2105)
  avant la première édition, la branche étant vide (D-518 §1).
- PR ordinaire, à déclarer « prête @<sha> » pour l'intégrateur (D-373,
  D-454). Ni migration ni `schema.prisma`.
- Aucun fichier sous un chemin déclencheur de `release-db` (ni
  `web/src/lib/clinical/`, ni table signée) : pas de release-db au merge.
- **Avant le lot**, dans la même session : #2106 (BP-17 PR 6) était renvoyée
  par l'intégrateur (`20261114-1146-integrateur-c`, conflit sur
  `docs/FEATURE_FLAGS.md` avec #2103). Sur arbitrage du responsable dans la
  session (D-518 §2, option « fusionner »), j'ai fusionné `origin/main` dans
  `feat/bp17-pr6-cockpit` (`99814e04`). J'ai gardé les deux lignes de la
  PR 6, et la ligne de `main` pour la déclaration sur le suicide, avec le
  complément de #2103. T1 vert, branche poussée, CI attendu. La branche
  fusionne proprement sur `main@b5ac3bac` (#2105).

## Objectif

1. Prouver qu'aucun module de production n'importe `balayageSources.ts` ni
   `resolutionImports.ts`, l'outillage des bancs sous `web/src`. C'était la
   question de `wn-reviewer` sur #2092.
2. Jouer les deux contre-épreuves reportées par #2092 :
   - `atteintLePaquet` sur `../…/node_modules` ;
   - la racine d'un asset `@/components`.
3. P3-a de #2106, à la condition que #2106 soit mergée au départ du lot.

## Décisions prises

Ce sont des choix de forme, dans le cadre du lot. Rien de clinique.

- **Le banc neuf** `web/src/lib/bio-parcours/outillageBancs.guard.test.ts` :
  - il suit la fermeture résolue depuis tout `web/` (`web/src`, plus les
    entrées et `web/scripts/`), sur le patron d'`importeurs.guard.test.ts` ;
  - un fichier de test ou ignoré qu'importe la production est balayé à son
    tour ;
  - un import qui nomme l'outillage (motif, casse ignorée, requête `?raw`
    tolérée), l'atteint (résolution) ou reste indéterminé fait de son fichier
    un importeur, `import type` compris ;
  - aucun importeur n'est admis.
- **Fonction de fermeture locale au banc.** Celle d'`importeurs.guard` n'a
  pas été extraite : ce banc-là n'est pas touché.
- **Client Prisma en lien** (P1 de `wn-reviewer`, corrigé dans le lot) :
  - le contrôle de fusion pose `web/src/generated/prisma` en lien vers la
    copie source, et le client atteint, canonicalisé, sort du dépôt ;
  - `dansLeDepot` le ramène à son chemin du dépôt. Il reste ainsi suivi, et
    exempté de la règle des noms nus ;
  - sans ce correctif, l'anti-vacuité rougissait au contrôle de fusion,
    « imputable » puisque le banc est absent de `main`.
- **Contre-épreuve `atteintLePaquet`** : elle est posée dans le banc neuf, sur
  un vrai lien `web/node_modules -> …/node_modules`.
- **Contre-épreuve de l'asset** : `racinesMonteesDansLePortail`
  (`gamification-patient`) accepte un graphe en mémoire (`hoteEnMemoire`).
  Son comportement sur le dépôt ne change pas.
- **P3 écarté** (`wn-reviewer`), avec motif : `hoteEnMemoire` rend
  `realpath: f => f`. C'est sans effet ici, puisque le graphe en mémoire
  résout contre la racine du dépôt.

## Fichiers modifiés

- `web/src/lib/bio-parcours/outillageBancs.guard.test.ts` (nouveau)
- `web/src/lib/gamification-patient.guard.test.ts`
- `changelog.d/2026-11-14-garde-outillage-bancs.md`
- `docs/claude/plan-journal/F11/2026-11-14-02-garde-outillage-bancs.md` (rang
  02 : la PR 6 porte le 01 du même jour)
- ce handoff

## Validations exécutées

- **Mutations réelles**, jouées puis retirées (copie restaurée, `git status`
  vérifié) :
  - un `import type` de `resolutionImports` dans
    `components/patient/AvisLectureDatee.tsx`, et un import latéral de
    `balayageSources` dans `web/scripts/bioExtractionWorker.ts` : rouge, les
    deux fichiers nommés ;
  - le motif d'`atteintLePaquet` ancré sur `^web/node_modules/` : la
    contre-épreuve du paquet rougit ;
  - la branche « asset » de `racinesMonteesDansLePortail` retirée : la
    contre-épreuve de l'asset rougit ;
  - `dansLeDepot` neutralisé : la contre-épreuve du client en lien rougit.
- **Bancs** : `outillageBancs.guard` à 6/6, `gamification-patient.guard` à
  6/6. Sur le dépôt, aucun importeur.
- **T1** (`npm run check:rapide`) vert.
- **Revue `wn-reviewer`** (P1, garde) : un P1, corrigé. Deux P3 : le motif
  `?raw`, corrigé ; le `realpath` de l'hôte en mémoire, écarté.
  Contre-vérification du correctif : **GO**, 6/6 rejoué. Le contrôle de
  fusion sur l'arbre extrait n'a pas pu être rejoué par la revue, qui ne peut
  pas lancer `git archive` : son verdict, à l'étape 7 bis, reste le constat
  à obtenir.

## Problèmes ouverts

- **P3-a de #2106** (`cockpit.guard.test.ts` ne contrôle qu'un niveau
  d'imports) : il n'est pas traité, puisque #2106 n'était pas mergée au
  départ du lot. Il reste à prendre après son merge : l'étendre à la
  fermeture, ou le dire couvert par `ecritures.guard`.
- **Limites déclarées du banc neuf** : `new URL('./balayageSources.ts',
  import.meta.url)` et `require.resolve` ne sont pas des imports lus. Ce sont
  des cas marginaux, et aucun n'existe en production.
- **#2106** : redéclarer « prête @99814e04 » quand le CI rend 0, puis passer
  `20261114-1146-integrateur-c` à `traite`.

## Prochaine action exacte

1. Ouvrir la PR, puis lancer `wn-attendre-ci` et `wn-revue-pr-agent` (repli :
   `wn-reviewer`, D-448).
2. Déclarer « prête @<sha> » : commentaire de PR, ligne `prete` au registre,
   `pr` dans la ligne du carnet `garde-outillage-bancs`.
3. Le lot suivant de la file C : il n'y en a pas de `pret`. La PR 7
   (contenus) attend le responsable et la file B.

## Interdits encore actifs

- N'élargir aucun des périmètres balayés par les autres bancs ni aucune liste
  admise.
- Ni migration ni `schema.prisma`. Aucun contenu clinique.
- Ne pas reposer D-480, D-514, le découpage ni les arbitrages BP-17.
  `20261114-1116-c` est répondue : afficher, avec la mention.
- Production en lecture seule, par conteneur, en agrégats.
