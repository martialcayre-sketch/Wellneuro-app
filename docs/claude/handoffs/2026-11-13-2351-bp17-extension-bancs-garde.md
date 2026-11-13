# Handoff — 2026-11-13 — file C, lot `bp17-extension-bancs-garde` : bancs de garde sur le parseur et la résolution

## Branche et état Git

- Branche `feat/bp17-extension-bancs-garde`, worktree `bp17-garde`, créée
  depuis `origin/main` (`904caeed`, merge de #2082), avancée en `--ff-only`
  avant la première édition (branche vide).
- Fusion de `origin/main` (`28fb690c`, #2087, #2086, #2076, #2089) sur
  arbitrage du responsable dans la session : aucun fichier commun ;
  `merge-tree` propre ; seul `web/package.json` bougeait côté `main`, sur un
  script non figé (`bancs-outillage-check`).
- PR ordinaire, déclarée « prête @<sha> », mergée par l'intégrateur (D-373,
  D-454). Ni migration ni `schema.prisma`. Elle touche
  `web/src/lib/clinical/bundleClient.guard.test.ts`, sous le chemin
  déclencheur de `release-db` : son merge **propose une release-db**, sans
  changement de base. L'approbation reste humaine.

## Objectif

Étendre aux autres bancs de garde ce que `importeurs.guard.test.ts` (D-480
§8) avait reçu à la PR 4 :
- la résolution `resolveModuleName` avec les options de `web/tsconfig.json`,
  liens symboliques suivis ;
- les verrous de configuration ;
- la règle des noms nus ;
- la lecture par le parseur.

Contrainte : sans élargir ni restreindre aucune liste admise.

## Décisions prises

Choix de forme de la session, dans le cadre routé par la PR 4. Aucun ne
touche au clinique.

- **Pièces communes.**
  - `web/src/lib/bio-parcours/resolutionImports.ts` est extrait du banc de la
    bibliothèque. Il porte `fichierAtteint`, `nomNuInconnu`,
    `segmentsInterditsDuDossier`, `contexteResolution`, `importsResolus`,
    `designe`, `atteintSous`, `atteintLePaquet` et `hoteEnMemoire`.
  - Les trois verrous de configuration passent **à l'identique** dans
    `bio-parcours/resolutionImports.guard.test.ts`, puisqu'ils valent pour
    tous les bancs qui résolvent. Ce sont la chaîne de lancement, les
    configurations de résolution et `next.config` évalué.
  - `importeurs.guard.test.ts` importe le module commun. `LECTEURS_ADMIS`
    n'est pas touché.
- **Imports de type seul.** `importsSyntaxiques` les marque : `import type`,
  noms tous en `type`, `export type`, `import type X = require`,
  `typeof import`.
  - Les bancs qui exemptaient `import type` par regex exemptent ces formes.
  - Les bancs qui comptaient tout comptent encore tout.
  - Un verrou neuf refuse `verbatimModuleSyntax`, `preserveValueImports` et
    `importsNotUsedAsValues`. Ces options feraient d'un import tout en
    `type` un import latéral qui charge le module.
- **Règle commune.** Un import non constant, ou un nom nu ni dépendance
  déclarée ni module natif, est « indéterminé ». Chaque banc le traite comme
  un lecteur possible, ou comme `inconnu · client` pour `sitesAppelIa`.
  - Sur un faux rouge (`server-only`, un paquet de types), la sortie est de
    **déclarer la dépendance**, jamais d'assouplir la règle. C'est écrit dans
    le module.
- **Lecture par mot gardée.** `meteo-praticien-seul` et `matierePriorite`
  testaient un mot sur le texte, ce qui est plus large que l'import. La
  lecture par le parseur s'**ajoute** à la leur, qui reste. De même :
  - les sous-chaînes interdites de `propositionObjectif` et de
    `comprehensionAppendOnly` ;
  - la détection textuelle des appelants du modèle dans
    `reserveMarqueurAntiLdl`.
- **Écarté** : `clinical-engine/evaluerAbstentionImporteurs`. Il cherche un
  nom de symbole par `git grep`, pas un import.
- **Durcissement noté** (question de `wn-reviewer`) : `appelantsLlmBiologie`
  exige le vérificateur importé **en valeur**, chemin atteint égal au
  fichier, casse comprise. Aucun importeur n'existe aujourd'hui. Le
  durcissement est voulu : un `import type` ne vérifie rien.
- **Coût.** Sous Vitest, chaque import nommé de `typescript` coûtait un accès
  par l'espace de noms à chaque appel. Liées une fois au chargement, les
  fonctions ramènent le parcours de `web/src` de 77 s à 14 s, mesuré sous
  une charge machine de 31.
  - Sur la même charge, `importeurs.guard` passe de 63 s à 32 s.
  - Les 29 fichiers de bancs touchés passent en 9 s à faible charge.
  - Cela répond à la note de l'intégrateur au merge de #2082 :
    `importeurs.guard` était rouge sous charge dans le contrôle de fusion.

## Fichiers modifiés

- **Nouveaux :**
  - `web/src/lib/bio-parcours/resolutionImports.ts`
  - `web/src/lib/bio-parcours/resolutionImports.guard.test.ts`
- **Outillage :** `web/src/lib/bio-parcours/balayageSources.ts`.
- **Banc de la bibliothèque, raccordé :**
  `web/src/lib/bibliotheque-options/importeurs.guard.test.ts`.
- **Bancs migrés :**
  - `web/src/lib/bio-parcours/` : `importeursBiologyLibrary`,
    `bioflowPublie`, `catalogueConduitesSepare`, `appelantsLlmBiologie`,
    `cheminDocumentaire` ;
  - `positions-expert/ecritures`, `atelier-bibliotheque-options/ecritures` ;
  - `equilibre/frontierePortail`, `equilibre/natureIndiceGlobal` ;
  - `fiches-assiette/catalogue`, `fiches-usage/reserveMarqueurAntiLdl` ;
  - `clinical/bundleClient`, `gamification-patient`, `auth.roles` ;
  - `comprehensionAppendOnly`, `praticien/propositionObjectif` ;
  - `sitesAppelIa`, `meteo-praticien-seul`, `objectif/matierePriorite`.

  Tous sont des `*.guard.test.ts` sous `web/src/lib/`.
- **Documentation :**
  - `changelog.d/2026-11-13-bp17-extension-bancs-garde.md` ;
  - `docs/claude/plan-journal/F11/2026-11-13-04-extension-bancs-garde.md` ;
  - ce handoff.

## Validations exécutées

- **Mutations réelles.** Chaque banc migré a été vu rouge sur une mutation
  que l'ancienne lecture ne voyait pas, jouée puis retirée (fichiers
  restaurés depuis une copie, `git status` vérifié). Le fautif était nommé
  chaque fois.
  - Lien symbolique `zzdetour → biology-library` : `importeursBiologyLibrary`,
    `bioflowPublie`, `cheminDocumentaire`.
  - Lien de fichier vers le catalogue ou le client du modèle :
    `catalogueConduitesSepare`, `appelantsLlmBiologie`.
  - Import relatif : les deux bancs d'écritures, `gamification-patient`.
  - Commentaire glissé : `frontierePortail`.
  - Import latéral entre guillemets doubles : `fiches-assiette/catalogue`.
  - `require` concaténé : `reserveMarqueurAntiLdl`, `auth.roles`,
    `propositionObjectif`, `sitesAppelIa`.
  - `import()` dynamique d'un composant client : `bundleClient`.
  - `require` dans une feuille : `comprehensionAppendOnly`,
    `natureIndiceGlobal`.
  - Ré-export sur plusieurs lignes : `meteo-praticien-seul`.
  - `export … from` dans une feuille : `matierePriorite`.
- **Dépôt actuel.** Aucun banc ne rougit une fois migré : pas de constat.
- **Suites et contrôles :**
  - les 29 fichiers de bancs touchés (dont tout `bio-parcours/`) : 380 tests
    verts, rejoués après la fusion et les correctifs de revue ;
  - `tsc --noEmit` : 0 ;
  - `npm run check:rapide` (T1) : vert.
- **Revue `wn-reviewer` (P1, garde-fous)** : **GO**, sans P0 ni P1. Cinq P2,
  tous **corrigés** :
  - `typeSeul` est lié à l'absence de `verbatimModuleSyntax` (verrou neuf) ;
  - le nom de paquet est poussé sans barre finale pour les SDK ancrés
    (`ai$`…) ;
  - le paquet atteint hors du dépôt est reconnu quand `node_modules` est un
    lien symbolique (`atteintLePaquet`), comme dans le contrôle de fusion ;
  - la racine d'un `@/components/x` non résolu est conservée ;
  - la sortie d'un faux rouge des noms nus est documentée.

  Contre-épreuves ajoutées : `import { type X }` dans les deux bancs
  d'écritures, et un alias vers l'entrée publiée dans `bioflowPublie`.

## Problèmes ouverts

- **Question de `wn-reviewer`, non tranchée.** Aucun banc ne vérifie que
  `balayageSources.ts` et `resolutionImports.ts`, outillage des bancs sous
  `web/src`, ne sont importés par aucun module de production. À poser avec
  le prochain lot de garde, ou à la PR 6.
- **Périmètres inchangés.** Plusieurs bancs balaient `web/src` seul, là où le
  banc de la bibliothèque balaie tout `web/` (worker et cron compris). Les
  étendre élargirait ce qu'ils jugent, et peut-être leur liste admise : hors
  de ce lot, à proposer s'il le faut.
- **Suivi des imports de test.** Seul le banc de la bibliothèque suit un
  fichier de test ou ignoré qu'importe la production. Les autres partent des
  sources de production, comme avant.
- **Release-db proposée** au merge (`clinical/bundleClient.guard.test.ts`
  sous le chemin déclencheur), sans changement de base.
- **Registre des messages.** La ligne `20261113-2237-integrateur-c` est
  passée à `traite` à la déclaration « prête », puisque la note qu'elle
  portait (rouge d'`importeurs.guard` sous charge) reçoit sa réponse ici.

## Prochaine action exacte

1. Ouvrir la PR, attendre le CI (`wn-attendre-ci`), puis la revue PR-Agent.
2. Déclarer « prête @<sha> » à l'intégrateur : commentaire de PR, ligne
   `prete` au registre, `pr` dans la ligne du carnet.
3. Prendre le lot `pret` suivant de la file C.

## Interdits encore actifs

- Ni migration ni `schema.prisma`. Aucun texte clinique.
- Aucune liste admise élargie sans le dire dans la PR. `LECTEURS_ADMIS` de
  la bibliothèque n'est pas touché : le cockpit de la PR 6 y entrera.
- Ne pas reposer D-480, D-514 ni le découpage BP-17.
- Les P3 et les bancs manquants de l'écran de l'atelier (#2082) sont routés
  vers la PR 6 (cockpit), hors de ce lot.
- Production en lecture seule, par conteneur, en agrégats.
