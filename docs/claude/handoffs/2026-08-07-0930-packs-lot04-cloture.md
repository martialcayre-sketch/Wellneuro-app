# Handoff — 2026-08-07 — Packs personnalisés : clôture de campagne (LOT-04)

## Branche et état Git

- Worktree : `.claude/worktrees/lot04-packs-cloture`
- Branche : `worktree-lot04-packs-cloture`, basée sur `main` = `63fcbc2f` (#605,
  CI vert sur ce commit).
- Aucun commit posé par cette session : rédaction laissée en arbre de travail.

## Objectif

Clôture **documentaire seule** de la campagne `2026-08-06-packs-personnalises` :
rendre le verdict sur les quatre faits du « Résultat observable », réécrire ceux
dont l'énoncé dépassait la preuve, et loger les dettes restantes.

**Aucun fichier de `web/src/`, `web/prisma/` ou `web/e2e/` n'est touché.**

## Décisions prises

1. **Le parcours E2E manquant part en lot nommé** ; la campagne clôt sur la
   couverture existante et le fait 2 est réécrit pour ne dire que ce qui est
   prouvé — bancs unitaires seulement, **aucune preuve E2E**.
2. **Le fait 2 est restreint au panneau d'orientation.** Le formulaire « Assigner
   un pack à un patient » (`PacksPanel.tsx:483-513`) reste, nommé comme
   survivance assumée : il ne peut plus proposer que « Base de consultation ».
3. **Seule la dette `Q_ALI_09` reçoit un lot** — et ce lot **débloque la campagne
   `2026-08-04-agenda-alimentaire`** (détail en « Problèmes ouverts »). Les
   **cinq** autres dettes sont nommées **sans lot d'accueil**, écrit comme un
   choix ; le décompte annoncé d'abord, « trois », était faux
   (`LOT-03-integration.md:203-213` en datait cinq).

Formalisées en [[D-032]].

## Faits vérifiés, avec leur preuve

Tableau complet, preuve par preuve, en `.../lots/LOT-04-validation.md`. Ici, les
verdicts en abrégé, dont le seul qui ne soit pas entier (fait 4) :

- **Faits 1 à 3 — vérifiés, avec deux restrictions écrites** : le fait 2 est
  **unitaire seulement** (aucune preuve E2E) et **restreint au panneau
  d'orientation** ; le fait 3 ne porte que sur `suggestion.packId`, la branche
  **questionnaire** (`orientationEngine.ts:627`,
  `orientationService.ts:262-264`) restant non instrumentée — dette sans lot.
- **Fait 4** — **partiellement vérifié : dérive survenue et non prévenue.**
  L'invariant « registre relationnel = legacy » **tient** : 6 qids (`Q_MOD_03`,
  `Q_MOD_01`, `Q_INF_03`, `Q_SOM_09`, `Q_ALI_01`, `Q_ALI_09`),
  `pack_questionnaires` aligné à **6 lignes**, relu le 2026-08-07. La
  **non-dérive**, elle, est **démentie** : le LOT-00 mesurait **5 qids** en
  production le 2026-08-06 (`LOT-00-cadrage.md:90-91,119-123`), et
  `packs.updated_at` porte **2026-08-06 18:02:38.913** — horodatage qui ne borne
  que la **dernière** écriture sur la ligne. Ce qui est prouvé : `Q_ALI_09` est
  entré **entre la mesure du LOT-00 (2026-08-06) et 18:02:38.913**, dernière
  écriture connue — donc pendant la campagne, et **avant** l'existence du garde
  `IDS_SUSPENDUS` sur `PATCH` (LOT-03, #604, 2026-08-07). La lecture du
  2026-08-05 consignée en [[D-025]] (« aucun des 8 packs ne le référence »)
  corrobore. **L'auteur du geste est indéterminé** : aucune colonne d'audit, aucun
  document de campagne.

## Fichiers modifiés

Modifiés : `2026-08-06-packs-personnalises/CAMPAGNE.md` (front matter clos, faits
2/3/4 réécrits, « Done » coché sur pièces) ; `.../lots/LOT-04-validation.md`
(`statut: livré`, « Résultats ») ; `docs/DECISIONS.md` ([[D-032]]) ;
`.wn/state.json` + `ACTIVE_CAMPAIGN.md` (bascule d'activité, vue régénérée par
`wn-campaign.mjs sync`). Créés :
`2026-08-07-dettes-packs-residuelles/CAMPAGNE.md` et ses deux lots (LOT-00,
LOT-01), `changelog.d/2026-08-07-packs-cloture-campagne.md`, ce handoff.

## Validations exécutées (lues le 2026-08-07)

- **T1 — `npm run check` : vert (code 0)**, audit de campagnes inclus.
- **Audit de campagnes**, drapeaux du CI : **code 0**, 0 erreur, 1 warning
  préexistant (`duplicate_lot_ordinal` sur `2026-07-11-refonte-ux-shell-3-0`).
- **T3 — `npm run test:worktree` : vert** en 1 min 54 s.
- **CI de la PR : non encore lu** — la PR n'est pas ouverte ; rien n'est
  annonçable tant que `wn-attendre-ci.mjs` n'a pas rendu `0`. `wn-cycle.mjs` et
  `wn-etat-reel.mjs` non lancés.

## Problèmes ouverts

- **Dette avec lot** : `Q_ALI_09` soudé au pack de base. **Deux portes**
  seulement ferment le geste — `questionnaires/route.ts:35` (`.filter(q =>
  q.actif)`, aucune case n'expose le qid) et `PacksPanel.tsx:309-310` puis `:215`
  (l'état stocké repart entier). `packs/route.ts:306-309` **n'est pas une
  porte** : la garde ne juge que les qids **ajoutés** et ne bloque aucun retrait
  (c'est ce qui évite de verrouiller le pack, commentaire `:298-301`) — ne pas la
  « corriger », les Interdits du LOT-00 l'excluent. `portail/valider/route.ts:144-152`
  est la **conséquence** : amputation silencieuse journalisée à chaque
  onboarding. Clinique, actif en production, **et bloquant pour la campagne
  `2026-08-04-agenda-alimentaire`** (`RUNBOOK-allumage-drapeau.md:44-53`). La
  dette « seed à 5 qids » est rattachée au périmètre de ce LOT-00.
- **Dette avec lot** : couverture E2E nulle sur orientation → file d'envoi →
  envoi → déduplication.
- **Cinq dettes sans lot d'accueil**, assumées — énumérées avec leurs références
  de ligne en
  `docs/claude/campagnes/2026-08-06-packs-personnalises/lots/LOT-04-validation.md`,
  section « Cinq dettes nommées, sans lot d'accueil ». Non dupliquées ici.

## Prochaine action exacte

1. ~~T1, T3 et `wn-campaign-audit.mjs`~~ — **faits le 2026-08-07, les trois verts**.
2. ~~Bascule d'activité vers `2026-08-05-cloture-des-dettes-wellneuro-5-0`
   LOT-06~~ — **faite dans cette PR** (`.wn/state.json` puis
   `node scripts/wn-campaign.mjs sync`, qui régénère `ACTIVE_CAMPAIGN.md`).
3. Ouvrir la PR de clôture avec `--body-file`, attendre le CI avec
   `node scripts/wn-attendre-ci.mjs <N>` lancé **nu** (un `; echo "CODE=$?"`
   masque le code de sortie), et ne rien annoncer hors du code `0`.
4. **Après le merge, et uniquement cela** : `node scripts/wn-cycle.mjs --appliquer`
   depuis `main` — il ne réconcilie que les champs `git.*`, puis relance `sync`.

## Interdits encore actifs

- Aucun fichier de `web/src/`, `web/prisma/`, `web/e2e/` dans la PR de clôture.
- Pas de migration, pas de SQL d'écriture, pas de secret.
- Patients fictifs seuls : Sophie Nicola, Jennifer Martin, Michel Dogné.
- Pas d'édition du haut de `CHANGELOG.md` — fragment `changelog.d/` uniquement.
- `ACTIVE_CAMPAIGN.md` ne s'édite jamais à la main : `.wn/state.json` puis `sync`.
