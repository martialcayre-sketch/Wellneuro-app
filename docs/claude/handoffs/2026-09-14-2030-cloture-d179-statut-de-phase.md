# Handoff — clôture tardive de `D-179` : le statut d'une phase lit son geste (2026-09-14 20:30)

**Fenêtre de clôture ratée, et rattrapée ici.** La PR #1091 a été mergée en squash
le 2026-09-13 à 12 h 43 sans `SESSION_LOG.md` ni fragment de handoff dans son diff.
`node scripts/wn-cycle.mjs` le signalait encore ce matin. Ce fragment porte la
clôture d'un lot vieux d'un jour ; il est écrit depuis `main`, en PR de doc
séparée, comme le cycle le demande.

## Branche et état Git

- **Mergé sur `main`** : `aa2e32f5` (PR #1091), 2026-09-13 12 h 43 UTC, dix fichiers.
- Branche `statut-decision-suit-la-selection` ; le worktree du même nom survit sur
  disque et n'a plus d'usage — il est behind 58 et son contenu ne remonte plus.
- **Mise en ligne constatée par CONTENANCE** (jamais par égalité de SHA) :
  `git merge-base --is-ancestor aa2e32f5 30d16e42` est vrai, et `30d16e42` est la
  release `success` du 2026-09-14 19 h 59.

## Ce qui a causé le lot

Lecture de production du 2026-09-13 (one-off `scalingo run -d`, dé-identifiée) :
**28 patients, 7 épisodes T0 confirmés, 1 seule sélection de priorité, 0 version
de protocole C1.** L'unique ligne de `protocol_drafts` date du 2026-07-31 et porte
un contrat d'observation alimentaire.

Le goulot n'était pas le formulaire : c'était le geste d'avant. `statutPhase('decision')`
rendait `'fait'` dès `episodeConfirme`, si bien que le rail affichait « Décision 21 j :
renseignée » pendant que le geste que cette phase PORTE restait dû — et la règle D5
envoyait le praticien sur Actions, qui refuse d'afficher un protocole sans dire où
aller. Troisième occurrence de la même famille après `D-161` §10 et le fragment
`2026-09-13-statut-phase-deux-suit-le-rideau.md` ; même gabarit de correctif,
commentaire compris : **ce que la phase CONTIENT, et non ce qui l'entoure.**

## Ce qui a été livré

- `isSelectionPrioriteDue` dans `web/src/lib/clinical-engine/decisionGuards.ts` —
  trois conditions cumulatives, dont les deux dernières **reprennent le prédicat
  que `SelectionPrioritePanel` applique déjà pour se retirer**, afin que le rail
  n'envoie jamais le praticien sur une phase où le panneau ne se monte pas.
- Un tri-état `selectionPrioriteDue: boolean | null` remonté par
  `ClinicalRuntimeSection`, sur le gabarit exact de `rideauT0Satisfait` : carte non
  lisible ⇒ « indéterminée », jamais affirmée.
- Le prédicat de `statutPhase('decision')` dans `FichePatientPanel.tsx`.
- Un quatrième bandeau de fiche, calqué sur celui du protocole bloqué : « Priorité
  non retenue — le protocole reste indisponible. » + « Choisir la priorité ». Le
  libellé nomme le GESTE et non la destination, pour ne pas entrer en collision
  avec « Ouvrir la phase Décision 21 j » d'`ObjectifNegociePanel` sous le mode
  strict de Playwright.
- Le point de synchronisation anti-course de `e2e/helpers/biologie.ts` déplacé de
  « Décision 21 j renseignée » vers « Actions à traiter » — même dérivation depuis
  `episodeConfirme`, trois specs biologie en dépendaient.
- Cinq bancs neufs sur le trou qui avait laissé passer le défaut : la fixture
  `decisionCard()` posait toujours `selectedMainPriority` non nul, donc **aucun test
  existant ne pouvait casser par cette voie**.

## Une correction de mon propre décompte

J'ai d'abord annoncé **six dossiers bénéficiaires**. C'est faux, et le motif vaut
d'être retenu : compter les signaux d'alerte bruts est un mauvais proxy, parce que
`construireSafetyFindings` ignore les cinq libellés de rang `vigilance`
(`safetyFindings.ts`, `if (rang === 'vigilance') continue`). Seuls les six
`adressage` de `safetySignalsV1` bloquent la décision.

Re-mesuré : **trois dossiers** passent de « renseignée » à « à traiter », trois
restent bloqués par un signal d'adressage, un est inchangé — il a retenu sa
priorité le 2026-09-12. Et **trois est un majorant** : l'abstention est l'autre
cause de blocage et ne se lit pas en SQL.

## Validations exécutées

- T1 vert après `npx prisma generate` (le worktree neuf n'avait pas de client).
- T2 vert, lu dans le fichier de sortie et non dans le résumé de notification.
- CI `verify` vert, `node scripts/wn-attendre-ci.mjs 1091` = 0.

## Ce qui reste ouvert

- **La vérification à l'écran n'a pas été faite** : elle demande la session Google
  du praticien. Trois dossiers réels sont concernés ; ils se regardent par
  identifiant, jamais par nom.
- Les cinq autres coupures de l'audit de la phase Actions, nommées hors périmètre
  par `D-179` : le patient ne reçoit qu'une action sur trois, la caducité
  silencieuse de la diffusion, l'hydratation du formulaire, le contrat V4 sans
  producteur d'écran, `versionsLues` non remonté au rail.
- Le worktree `statut-decision-selection` est à supprimer.

## Prochaine action exacte

Ouvrir la campagne **« 5. Actions — le protocole assisté »**, cadrée en séance le
2026-09-14 sur douze arbitrages : elle reprend quatre de ces cinq coupures et
absorbe l'entrée « Producteur d'intentions `conditionnelle_biologie` » de
`FILE_ATTENTE.md`.

## Interdits encore actifs

Inchangés : aucune identité patient réelle dans le dépôt ; production en lecture
par `scalingo run -d`, écriture par migration relue puis `release-db` approuvée ;
pas de `schema.prisma` ni de clinique/scoring sans demande explicite.
