# Handoff — 2026-09-18 — Les deux lignes en suspens, posées sur arbitrage

## 1. Branche et état Git

- Branche `wn-regles-revue-et-concurrence-2026-09-18`, partie de `origin/main` à
  `7496842e` (D-228, mergée dans la nuit).
- Écrite dans le **checkout principal**, qui était en `HEAD` détaché sur
  `origin/main` — la branche `main` est prise par le worktree verrouillé
  `correspondance-lot00` (resté à `92537a29`). Deux autres worktrees sont vivants,
  dont `phases-hash-2026-09-16` sur `wn-indications-assiettes-claims-2026-09-18`.
- Lot **documentaire seul** : aucune ligne de code applicatif, aucun banc, aucune
  migration.

## 2. Objectif de la session

Poser les deux lignes de règles que deux sessions se partageaient depuis le
2026-09-17 sans les écrire, faute d'arbitrage — le handoff de 00 h 30 le disait
en toutes lettres (« ne pas l'écrire sans arbitrage, deux sessions l'attendent »).
Le responsable a tranché le 2026-09-18 : les deux se posent.

## 3. Décisions prises

**Aucune au registre.** Deux règles d'opérateur, pas de code : même forme que le
2026-09-16 (`60b1004d`), qui n'avait pas pris de `D-NNN` non plus. Le registre
reste à `D-228`, sans trou.

**Le choix du fichier est le seul vrai arbitrage technique du lot.** Les deux
règles vont dans `docs/claude/REGLES_PR_MERGE.md`, et **pas** dans
`.claude/rules/` :

- La règle de revue y est un **résumé**, dont le détail reste à sa place
  (`.claude/rules/pr-revue-et-release-db.md` §1.1). Recopier le détail aurait créé
  une seconde source à maintenir.
- La règle de concurrence appartient à la section « Attendre le CI », que ce
  fichier porte. La déposer dans `.claude/rules/pr-revue-et-release-db.md` — armé
  sur `.github/**` — l'aurait rendue invisible au geste qu'elle vise : relancer un
  run pendant un merge ne touche aucun fichier.

## 4. Ce que ce lot ferme, et ce qu'il n'atteint pas

- **Ferme** — les trois emplacements d'un constat de revue sont nommés dans le
  résumé lu à chaque merge, `.reviews[].body` compris.
- **Ferme** — le piège de concurrence du CI est écrit quelque part dans le dépôt,
  pour la première fois.
- **N'atteint pas** — aucun banc ne tient ces deux règles : elles portent sur un
  geste d'opérateur. Un `wn-attendre-ci` qui rendrait `2` après une relance
  intempestive resterait le seul signal, et il arrive après la faute.
- **N'atteint pas** — une session qui merge **sans** `/wn-merge` et sans toucher
  `.github/**` ni `web/prisma/**` ne charge toujours pas le détail de §1.1. Le
  résumé de `REGLES_PR_MERGE.md` la couvre désormais, à condition qu'elle l'ouvre.

## 5. Fichiers modifiés

- `docs/claude/REGLES_PR_MERGE.md` — deux ajouts : le corps de revue dans le bloc
  « à lire avec ce document », et un paragraphe « ne jamais relancer un run qui
  n'est pas celui de la tête » dans « Attendre le CI ».
- `changelog.d/2026-09-18-corps-de-revue-visible-et-relance-de-run.md` — fragment.
- `docs/claude/SESSION_LOG.md` — entrée du jour.
- Ce handoff.

## 6. Validations exécutées

Toutes en local, sur la branche, avant l'ouverture de la PR :

- `node --test scripts/wn-coherence-etat.test.mjs` — **29/29**.
- `node --test scripts/ci-invariants.test.mjs` — **10/10** (il garde justement le
  bloc `concurrency` que le nouveau paragraphe cite).
- `node scripts/wn-ancres-doctrine.mjs` — OK, 4 ancres vérifiées.
- `node scripts/lib/decisions-numerotation.mjs` — OK, 228 décisions, sans trou.

`changelog-collate.mjs` **n'a pas été lancé** : sans argument il replie puis
supprime les fragments, et n'a pas de mode `--check`.

## 7. Problèmes ouverts

- **Une prémisse fausse a circulé une journée entière, et venait d'une mémoire de
  session** : « la ligne de `.claude/rules/` §1.1 est invisible d'une session
  voisine, à cause de son `paths:` ». Vérification faite, `/wn-merge` fait
  `cat` du fichier entier à son préambule (`SKILL.md:13`). Le trou réel était le
  résumé, pas la portée. Une portée se lit dans le frontmatter **et** dans ce qui
  charge le fichier.
- **Deux arbitrages du responsable restent ouverts**, tous deux hors code :
  `D-049` (fermer ou attendre) et les deux points RGPD de `D-222` §2. Voir §8.
- **Flake connu**, inchangé : `portail-parcours.spec.ts`, `socket hang up` /
  `ECONNRESET`. À ne pas confondre avec les deux signatures de `D-049`.

## 8. Prochaine action exacte

1. Lire la revue Copilot sur cette PR — **les trois emplacements**, dont le corps
   de revue, ce que ce lot vient précisément d'écrire — puis merger avec
   `--subject`.
2. `D-049` : trancher. La condition de sortie écrite est remplie (cause racine
   identifiée, corrigée en WebKit 2359, montée mergée en `bf852f59`). Ce qui
   retient la fermeture n'est pas la preuve mais son effet : fermer rétablit le
   **T3 local** sur les PR migration/scoring/clinique.
3. `D-222` §2 : la qualification juridique du traitement « correspondance
   médecin », et l'information des patients **déjà consentants** — l'accusé de la
   v9 ne les atteint qu'à leur prochaine visite au portail, et la production dit
   qu'on y entre le jour même ou jamais.

## 9. Interdits encore actifs

- Aucune identité réelle au dépôt ; les dossiers de test se lisent par
  identifiant, jamais nommés.
- Aucun secret en dur ; production en **lecture seule** par conteneur détaché.
- Pas de migration Prisma ni de `schema.prisma` sans demande explicite.
- Aucun contenu clinique du corpus au dépôt tant que G6 est fermée.
- Une signature clinique ne se pose jamais par l'outil.
- `retries` reste interdit à Playwright, `D-049` ouverte ou fermée.
- Force-push, production et arbitrages restent à demander. Autorisation Git
  courante jusqu'au **2026-09-24**.
