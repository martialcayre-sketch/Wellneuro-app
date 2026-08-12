# Handoff — diagnostic du blocage navigateur E2E

## Branche et état Git

- Branche : `fix/e2e-diagnostic-blocage-navigateur`, vivante, **non poussée**,
  aucune PR. Arbre propre.
- Base : `origin/main` = `e5a1ce60` (PR #661). Deux commits :
  - `0a00badf` — le script, son banc, le branchement au harnais, le fragment ;
  - `90ba3503` — l'entrée `SESSION_LOG`.
- Lot **hors campagne** : `.wn/state.json` n'a pas été touché, le LOT-01 reste
  le lot actif et inachevé.

## Objectif

Rendre exécutable une lecture qu'il a fallu refaire à la main trois fois en deux
jours : un `page.goto` expiré **sans aucune requête réseau** est un blocage du
navigateur, pas un défaut de l'application.

## Décisions prises, et leur raison

- **Le blocage est étranger à tout diff — établi, pas supposé.** La trace donne
  `0-trace.network` **vide** : aucune requête HTTP n'est jamais partie, le
  serveur n'a jamais été sollicité. Ni l'application, ni Prisma, ni PostgreSQL
  ne peuvent expliquer un échec où rien n'a été demandé. Vérifié au passage que
  `trace: 'retain-on-failure'` enregistre bien le réseau — le fichier vide est
  un fait, pas un réglage.
- **Preuve d'attribution close** : le blocage s'est reproduit sur cette branche
  d'outillage, qui ne contient **aucune ligne** du LOT-01.
- **Le script ne décide de rien.** Il n'altère pas le code de sortie ; un run
  rouge reste rouge. Il dit seulement de quoi le rouge parle. Le message le
  formule explicitement, pour qu'un lecteur pressé ne puisse pas y lire « vert ».
- **Lecteur ZIP maison, répertoire central seul, aucune décompression** — évite
  une dépendance à `unzip`, absent d'une Debian minimale.
- **Le harnais avale l'échec du diagnostic** (`|| true`) : le défaut d'un outil
  d'aide au diagnostic ne doit jamais masquer l'échec qu'il commente.

## Écarté, et pourquoi

- **`retries`** : ferait de ce blocage un succès silencieux, et emporterait avec
  lui les vrais échecs intermittents — précisément ce qu'on veut voir.
- **Montée Playwright 1.61.1 → 1.62.1** : rien ne relie ce blocage à un
  correctif amont. Monter sur une supposition ne se distingue pas d'un tirage
  au sort.
- **Deux hypothèses suivies puis jetées** : la réouverture de connexion Prisma
  (la ligne de log appartenait au processus du pas suivant) et « aucun log
  serveur pendant le blocage » (les tests 126→136 n'en produisent aucun non plus
  et passent).

## Fichiers

- `scripts/wn-diagnostic-e2e.mjs` — nouveau.
- `scripts/wn-diagnostic-e2e.test.mjs` — nouveau, 11 cas.
- `scripts/wn-test-worktree.sh` — branchement dans la branche d'échec des E2E ;
  correction du bloc d'en-tête qui annonçait encore que `--fast` saute le build
  (démenti par PR #661 elle-même).
- `web/package.json` — banc enregistré dans `bancs-outillage-check`.
- `changelog.d/2026-08-12-diagnostic-blocage-navigateur-e2e.md`.
- `docs/claude/SESSION_LOG.md`.

## Validations exécutées

- **T1 vert** — 307 bancs `node --test` contre 296 avant.
- **Banc du diagnostic 11/11**, et **rougissant sous ses trois mutations**
  (champ de taille compressée au lieu de décompressée ; garde réseau retirée ;
  garde `goto` retirée). Un cas dissocie compressée et décompressée, sans quoi
  des archives « stockées » laisseraient passer un lecteur visant le mauvais
  champ.
- **Script vérifié deux fois sur des traces réelles**, dont une produite par le
  harnais lui-même pendant ce lot.
- `bash -n` sur le harnais.
- **T3 sort en 1** — et n'est pas présenté autrement. C'est ce run qui a validé
  le diagnostic en conditions réelles.

## Problèmes ouverts

- **La cause racine est hors de notre code et non identifiée.** Signature :
  macOS, projet iPhone 13 (WebKit), queue de suite, charge machine soutenue ;
  jamais observée en CI (Linux). Six runs, quatre blocages ; les deux verts
  datent d'avant 21 h le 2026-08-11.
- **Le palier T3 local n'est atteignable sur aucune branche de ce Mac.** Or la
  règle du dépôt l'exige avant une PR migration/scoring/clinique — la classe du
  LOT-01. **Arbitrage utilisateur en attente**, trois voies soumises : le CI
  fait autorité tant que le blocage dure ; un run machine réellement au repos
  (Chrome fermé) pour tester l'hypothèse de charge ; ou pousser d'abord cette
  branche pour ce que le CI en dira.
- **Promotion proposée, non écrite** : un banc d'invariant sur l'accord entre le
  texte d'usage du harnais et son code (patron existant :
  `ci-invariants.test.mjs`, `parite-check-ci.test.mjs`). Deux commentaires
  démentis par leur propre commit en deux jours. Faiblesse assumée : ce genre de
  banc épingle une formulation et se contourne en reformulant.
- **Décision structurante candidate, non écrite** : « le CI fait autorité sur le
  palier E2E tant que le blocage local dure » appartiendrait à
  `docs/DECISIONS.md` — mais elle n'est pas rendue.

## Prochaine action exacte

Rendre l'arbitrage sur le palier T3. Ensuite seulement `/wn-pr apply` sur cette
branche.

Le LOT-01 est intact et attend ailleurs : étape 6 commitée sur
`campaign/2026-08-10-chaine-t0/lot-01-etapes-3-6` (389 fichiers / 4412 tests
verts, T1 vert), étapes 3 et 5 bloquées sur trois arbitrages cliniques — la
valeur `importance` de C-STR, la fenêtre temporelle entre passations comparées,
et la cohabitation à l'écran de C-STR avec `R2-STR-01`.

## Interdits encore actifs

- **Ne pas ajouter de `retries`** à la configuration Playwright pour faire
  verdir ce blocage.
- **Ne pas rejouer T3 jusqu'au vert** : un vert obtenu ainsi ne vaut rien.
- **Ne pas réinstruire l'attribution** : elle est close, preuves ci-dessus. Si
  le diagnostic parle, l'enquête est déjà faite.
- **Rien n'est poussé** : push, ouverture et merge de PR restent sur demande
  explicite ; la revue et le merge appartiennent à Copilot hors autorisation
  transitoire.
- **Ne jamais lire la production autrement que par l'outil MCP Supabase
  `execute_sql`.** Aucune migration Prisma ni modification de `schema.prisma`
  sans confirmation explicite.
