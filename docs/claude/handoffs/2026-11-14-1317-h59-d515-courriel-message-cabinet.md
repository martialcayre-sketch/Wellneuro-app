# Handoff — H59, D-515 §6.2, PR 3 sur 4 : courriel et message au patient sur un instrument du cabinet (2026-11-14)

## 1. Branche et état Git

- Branche `h59-d515-pr3-courriel-message`, worktree `.claude/worktrees/h59-d515-saf-quest-02`, partie d'`origin/main` à `3f7f5d0f` (PR 2, #2112, mergée).
- Release-db de #2112 (run `43592490187`, tête `3f7f5d0f`) : **en attente d'approbation** au moment de l'écriture. Elle a été annoncée à l'intégrateur au registre (message `20261114-1300-a`). La PR 3 ne se merge pas avant que ce run soit passé et le déploiement constaté.
- Ligne de carnet : `h59-d515-code`, file A, état `pris` jusqu'à la PR 4.

## 2. Objectif

Troisième PR du code de [[D-515]] §6.2. Elle ajoute le courriel de [[D-277]] §2 et le message de [[D-277]] §1 sur un instrument du cabinet, lus sur la désignation COPIÉE à l'envoi, derrière `WN_ENABLE_DECLARATION_SUICIDE_CAB` (éteint) et sous `SAF-QUEST-02` signée. C'est un chemin clinique, sans migration. Rien ne change en production : drapeau éteint, table non signée.

## 3. Décisions prises

- **Une seule condition pour le courriel et pour le message.** `designationSuicideCabinetServie` (producteur) sert `{idQuestion, valeurNon}` quand cinq conditions sont réunies :
  - le drapeau est allumé ;
  - l'instrument est un `CAB_` ;
  - la copie vaut « oui » ;
  - la copie est lisible (`lireCopieDesignation`) ;
  - la table est signée.

  `transmissionAppelleAlerteSecurite` n'appelle le courriel d'un `CAB_` que dans ce même cas, quand la valeur transmise diffère de la valeur « non » copiée.
- **Le courriel d'un `CAB_` lit le verrou de signature**, contrairement à celui du catalogue. Il renvoie à une carte du Fil qui ne naît qu'une fois la table signée (plan approuvé : « jamais tant que la table n'est pas signée »).
- **Le courriel d'un `CAB_` ne lit pas le drapeau courant** (contre-revue Codex, P1 ; `wn-reviewer`, P3-1). Le message est décidé au GET et le courriel au POST. Si le drapeau s'éteignait entre les deux, le patient aurait lu « votre praticien sera prévenu » sans courriel. Le correctif tient en deux points :
  - `reponsesSecuriteDeclarees(…, { courrielMalgreDrapeau: true })`, que passe ce seul appelant ;
  - une copie « oui » n'est écrite que drapeau allumé, à l'envoi.

  Le sens inverse, un courriel sans message (drapeau allumé entre-temps), est admis : un courriel de trop vaut mieux. Le constat, la carte et la lettre restent soumis au drapeau courant.

  **Conséquence durable** (`wn-reviewer` sur l'écart, P2-1) : après une extinction volontaire, les `CAB_` déjà envoyés continuent de faire partir le courriel, qui renvoie à un Fil sans carte. Ce point est porté au responsable dans la question `20261114-1335-a` (recommandation : garder ; avis Codex joint : option C, qui garde aussi et prépare l'extinction par un lot dédié).
- **La règle cliente lit ce que le formulaire transmet**, c'est-à-dire `parseFloat`, sans ce qui n'est pas un nombre fini. Elle ne lit pas ce qu'il affiche. Une chaîne non numérique n'est jamais transmise, donc ni courriel ni message. `Infinity` part en JSON `null`, donc ni l'un ni l'autre non plus.
- **Seuls l'identifiant de la question et la valeur « non » sont servis.** Les options, prévues au plan, ne sont pas nécessaires à la règle : toute autre valeur est positive.
- **Les routes du patient ne nomment pas la copie.** Elles passent leur assignation, lue entière, par `designationDeLAssignation`, ajoutée à `designationsCabinetPrisma.ts`. Le banc de la copie le tient.
- **E2E de l'état livré** : drapeau allumé dans le seul webServer Playwright. Le serveur sert l'encart mais pas la désignation, et aucun message n'apparaît, même sur la réponse la plus grave. Le spec change avec la signature (PR 4).

## 4. Fichiers modifiés

- **Serveur** :
  - `web/src/lib/clinical-engine/safetyFindings.ts` (`designationSuicideCabinetServie`) ;
  - `designationsCabinetPrisma.ts` (`designationDeLAssignation`) ;
  - `web/src/lib/securite/alerteSecuritePraticien.ts` ;
  - `web/src/app/api/patient/submit/route.ts` ;
  - `web/src/app/api/patient/questionnaire/route.ts`.
- **Client** :
  - `web/src/lib/securite/urgenceSuicide.ts` (`DesignationSuicideServie`, `estReponseSuicideCabinetPositive`, `questionnaireCabinetPorteReponseSuicidePositive`) ;
  - `web/src/components/patient/GenericQuestionnaire.tsx` ;
  - `web/src/app/portail/[token]/questionnaires/[idAssignation]/page.tsx`.
- **Bancs** :
  - `reponseSuicide.guard.test.ts` (bloc `CAB_`) ;
  - `declarationSuicideCabinet.guard.test.ts` (routes du patient) ;
  - `signauxSecurite.parite.test.ts` (`CAB_`) ;
  - les tests des routes `submit` et `questionnaire` ;
  - `EncartUrgenceSuicide.test.tsx` (désignation servie).
- **E2E** :
  - `web/e2e/portail-cabinet-designation-suicide.spec.ts` ;
  - `web/e2e/helpers/db.ts` ;
  - `web/playwright.config.ts`.
- **Docs** :
  - `docs/FEATURE_FLAGS.md` ;
  - `docs/claude/MATRICE_CONSOMMATION.md`, régénéré : une surface indirecte de plus pour le corpus, par l'import de `safetyFindings` dans la route `questionnaire`.
- **Fragments** :
  - `changelog.d/2026-11-14-h59-d515-courriel-message-cabinet.md` ;
  - `docs/claude/plan-journal/H59/2026-11-14-04-d515-courriel-message-cabinet.md`.

## 5. Validations exécutées

- Bancs ciblés :
  - `src/lib/securite/` et le banc `SAF-QUEST-02` : 92/92 ;
  - routes `submit` et `questionnaire` : 76/76 ;
  - `src/lib/fil/` : 253/253 ;
  - `src/components/patient/` et `src/app/portail` : 2009/2009.
- `npm run check:rapide` : 0.
- **Premier T3** : rouge sur `wn-matrice-consommation.test.mjs` (garde de fraîcheur). La matrice a été régénérée et indexée.
- **`wn-reviewer` P0** : GO, ni P0, ni P1, ni P2. Verdicts de ses P3 :
  - P3-1 (fenêtre du drapeau) : corrigé, avec le P1 de Codex ;
  - P3-2 : routé à la PR 4 ;
  - P3-3 (le helper E2E écrivait la copie à la main) : corrigé, il passe par `copieDesignationSuicide` ;
  - P3-4 (l'E2E ne prouve que l'état non signé) : écarté, c'est voulu, et il s'inverse à la PR 4.
- **Codex P0** (`wn-codex-avis.mjs --mode revue`, conforme) : un P1, la fenêtre du drapeau. Corrigé. Le banc la joue sur les quatre combinaisons GET×POST.
- **`wn-reviewer` sur l'écart** : GO. Ses constats :
  - P2-1 (conséquence durable de l'extinction) : écrit dans la doc et dans le code, et routé vers la question `20261114-1335-a` ;
  - P3-1 (commentaires « exactement » et « mêmes conditions ») et P3-2 (libellé « désignerait ») : corrigés ;
  - test manquant (les `NON_LUES` drapeau éteint) : ajouté.
- **Second T3** : 4 rouges E2E, deux tests sur les deux projets.
  - `dashboard-praticien` (publication d'un instrument) : drapeau allumé, la déclaration est exigée et « publier » reste grisé. Le spec répond maintenant « Non ».
  - `packs-modale-edition` : par ricochet, l'instrument laissé actif par le test expiré passait avant le pack.
- **Troisième T3** : arrêté avant les E2E sur `banc-file-extraction-deux-sessions.test.ts` (« l'import périmé est compté »), un banc de la file des lectures biologiques que le diff ne touche pas. Rejoué seul sur la base locale du worktree, il passe entièrement : l'échec est intermittent, et n'a pas été instruit plus loin.
- **Quatrième T3 (final)** : **vert**, avec la séquence CI complète en 12 min 28 s ; Vitest 17 747 tests ; 392 E2E passés, dont le nouveau spec, `dashboard-praticien` et `packs-modale-edition`, sur les deux projets.
- `npm run check` (T1 complet) : 0 après les corrections.
- **T3 final, `wn-reviewer`, Codex, CI, PR-Agent** : voir le corps de la PR.

## 6. Problèmes ouverts

- **Question `20261114-1335-a`** (courriels après extinction volontaire) : ouverte, à trancher avant la PR 4.
- **Fenêtre GET↔POST, sens restant** : une PR qui retirerait la signature de la table, c'est-à-dire un retour en arrière de la PR 4, déployée entre l'ouverture de la page et la transmission, laisserait un message sans courriel. Ce cas est négligeable, mais il doit être cité à la surface de la PR 4.
- **Définition servie vivante, copie figée** (`wn-reviewer`, P3-2, routé) : si l'instrument est modifié après l'envoi (options renumérotées, identifiant réemployé), le message et le courriel peuvent viser une réponse « non » ou une autre question. C'est fail-closed et cohérent des deux côtés. C'est la conception de [[D-515]] §4, à présenter à la surface de relecture de la PR 4 (faut-il interdire de modifier un instrument qui a des envois en attente ?).
- **Question `20261114-1217-a`** (la garde non prescriptive juge les libellés du praticien) : ouverte, à trancher avant la PR 4.
- **À relire à la signature (PR 4)** :
  - le texte de `LIMITATION_QUESTIONNAIRE_HORS_OPTIONS` pour l'option écartée hors int4 ;
  - l'inscription de la table dans `shaPerimetreLitteral.guard.test.ts` ;
  - la question de `DC-24` sur une passation `CAB_` sans assignation retrouvée ;
  - le spec E2E, à inverser : le message paraît, et la désignation est servie.
- **Étape 3** : recompter les `CAB_` à copie NULL avant l'allumage.

## 7. Prochaine action exacte

1. Donner un verdict à chaque constat de `wn-reviewer` et de Codex, puis jouer le T3 complet.
2. Commit, push, PR (`--body-file`), puis `wn-attendre-ci` en fond, `wn-revue-pr-agent` → 0, et Codex déposé sur la PR.
3. Merge par la file (chemin clinique) après 7 bis et 7 ter, une fois la release-db de #2112 passée. Puis release-db, et constat du déploiement.

## 8. Interdits encore actifs

- Allumage de `WN_ENABLE_DECLARATION_SUICIDE_CAB` : geste du responsable, après les PR 2 à 4 et le recomptage.
- Table `SAF-QUEST-01`, `safetyQuestionnaireTextes.ts` et leur SHA : identiques à l'octet. Textes signés de D-275 et D-277 : mot pour mot.
- Pas de retouche au trigger `adressages_signal_alerte`.
- Ne pas reposer D-303, D-493, D-515, 0027-a à 0030-a, 2148-a, 2023-a à 2025-a, 1807-a ni 1112-a ; ne pas trancher `20261109-1354-c`.
- Pas de `prisma format`, pas de SQL manuel en production (D-087).
- Production en lecture seule, par conteneur, en agrégats.
