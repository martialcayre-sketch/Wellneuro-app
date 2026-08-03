# Handoff — 2026-08-03 — LOT-06 : consommateur praticien de l'orientation, restitution IA

## Git

- Worktree `.claude/worktrees/lot-06-consommateur-orientation`, branche
  `worktree-lot-06-consommateur-orientation`, partie de `main`, **PR #550**.
- `main` a avancé **deux fois** pendant le lot — #547/#548/#549 jusqu'à
  `8cc4ef11`, puis #551 (`92adb17a`) — et `origin/main` a été fusionné à chaque
  fois. Deux conflits, tous deux dans de la documentation : `SESSION_LOG.md`
  (append contre append : les deux entrées conservées, la mienne en dernier) et
  `HANDOFF_CURRENT.md` (résolu **en faveur de la branche** — ce fichier est
  remplacé à chaque handoff, jamais fusionné).
- **PR #550 : `verify` vert en 10 min 19 s** sur le head fusionné `c6ec5a4f`.
  Merge et suppression de branche = ressort Copilot. Rien n'est en attente côté
  assistant.
- Campagne `2026-08-03-packs-moteur-d-intervention-et-corpus-consommable`,
  LOT-06, palier T2.

## Objectif du lot

Rendre la couche orientation réellement consommée : `GET /api/praticien/orientation`
existait depuis la campagne de certification et **personne ne l'appelait**. Y
brancher une surface praticien, et faire **restituer** la recommandation par la
synthèse IA sans jamais lui laisser la produire (PMI-5).

## Décisions prises

| # | Décision | Raison |
|---|---|---|
| 1 | Surface = onglet **Trajectoire** de la fiche patient, au présent seulement | `/dashboard/trajectoires` n'est qu'une liste ; afficher une recommandation en lecture datée la ferait passer pour ce que la table proposait à cette date-là |
| 2 | Extraire l'évaluation vers `lib/clinical/orientationService.ts` | La synthèse en devient un second consommateur ; un fail-closed dupliqué est un fail-closed qu'on peut oublier de corriger dans une des deux copies. Et un `route.ts` ne peut pas exporter de valeur |
| 3 | Le verrou reste **avant** le contrôle d'appartenance | `verifierAppartenancePatient` journalise l'accès au dossier : table non signée → aucune lecture → aucun accès consigné qui n'a pas eu lieu |
| 4 | Aucun bloc injecté quand rien n'est recommandé | Doctrine #408 : retirer la donnée protège, la consigne seule non. Un en-tête vide invite le modèle à le remplir |
| 5 | Écart de restitution : **on journalise, on ne censure pas** | L'objet actionnable — la carte et son bouton — vient de la route déterministe ; un pack cité à tort dans la prose ne peut rien déclencher, et un faux positif textuel ne doit pas priver le praticien de sa synthèse. **Candidat à `docs/DECISIONS.md` (D-009), non écrit** |
| 6 | Assignation en deux temps, bouton non réarmé après succès | Le geste envoie un e-mail ; `packs/assign` ne déduplique pas |
| 7 | `emailPatient` passé seulement s'il désigne le patient affiché | Le panneau calcule sur `idPatient`, l'assignation part sur l'email : deux sources dont aucune ne vérifiait l'autre |

**Écarté** : neutraliser la synthèse sur écart (trop brutal pour une
correspondance textuelle) ; ouvrir `packs/assign` à `idPatient` (modifie une
route d'écriture existante, hors finalité) ; signer la table dans ce lot.

## Fichiers modifiés

**Créés** — `web/src/lib/clinical/orientationService.ts` (+ test) ;
`web/src/lib/clinical/verifierRestitutionOrientation.ts` (+ test) ;
`web/src/components/patient-cockpit/OrientationPanel.tsx` (+ test) ;
`web/src/app/api/praticien/synthese/orientation.restitution.test.ts` ;
`changelog.d/2026-08-03-lot-06-consommateur-orientation.md`.

**Modifiés** — `api/praticien/orientation/route.ts` (devient un enveloppeur
HTTP) ; `api/praticien/synthese/route.ts` (bloc, garde, métadonnées) ;
`lib/anthropic.ts` (section de consigne, `synthese-v14`) ;
`lib/observability/eventCodes.ts` (deux codes) ;
`components/patient-cockpit/TrajectoirePanel.tsx` ; `components/FichePatientPanel.tsx` ;
trois mocks de test de la synthèse ; `docs/FEATURE_FLAGS.md` ; `CAMPAGNE.md` et
les fiches LOT-05 / LOT-06.

## Validations exécutées

- **T1** `npm run check` vert : 3 440 tests unitaires, 906 bancs, type-check,
  lint, anti-secrets.
- **T2** `npm run test:worktree -- --fast` vert : 108 E2E, dont le parcours
  praticien, l'onglet Trajectoire et la Spirale peuplée.
- **CI** : `verify` vert sur le head fusionné `c6ec5a4f`.
- **Deux revues adversariales `wn-reviewer`, deux NO-GO levés**, plus une
  relecture de l'entrée `SESSION_LOG` qui a corrigé deux affirmations fausses.

Deux échecs E2E rencontrés et diagnostiqués, non écartés :
`portail-lien-magique:48` (anti-oracle de temps, 21 s contre un seuil de 800 ms)
et `fiche-trajectoire-peuplee:23` (page bloquée sur « Chargement de la fiche
patient… », état `loading` **en amont** du montage de l'encart). Verts au rejeu,
le second après purge de `.next`.

## Problèmes ouverts

1. **La table du LOT-05 n'est pas signée.** `validationExterne: false` : le seul
   chemin exerçable en production est `actif: false`, l'écran affiche « en cours
   de constitution ». Le chemin `actif: true` n'est couvert que par des tests.
2. **Toutes les synthèses de production partent désormais en `synthese-v14`**
   avec la consigne de restitution, alors qu'aucun bloc n'a jamais été transmis :
   la section du prompt système est inconditionnelle. Le seul discriminant est
   `donneesEntree.orientationInjectee`.
3. **Un écart mesuré par heuristique textuelle est écrit dans `donneesEntree`**
   du dossier patient. A-t-il sa place ailleurs que dans le journal ? Non tranché.
4. **Le garde a quatre angles morts déclarés** (en-tête du module) : pack nommé
   sans « pack » avant lui, pack cité loin derrière son introducteur, exploration
   en langage libre, et le **réordonnancement** — interdit par la consigne, mais
   invérifiable par occurrences.
5. `.wn/state.json` et `ACTIVE_CAMPAIGN.md` restent sur `idle` (2026-08-01 /
   2026-07-23) alors que la campagne tourne. Vues générées ; `scripts/wn-cycle.mjs`
   vient d'arriver sur `main` et son `--appliquer` écrit `git.branch`, un nom de
   worktree éphémère. Non éditées à la main.
6. **Promotion proposée, non écrite** : l'idiome d'attente du CI de `CLAUDE.md`
   ne distingue pas « aucun check en attente » de « aucun check tout court ». Il
   a rendu la main sur deux checks Vercel verts alors que `verify` n'existait
   pas — parce que `main` avait bougé et que la PR était `CONFLICTING`, état dans
   lequel **GitHub ne crée aucun run**. C'est une **troisième** cause de `verify`
   absent, en plus des deux déjà documentées. Correctif : exiger d'abord
   l'existence de `verify`, puis attendre la fin des checks.

## Prochaine action exacte

**Signer `ORIENTATION_METADATA` après relecture clinique des six règles, ET
poser `WN_ENABLE_ORIENTATION_NNPP2=1` en production.** Le verrou est un ET :
signer seul n'allume rien — c'est désormais écrit dans `docs/FEATURE_FLAGS.md`.
Avant de signer, refaire la lecture en base des neuf `claimId` (aucun test
unitaire n'ouvre `rag_corpus_claims`).

À défaut : **LOT-01**, validation des 755 claims d'intervention — c'est la porte
D-003, et sans elle le done de campagne « 2002 / 0 » reste inatteignable.

## Interdits encore actifs

- Ne **jamais** contourner `tableSignee()` ni forcer `validationExterne` pour
  « voir » la feature.
- Aucune auto-assignation, aucune exposition patient de la recommandation.
- Aucune modification des 64 instruments certifiés, aucune migration Prisma.
- Ne pas ouvrir ni modifier `POST /api/praticien/packs/assign`.
- Pas de secret, pas de donnée patient réelle (Sophie Nicola, Jennifer Martin,
  Michel Dogné seulement), aucun texte UI en anglais.
- Merge et suppression de branche : ressort **Copilot**.
