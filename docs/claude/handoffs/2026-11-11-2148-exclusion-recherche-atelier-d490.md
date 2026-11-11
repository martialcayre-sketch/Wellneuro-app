# Handoff — 2026-11-11 — Corpus : le geste « exclure de la recherche » à l'atelier (D-490, PR 2 sur 3)

## Branche et état Git

- Branche `b-exclusion-recherche-atelier`, dans le worktree
  `.claude/worktrees/b-bp17-cadre`, créée depuis `origin/main` 3b9e318.
  L'ancienne branche `b-claim-non-servi` (PR 1, #1992) est mergée.
- PR 2 sur 3 : **code seul**, sans migration. La PR est déclarée « prête
  @<sha> » et l'intégrateur la merge (D-373, D-454).

## Objectif

Livrer le geste journalisé de D-490 §3 après l'application de la migration
(#1992, release-db du run 43069360191, constat vert one-off-2352) :

- exclure de la recherche un claim `VALIDE`, ou l'y rétablir, en individuel
  et en lot ;
- routes praticien, atelier et bancs.

Aucun marquage en production dans ce lot.

## Décisions prises

- **D-490** (acceptée), sans changement. Les trois réponses du responsable
  du 2026-11-11 (portée, rattrapage, porteur) ne sont pas reposées.
- **Motif jugé plus strictement que le CHECK.** À l'écran et sur la route, le
  motif est vide dès qu'il ne contient que des blancs Unicode (`\s`) ou des
  espaces sans chasse. Ce contrôle couvre tout l'ensemble que retire le
  `btrim` de la base. Un motif accepté à l'écran ne finit donc jamais en 500.
- **Un claim déjà dans l'état visé ne crée aucun acte**, en individuel
  (`inchange`) comme en lot (`inchanges`). C'est le patron de D-325 §3 : un
  double clic ou un renvoi n'ajoute rien au journal.
- **Format de la liste collée** : `WN-CL-…[@vX.Y] ; motif`, un claim par
  ligne.
  - La ligne est coupée au premier séparateur (`;`, tabulation ou `|`), si
    bien que le motif peut contenir d'autres séparateurs.
  - Le sens est fixé pour tout le geste ; le motif est donné par ligne, car
    c'est la provenance de chaque claim.
- **Filtre « Exclus de la recherche seulement »** :
  - il n'existe que dans l'onglet Validés ; la route refuse `exclu=1`
    ailleurs ;
  - une recherche par identifiant le remet à zéro, pour que le renvoi d'une
    recherche vide ne désigne pas l'onglet ouvert.
- **Remise en attente** : un claim exclu qu'on remet en attente garde sa
  marque. On ne peut rétablir qu'un claim `VALIDE` (garde de la route). Ce
  comportement est conservé tel quel ; il est consigné ici, sans être
  arbitré.

## Fichiers modifiés

Lib :
- `web/src/lib/rag/claims/exclusionRecherche.ts` (neuf, module pur) et son
  test ;
- `web/src/lib/rag/claims/revue.ts` :
  - `elementJournalExclusion`, `exclureDeLaRecherche`,
    `exclureDeLaRechercheLot` ;
  - `excluRecherche` dans `ClaimEnRevue` et dans le filtre de
    `listerClaimsRevue` ;
- `web/src/lib/rag/claims/revue.test.ts`.

Routes :
- `web/src/app/api/praticien/corpus/claims/exclusion-recherche/route.ts`, et
  son test ;
- `web/src/app/api/praticien/corpus/claims/exclusion-recherche-lot/route.ts`,
  et son test ;
- `web/src/app/api/praticien/corpus/claims/route.ts` (paramètre `exclu`), et
  son test.

Atelier :
- `web/src/components/corpus/AtelierCorpusPanel.tsx` (badge, filtre, geste),
  et son test ;
- `web/src/components/corpus/ExclusionRechercheLotPanel.tsx` (neuf), et son
  test ;
- `web/src/components/corpus/AtelierCorpus.tsx` (montage du panneau).

Commentaires (revue P3-e de la PR 1) :
- `web/src/lib/rag/claims/validite.ts` : commentaires seuls ;
- `web/src/lib/rag/claims/validite.test.ts` : commentaire, plus une
  assertion qui vérifie l'absence de `exclu_recherche` ;
- `web/src/lib/supplement-library/rayonCorpus.ts` : commentaire.

Banc PostgreSQL :
- `web/scripts/banc-exclusion-recherche-prisma.test.ts` (neuf) ;
- `.github/workflows/ci.yml` (étape « Search exclusion writer bench ») ;
- `scripts/wn-test-worktree.sh`.

Clôture :
- `changelog.d/2026-11-11-d490-exclusion-recherche-atelier.md` ;
- `docs/claude/plan-journal/F05/2026-11-11-04-exclusion-recherche-atelier.md` ;
- ce handoff.

## Validations exécutées

- **Vitest ciblé** : vert, avec la lib, les routes, la liste, les deux
  panneaux et `validite.test.ts`.
- **Banc PostgreSQL** sur la base du worktree (`wn-dev-db.sh --migrate`) :
  vert, points 0 à 5. Le point 4 passe par le vrai `servirRayonCorpus`,
  `fetch` des embeddings substitué et configuration RAG factice : le claim
  exclu est absent du rayon, son jumeau présent, et `claimsValidesAuCorpus`
  le tient pour valide.
- **Mutations**, toutes deux rouges :
  - M1 : le prédicat `exclu_recherche = false` retiré de la fonction rougit
    le point 4. La fonction a été restaurée, et son prédicat constaté par
    `pg_get_functiondef` ;
  - M2 : le refus d'un claim non `VALIDE` retiré du lot rougit le point 3.
    Le code a été restauré.
- **T1 complet** (`npm run check`) : vert.
- **T3** (`npm run test:worktree`) : deux passages rouges, aucun sur ce
  diff, E2E non atteints.
  - 1er passage : un timeout à 5 s dans
    `patient-cockpit/ProtocolMiniBuilder.test.tsx`.
  - 2e passage : cinq timeouts dans ce même fichier, plus le test de durée
    de `export-dossier/masquage.test.ts`. La charge moyenne de la machine
    était à 44, à cause de suites concurrentes d'autres sessions.
  - Rejoué seul, `ProtocolMiniBuilder.test.tsx` est vert (94 tests).
  - 3e passage (charge moyenne 6 au départ, 18 à l'arrivée) : un seul
    échec, encore un timeout à 5 s dans `ProtocolMiniBuilder.test.tsx`.
  - Aucun de ces fichiers n'est touché par le diff, et
    `ProtocolMiniBuilder` n'a pas changé depuis le 2026-10-25. C'est un
    fichier jsdom lourd (12 s à lui seul), sensible à la charge.
  - Le CI de la tête est vert, E2E compris. Le verdict final de T3 est
    consigné en commentaire de la PR.
- **Revue de tête** :
  - CodeRabbit : statut « skipping » (moins de 10 étoiles), puis « Review
    rate limited » à la demande manuelle.
  - Copilot : quota présumé épuisé (`wn-revue-copilot --quota`, refus sur
    #1942).
  - PR-Agent : non probant (`wn-revue-pr-agent` rend 1 : « pruning diff »,
    « Review coverage », runs sur commentaire concurrents).
  - Dérogation D-448 : `wn-reviewer` remplace les robots. Son GO porte sur
    `9aa1073`, et sur l'écart depuis `7d2e4d1`.
  - Son P3 restant est corrigé : une assertion fixe le délai de 30 s du geste
    individuel.

- **`wn-reviewer`** sur 7d2e4d14b : GO avec corrections mineures, sans P1 ni
  P2.
  - P3-1, corrigé : un motif contenant un caractère nul, ou une moitié de
    paire de substitution isolée, passait l'écran puis échouait en base. Il
    est désormais refusé, avec un test.
  - P3-2, corrigé : le geste individuel attend désormais 30 s, comme le lot,
    sous un verrou tenu par un lot.
  - P3-3, corrigé : le banc vérifie aussi l'absence du passage avant
    d'écrire. Le geste individuel y est rejoué (aucun acte) et refusé sur un
    claim en attente.
  - P3-4, écarté : les lignes sans chiffre sont ignorées par conception
    (en-têtes et séparateurs), ce que l'en-tête du module documente. Une
    ligne de claim porte toujours des chiffres.
  - Tests ajoutés : exclusivité des gestes armés entre deux claims.
  - Deux versions d'un même claim dans un lot sont refusées en 422 (doublon
    de `claimId`). C'est le patron de l'étiquetage en lot ; on le garde.

## Problèmes ouverts

**Questions de la revue pour le responsable** (D-490, pas ce diff) :
- **Q1.** Un claim exclu, remis en attente puis revalidé, revient exclu,
  sans acte nouveau (le badge le montre). Faut-il garder ce comportement ?
  D-490 §3 ne traite que les nouvelles versions.
- **Q2.** Le filtre « exclus seulement » n'existe que dans l'onglet Validés,
  si bien qu'on ne peut pas lister un claim rejeté et exclu.

**Coordination avec la file C (LOT-17, PR 4).** À remettre avec la PR, et
reporté dans un commentaire de celle-ci :

> La file B livre D-490 : un claim `VALIDE` peut porter
> `rag_corpus_claims.exclu_recherche = true`. Il ne remonte alors plus par
> `match_wellneuro_rag_claims`, mais il reste valide pour
> `claimsValidesAuCorpus` (D-490 §2). La marque ne refuse donc **pas** une
> option BP-17 qui cite un tel claim. Ce refus est un contrôle distinct, qui
> revient à la PR 4 de LOT-17 (« contrôles et garde ») : lire la colonne
> `exclu_recherche` du couple identifiant-version cité, et refuser l'option
> si elle est vraie. Une nouvelle version d'un claim n'hérite pas de la
> marque (§3). Les claims seront marqués par la PR 3 de D-490 (rattrapage),
> pas avant.

**PR 3 (rattrapage)**, hors de ce lot :
- reconstituer la liste des polyphénols (321 sur 335 ne sont pas nommés) ;
- établir la liste exacte, dédoublonnée et contrôlée par conteneur contre les
  usages explicites ;
- la faire valider par le responsable ;
- exécuter le geste en lot par délégation depuis Chrome ;
- constater par conteneur ;
- écrire une requête de cohérence entre la colonne et le dernier `sens` au
  journal ;
- mesurer le nombre de résultats rendus après le rattrapage (filtre appliqué
  après l'index HNSW).

**Liste commune** : la question `20261104-2225-b` reste `repondue` jusqu'au
merge du rattrapage.

## Prochaine action exacte

1. Lire la revue sur la tête : CodeRabbit, sinon Copilot (`--quota`), sinon
   PR-Agent prouvé. Puis `wn-reviewer`.
2. Donner un verdict à chaque remarque.
3. Déclarer « prête @<sha> » ; l'intégrateur merge.
4. Ensuite, la PR 3 : préparer la liste au dossier privé, sans marquer.

## Interdits encore actifs

- Production en lecture seule (`scalingo --app wellneuro run -d`).
- Aucun marquage en production avant la liste exacte validée par le
  responsable, et par délégation seulement (D-490 §6).
- Aucun texte clinique, libellé, seuil ni dose au dépôt (D-251 §4) : les
  listes et classements restent au dossier privé.
- Ni signature ni arbitrage par l'assistant.
- Pas de `prisma format` ; `schema.prisma` inchangé.
- Session concurrente : `git`/`gh` en direct, sans `/wn-*`.
