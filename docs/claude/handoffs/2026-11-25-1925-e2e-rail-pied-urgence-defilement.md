# Handoff — 2026-11-25 19:25 — E2E du rail latéral : la mesure du pied d'urgence redéfile

## Branche et état Git

- Branche `fix/e2e-rail-pied-urgence-defilement`, worktree
  `.claude/worktrees/e2e-rail-pied-urgence-2`.
- Tirée d'`origin/main` à `29d6ffff`, puis avancée par `--ff-only` à
  `ed4aaf11` après T2.
- Lot hors carnet. Il complète #2353 (mergée `551a5c7b`), demandée par le
  responsable en session de l'intégrateur (« Corrige e2e »).

## Objectif

Que le test « jamais sur le pied d'urgence ; le lien d'évitement passe le
rail » (`web/e2e/portail-rail-lateral.spec.ts`) ne rougisse plus au hasard,
sans rien affaiblir de ce qu'il interdit.

## Décisions prises

- **Ce que montrait le rouge** : le message ajouté par #2353 a parlé au premier
  rouge suivant. Sur #2364 (T2 local, Mac chargé), il a rendu
  `Received: "hors de la fenêtre"` pendant tout le délai de 10 s. Le numéro
  n'était pas recouvert : il était sous la fenêtre. La page s'allongeait après
  le premier `scrollTo`, et la mesure répétée ne redéfilait pas.
  - Constat *observé* sur un run local (rapport Playwright du worktree
    `refonte-lien-com2`).
  - *Inconnu faute de preuve* : quel contenu allonge la page après le premier
    défilement.
- **Correctif** : chaque essai de `expect.poll` appelle d'abord
  `window.scrollTo(0, scrollHeight)`, puis lit `elementFromPoint`. Le premier
  `scrollTo` et le `toBeVisible` restent en place. L'interdit ne change pas,
  et aucun `retries` n'est ajouté.
- **Fragment de changelog** : un fragment neuf. Celui de #2353, déjà mergé,
  n'est pas réécrit.

## Fichiers modifiés

- `web/e2e/portail-rail-lateral.spec.ts`
- `changelog.d/2026-11-25-e2e-rail-pied-urgence-defilement.md`
- Ce handoff.

## Validations exécutées

- T1 complet (`npm run check`) : 0.
- T2 `--fast` : vert en 11 min 13 s, 483 E2E passés, 0 échec. Le test corrigé
  passe en 190 ms sur Desktop Chromium.

## Problèmes ouverts

Deux autres rouges locaux ont été vus ce soir, dans des T2 sous charge, hors
de ce test. Ils ne sont pas instruits ici, et tous deux sont verts dans le CI :

- `portail-rail-lateral.spec.ts:208`, sur #2366 et #2365 (« écritures
  parallèles sur la même fixture », selon la file) ;
- `biologie-saisie-resultats.spec.ts:287` sur iPhone 13 (« Clicking the
  checkbox did not change its state »), sur #2364.

## Prochaine action exacte

Merge par l'intégrateur après « prête », puis surveiller ce test dans les
prochains CI de `main` et dans les T2 locaux.

## Interdits encore actifs

- Pas de `retries` Playwright.
- Un rouge WebKit du CI ne se relance jamais.
- E2E sur le Mac seul.
