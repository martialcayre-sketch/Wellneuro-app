# Handoff — 2026-11-14 — Refonte Lien / Empreinte, PAT-6 seconde partie : Q2a et Q3a codées (T-36 sous le 401 de dépôt et d'enregistrement)

## Branche et état du dépôt

- Branche `claude/refonte-lien-pat6-reconnexion-2d8949`, dans le worktree `.claude/worktrees/festive-euclid-5b8aff` (session lancée par la session PAT), avancée par `--ff-only` jusqu'à `origin/main@71efdcb3` (correctif du banc, #2143, compris) avant le commit.
- Code patient et E2E seuls ; aucun fichier `app/api/**`, `prisma/schema.prisma`, migration, drapeau, ni texte de consentement, de droits ou de sécurité. Fichiers COM-0 intacts (`FormulaireTraitement` reçoit T-36 par sa prop `erreur`, déjà là). La session ne merge pas : l'intégrateur merge sur « prête @<sha> ».

## Objectif

Coder Q2a et Q3a du prototype PAT-6 ([[D-481]] complément DOC-11, Q2, Q3 et précisions du responsable ; [[D-488]] amendement DOC-11), après la garde serveur du dossier de la page (#2125, DOC-12).

## Décisions prises

- Q2a, U33 et U34 : un dépôt refusé en 401 ne fait plus `router.replace`. La page garde le fichier (et la catégorie sur U33), ne relit pas la liste (la relecture renverrait à l'entrée), et affiche sous le bouton le message de la route (`data.error`, « Session expirée. Reconnectez-vous. »), puis `LienReconnexion nouvelOnglet`. Repli si le corps est illisible : le même message, `MESSAGE_SESSION_EXPIREE` (`app/portail/[token]/textesEntree.ts`), pour que T-36 ne paraisse jamais sous une autre phrase (remarque PR-Agent de #2146) ; un banc tient son égalité avec le texte de `lib/trust/portailAuth.ts`. Le chargement et l'accusé de U34 gardent leur renvoi silencieux.
- Q3a, U35 : `message` de `DeclarationsPatient` porte `reconnexion`, vrai seulement sur 401 ET `onSessionExpiree` passé (page de la fiche seule, via `DeclarationsDeLaFiche`) ; T-36 suit le message à l'ancre (Q5a), ou en tête si l'ancre a disparu. U07 ne change pas.
- Q3a, U39 : `erreur.reconnexion` sur 401, T-36 dans l'accordéon du choix, sous le message. U40 : `sessionExpiree` sur 401, T-36 sous le message, dans les trois formulaires ; remis à faux au renvoi, à l'annulation et à la réinitialisation.
- T-36 ne paraît qu'avec son message (correctif de PAT-5) ; les autres refus ne le proposent pas ; rien n'est renvoyé automatiquement.
- E2E : la session expire par `clearCookies({ name: wn_portail })`, pour garder la session praticien qui écarte les comptes rendus (seul nettoyage admis). Les choix et incidents écrits par le parcours sont effacés par identifiant (helpers `idsEcrituresTrust`, `effacerEcrituresTrustNeuves`), jamais tout le dossier. Finalité jouée : « Communications non essentielles », pour ne pas toucher le partage avec le médecin traitant dont dépend le courrier.

## Fichiers modifiés

- `web/src/components/patient/collecte/DepotDocuments.tsx`, `web/src/components/patient/biologie/TransmissionCompteRendu.tsx`.
- `web/src/components/physio-traitements/DeclarationsPatient.tsx`, `web/src/components/patient/trust/MesChoix.tsx`, `web/src/components/patient/trust/SignalerProbleme.tsx`.
- `web/src/components/patient/LienReconnexion.tsx` (commentaire seul).
- `web/src/app/portail/[token]/textesEntree.ts` (`MESSAGE_SESSION_EXPIREE`, texte existant de D-488) et son banc `web/src/components/patient/LienReconnexion.messageSession.test.ts`.
- Bancs neufs `*.reconnexion.test.tsx` sur les cinq composants.
- `web/e2e/portail-reconnexion-transmissions.spec.ts` (neuf), `web/e2e/helpers/db.ts` (deux helpers).
- `changelog.d/2026-11-14-refonte-lien-pat6-reconnexion.md`, ce handoff.

## Validations exécutées

- Vitest ciblé (collecte, biologie, trust, physio-traitements) : 20 fichiers, 90 tests verts ; les cinq bancs neufs : 20 tests verts.
- T1 rapide : 16 étapes vertes, 3 sautées (après `prisma generate`, absent du worktree neuf).
- T2, première passe (`npm run test:worktree -- --fast`, sur `18c57d30` plus le diff) : ROUGE avant les E2E. Vitest vert (1 038 fichiers, 17 937 tests). Échec sur le banc à deux sessions `web/scripts/banc-envoi-cabinet-deux-sessions.test.ts` (NF-7, H59), erreur exacte : « ÉCHEC du banc de l’envoi d’un instrument du cabinet : Expected values to be strictly equal: 409 !== 200 ». Hors lot : le banc joue les handlers praticien `api/praticien/file-envoi/envoyer` et `api/praticien/instruments` contre PostgreSQL ; le diff ne touche ni ces routes ni rien qu'elles importent (composants du portail patient et E2E seulement). Le même banc est vert au job CI de `main@304e5709` (run « CI » du 2026-11-14, conclusion `success`). Course forcée par verrous, jouée pendant que d'autres sessions chargeaient la machine : cause non établie, aucune occurrence observée ailleurs. Le détail de la course échouée n'est pas connu (sortie du banc redirigée vers `/dev/null` par le script).
- T2, seconde passe (`--fast --keep-db`, sur `304e5709` plus le diff) : ROUGE à un autre endroit, plus tôt : Vitest, 9 fichiers et 30 tests en échec sur 17 991 (dont 18 « Test timed out »), en 545 s contre 201 s à la première passe, charge machine de 27 à 35 relevée à la fin. Fichiers en échec : `anamneseMessageSuicide`, `FichePatientPanel`, `ProtocolMiniBuilder`, `GenericQuestionnaire`, `MessageReponseSuicide`, trois gardes de source (`cockpit.guard`, `replisAssietteV1.guard`, `seuilsLitterauxMotives.guard`) et les bornes de temps de `export-dossier/masquage`. Aucun n'appartient au diff, et tous étaient verts à la première passe. Le banc `banc-envoi-cabinet` et les E2E n'ont pas été atteints. Pas de troisième passe : signalé à la session PAT.
- Cause de la seconde passe, relevée par la session PAT : un autre T2 tournait en même temps sur le Mac (worktree `h59-d515-saf-quest-02`, charge 31 sur 5 min), alors que les E2E sont exclusifs au Mac.
- T2, troisième passe (`--fast --keep-db`, sur `6c46405a` plus le diff), lancée à 22 h 49 après la fin de ce run, sur une machine calme (plus aucun `wn-test-worktree.sh`, charge 6,8 sur une minute) : ROUGE dans Vitest, 2 tests sur 17 991, tous deux dans `src/components/patient-cockpit/ProtocolMiniBuilder.test.tsx` (« le comptage pendant la composition », cas « 4 typées + 3 suspendues » et « 7 typées »). Erreur : « Test timed out in 5000ms ».
  - Pendant la passe, deux autres `wn-test-worktree.sh --fast` ont démarré (pids 33698 et 37825), plus un Vitest d'un autre worktree ; la charge est remontée à 20.
  - Rejoué seul, le fichier est vert (102 sur 102, 27,7 s). Le diff ne touche rien sous `patient-cockpit`.
  - Ni le banc `banc-envoi-cabinet` ni les E2E n'ont été atteints.
- T2, quatrième passe (`--fast --keep-db`, sur `983f956e` plus le diff), lancée à 23 h 20 au calme : aucun autre `wn-test-worktree.sh` au démarrage ni 30 s plus tard, et le seul run relevé chaque minute ensuite était le sien ; charge de 4,3 à 16,4 sur une minute.
  - Vitest vert : 1 038 fichiers, 17 941 tests. `banc-envoi-cabinet` vert.
  - ROUGE sur `web/scripts/banc-file-extraction-deux-sessions.test.ts`, cas 11 (fantômes), avec l'erreur exacte : « ÉCHEC du banc de la file : l’import périmé est compté ».
  - Hors lot : ni le banc ni `lib/biology-library/import/fileExtraction.ts` ne sont touchés par le diff ; ils n'ont pas changé depuis #1837 et #1897.
- Instruction du rouge de la quatrième passe (démontré dans le code, une seule occurrence observée).
  - Le déclencheur `bio_ingest_import_avant_insertion` pose `lance_le := clock_timestamp() AT TIME ZONE 'UTC'` dans une colonne `timestamp(3)`.
  - L'arrondi à la milliseconde la plus proche place `lance_le` jusqu'à 0,5 ms dans le futur. Sur la base gardée, c'est le cas 5 796 fois sur 10 000 lectures de `clock_timestamp()` arrondies puis comparées à la lecture suivante.
  - `reconcilierFantomes(0)` exige `lance_le < clock_timestamp() - 0 ms`. Appelée dans cette demi-milliseconde après l'insertion, elle ne compte rien et l'assertion tombe : une course du banc, plus probable sur une machine rapide.
  - Une première hypothèse, le fuseau `Europe/Brussels` du cluster éphémère, est écartée : le déclencheur écrit en UTC.
  - Rejoué seul sur la base gardée, le banc est vert deux fois (fuseau du cluster, puis `PGTZ=UTC`).
  - Correctif possible, hors lot et à router : une péremption injectée d'au moins 1 ms dans le cas 11.
- T2, cinquième passe (`--fast --keep-db`, sur `0045026a` plus le diff), lancée à 23 h 39 au calme : aucun autre run au démarrage ni 30 s plus tard ; charge de 4,5 à 9,4 sur une minute.
  - Vitest vert : 17 941 tests.
  - ROUGE sur `banc-envoi-cabinet-deux-sessions.test.ts`, avec l'erreur de la première passe : « 409 !== 200 ».
- Instruction du rouge de `banc-envoi-cabinet` (démontré dans le code ET observé : 5 échecs sur 10 exécutions seules, base gardée, machine calme).
  - Le banc ne touche aucune route de la garde de #2125 : il ne joue que `api/praticien/file-envoi/envoyer` et `api/praticien/instruments`, alors que la garde ne couvre que cinq routes `api/portail/**`.
  - L'assertion en échec est celle du cas 10 (`édition du titre 10`, ligne 668) : à chaque échec, les cas 1 à 9 passent, puis l'édition du titre reçoit 409.
  - Cause : #2130 (`h59-d515-garde-publication`, mergée le 2026-11-14 à 21 h 14) a ajouté au PATCH de `api/praticien/instruments`, drapeau `WN_ENABLE_DECLARATION_SUICIDE_CAB` allumé (le banc l'allume), une écriture conditionnelle `updateMany … where updatedAt = <lu>`. Elle refuse en 409 « L’instrument a été modifié entre-temps » quand l'instrument a bougé depuis la lecture.
  - Le cas 10 joue exactement ce scénario (lecture V1, puis V2 publiée « non » par un tiers avant l'écriture) et attend toujours 200.
  - L'issue dépend de l'égalité à la milliseconde entre `updated_at` posé à l'insertion de la fixture et `now()` de la transaction du tiers, ouverte juste après. Égales : l'écriture passe (200). Distinctes : 409. D'où environ un échec sur deux.
  - Le vert au CI de `main` et de #2130, et celui de la quatrième passe, sont des tirages favorables.
  - Le défaut est sur `main`, hors du diff et hors du lot. Il est à router à la file H59 (#2130), qui doit trancher si le cas 10 attend désormais 409 ou si la route doit écrire le seul titre.
- Suspension : sur décision du responsable (« Attendre le correctif »), aucune passe jusqu'au correctif du cas 10, #2143 (`ab1dadbf`, le cas attend désormais le 409 de #2130, pose reculée d'une seconde).
- T2, sixième passe (`--fast`, sur `71efdcb3` plus le diff), lancée le 2026-11-15 à 10 h 50 au calme : aucun autre `wn-test-worktree.sh` au démarrage ni 30 s plus tard, puis le sien seul ; charge de 5,7 à 13,7 sur une minute. VERTE, en 17 min.
  - Vitest : 1 038 fichiers, 17 941 tests.
  - Bancs à deux sessions verts, dont `banc-envoi-cabinet` et `banc-file-extraction`.
  - E2E sur build de production : 410 passés, 34 sautés, aucun échec.
  - Les 12 cas de `portail-reconnexion-transmissions.spec.ts` sont verts, 6 sur Desktop Chromium et 6 sur iPhone 13 (WebKit). `portail-reconnexion-envoi.spec.ts` est vert sur les deux.
- T1 complet (`npm run check`), après cette passe : 0. `check_no_secrets.sh` : 0.
- Correctif de la remarque PR-Agent (repli `MESSAGE_SESSION_EXPIREE`), puis septième passe (`--fast`, le 2026-11-15 à 11 h 18, au calme au démarrage) : ROUGE dans Vitest sur 2 tests hors lot.
  - `ProtocolMiniBuilder.test.tsx` : « Test timed out in 5000ms ».
  - `export-dossier/masquage.test.ts` : borne de temps, 1 608 ms pour 1 500 ms permises.
  - La charge est montée de 7,5 à 22,9 sans autre `wn-test-worktree.sh` ; la source était arrêtée au relevé suivant.
  - Rejoués seuls, les deux fichiers sont verts (272 tests). Reprise au calme suivant, avec en plus aucun Vitest ni Playwright d'un autre worktree au démarrage.
- Huitième passe (le 2026-11-15 à 11 h 25, calme au démarrage : `autres=0`, charge 5,2) : ROUGE dans Vitest, 9 tests hors lot, tous sensibles au temps (`ProtocolMiniBuilder`, `masquage`, `cockpit.guard`). Au relevé de 11 h 30, un Vitest ou Playwright d'un autre worktree tournait (`autres=1`), charge 35. Contention apparue en cours de passe ; reprise au calme suivant.
- CI de la première tête (`66b96e38`) : `e2e` rouge sur un seul test, `portail-reconnexion-envoi.spec.ts:165` sur iPhone 13 (WebKit), « U25 : un AUTRE patient connecté », avec `locator.click: Test timeout of 120000ms exceeded`. Le journal d'appels montre une navigation vers `/portail/PAT_SEED_01`, l'entrée, avant le clic.
  - Instruit comme un défaut du spec de PAT-5, sans relance ni tolérance. `DossierDeuxVoixView` rend le titre « Mon dossier, à deux voix » dès sa phase `chargement` (ligne 330). Le spec attendait ce titre, puis effaçait le cookie.
  - Une lecture `GET /api/portail/dossier` encore en vol recevait alors le 401 et renvoyait à l'entrée (`window.location.href`). Le bouton « C’est bien ça » ne paraissait jamais.
  - Correctif : dans les deux cas U25, attendre le bouton (l'état chargé) avant d'expirer la session. Le code de l'écran n'est pas touché.
- Neuvième passe, avec les deux correctifs (repli `MESSAGE_SESSION_EXPIREE`, attente de l'état chargé dans `portail-reconnexion-envoi`), lancée le 2026-11-15 à 12 h 11 après deux minutes de calme (charge 2,5) : VERTE.
  - Vitest : 1 039 fichiers, 17 947 tests.
  - E2E : 410 passés, 34 sautés, 0 échec. Les deux specs de reconnexion sont verts sur Desktop Chromium et iPhone 13 (WebKit), dont les deux cas U25 corrigés.
- U33 et U35 ne sont pas jouables en E2E : `WN_PORTAIL_DEPOT_DOCUMENTS` et `WN_PHYSIO_TRAITEMENTS` sont éteints dans l'environnement E2E (pages en `notFound`). Ils sont tenus par leurs bancs unitaires. Aucun constat à l'écran local n'a été fait.

## Problèmes ouverts

- Course du cas 11 de `banc-file-extraction-deux-sessions.test.ts` (arrondi `timestamp(3)`, fenêtre d'une demi-milliseconde) : hors lot, proposée par la session PAT au responsable comme lot distinct. Le cas 10 de `banc-envoi-cabinet` est corrigé par #2143.
- Hors lot, déjà routés : accusé explicite sur U35 et U39 (micro-lot documentaire recommandé), séparateur des deux voix et ornements après COM-1, extension de la garde aux autres routes d'écriture (`20261114-1951-d`).

## Prochaine action exacte

1. CI à 0 (`wn-attendre-ci.mjs` en tâche de fond), `wn-revue-pr-agent.mjs` → 0, un verdict par remarque.
2. « prête @<sha> » sur la PR, ligne « prete » au registre D-503, `lots/PAT-6` et `journal` du suivi patient.
3. Après le merge : PAT-6 complet côté code ; lot suivant du plan patient.

## Interdits encore actifs

- Aucun texte d'interface hors de [[D-488]] ; aucun décor avant COM-1 ; fichiers COM-0 gelés.
- Aucune question, option, condition d'apparition ni règle d'enregistrement modifiée ; rien de clinique ; aucun texte de consentement, de droits ni de sécurité modifié.
- Aucune migration, aucun drapeau ; production en lecture seule ; constat à l'écran en local seulement.
- Aucun seed ni E2E sur un dossier réel ; fixtures Sophie Nicola, Jennifer Martin et Michel Dogné seulement.
- Jamais de merge par la session ; toute écriture ArtifactData épinglée par `if_version`.
