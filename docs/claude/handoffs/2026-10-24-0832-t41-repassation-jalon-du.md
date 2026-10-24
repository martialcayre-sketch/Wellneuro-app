# Handoff — t41 : la re-passation ciblée atteignable au jalon dû

## Branche et état du dépôt

- Branche `lot/t41-repassation-jalon`, worktree `d281-lot3-portail`, partie
  de `origin/main` à 5aa5ceec. Session concurrente de la file A, cycle en
  `git`/`gh` direct.
- Deux commits de code (c6757617, f8138dd8), puis la clôture. Aucune
  migration, donc aucune release-db.

## Objectif

Au jalon dû, la route cockpit rend `proposal_required` et l'écran n'a pas de
carte : la re-passation ciblée (LOT-07, D-058) ne recevait ni les `needIds`
du candidat visé ni les besoins visés d'une priorité posée (D-338 §3, t39).
Il fallait transmettre la sélection de l'épisode confirmé de l'ancre, lue par
`lireSelectionPriorite` avec ses contrôles d'applicabilité, et la réserver à
la re-passation.

## Décisions prises

- **Ce qui voyage** : `repassationAncre: { needIds, besoinsVises }` sur
  `proposal_required`, et rien d'autre (ni la carte, ni le motif, ni le
  candidat). Le champ n'est posé que sur un jalon de mesure, en lecture
  présente, quand la carte de l'ancre se rejoue.
- **Même chemin que l'écran de l'ancre** : proposition de l'ancre (avec
  `ancreCycle` à `null`), épisode persisté, `lireSelectionPriorite` et le
  repli `construireChaineC1Tolerante`. La proposition doit désigner la ligne
  de `ancreCourante`. Une sélection écartée fait retomber la cible sur la
  priorité proposée, comme à l'écran.
- **Une seule dérivation** : `besoinsDeRepassation` (dans
  `lib/protocol/repassationCiblee.ts`, module pur), lue par l'écran et par la
  route. Elle rend les tableaux de la carte ou un vide partagé, donc des
  références stables.
- **Rejeu factorisé** (`episodePersisteRejouable`, `rejouerChaine`), à
  comportement constant pour le jalon demandé.
- **Ancres lues une seule fois** pour la proposition du jalon et pour la
  cible (P2 de la revue).
- **Écarté** : relire l'épisode de l'ancre sans repasser par sa proposition,
  pour contourner la limite des cycles rouverts (voir « Problèmes ouverts »).
  La cible divergerait de la carte que l'écran de l'ancre sert.

## Fichiers modifiés

- `web/src/app/api/praticien/cockpit/route.ts` et `route.test.ts` (dix bancs
  neufs).
- `web/src/lib/protocol/repassationCiblee.ts` et son test.
- `web/src/components/patient-cockpit/ClinicalRuntimeSection.tsx` et son test.
- `changelog.d/2026-10-24-t41-repassation-jalon-du.md`, ce handoff,
  `SESSION_LOG`.

## Validations exécutées

- **T1** rapide et complet : verts.
- **Vitest ciblé** : route 85/85, cockpit et fiche 1 048/1 048,
  `ClinicalRuntimeSection` 62/62.
- **T3** : vert en 6 min 37 s sur f8138dd8, 282 E2E compris.
- **`wn-reviewer` (fort risque)** : GO avec réserves, aucun P0.
  - P1 (limite du rejeu des cycles rouverts) : documentée dans le fragment et
    dans le code, figée par un banc.
  - P2-1 (double lecture des ancres) : corrigée.
  - P2-2 (coût) et P2-3 (bascule après la confirmation du J21) : écartées
    avec motif. Le coût correspond à une lecture à l'ouverture de l'écran, et
    la bascule est antérieure au lot, qui ne règle que le cas sans carte.
  - Tests ajoutés : cycle rouvert (la cible vient du `T1`) et limite figée.

## Problèmes ouverts

- **Rejeu des ancres de rang 1 et plus** (défaut D-118 antérieur au lot,
  démontré dans le code sans occurrence observée). `dateDeReference` date un
  `T1` sur la réponse la plus récente. Une passation arrivée après sa
  confirmation le rend donc non rejouable : l'écran du `T1` perd sa carte, et
  la cible de re-passation manque, comme avant t41. Ce défaut est à router
  par le responsable, sur une ligne du suivi de la file A. Le banc
  « une passation arrivée après le `T1` fait perdre la cible » devra alors
  être inversé.
- **Q1 de la revue**, non tranchée : après la confirmation du J21, la
  re-passation du J42 vise la carte du J21 (sans sélection), pas la sélection
  de l'ancre. Ce comportement est antérieur au lot.

## Prochaine action exacte

CI (`node scripts/wn-attendre-ci.mjs <N>`), revue CodeRabbit sur le sha de
tête, vérification qu'aucune release-db n'attend, merge
`--match-head-commit`, observation du déploiement, puis t41 « fait » au
suivi de la file A.

## Interdits encore actifs

- Un merge à la fois, aucun auto-merge.
- Ne jamais redéployer une image antérieure à 257807e3.
- Ne pas toucher aux branches `lot/file-a-suivant`,
  `j3-12d-badges-preuve-masques` et `lot/t23-restes-verificateur`, ni aux PR
  ou release-db des autres sessions.
- Hors périmètre : t36, m38, et l'allumage de `WN_CONSTAT_BESOIN`.
