# Handoff — 2026-11-12 — BP-05 (LOT-05, F20) : code consommateur du contexte de prélèvement (D-497 §8.3, PR 3)

## Branche et état Git

`feat/bp05-code-contexte-prelevement` tourne en session concurrente, dans le worktree `.claude/worktrees/b-bp05-migration`. Elle est créée sur `origin/main` après le merge de #2018 (c85853730), puis avancée par `--ff-only` jusqu'à `a84e5a697`. **Arbitrage du responsable du 2026-11-12** : `origin/main` (`470700859`, #2025 à #2044, sans conflit) est mergé dans la branche pour corriger le constat « données périmées » de PR-Agent. La PR ne contient ni migration ni `schema.prisma`, et ne touche pas `web/src/lib/clinical/**` : aucune release-db n'est due. Régime : déclarée « prête @<sha> » à l'intégrateur.

## Objectif

Écrire le code qui se sert de la table `contextes_prelevement`, appliquée et constatée par conteneur le 2026-11-12 :
- recueil du contexte à la saisie d'un bilan et à la validation d'un import ;
- deux absences distinctes à l'écran ;
- motifs de la série ;
- effacement sans tolérance ;
- ramassage E2E en une transaction ;
- texte patient publié dans le même déploiement ;
- aucun drapeau neuf.

## Décisions prises

- **Arbitrage du responsable du 2026-11-12** : Conditions v6 et e-mail `conditions_utilisation@6` en **versions courtes**. Leurs textes sont en B1 et B2 de `docs/claude/propositions/2026-11-12-bp05-texte-patient/README.md` ; l'énumération reste dans le texte patient complet (v23).
- **Arbitrage du responsable du 2026-11-12** : BP-13 en **affichage en ligne**.
  - Les déclarations du dossier s'affichent à côté du bloc, en lecture seule, datées, sous le drapeau BP-13 (le 503 masque l'encart).
  - Elles ne préremplissent rien. Aucune n'est recopiée ni lue comme l'état au prélèvement.
- La saisie unitaire neuve écrit une ligne à « inconnu » (D-497 §4 : « une ligne ajoutée plus tard reçoit sa propre ligne »). Une correction n'en écrit pas : elle garde le contexte de sa racine.
- Le moment de la journée vaut « inconnu » tant qu'aucune heure n'est lue sur un compte rendu, saisie praticien comprise (D-497 §3).
- Champs comparés sans conversion : 24 h et 1 jour sont « différents ».
- Le bloc vit dans `web/src/components/biologie/`, sous la frontière BioFlow (D-306), avec une entrée motivée dans les deux listes blanches (importeurs de `biology-library`, lecteurs BP-13 de D-335 §8).
- `publieLe` vaut **2026-11-12** pour la v23, les conditions v6 et la @6.

## Fichiers modifiés

- Module pur `web/src/lib/biology-library/contextePrelevement.ts` et son banc (neufs). `saisieMessages.ts` (`contexte_invalide`).
- Écritures :
  - `api/praticien/biologie/resultats/bilan/route.ts` ;
  - `resultats/route.ts` (écriture unitaire et lecture de la tête, `heureLue`) ;
  - `lib/biology-library/import/decisions.ts` et `import/decisions/route.ts`.
- Série : `serieParAnalyte.ts` (contexte de la racine, `contexte_non_renseigne` conditionné, `contextes_differents`).
- Écrans :
  - `components/biologie/BlocContextePrelevement.tsx` (neuf) ;
  - `patient-cockpit/SaisieBilan.tsx`, `EstimeMesurePanel.tsx` (`ContexteDuPoint`) ;
  - `ImportCompteRenduPanel.tsx`. **Correctif d'un défaut antérieur** : les clés des trois `<details>` frères sont préfixées. Le rendu de plus du `useEffect` dupliquait sinon les lignes.
- Effacement : `lib/patient/effacement.ts` et son banc (la tolérance `to_regclass` est retirée).
- Banc à vraie base : `web/scripts/banc-decisions-atomicite-prisma.test.ts` (ménage des contextes, deux assertions).
- E2E : `web/e2e/helpers/db.ts` (`nettoyerResultatsBiologiques` en une seule `$transaction`, contextes d'abord) et `biologie-saisie-resultats.spec.ts` (cas neuf « À jeun : oui »).
- Texte patient :
  - `lib/trust/contenus/registre.ts` (v23, conditions v6) ;
  - `lib/correspondance/registreGabarits.ts` (@6) ;
  - les bancs des deux.
- Bancs mis à jour :
  - gardes `importeursBiologyLibrary.guard`, `lecteursPhysioTraitements.guard` ;
  - fiche LOT-05 : rubrique « Reste après la PR 3 » ;
  - `doctrine/seuilsLitterauxMotives.guard` : exemption motivée de `v <= 2147483647`, la capacité du type INTEGER et non une borne clinique (le premier T2 a rougi sur elle) ;
  - routes, série, panneaux.
- Docs :
  - proposition (B1, B2, ancre précisée) ;
  - `docs/DOSSIER_RGPD.md` (état de la migration, publication) ;
  - fiche LOT-05 (statut) ;
  - `plan-journal/F20/2026-11-12-03-…` ;
  - `changelog.d/2026-11-12-bp05-code-contexte-prelevement.md` ;
  - ce handoff.

## Validations exécutées

- Vitest ciblé sur les dossiers touchés : 3176 verts, 28 sautés.
- `npx tsc --noEmit` passe (code 0).
- T1 rapide passe (16 étapes vertes).
- Premier T2 : rouge sur un seul test (garde des seuils littéraux), corrigé par l'exemption motivée. Second T2 arrêté avant les E2E, pour laisser passer les correctifs de la revue.
- `wn-reviewer` (P1) sur le diff non commité : **GO sous conditions** (T1, T2 et T3 verts ; dette routée ; constat 1 tranché). Verdicts :
  - **constat 1**, une série sans aucun motif : **corrigé**. Le pied dit « aucun motif connu de non-comparabilité ; la série n'est pas déclarée comparable » (D-497 §5, DC-24), avec un banc ;
  - **constat 2**, un contexte recopié à tort : **corrigé**. Le brouillon repart à « inconnu » si la date change après un succès, deux bancs. La dette « écran de correction » est **routée** à LOT-05 (« Reste après la PR 3 ») et au fragment F20 03 ;
  - **constat 3**, aucune preuve sur une vraie base pour l'import et la saisie unitaire :
    - **import corrigé** : T3 l'a révélé. Le banc à vraie base `scripts/banc-decisions-atomicite-prisma.test.ts` appelle `deciderLignes`, et son ménage rougissait (FK `contextes_prelevement_id_resultat_fkey`) ;
    - ce banc supprime maintenant les contextes avant les résultats, et vérifie deux choses : une course annule aussi le contexte, et le témoin écrit une ligne à « inconnu » sur sa racine, ce qui prouve le trigger ;
    - **saisie unitaire, écartée avec motif** : même forme imbriquée que le bilan, que l'E2E prouve ;
  - **constat 4**, encart BP-13 sur une forme inattendue : **corrigé**. Filtrage élément par élément, deux bancs (élément malformé, fetch rejeté) ;
  - **nitpicks** :
    - `useId` pour le titre de l'encart : corrigé ;
    - `console.error` sans valeur sur une tête illisible : corrigé ;
    - renvoi §3 → §2 dans l'exemption : corrigé ;
    - message absent sous un champ « Renseigné » vide : d'abord écarté, puis **corrigé** quand PR-Agent l'a signalé aussi (voir plus bas) ;
    - « heure lue » après une heure modifiée à la validation : écarté, D-497 §3 lit `heureLue` et ne prévoit pas cette nuance ;
  - **questions** :
    - Q1 : traitée par le constat 1 ;
    - Q2 : la validation de B1 et B2 est la réponse du responsable en session (question à options du 2026-11-12), consignée dans la proposition ;
    - Q3 : la date `publieLe` se vérifie au moment de déclarer la PR « prête » (problème ouvert ci-dessous).
- Après les correctifs : 2471 tests verts sur les dossiers touchés.
- T3 complet vert sur `cea1fe63` (9 min 26 s, 370 E2E) ; T1 complet vert ; CI de #2038 vert (`wn-attendre-ci` → 0).
- PR-Agent sur `cea1fe63` : revue **partielle**, 22 fichiers exclus faute de budget (`wn-revue-pr-agent` → 1). Recours : `wn-reviewer` sur la tête (D-448). Son seul constat, « blocage silencieux », est **corrigé** :
  - `messageJourCycle` et `messageDelai` disent sous le champ chaque cas où l'envoi attend (vide, illisible, trop grand selon le validateur du serveur) ;
  - le délai porte désormais `aria-describedby` ;
  - un banc vérifie, cas par cas, qu'un message nul équivaut à un contexte envoyable.
- `wn-reviewer` sur la tête `90089682`, diff complet, en recours de PR-Agent : **GO**. Verdicts :
  - **1**, deux lectures BP-13 journalisées quand deux blocs sont montés : **écarté**. Chaque lecture est réelle et affichée, le journal dit vrai ; mutualiser l'appel toucherait `EstimeMesurePanel` sans bénéfice pour le patient ;
  - **2**, un contexte « Renseigné » vide bloque aussi un envoi qui ne fait qu'écarter des lignes : **écarté**. Le cas est rare, le message dit quoi faire (« Inconnu »), et l'écarter évite de toucher le contrôle du serveur ;
  - **3**, message d'import imprécis pour « trop grand » : **corrigé**, il renvoie au message sous le champ ;
  - **4**, source BP-13 hors liste affichée « undefined » : **corrigé** (`?? NON_RENSEIGNE`) ;
  - **5**, espace supprimé sur une ligne voisine de la garde des seuils : **corrigé**, la ligne retrouve son état de `main` ;
  - **6**, assertion E2E « non recueilli » à 0 : **écartée**. T2 et T3 provisionnent une base éphémère neuve, et le seed n'écrit aucun résultat de biologie ;
  - **Q1** et **Q2**, moment de la journée : **routées au responsable**, voir Problèmes ouverts. **Q3**, validation de B1 et B2 : donnée par le responsable en session, sur question à options.
- Validations de l'écart `90089682` → `f49e810b` (4 lignes de code, trois fichiers) :
  - T2 était vert sur `90089682` (370 E2E) ;
  - sur l'écart, trois T2 ont rougi, chaque fois seulement sur des tests chronométrés de fichiers hors du lot (`ProtocolMiniBuilder` à 5 s, `masquage` linéaire). La machine était chargée : charge 15 à 20, une autre session en T2 et build, `fseventsd` à 99 % ;
  - ces deux fichiers passent seuls (258 tests) ; T1 complet vert ; CI de `f49e810b` vert sur un runner propre.
- PR-Agent sur `f49e810b`, toujours partiel (24 fichiers exclus). Verdicts :
  - « blocage silencieux » : déjà **corrigé** dans `90089682`. Il reste marqué actif parce que PR-Agent l'a vu pour la dernière fois sur `cea1fe63` ;
  - « données périmées » : **corrigé** après le merge de `main`. Si le dossier change sans remontage et que la nouvelle lecture échoue, l'encart BP-13 pouvait garder les déclarations du dossier précédent. `key={idPatient}` le remonte à chaque dossier, et un banc couvre le cas (lu, puis 503 sur l'autre dossier).
- Après le merge de `main` et `key={idPatient}` :
  - T2 lancé machine calme (charge 4,6) : rouge, encore sur le seul `ProtocolMiniBuilder` (5 s). La suite unitaire a pris 142 s au lieu de 73 ;
  - c'est le quatrième rouge chronométré de suite, hors du lot, sur ce Mac, avec `fseventsd` durablement à 99 %. La passe complète de la tête est celle du CI ;
  - T1 complet : voir la PR.

## Problèmes ouverts

- **`publieLe` = 2026-11-12** : si le merge tombe un autre jour, il faut ajuster la date de la v23, des conditions v6 et de la @6. Les empreintes du registre et du gabarit couvrent leur contenu et sont à recalculer dans ce cas, avec les bancs.
- **L'envoi de l'e-mail `conditions_utilisation@6` est le geste du responsable**, après le déploiement.
- Corriger un contexte (remplacer la tête) n'a **pas encore d'écran**. La base l'accepte, aucun code ne l'écrit. Dette routée à LOT-05.
- Libellé du pied de série vide (constat 1) : le responsable peut l'amender.
- **Question au responsable, moment de la journée** (revue de tête, Q1 et Q2) :
  - D-497 §5 ne fait pas de l'heure un motif. Une série matin/soir (cortisol, par exemple) dont les sept champs sont connus et égaux affiche donc « aucun motif connu de non-comparabilité ».
  - Un point saisi au cockpit avec son heure affiche « Moment de la journée : inconnu (aucune heure lue sur un compte rendu) », à la lettre de §3.
  - À trancher : faut-il un motif « heures de prélèvement différentes » (décision), ou le laisser à BP-27 ?
- Le bloc n'apparaît ni dans la saisie unitaire ni dans la correction (périmètre de D-497 §4).
- Aucune lecture du contexte dans l'export ni dans la synthèse (hors périmètre de la fiche, part B de H95).

## Prochaine action exacte

1. PR #2038 : CI de la tête finale (`wn-attendre-ci`), revue `wn-reviewer` de l'écart sur cette tête (PR-Agent reste partiel), un verdict pour chaque remarque.
2. D-503 : lire la boîte B du registre des messages, y écrire une ligne `prete` pour l'intégrateur, puis commenter « prête @<sha> » sur la PR.
3. Au merge, si la date a changé : recaler `publieLe` et les empreintes avant de déclarer de nouveau.
4. Après le déploiement : le responsable envoie la @6.

## Interdits encore actifs

- Jamais `npx prisma format` ; ni migration ni `schema.prisma` dans ce lot.
- Aucune borne, catégorie ni comparaison à une consigne de `biology_preanalytics` ; aucun verdict de conformité ; le contexte n'est jamais « complet ».
- Aucune déclaration BP-13 recopiée ni interprétée comme l'état au prélèvement.
- Production en lecture seule, par `scalingo run -d`.
- Aucun seed ni E2E sur un dossier réel ; fixtures Sophie Nicola, Jennifer Martin, Michel Dogné.
- Ne pas toucher à t71b (worktree `t71b-cadrage`), t51, r4_01, #2006 (BP-17), t78.
