# Handoff — 2026-09-30 — Calendrier de suivi ancré sur la diffusion, lot 3b : jalons d'objectif (D-255)

## 1. Branche et état Git

`feat/calendrier-suivi-3b`, worktree `.claude/worktrees/deploy-anti-recul-lot1`,
partie de `origin/main` à `f2560b7a` (#1266, lot 3a). Un merge à la fois.

## 2. Objectif

- Compter les étapes d'objectif depuis le jour 0 du suivi (`D-255`), au
  portail comme au cockpit.
- Consigner l'arbitrage « pivot » rendu sur la revue de #1266.

## 3. Décisions prises

- **Arbitrage du responsable** (revue de #1266) : après un pivot, un jalon de
  mesure déjà confirmé reste acquis. La base n'admet qu'une mesure par jalon
  et par cycle. Seuls les jalons restants repartent du pivot. Rouvrir toutes
  les mesures est écarté.
- **Étapes d'objectif** : elles partent du jour 0 du cycle courant ; sans
  diffusion, aucune ne s'ouvre. Le motif patient est inchangé.
- **E2E** : la fixture pose aussi une version relue et son approbation, à la
  date de l'ancre.

## 4. Fichiers modifiés

- `web/src/lib/protocol/calendriersPersistes.ts` : `jourZeroDuCycleCourant`.
- `web/src/lib/protocol/jalonObjectifDu.ts` : commentaires, sans changement de
  logique.
- Routes : `portail/dossier` (GET et garde du POST), `praticien/objectifs`
  (GET).
- `web/e2e/helpers/db.ts`, `web/e2e/globalSetup.ts`.
- Bancs : `jalonDu.test.ts` (pivot acquis), `calendriersPersistes.test.ts`,
  `portail/dossier/route.test.ts`, `praticien/objectifs/route.test.ts`.
- `docs/DECISIONS.md` (deux compléments à `D-255`), changelog, ce handoff,
  SESSION_LOG.

## 5. Validations exécutées

- Bancs des routes touchées : verts (portail dossier, 212 tests ; objectifs,
  104 tests).
- Mutations : 6 jouées, toutes détectées.
- T1 et T2 (E2E compris) : voir la PR.

## 6. Problèmes ouverts

- 3c : bandeau (« Jour n du protocole ») et résumé des trajectoires.
- Lot 4 : garde serveur au POST du cockpit ; rail « Suivi » et panneau J21
  sans protocole.

## 7. Prochaine action exacte

PR du lot 3b, CI, revue Copilot, merge, déploiement constaté. Puis le lot 3c.

## 8. Interdits encore actifs

- « Un merge à la fois » (D-248).
- Aucune fenêtre ni tolérance modifiée ; rien sous `lib/clinical/`.
- Les fixtures E2E ne visent que des identifiants réservés, jamais un dossier
  réel.
- Ne jamais confirmer un J21 pour débloquer une saisie.
