# Handoff — 2026-11-13 — BP-17, PR 4 : contrôles et garde de la bibliothèque des options

## Branche et état Git

- Branche `feat/bp17-garde`, worktree `bp17-garde`, créée depuis
  `origin/main` (`a57aa221`, après le merge de la PR 3, #2006, `2342b154`),
  avancée en `--ff-only` sur `52a7e0eb` (#2059 et voisines, aucun fichier
  commun) avant la première édition du banc §8.
- PR ordinaire de la file C : déclarée « prête @<sha> », mergée par
  l'intégrateur (D-373, D-454). Ni migration ni `schema.prisma`. Elle touche
  `web/src/lib/clinical/` (banc de fraîcheur) et deux chemins nouveaux du
  déclencheur : son merge **propose une release-db**, à approuver, dont les
  préflights rejouent les deux contrats.

## Objectif

Poser les contrôles de D-480 §5 qui restaient après la PR 3 (deux tables au
contrat de fraîcheur, contrat des positions citées, aucune lecture de
dossier, hook DC-17, matrice de consommation, chemins de release-db), et
trancher par un verdict chacun des points que la PR 3 avait routés vers la
PR 4.

## Décisions prises

Choix de forme de la session, dans le cadre de D-480 et du découpage
accepté (`20261111-1131-c`). Aucun ne touche au clinique.
- **« Deux tables au contrat de fraîcheur » lu selon D-480 §5.2** : deux
  entrées `table_signee` du contrat des claims, selon l'usage du claim —
  `bibliotheque_options_dose` (`exige_prescriptif = true`, D-044) et
  `bibliotheque_options` (`false`, D-046). L'instruction de session parlait
  des deux tables SQL de la PR 2 (`bibliotheque_options_textes`, `…_actes`) :
  elles portent du texte, pas des claims, et n'ont pas de place au contrat de
  fraîcheur. Le texte de D-480 §5.2 et l'arbitrage du 2026-11-10 (« deux
  tables au contrat, `prescriptif` exigé de la seule source de dose ») font
  foi. Les claims attendus se lisent dans la STRUCTURE
  (`claimsCitesParUsage`), pas dans `claimsSource`, qui ne porte pas l'usage.
  Le banc admet désormais un arbitrage sans ligne SQL pour une table qui
  n'attend aucune paire ; ailleurs, un arbitrage sans ligne reste rouge.
- **Contrat des positions citées** : fichier propre
  (`positions_citees_tables_signees_v1.sql`), patron du contrat des claims :
  liste en JSON (vide aujourd'hui ; un `VALUES` vide n'est pas du SQL),
  prédicat partagé avec le négatif, préflight avant `migrate deploy`. Le cas
  « empreinte divergente » n'a pas de fixture possible (la base refuse l'acte)
  : le négatif le constate.
- **Aucune lecture de dossier** : fermeture des imports figée par liste
  exacte plutôt que par liste d'interdits — tout module ajouté se relit.
- **Hook DC-17** : même régime que les fiches d'usage (verrou éteint
  couvert), dans `protect-wellneuro-files.mjs` et `gate-codex-p0.mjs`.
- **Matrice** : source déclarée, dormante, verdict `a_brancher` daté
  (porteur PR 5 et PR 6, réexamen 2026-12-15).
- **Découpage** : l'extension aux autres bancs de garde (résolveur, verrous
  de configuration, noms nus, parseur) est une finalité distincte. Inventaire
  fait : cinq bancs de `bio-parcours/` sur `specificateursImportes`
  (`importeursBiologyLibrary`, `cheminDocumentaire`, `bioflowPublie`,
  `catalogueConduitesSepare`, `appelantsLlmBiologie`), dix bancs à regex
  propre (`propositionObjectif`, `sitesAppelIa`, `frontierePortail`,
  `fiches-assiette/catalogue`, `reserveMarqueurAntiLdl`, `bundleClient`,
  `gamification-patient`, `positions-expert/ecritures`, `auth.roles`, et
  deux absences d'import). Proposée en PR séparée.

## Verdicts des points routés par la PR 3

- **Lien symbolique** (BLOQUER de la contre-passe Codex n° 7) : **corrigé**.
  Le fichier atteint est canonicalisé (`realpath`, racine comprise) avant la
  comparaison. Contre-épreuve sur un vrai lien (dossier et fichier) en
  répertoire temporaire ; mutation réelle (`web/src/lib/zzdetour ->
  bibliotheque-options` et un importeur sous `web/src/app/`) : importeur nommé.
- **Valeurs de `scripts` de `web/package.json`** : **corrigé**. La chaîne de
  lancement de production est figée : empreintes de `web/Procfile`,
  `web/cron.json`, `web/scripts/build.sh` et `web/prisma/runWithAlias.js`
  (chargeur `jiti` à alias `@` du worker et du cron, que la PR 3 ne voyait
  pas) ; valeur exacte des cinq scripts appelés ; aucun script de cycle de vie
  ni d'installation autour d'eux ; aucun script ne nomme `NODE_PATH`,
  `NODE_OPTIONS` ni un drapeau de chargeur. Mutation réelle (`NODE_PATH` dans
  `build`, `postinstall` ajouté) : rouge.
- **Extension aux autres bancs** et **passage au parseur** : **routés** vers
  une PR séparée (voir « Décisions »).
- **Outillage de `scripts/` et `tools/`** : **corrigé dans sa part
  vérifiable**. Banc propre sur les spécificateurs CONSTANTS (motif et
  résolution) ; un chargement calculé n'y est pas vu — limite déclarée,
  outillage hors production. Mutation réelle (`scripts/zzMutationOutil.mjs`) :
  nommé.
- **`module.hot.accept`** : **corrigé** dans `specificateursSyntaxiques`
  (helper partagé, que seul ce banc consomme) : `accept`/`decline` à chaîne ou
  tableau constants rendent leurs chemins, un rappel seul rien, toute autre
  mention de `module.hot` ferme le verrou. Contre-épreuves et mutation réelle :
  nommé.
- **Fichiers de test ou ignorés importés par la production** : **corrigé**.
  Le balayage suit chaque import résolu sous `web/` hors `node_modules` et
  balaie le fichier atteint (test, ignoré, client Prisma généré) jusqu'au
  point fixe. Le client généré suit la résolution mais pas la règle des noms
  nus (ses dépendances sont celles de `@prisma/client`). Mutation réelle (un
  `.test.ts` relais importé par `web/src/app/`) : relais nommé.

## Fichiers modifiés

- `web/src/lib/bibliotheque-options/bibliothequeBesoin2V1.ts`
  (`claimsCitesParUsage`, commentaires d'en-tête), `bibliothequeBesoin2V1.test.ts`,
  `importeurs.guard.test.ts`, nouveau `aucuneLectureDeDossier.guard.test.ts`.
- `web/src/lib/clinical/claimsEpinglesFraicheur.guard.test.ts`.
- `web/src/lib/positions-expert/positionsCitees.guard.test.ts` (nouveau).
- `web/src/lib/bio-parcours/balayageSources.ts` (`module.hot`).
- `web/prisma/checks/positions_citees_tables_signees_v1.sql` et `…_negatif.sql`
  (nouveaux).
- `.github/workflows/ci.yml` (négatif), `.github/workflows/release-db.yml`
  (deux chemins, deux listes), `web/scripts/release-db-scalingo.sh`
  (préflight), `scripts/wn-deploiement-deployer.mjs`,
  `scripts/wn-sonde-release-db.mjs` et leurs bancs
  (`release-db-invariants`, `-comportement`, `-scripts`, `wn-sonde-release-db`).
- `.claude/hooks/protect-wellneuro-files.mjs`, `gate-codex-p0.mjs` et leurs
  bancs.
- `scripts/wn-matrice-consommation.mjs`,
  `docs/claude/corpus/consommation_decisions.json`,
  `docs/claude/MATRICE_CONSOMMATION.md` (régénéré).
- `changelog.d/2026-11-13-bp17-controles-garde-bibliotheque.md`, fragment F11
  `2026-11-13-01-controles-et-garde-bibliotheque.md`, ce handoff.

## Validations exécutées

- Bancs du dossier, de fraîcheur et des positions : verts (54 + 27 + 5).
- Contrat des positions sur base locale migrée : négatif vert ; positif vert
  sur liste vide. Mutations : clause « révisée » retirée du prédicat → le
  négatif nomme le cas ; une position dans la liste sur base vide → le
  positif lève `WN001` (« absente »).
- Mutations réelles, jouées puis retirées : claim cité en dose et en
  précaution (banc de fraîcheur nomme les deux paires, chacune dans sa
  table) ; position citée (banc des positions la nomme) ; import de Prisma et
  `fetch` dans le module (fermeture, extérieurs et accès globaux rouges) ;
  regex du crochet ramenée à l'ancienne forme (trois rouges) ; lien
  symbolique, `module.hot`, relais de test, outillage, `package.json`.
- Bancs `release-db-*`, déployeur, sonde, CI : 226 verts. Crochets touchés :
  102 verts. Matrice : verte.
- T1 rapide et T1 complet : code 0. T3 sur `fc67b4af` (première tête) : vert
  en 9 min 52 s (Vitest 17 288 tests, E2E 382, dérive schéma ↔ migrations
  sans différence, négatif des positions joué parmi les contrats SQL).
- Passe Codex P0 (`wn-codex-avis.mjs --mode revue`, codex-cli
  0.169.0-alpha.11.1, avis conforme) sur `fc67b4af` : 3 P1 et 1 P2,
  **tous corrigés** :
  - P1, dispense « arbitrage sans ligne » étendue à toutes les tables :
    réservée aux tables par usage ; une table ordinaire doit avoir ses lignes.
    Mutation (ligne `contradictions` retirée du contrat) : la nouvelle
    assertion nomme la table.
  - P1, suivi arrêté à `web/` : il couvre tout le dépôt. Contre-épreuve par
    parcours complet en racine temporaire ; mutation réelle
    (`shared/zzRelais.test.ts`) : nommé.
  - P1, `web/scripts/db-deploy.sh` non figé : ajouté aux empreintes, avec
    `prisma:generate` (appelé par le build) ; tout `bash x.sh`/`node x.js`
    lancé par un script figé doit l'être aussi. Mutation : empreinte nommée.
  - P2, constructeur de fonction sans le nommer : `constructor`,
    `prototype`, `__proto__`, `Reflect`, `Proxy` et minuteries refusés, par
    nom ou par clé constante. Limite déclarée : une clé tirée d'une variable.
    Mutation : nommé.

## Problèmes ouverts

- Les quinze autres bancs de garde gardent leur lecture par motif : PR
  séparée à ouvrir (inventaire ci-dessus).
- Deux questions à l'arbitrage, inscrites à la liste commune :
  `20261113-1338-c` (forme de renvoi du registre des compléments, ordinaire)
  et `20261113-1339-c` (« déclarée manquante » hors de la dose, clinique).
- Le contrat des positions ne juge pas la fraîcheur des claims d'appui d'une
  position (l'écran des positions l'affiche « à relire ») : D-480 §5.3 ne
  l'exige pas.
- Limite déclarée de la garde §8 : une variable d'environnement de
  déploiement (`NODE_OPTIONS` chargeur) n'est pas lisible au dépôt ; seule la
  règle des noms nus couvre `NODE_PATH`.
- Le merge propose une release-db (chemin clinique et deux chemins neufs).

## Prochaine action exacte

PR ouverte, CI suivi par `wn-attendre-ci`, revue PR-Agent (sinon
`wn-reviewer`) et passe Codex (`wn-codex-avis.mjs`), verdicts sur la PR,
puis « prête @<sha> ». Ensuite : PR 5 (atelier) dans une nouvelle session ;
la PR séparée d'extension des bancs de garde à inscrire au carnet.

## Interdits encore actifs

- Aucune migration, aucune modification de `schema.prisma`, aucune lecture
  ni écriture des lignes des tables de la PR 2.
- Aucune option, dose, durée, précaution, contre-indication, interaction ni
  libellé rédigé par une session (porte 23, DC-11) ; fixtures neutres.
- Aucune signature : geste du responsable, à la PR 7.
- Aucun lecteur de `creePar` / `validePar` (D-459 §7) ; `LECTEURS_ADMIS`
  reste vide jusqu'aux PR 5 et 6.
- Ne pas reposer D-480, ses trois points de forme ni le découpage ; ni les
  arbitrages BP-17, D-477, BP-14, D-459, F78, BP-12b ; ni l'arbitrage du
  2026-11-13 qui a routé le lien symbolique vers cette PR.
- Production en lecture seule, par conteneur, en agrégats.
