# Handoff — lot `autonomie-pieges-restes`, partie 13 : réservation WN-SRC (2026-11-23)

## 1. Branche et état Git

- Branche `chore/autonomie-pieges-partie13`, tirée d'`origin/main` à 3f98ea93 (après #2308, partie 12, mergée
  c684a376, et #2307). Elle vit dans le worktree `.claude/worktrees/orch-ci`. L'ancienne
  `chore/autonomie-pieges-partie12` est périmée et n'a pas été touchée.
- Le commit est fait tard, juste avant le push (D-518).
- Carnet : le lot `autonomie-pieges-restes` (ordre 35) reste pris par cette session. `branche` et `tenu_le` ont été
  mis à jour avec `if_version`, en version 47.
- Boîte D lue au démarrage : un seul message `emis`, le `merge_fait` de #2308, passé à « lu ».
- La consigne de reprise visait la partie 12, déjà mergée (#2308) : la session a pris le piège suivant du §7 du
  handoff p12.

## 2. Objectif

Convertir en contrôle le piège « réservation WN-SRC » (mémoire du 2026-11-01). Rien ne réservait un numéro de source
entre deux sessions : #1808 a pris `WN-SRC-0577` à `0588` au registre pendant que #1810 ingérait en base sous `0577` à
`0582`. La base est la partie irréversible, et l'ingestion précède la PR.

## 3. Décisions prises

- **Calque de D-370** plutôt qu'un mécanisme neuf : `scripts/wn-reserver-source.mjs` crée
  `refs/tags/reserve/WN-SRC-NNNN`. Il reprend la boucle `reserver()` de `wn-reserver-decision.mjs`, qui prend
  désormais la référence en paramètre (par défaut, celle d'une décision ; rien d'autre ne change).
- **Registre lu en brut** (`Accept: application/vnd.github.raw+json`) à la tête de `main` : le fichier fait environ
  970 Ko, au bord de la limite de 1 Mo de l'API `contents` en JSON.
- **Un registre en défaut sur `main` n'est pas un maximum** : doublon ou forme hors canon, et rien n'est tenté
  (code 2).
- **Garde `scripts/lib/sources-numerotation.mjs`** (`npm run sources-check`) :
  - refus : un doublon, une forme hors canon (`WN-SRC-` suivi de quatre chiffres au moins, sans zéro de tête au-delà
    de quatre), un registre illisible ;
  - code 2 : un registre absent ou vide ;
  - avertissement seul, sur une PR : une source ajoutée sans réservation.
- **Avertissement, pas refus**, pour la source non réservée : c'est le régime de D-370 §4 pour les décisions, et un
  durcissement demanderait une décision. Le vrai rempart est la réservation **avant l'ingestion**, que dit le README
  du corpus ; le CI vient après l'ingestion.
- **Au CI, sans filtre `docs_only`** : le registre est un `.json` sous `docs/`, une PR qui n'ajoute que des sources
  est classée documentaire. Les deux étapes sont avant `setup-node`, donc gardées par la parité avec `check`.
- **Écarté** : refuser une source supprimée par la PR (comme le fait le garde des décisions). Le geste est plausible,
  mais il engagerait une règle sur la vie du registre que rien n'a décidée.
- **Risque** : P1 (workflow CI, outil qui écrit sur GitHub). Revue : `wn-reviewer`, puis PR-Agent → 0.
- **Revue `wn-reviewer` : GO, sans P0 ni P1.** Verdicts :
  - P2-1, câblage de la base en mode PR non testé (un `git show` cassé aurait tu l'alerte, CI vert) : corrigé. Un
    dépôt git temporaire avec commit de fusion joue le script en CI de PR (`HEAD^1`) et avec `--pr` (ancêtre commun
    avec `origin/main`), faux `gh` dans le `PATH`. L'en-tête du banc, qui annonçait un dépôt git sans en créer, est
    corrigé.
  - P2-2, « OK : réservé » promettait un titulaire : corrigé. Le libellé dit qu'une réservation existe, titulaire non
    vérifié ; la limite est écrite dans le garde et le README.
  - P2-3, garde absent de `GARDES_NODE` de `scripts/wn-controle-fusion.mjs` (deux PR qui ajoutent le même
    `sourceId` sans conflit textuel, l'ajout au milieu par exemple) : routé (§6). Il touche le contrôle de merge de
    l'intégrateur, hors du périmètre de cette partie.
  - P3, `--pr` non documenté : corrigé (README). P3, avertissement inapplicable pour une source qui comble un trou :
    corrigé, message distinct et cas de banc. P3, fixture E2E `WN-SRC-0998` : routé (§6). P3, message « aucune
    décision lue » inatteignable pour les sources : sans effet, laissé. P3, mutations sans trace au dépôt : elles
    sont listées au §5.

## 4. Fichiers modifiés

- Neufs : `scripts/wn-reserver-source.mjs`, `scripts/wn-reserver-source.test.mjs`,
  `scripts/lib/sources-numerotation.mjs`, `scripts/lib/sources-numerotation.test.mjs`.
- `scripts/wn-reserver-decision.mjs` : paramètre `reference` de `reserver()`.
- `web/package.json` : `sources-check` dans `check` ; deux bancs dans `bancs-outillage-check`.
- `.github/workflows/ci.yml` : le garde (jeton en lecture, pour les réservations) et ses bancs.
- `docs/claude/corpus/README.md` : section « Numéro d'une source neuve ».
- `changelog.d/2026-11-23-autonomie-pieges-partie13.md`, ce handoff.

## 5. Validations exécutées

- **Bancs** : `sources-numerotation` 21 sur 21 après la revue (16 avant), `wn-reserver-source` 10 sur 10,
  `wn-reserver-decision` inchangé et vert.
- **Mutations**, chacune rétablie ensuite (fichiers comparés à leur copie) :
  - doublon ignoré : 4 cas rouges ;
  - réservation ignorée : 2 ;
  - numéro sans zéros de tête : 16 ;
  - zéro de tête en trop toléré : 2 ;
  - base de la PR ignorée : 4 ;
  - registre vide rendu vert : 1 ;
  - registre lu sans le mode brut : 1 ;
  - registre en défaut accepté par la réservation : 1 ;
  - référence de décision passée à la réservation : 5 ;
  - `sources-check` retiré de `check` : le banc de parité rougit.
  - Correctifs de la revue : base CI lue sur `HEAD`, base au poste lue sur `HEAD`, `--pr` ignoré, trou non
    distingué : 1 cas rouge chacun.
- **Lecture réelle, sans écriture** : `apiSources()` lit sur `main` (3f98ea93) 825 notices, maximum `WN-SRC-0853`, et
  aucune réservation. Le garde rend 0 sur le dépôt, avec et sans `--pr`. Aucune référence n'a été créée.
- **Parité et invariants du CI** (`parite-check-ci`, `ci-invariants`) : 82 sur 82.
- **T1 complet** (`npm run check`) : vert (code 0), `sources-check` compris, anti-secrets compris. T2 n'est pas joué :
  aucun E2E n'est concerné.

## 6. Problèmes ouverts

- Ni le script ni le garde ne voient une PR ouverte qui a ajouté une source **sans** réservation : la réservation
  suivante peut prendre le même numéro. Le CI de cette PR l'avertit ; au premier usage, relire les PR ouvertes qui
  touchent le registre (aucune ce jour : #2306, #2300 et #2178 n'y touchent pas).
- Routé de la revue (P2-3) : `sources-check` n'est pas dans `GARDES_NODE` de `scripts/wn-controle-fusion.mjs`. Deux
  PR vertes chacune, qui ajoutent le même `sourceId` sans conflit textuel, peuvent porter un doublon sur `main` ; le
  CI de `main` le verrait après coup. À traiter dans une partie suivante du lot (contrôle de merge de l'intégrateur).
- Routé de la revue (P3), geste à décider par le responsable : la fixture E2E `web/e2e/helpers/db.ts` utilise
  `WN-SRC-0998`, que le script attribuera dans quelques semaines au rythme constaté. Remède sans code : poser une
  fois `refs/tags/reserve/WN-SRC-0998` (le script la saute). Non fait : c'est une écriture sur le dépôt public.
- La procédure d'ingestion en production vit dans des scripts de scratchpad (mémoire « ingestion corpus ») : aucun
  point de passage unique où refuser une source non réservée. Le README du corpus porte la consigne.
- Toujours en suspens depuis la partie 11 :
  - deux dossiers temporaires `wn-repro-imp-*` sous `$TMPDIR`, à supprimer à la main ;
  - les commentaires de `dansLeDepot` dans `outillageBancs.guard.test.ts` et `cockpit.guard.test.ts`.
- Pièges encore à traiter dans le lot :
  - focus areas de PR-Agent ;
  - SESSION_LOG réordonné ;
  - sessions concurrentes ;
  - crochets de la copie principale en retard ;
  - `wn-attendre-ci` ;
  - statut « transféré » (décision requise) ;
  - lint « objet d'erreur brut ».
- Toujours à arbitrer par le responsable : les deux lots rangés « bloque » par les passes cloud du 2026-11-21 faute
  de droits (403). Reste à donner les droits à la routine, ou à la couper.

## 7. Prochaine action exacte

1. Verdicts sur la revue `wn-reviewer`, puis commit, push et PR (`--body-file`), puis `wn-attendre-ci` en fond.
2. PR-Agent → 0. Chaque remarque reçoit un verdict.
3. « prête @<sha> » sur la PR et au registre (boîte `integrateur`). Ensuite, plus aucune écriture sur la PR (D-546).
4. Ensuite, le piège suivant : « focus areas de PR-Agent ».

## 8. Interdits encore actifs

- Ni migration, ni schéma, ni clinique, ni donnée patient. Fixtures neutres seulement. Pas de `prisma format`.
- Rien d'édité dans `web/src/lib/clinical/`. Aucune écriture en production ; aucun `workflow_dispatch` de
  `release-db`. `release-db.yml` non touché.
- Ne pas toucher `tools/corpus/fiches-usage/rediger.mjs`. Ne jamais supprimer une ligne des registres.
- Aucune référence `refs/tags/reserve/…` créée par cette session pour essai : le script ne s'exerce que sur faux `gh`.
- Aucune routine créée, rallumée ni lancée. `orchestrateur/arret` vaut `false` ; cette session n'y touche pas. La
  phase 3 (pilote) attend le feu vert du responsable.
- Ne pas déclarer la porte 24 levée. Aucune adresse de page privée dans le dépôt.
- Horodater en lisant l'heure système.
