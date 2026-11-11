# Handoff — 2026-11-11 — Corpus : un claim exclu de la recherche (D-490), migration seule

## Branche et état Git

- Branche `b-claim-non-servi`, dans le worktree `.claude/worktrees/b-bp17-cadre`.
- Avancée par `git merge --ff-only` sur `origin/main` 637d6284 ; aucun commit
  propre avant celui du lot.
- PR 1 sur 3 : **migration seule**. Elle reste à sa file, qui la suit
  jusqu'au constat : ni « prête », ni merge par l'intégrateur.

## Objectif

Question `20261104-2225-b`, due par la file B : la validation d'un claim et
sa visibilité en recherche deviennent distinctes. Un acte journalisé de
l'atelier exclut un claim `VALIDE` de la recherche des rayons, sans toucher
à sa validité. Ensuite, les dossiers clos du besoin 2 sont rattrapés. Ce lot
passe avant la PR « Contenus » de BP-17 (LOT-17, PR 7).

## Décisions prises

- **D-490** (réservée, `refs/tags/reserve/D-490`), statut « accepté ». Elle
  porte trois réponses du responsable, rendues le 2026-11-11 sur questions à
  options :
  - **portée** : la recherche seule. D-140 §7 est précisé : cinq prédicats
    de validité, plus un sixième de recherche. Le nom retenu est « exclu de
    la recherche ». Le refus des options de BP-17 qui citeraient un claim
    exclu revient à la file C (LOT-17, PR 4) ;
  - **rattrapage** : les claims hors parcours sans usage explicite dans
    aucun dossier, plus trois « à relire » nommés (`0044-016`, `0167-023`,
    `0292-003`). La liste exacte est validée par le responsable avant tout
    marquage. Les polyphénols attendent la reconstitution de leur liste.
    Cette réponse remplace l'arbitrage iode du 2026-11-04 ;
  - **porteur** : délégation sur une liste relue. Le patron de D-325 §5 est
    étendu au nouvel acte.
- Forme : migration. L'approbation du plan a valu accord explicite. On a
  retenu une colonne plutôt qu'une clé de `metadata`, parce qu'aucune
  ingestion ne l'apporte.

## Fichiers modifiés

- `web/prisma/migrations/20261111160000_rag_claim_exclusion_recherche_v1/migration.sql`
- `web/prisma/checks/rag_claim_exclusion_recherche_v1_negatif.sql`
- `.github/workflows/ci.yml` (étape « RAG claim exclusion recherche contract »)
- `docs/decisions/D-490.md`
- `changelog.d/2026-11-11-d490-exclusion-recherche-migration.md`
- `docs/claude/plan-journal/F05/2026-11-11-03-exclusion-recherche-d490.md`
- ce handoff

## Validations exécutées

- **Mesure en production** (`one-off-1603`, lecture seule, agrégats) :
  - 199 identifiants hors parcours nommés, dont 198 `VALIDE` et rendus par
    la recherche ;
  - les trois « à relire » aussi ;
  - base : 8 594 `VALIDE` (dont 887 étiquetés), 34 en attente, 92 rejetés.
- **Base locale du worktree** (`wn-dev-db.sh --migrate`) :
  - migration appliquée ;
  - contrats verts : le nouveau, la barrière D-003, l'étiquetage et le
    journal.
- **Mutations rejouées sur le contrat**, toutes rouges :
  - M1, le prédicat retiré de la fonction (« X remonte ») ;
  - M2, `btrim` à un argument (« motif de blancs accepté ») ;
  - M3, `tirage_id IS NULL` retiré (« tirage accepté ») ;
  - M4, l'ensemble des blancs réduit (« blancs typographiques ou
    invisibles ») ;
  - la base est restaurée après chaque mutation, et le contrat intact est
    vert sur une base recréée.
- **T1 complet** : vert (831 tests, aucun secret).
- **T3** : vert (séquence CI complète en 15 min, 357 E2E), joué avant les
  corrections de la revue. Celles-ci ne touchent que le CHECK, des
  commentaires et le contrat ; ce dernier a été rejoué sur une base
  recréée.
- **`wn-reviewer`** : GO avec corrections mineures, toutes traitées.
  - P2-a et P2-b : test du tirage ajouté.
  - P3-a : ensemble des blancs élargi, avec son test.
  - P3-b : formes vides et non textuelles testées.
  - P3-c : commentaire corrigé.
  - P3-d : release à une heure sans usage de l'atelier.
  - P3-e : routé à la PR 2.

## Problèmes ouverts

- Les HP polyphénols : 321 sur 335 ne sont pas nommés dans le dossier
  privé ; ils renvoient aux pièces de l'étape 2. Ils sont à reconstituer
  avant la PR 3.
- La liste commune : les trois réponses du 2026-11-11 y sont inscrites
  (`20261111-1620-b` à `-1622-b`, `repondue`, D-490). La question
  `20261104-2225-b` porte D-490 et reste `repondue` jusqu'au merge du
  rattrapage.
- Le message de coordination à la file C (LOT-17, PR 4), à remettre avec la
  PR 2.
- L'ordre des migrations : #1976 (NF-7, `20261111100000`, plus ancienne)
  est ouverte. Les tables sont disjointes, mais la règle reste un merge de
  migration à la fois, avec le gel de D-374 (`wn-sonde-release-db`).
- Pour la PR 2, sur les commentaires « cinq prédicats » de la fonction
  (`validite.ts:18`, `validite.test.ts:75`), revue P3-e : la fonction en
  porte désormais six, dont un de recherche.
- Pour la PR 3 :
  - une requête de cohérence entre la colonne et le dernier `sens` au
    journal, car la base ne lie pas les deux ;
  - une mesure du nombre de résultats rendus par la recherche après le
    rattrapage (filtre appliqué après l'index HNSW).

## Prochaine action exacte

1. Merger la PR 1.
2. Faire approuver la release-db par le responsable, au créneau qu'il
   choisit.
3. Constater par conteneur :
   - `migrate status` à jour ;
   - la colonne présente ;
   - zéro claim exclu ;
   - le prédicat présent dans `pg_get_functiondef`.
4. Ouvrir ensuite la PR 2, le code de l'atelier :
   - geste individuel et en lot, au patron `etiqueterClaim[sLot]` ;
   - routes `claims/exclusion-recherche[-lot]` ;
   - badge et filtre « Exclu de la recherche » ;
   - bancs.

## Interdits encore actifs

- Production en lecture seule, par `scalingo run -d`.
- Aucun texte clinique, seuil ni dose au dépôt (D-251 §4) ; les listes
  restent au dossier privé.
- Aucun marquage avant que le responsable ait validé la liste exacte.
- Pas de `prisma format`, et `schema.prisma` reste inchangé (tables
  externes).
- Pas de code consommateur avant le constat de la release-db.
