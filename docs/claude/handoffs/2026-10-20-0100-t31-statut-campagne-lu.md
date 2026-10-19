# Handoff — t31 : la vue des campagnes actives lit le statut de la fiche

## Branche et état du dépôt

- Branche `t31-statut-campagnes-lu`, worktree `d281-lot3-portail`, partie de
  `origin/main` (fde0f807). Outillage seul ; nuit en autonomie file A du
  2026-10-19.

## Objectif

Dette t31 du plan (§8, revue CodeRabbit de #1526) : `ACTIVE_CAMPAIGN.md`
écrivait « active » en dur pour la campagne primaire, même quand sa fiche
disait `en_pause`.

## Décisions prises

- `statutDeFiche()` (`scripts/lib/vue-campagnes-actives.mjs`) : premier mot du
  `statut:` de la fiche, sans la parenthèse qui le date ; « inconnu » sans
  fiche ou sans statut lisible.
- Campagne parallèle : le statut de `.wn/state.json` reste prioritaire quand
  l'entrée en porte un (l'état machine est la source) ; sinon celui de la
  fiche, au lieu de « active » en dur.
- Vue régénérée par le rendu lui-même (même lecteur que le garde), sans
  toucher `.wn/state.json` ni lancer `wn-cycle --appliquer`.

## Fichiers modifiés

- `scripts/lib/vue-campagnes-actives.mjs`.
- `scripts/wn-coherence-etat.test.mjs` : deux cas neufs ; la fixture du test
  CÂBLAGE porte le statut de sa fiche.
- `docs/claude/campagnes/ACTIVE_CAMPAIGN.md` (primaire : `en_pause`).
- Plan (ligne t31), changelog, SESSION_LOG.

## Validations exécutées

- `node --test` sur `wn-coherence-etat`, `wn-etat-reel`, `wn-campaign` : 47
  verts. T1 complet : voir la PR.

## Problèmes ouverts

- Aucun.

## Prochaine action exacte

PR, CI, CodeRabbit, merge ; t31 → fait sur la page de suivi de la file A.

## Interdits encore actifs

- Ne jamais éditer `ACTIVE_CAMPAIGN.md` à la main ; `wn-cycle --appliquer`
  est à sens unique.
