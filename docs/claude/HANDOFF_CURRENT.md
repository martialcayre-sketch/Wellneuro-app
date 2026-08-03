# Handoff — 2026-08-03 — Après `wn-cycle` (#549 mergée)

## Git

- `main` synchronisé sur `8cc4ef11`, arbre propre. Worktree principal à jour.
- **PR #549 mergée** (squash, branche distante supprimée, worktree retiré) :
  la fenêtre de clôture d'un lot est désormais outillée.
- Rien en vol. `.wn/state.json` = `idle`, aucune campagne active.
- Ce handoff est écrit depuis un worktree dédié en **PR de doc** : le lot qu'il
  clôt était déjà mergé, il n'y avait plus de PR où l'embarquer. C'est le cas de
  repli documenté, pas le chemin nominal.

## Objectif atteint

Rendre **vérifiable** l'ordre du cycle de lot, au lieu de mémorisé. Le merge est
un squash : `SESSION_LOG.md` et `HANDOFF_CURRENT.md` écrits après lui ne sont
plus dans l'ascendance de `main` et coûtent une seconde PR de doc — ce qui
s'était produit le 2026-08-03 avec #545 puis #547 et #548.

## Ce qui est en place sur `main`

- **`scripts/wn-cycle.mjs`** — rend la phase (`hors-lot`, `travail`, `pret-pr`,
  `pr-ouverte`, `apres-merge`) et le geste suivant. Sorties `0` / `1` (fenêtre de
  clôture ratée) / `2` (hors dépôt). Preuve de merge reprise de
  `nettoyage-branches.sh` ; le diff compte le travail **non committé**, sans quoi
  la clôture serait déclarée absente une seconde après avoir été écrite.
  `--appliquer` resynchronise `ACTIVE_CAMPAIGN.md` et renseigne `git.*` dans
  `.wn/state.json`. Il n'écrit jamais `SESSION_LOG.md` ni `HANDOFF_CURRENT.md`.
- **`scripts/wn-cycle.test.mjs`** — 15 cas sur faits injectés, câblé dans le job
  `verify` (hors filtre `docs_only`, comme le contrôle d'invocations croisées).
- **`/wn-finish` et `/wn-handoff`** chargent le verdict par bloc `!` et portent
  la garde après-merge. Dans `wn-finish` il remplace `git status` +
  `git diff --stat`, qu'il subsume.
- **Ordre explicité** dans `/wn-lot` (étape 6), `/wn-campaign-run` et `CLAUDE.md` :
  `/wn-finish` → `/wn-handoff write` → `/wn-pr` → `/wn-merge`.
- **`wn-campaign.mjs`** — `writeActiveCampaignView()` tronquait le garde « cette
  vue est générée » dans sa branche idle ; rétabli.

## Décisions à ne pas rejouer

1. **La frontière est le merge, pas la suppression de la branche.** Écrire après
   le merge et avant le nettoyage ne sert à rien : sous squash, rien de
   postérieur ne remonte vers `main`.
2. **Un skill ne peut pas en invoquer un autre** (`disable-model-invocation:
   true` + contrôle CI `skill-cross-invocation.mjs`). Le seul chaînage
   exécutable entre deux étapes est un **bloc `!` lançant un script**. Toute
   tentative de « faire enchaîner les skills » par la prose est morte-née.
3. **Écarté** : le handoff après le merge (fenêtre inexistante) ; une PR de doc
   séparée *par défaut* (deux PR par lot) ; un contrôle CI bloquant réclamant le
   handoff sur toute PR de lot (bloquerait les PR de doc et les correctifs
   urgents).

## Validations exécutées

Banc `wn-cycle` 15/15 · `wn-campaign` 6/6 · `skill-cross-invocation` 0 violation
sur 32 skills · `wn-campaign-audit` (7 codes bloquants) 0 · `check_no_secrets` 0
· **T1** vert (70 tests) · **`verify` vert sur #549** (9 min 51 s).

Vérifié sur le réel, pas seulement au banc : depuis la branche squashée, le
script a rendu `apres-merge`, PR #549 reconnue, « clôture et handoff embarqués —
rien à reprendre ».

## Problèmes ouverts

- **Réserve non tranchée** : `--appliquer` écrit `git.branch` dans
  `.wn/state.json` — un nom de worktree éphémère. Committé, c'est du bruit à
  chaque PR et un conflit entre sessions parallèles. Non committé à ce jour ; à
  décider avant d'automatiser la commande plus loin.
- **Angle mort du garde CI d'invocations croisées** : il n'attrape qu'un verbe
  d'une liste fermée dans les 90 caractères précédant la référence, **sur la même
  ligne**. Un retour à la ligne le neutralise (`wn-lot:175-176`, vert), et
  `enchainer` sans circonflexe passe. Vert ne prouve pas l'absence de
  branchement mort.
- Hors ligne (`gh` muet), `apres-merge` ne peut pas être établi : verdict
  partiel, exit 0. Choix assumé — un skill qui ne se charge pas serait pire.
- `scripts/changelog-collate.test.mjs` et `scripts/wn-campaign.test.mjs` existent
  sans être câblés en CI ; ils ne tournent qu'en local.
- `.wn/state.json` reste écrit à la main dans les commits de clôture, et
  `ACTIVE_CAMPAIGN.md` n'est resynchronisé que sur demande explicite.

## Pièges d'environnement

- **Worktree neuf** : `npx prisma generate` avant `npm run check`, sinon
  `@/generated/prisma` manque et le type-check casse en cascade (une douzaine de
  `implicitly any` trompeurs).
- **`gh pr merge` depuis un worktree** échoue sur « main is already used by
  worktree » alors que le merge a atterri. Vérifier `state: MERGED`, ne pas
  relancer.
- Après un `ExitWorktree --remove`, le checkout principal reste sur son ancien
  commit : `git pull --ff-only` avant le lot suivant.

## Prochaine action exacte

Aucun travail en cours. Le prochain lot repart de `main` à jour, dans son propre
worktree. Candidats déjà nommés dans le journal : **LOT-06** (consommateur
praticien de la table d'orientation) ou la **signature de la table de règles V1**
après relecture clinique des six règles.

## Interdits encore actifs

Aucune migration, aucune écriture Supabase, aucun changement clinique n'a été
touché ici. Ne jamais forcer un merge sur une PR gelée en `action_required`
(`enforce_admins` est actif, `verify` obligatoire). Après un merge en squash,
repartir de `main` — jamais de la branche squashée.
