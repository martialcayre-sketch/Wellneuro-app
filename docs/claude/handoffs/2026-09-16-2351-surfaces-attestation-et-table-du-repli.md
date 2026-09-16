# Handoff — 2026-09-16 — Les quatre surfaces d'attestation, la reprise après revue, et la table du repli

## 1. Branche et état Git

- Worktree : `.claude/worktrees/phases-hash-2026-09-16`.
- **#1167 est MERGÉE** — `wn-reprise-surfaces-assiettes-2026-09-16`
  (documentaire + `D-216` + correction d'un commentaire dans `anamnese.ts`).
  Deux commits, `0131f6a0` puis `50688cd8` (six constats de revue traités
  **avant** le merge). CI vert sur la tête réelle, `D-216` sur `main` sans
  collision de numéro.
- **#1168 reste ouverte** — `wn-table-repli-2026-09-16b` (code : la table du
  repli, verrou éteint, plus `D-217`). Quatre commits plus un merge de `main` :
  module, handoff, journal de session, puis `42a74837` qui traite les **sept**
  constats de sa propre revue. CI relancé sur cette tête.
- **#1160 est mergée** (`428393e3`) — et elle l'a été **trop tôt** : voir §6.
- `main` local était en retard de deux commits en début de session,
  fast-forwardé sans divergence.

## 2. Objectif de la session

Terminer ce qui revenait à l'outil sur les quatre attestations laissées par
`D-213` : produire la surface de relecture de chacune, pour que le praticien
puisse attester. Puis, sur demande, reprendre S3 et S4 après une revue qui a
trouvé une erreur de lecture du corpus.

## 3. Décisions prises

- **`D-216`** (écrite, non encore mergée) — quatre arbitrages du responsable :
  l'âge redevient un déclencheur (trois claims prescriptifs portent des bornes
  citées, le motif du refus a disparu) ; l'enquête alimentaire ne déclenche
  jamais seule **une ligne d'assiette** ; la psychobiotique publie sa porte
  étroite et garde la large en brouillon ; les familles d'équivalence se feront
  mais le mécanisme change d'abord.
- **Le terme de la table du repli** : `actionsSansRepli`, mesuré directement.
- **Le statut descend sur la ligne d'indication**, pas sur l'entrée d'assiette —
  imposé par la psychobiotique, qui porte une porte publiée et une en brouillon.
- **La ligne cite les claims du protocole, jamais ceux de la fiche** : non
  arbitré, imposé par le registre des sources.

## 4. Fichiers modifiés

**#1167** — `docs/DECISIONS.md` (`D-216` en tête) ·
`docs/claude/campagnes/SURFACE_RELECTURE_CATALOGUE_ASSIETTES_2026-09-16.md`
(réécriture complète) · `…FAMILLES_EQUIVALENCE…` (réécriture partielle) ·
`…ECART_DE_PLAN…` (corrections) · `changelog.d/2026-09-16-trois-surfaces-attestation.md`
(réécrit) · `web/src/lib/consultation/anamnese.ts` (**commentaire seul** —
l'ancien motif du refus d'âge, que `D-216` lève).

**#1168** — `web/src/lib/clinical/tableRepliV1.ts` (neuf) ·
`tableRepliPur.ts` (neuf) · `tableRepliV1.guard.test.ts` (neuf, 24 tests) ·
`baremeChargePur.ts` (cinquième terme + type `LigneBornee`, `chevauchementsBareme`
élargi) · `docs/FEATURE_FLAGS.md` (ligne d'état du verrou) ·
`changelog.d/2026-09-16-table-du-repli.md`.

**Hors dépôt** : artefact de suivi republié ; trois mémoires écrites ou
corrigées.

## 5. Validations exécutées

- **T2 sur la reprise documentaire** : `T2-EXIT=0`, 566 fichiers, 9485 tests
  unitaires, E2E complètes.
- **T2 sur la première livraison (#1160)** : `T2-EXIT=1` — signature `D-049`
  (`portail-dossier-deux-voix`, iPhone 13, **2,0 min** sur `page.goto`, aucune
  requête émise), sur un diff sans code. CI Linux vert.
- **T1 après les corrections de revue** : `T1-EXIT=0`.
- **T1 sur la table du repli** : `T1-EXIT=0`. Bancs ciblés : **41 tests** verts
  (table du repli + barème, ce dernier inchangé malgré le cinquième terme).
- **CI** : #1160 vert et mergé ; #1167 et #1168 **en attente** à l'écriture.
- **Production lue** (autorisation du 2026-09-16) : 212 claims des vingt-quatre
  sources d'assiette ; un seul `protocol_drafts`, sans actions ; zéro référence
  d'assiette enregistrée.

## 6. Problèmes ouverts

- **#1168 n'est pas mergée** à l'écriture de ce handoff.
- **La revue de #1160 a été lue APRÈS le merge.** Sept constats, sept réels,
  dont un majeur : une indication clinique fondée sur une source que le registre
  interdit d'utiliser comme règle. Corrigé par #1167, mais `main` a porté le
  document fautif quelques heures.
- **Les deux PR suivantes ont reçu six et sept constats de plus**, tous traités
  avant leur merge. Sur les vingt de la journée, **vingt étaient réels** — dont
  deux défauts de code que le CI ne voyait pas : un type trop large laissant une
  ligne de repli se signer sur le mauvais terme, et un constat affirmant faux
  pendant la composition. Un CI vert n'atteint aucun des deux.
- **`D-216` engage un chantier qu'elle n'exécute pas** : exposer l'âge au moteur,
  revisiter `DC-43`. Tant qu'il n'est pas fait, trois assiettes publiées dans la
  surface dépendent d'un déclencheur inexistant — le document le dit, le code ne
  le sait pas encore.
- **Le catalogue d'assiettes n'a ni champ `statut` ni filtre de service.**
  `PractitionerFoodObservationPanel` rend **toutes** les entrées : signer la
  table avant le filtre exposerait les brouillons comme les publiées.
- **La route Boussole renvoie `alternatives: []` en dur** — le mécanisme de
  substitution n'est appelé que par son banc.
- **`suggererDepuisLignes` (barème) rend toujours un `null` unique** pour trois
  causes. `D-213` §5 reste ouvert de ce côté ; la table du repli, elle, naît avec
  le motif.
- `D-049` n'est toujours pas refermée.

## 7. Prochaine action exacte

1. **Merger #1168** une fois son CI vert sur la tête `42a74837` — et **comparer
   le `head=` du SNAPSHOT à la tête réelle** : `wn-attendre-ci` a déjà rendu `0`
   cette nuit sur la tête *précédente*, enchaîné à un push. Vérifier aussi que
   **`D-217` est libre** au moment du merge : l'autre session a pris `D-215`
   pendant la séance, et le registre n'admet ni trou ni collision.
2. Ensuite : soumettre au responsable **les trois constats de `REPLI-01` à
   `REPLI-03`** pour relecture mot à mot — c'est le seul reste de S2, et la
   table devient signable dans la foulée.
3. Puis les cinq chantiers qui conditionnent S3, dans cet ordre : le champ
   `statut` **et** le filtre de service (sans lui un brouillon s'affiche comme
   une ligne publiée), le champ d'indication et ses claims, le déclencheur
   d'âge avec la revisite de `DC-43`, le mécanisme orienté des familles, et
   `suggererDepuisLignes` qui rend toujours un `null` unique côté barème.

## 8. Interdits encore actifs

- **Aucune identité réelle dans le dépôt** — code, seeds, tests, docs, messages
  de commit.
- **Aucune signature clinique posée par l'outil.** Les quatre verrous concernés
  restent éteints ; l'attestation est un geste du responsable.
- **Aucun contenu clinique du corpus dans le dépôt** tant que G6 est fermée : une
  ligne **désigne** son claim, elle ne le recopie jamais.
- **Base de production : lecture seule** par conteneur `scalingo run -d` ;
  écriture par migration relue puis `release-db` approuvée.
- **Pas de migration Prisma ni de modification de `schema.prisma`** sans demande
  explicite.
- **Force-push, production et arbitrages** restent à demander ; l'autorisation
  Git court jusqu'au 2026-09-17.
- **Ne jamais merger sans avoir lu la revue** — et une revue absente juste après
  l'ouverture signifie « pas encore passée », jamais « rien à dire ».
