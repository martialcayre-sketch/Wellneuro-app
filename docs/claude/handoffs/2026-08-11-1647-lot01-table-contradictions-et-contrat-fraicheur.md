# LOT-01 — table de contradictions C-STR, contrat de fraîcheur des claims, D-046

## Branche et état Git

- `campaign/2026-08-10-chaine-t0/lot-01-contrat-fraicheur-claims`, vivante, non
  mergée, **aucune PR ouverte**. Arbre propre.
- Rebasée sur `origin/main` = `bf33d4b2` (qui porte le correctif du hook de
  fraîcheur Git, #658). Rebase arbitré, zéro conflit.
- Quatre commits : `b874b79b` (contrat de fraîcheur), `a6e8fbf7` (type
  `ContradictionFinding`), `b23088df` (table + moteur + D-046), `0ed87502`
  (entrée `SESSION_LOG`).

## Objectif actuel

Étape 1 du LOT-01 : rendre le moteur de contradictions **existant et gardé**
avant qu'il ne produise quoi que ce soit d'affiché. Les étapes 3 à 6 (prompt
v20, schéma de sortie strict, injection cockpit, marquage de la passation
courante par instrument) ne sont pas entamées.

## Décisions prises

- **`D-046`** (au registre) — `prescriptif` n'est exigé que des tables qui
  PRESCRIVENT. Une règle de contradiction CONSTATE ; son claim fondateur est
  descriptif, distinction que `DC-30` porte déjà. Exiger `prescriptif` de lui
  aurait forcé à épingler un claim voisin ne disant pas la règle (`DC-14`).
- **L'exigence est portée ligne par ligne** (`exige_prescriptif`), jamais
  déduite du nom de la table. Un prédicat testant `table_signee = 'orientation'`
  aurait dispensé toute table future — celle des parcours (`D-045`), qui
  prescrit pourtant — par le seul fait de ne pas porter ce nom.
- **Le contrat positif ne tourne QUE contre la production**, en préflight de
  `release-db`. La base du CI est vide : il y rougirait sans rien prouver. Ce
  qui éprouve qu'il mord est le fichier négatif, câblé en CI, à **sept** cas.
- **Le moteur partage** `derniereReponseParQuestionnaire` et
  `evaluerDeclencheur` avec le moteur d'orientation plutôt que de les
  réécrire : les gardes `DC-24` doivent valoir à l'identique des deux côtés.
- **Deux règles candidates écartées explicitement** (C-SOM, C-ALI) avec motif
  et condition de retour, plutôt que tues.

## Fichiers modifiés

Périmètre du lot : `git diff origin/main..HEAD` (18 fichiers).

- `web/src/lib/clinical/contradictionsV1.ts` + `.test.ts` — la table, une règle
  publiée, SHA256 épinglé.
- `web/src/lib/clinical/contradictionsEngine.ts` + `.test.ts` — le moteur,
  règles injectables.
- `web/src/lib/clinical/contradictionFinding.ts` + `.guard.test.ts` — l'objet.
- `web/src/lib/clinical/orientationEngine.ts` — deux `export`, corps inchangés.
- `web/prisma/checks/rag_claim_fraicheur_tables_signees_v1.sql` et son
  `_negatif.sql`.
- `web/src/lib/clinical/claimsEpinglesFraicheur.guard.test.ts` — couverture
  automatique par balayage du dossier.
- `.github/workflows/ci.yml`, `.github/workflows/release-db.yml`,
  `scripts/release-db-invariants.test.mjs`.
- `docs/DECISIONS.md`, trois fragments `changelog.d/`, `SESSION_LOG.md`.

## Validations exécutées

- **T3 complet vert en 4 min 13 s** : Vitest 386 fichiers / 4386 tests ;
  certification scoring 20 fichiers / 378 tests ; Playwright **136 passés, 0
  échec** ; contrats SQL (`prisma/checks`) verts.
- T1 vert après rebase ; anti-secrets OK.
- Production lue via MCP `execute_sql` : les **24 paires** épinglées donnent
  24/24, zéro violation. `WN-CL-0238-002` est `v1.0` / `VALIDE` / actif / non
  remplacé / `prescriptif = false`.
- **Trois passes de revue `wn-reviewer`.** Cinq bloquants corrigés (C1 :
  exemption par défaut ; C2 : cas négatifs tous sur orientation ; C3 : gardes
  inatteignables et banc tautologique ; C5 : attestations « 23 » pour 24 ;
  C6 : fragment de changelog contredit par sa propre release). La troisième
  passe portait sur l'entrée `SESSION_LOG` et a démenti trois de ses énoncés.

## Problèmes ouverts

**Trois arbitrages cliniques à rendre** — aucun n'est tranché par le code :

1. La valeur `importance: 'useful_not_urgent'` de C-STR, posée sans
   justification écrite, absente du dossier de règles et de `D-042`.
2. Le moteur doit-il refuser d'émettre tant que `validationExterne === false` ?
   **La table C-STR est dans cet état** : écrite et relue en PR, non signée.
   Aucun code n'empêche aujourd'hui une table non signée de produire une
   vigilance.
3. La fenêtre temporelle. Ce n'est pas seulement ouvert : le comportement est
   **figé par un banc** — `contradictionsEngine.test.ts:137-146` produit un
   constat entre un `Q_MOD_01` du 2026-07-01 et un DASS-21 du 2026-08-10, six
   semaines d'écart, alors que la troisième hypothèse explicative de C-STR est
   précisément temporelle.

**Dettes techniques nommées :**

- **La garde de complétude ne mord que si le porteur publie ses comptes**,
  servis depuis le 2026-08-04 seulement. Une passation antérieure relue telle
  quelle passe avec un total partiel, biaisé vers le bas, donc du mauvais côté
  de trois déclencheurs `<=`. La parade appartient à l'appelant — c'est
  l'étape 5, qui doit recalculer depuis `rawAnswers`.
- La colonne SQL s'appelle `table_signee` et inclut `contradictions`, qui n'est
  pas signée. Le nom promet plus que ce que la donnée porte.
- Le balayage de couverture s'arrête à `web/src/lib/clinical/` et ne voit pas
  `clinical-engine/`.
- Le filtre `paths` de `release-db` capte les `*.test.ts` : une correction de
  commentaire proposera une release.
- Le SHA épinglé ne couvre pas `CONTRADICTIONS_REGLES_ECARTEES_V1`.
- **Le test de mutation du prédicat `D-046` n'a pas pu être joué** —
  `prisma db execute` refusé par le hook de permissions. Que ce prédicat morde
  repose sur les sept cas du banc négatif, pas sur une mutation observée.
- **Piège à faux négatif, consigné pour la deuxième fois** : `--fast` joue
  Playwright contre `next dev`, qui se recycle en mémoire et emporte le test en
  cours. Deux runs, deux victimes différentes, toujours celle qui suit le
  redémarrage. Invisible en T3 et en CI, qui jouent le build.
  `wn-test-worktree.sh:502` pose déjà `PLAYWRIGHT_WEB_SERVER=start` dans le
  chemin complet, jamais dans `--fast`. **Promotion proposée, non écrite** :
  aligner `--fast`, ou faire échouer le harnais avec un message explicite.

## Prochaine action exacte

`/wn-pr apply` sur cette branche — la clôture est faite, la fenêtre est ouverte.
Puis les étapes 3 à 6 du LOT-01, en commençant par trancher les trois
arbitrages ci-dessus : l'étape 5 dépend directement du premier et du troisième.

## Interdits encore actifs

- **Ne jamais faire verdir le préflight par une écriture à la main** sur
  `statut`, `active` ou `prescriptif`. La correction est un arbitrage clinique :
  re-signer la table sans le claim, ou rétablir le claim par le chemin du
  corpus.
- Production en **lecture seule via l'outil MCP Supabase `execute_sql`**,
  jamais `psql` ni Bash.
- Aucune migration n'accompagne ce lot ; ne pas en introduire.
- La revue, le merge et la suppression de branche appartiennent à Copilot.
- `SESSION_LOG.md` est append-only ; les fragments de handoff ne s'écrasent pas.
