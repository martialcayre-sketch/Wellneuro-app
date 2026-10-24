# Handoff — 2026-10-24 — J3-12h, lot 3 de D-345 : courrier complément, remise au clic et refus, sous drapeau éteint

## Branche et état Git

- Branche `lot/j3-12h-lot3`, worktree `.claude/worktrees/j3-12h-lot3`
  (session concurrente, cycle en git/gh direct). Tirée d'`origin/main`
  290c2dcf ; aucune fusion de main depuis.
- Une PR de code, **sans migration** ni `schema.prisma`.
- L'ancien worktree `j3-12h-lot2` (détaché sur main) peut être retiré.

## Objectif

Poser G4 et G6 de la fiche
(`docs/claude/propositions/2026-10-22-j3-12h-garde-complement-cible/README.md`) :

- le courrier au médecin, son générateur et sa liste ;
- sa remise au patient dans le clic « Valider pour diffusion » ;
- le refus fail-closed avant l'embranchement ;
- la case « ciblé » dans le constructeur.

Le tout est livré sous `WN_COURRIER_COMPLEMENT` éteint (D-345 §4-§7).

## Décisions prises

D-357 consigne quatre arbitrages du responsable du 2026-10-24 :

- §1 : le texte du courrier est validé tel quel, sans population ni
  situation nommée ;
- §2 : « déjà tracé » est une inclusion dans **une** remise antérieure ;
  l'égalité stricte et l'union sont écartées ;
- §3 : le portail (espèce `courrier_complement`, écran, accusé, annonce)
  vient au lot 4 ;
- §4 : un seul drapeau.

Choix d'exécution :

- une remise refusée pour une autre raison que « déjà remis » **annule le
  clic** ;
- un courrier « à remettre » est refusé quand les fiches sont fermées ou le
  dossier bloqué ;
- l'anamnèse est lue sur toutes les consultations envoyées
  (`whereConsultationPorteuse`), datées par `dateValidation` ;
- la garde est inscrite parmi les lecteurs de D-335 §8.

## Fichiers modifiés

Neufs, sous `web/src/lib/` :

- `correspondance/courrierComplementListe.ts` ;
- `correspondance/courrierComplement.ts` ;
- `correspondance/courrierComplementConsignation.ts` ;
- `correspondance/courrierComplementRemise.ts` ;
- `clinical/entreesGardeComplement.ts`.

Chacun a ses tests. S'y ajoute `correspondance/courrierComplement.pg.test.ts`,
qui joue sur un vrai Postgres.

Route neuve :

- `web/src/app/api/praticien/protocoles/courrier-complement/route.ts`, avec
  son test.

Modifiés :

- `web/src/app/api/praticien/protocoles/diffusion/route.ts`, avec le test neuf
  `route.complement.test.ts` ;
- `web/src/app/api/praticien/protocoles/versions/route.test.ts`.

Écrans :

- `ProtocolMiniBuilder.tsx` et son test ;
- `ProtocolDiffusionPanel.tsx` ;
- `ClinicalRuntimeSection.tsx` ;
- `DocumentComposer.tsx`.

`web/src/lib/documents/modele.ts` et `types.ts` (modèle et source
`complement_cible`).

Gardes :

- `correspondance/courriersComplementRemises.guard.test.ts` (émetteurs
  nommés) ;
- `physio-traitements/lecteursPhysioTraitements.guard.test.ts`.

`.github/workflows/ci.yml`, étape « Courrier complement real-database bench ».

Documentation :

- `docs/FEATURE_FLAGS.md` ;
- `docs/DECISIONS.md` (D-357) ;
- `docs/claude/PLAN_WELLNEURO.md` ;
- `docs/claude/MATRICE_CONSOMMATION.md` (régénérée : une surface indirecte de
  plus pour la Boussole, celle de la route neuve) ;
- `changelog.d/2026-10-24-j3-12h-lot3-courrier-remise.md` ;
- `docs/claude/SESSION_LOG.md`.

## Validations exécutées

- **T1** :
  - `check:rapide` après chaque édition : vert ;
  - `npm run check` avant le commit : vert.
- **T2** (`test:worktree -- --fast`) sur 02ee30a2 : vert en 7 min 06 s.
- **Banc Postgres** sur la base locale du worktree : 8 tests sur 8.
- **Contre-épreuves** :
  - sans le refus « fiches fermées », un test de route rougit ;
  - les refus du banc Postgres sont reconnus à leur message de trigger.
- **`wn-reviewer`** sur 02ee30a2 : GO sous conditions, aucun P0.
  - Corrigés :
    - P1-1 (clôture) ;
    - P1-2 (`WN_PHYSIO_TRAITEMENTS` en condition d'ouverture) ;
    - P2-1 (le GET se dégrade au lieu de tomber) ;
    - P2-2 (la clé est présente dès le premier protocole) ;
    - P2-3 (l'état est remis à zéro sur échec) ;
    - P2-4 (un dossier bloqué est refusé) ;
    - P2-6 (banc Postgres : remise de bout en bout, collation, référence
      nulle) ;
    - P2-7 (la lecture est inchangée drapeau fermé).
  - Écartés avec motif :
    - P2-5 (écrivains physio et anamnèse non sérialisés avec le clic :
      fenêtre étroite, documentée) ;
    - P2-8 (`courrierComplementRemis` dit « ce clic a remis ») ;
    - P2-9 (même patron que le courrier biologie).
- **T3** (`test:worktree`) sur c847b10e : séquence complète verte en 8 min 17 s, 296 E2E passés.
- **CodeRabbit** sur fe81fdb1 : D-357 corrigée (`WN_FICHES_ASSIETTE` parmi les
  conditions d'ouverture) ; matrice écartée avec motif, signalement retiré par
  CodeRabbit. Sur 536bd66e : aucun commentaire ; la proposition de durcissement
  (fenêtre de fraîcheur) est routée vers la condition 2 d'ouverture (lot 4).
- **Codex** (P0) sur 536bd66e : BLOQUER, deux P1, corrigés :
  - P1-1 : la consignation relit la date de naissance sous verrou. Bancs route
    et Postgres (9 sur 9) ; contre-épreuve : sans le contrôle, les deux bancs
    rougissent ;
  - P1-2 : le libellé du destinataire est réservé à la grossesse (arbitrage du
    responsable) ; banc de l'aperçu pour un allaitement seul.
- **CodeRabbit** sur e89fcaf4 : deux P2 corrigés. Le GET sert `remise_impossible`
  quand le courrier est à remettre et le chemin des fiches fermé, avec le même
  motif que le refus du clic (banc neuf). Les bancs remplacent « Dr Exemple »
  par « Médecin traitant ».
- **Numérotation** : D-355 prise par r3_13 (#1689), puis D-356 par t36
  (#1690) ; la décision du lot est D-357 (deux fusions de main dans la
  branche).

## Problèmes ouverts

- **Lot 4, portail** :
  - espèce `courrier_complement` dans `lecturesAttendues`,
    `api/portail/lectures` et `mesEchanges` ;
  - écran et impression ;
  - accusé ;
  - annonce du clic.

  Le drapeau ne s'ouvre pas avant.
- **Ouverture du drapeau**, quatre conditions :
  - l'écran du portail ;
  - un passage de bout en bout sur un dossier de test, par identifiant ;
  - `WN_FICHES_ASSIETTE` ouvert ;
  - `WN_PHYSIO_TRAITEMENTS` ouvert.
- **Question de revue, à lire par conteneur** : combien de consultations
  `validee` n'ont pas de `dateValidation` ? Un « oui » non daté ne se lève
  jamais, et le courrier deviendrait perpétuel pour ces dossiers.
- **Au portail** : un intitulé de complément saisi par le praticien, ou le
  libellé suggéré du destinataire, peut nommer la population. L'opacité
  dépend aussi de ces saisies.

## Prochaine action exacte

1. CI et CodeRabbit sur la tête qui porte les corrections Codex (PR #1691).
2. Vérifier qu'aucun run `release-db` n'attend.
3. Merger avec `--match-head-commit`. Aucune release-db n'est attendue.
4. Vérifier que la première ligne de `scalingo deployments` est la tête de
   main.
5. Ensuite, le lot 4 (portail).

## Interdits encore actifs

- `WN_COURRIER_COMPLEMENT` reste éteint jusqu'aux quatre conditions.
- Aucun claim ni libellé de situation au dépôt (forme opaque).
- Le texte du courrier ne se retouche pas sans nouvelle validation (D-357 §1).
- Pas de `prisma format`.
