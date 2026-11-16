# Handoff — lot `autonomie-pieges-restes`, correctif de la partie 3 : garde des flux Anthropic allégée (2026-11-17)

## 1. Branche et état Git

- Branche `fix/garde-flux-borne-leger`, tirée d'`origin/main` 1f48afd6 (#2204). Elle a ensuite été avancée par `--ff-only` jusqu'à aa4500ba (#2207). Worktree : `.claude/worktrees/orch-ci`.
- #2207 (`d33-lever-plan`), le lot précédent de la même session, est mergée.
- Correctif de banc limité à `web/src/lib/anthropicFluxBorne.guard.test.ts`. Aucun code de production, aucune migration, rien de clinique.

## 2. Objectif

Répondre au signalement `20261117-0040-integrateur-d-garde-flux`. `wn-controle-fusion` juge « instable » la garde de la partie 3 (#2192) : elle est rouge, puis verte au rejeu, sur `main` 15f9d4a9. Elle bloque tout merge dont le contrôle est requis.

## 3. Décisions prises

- **Cause mesurée.** Le banc masquait chaînes et commentaires dans les 2 237 fichiers de `src/`. Seul, il prenait 1 561 ms. Sous la charge du contrôle, il dépassait le délai Vitest de 5 s. Or 4 fichiers seulement contiennent un appel brut. L'hypothèse de l'intégrateur est confirmée.
- **Correctif : alléger la lecture plutôt que poser un délai explicite.** Un fichier est sauté avant le masquage s'il ne contient, dans son texte brut, ni `messages.stream(` ni `messages.create(`. La garde n'est pas affaiblie : le masquage ne fait que retirer du texte, donc un fichier sans appel brut n'a pas d'appel masqué. Le contrôle des écarts entre texte brut et texte masqué (`incertains`) ne perd rien non plus. Le banc prend désormais 85 ms.
- Les témoins sont inchangés.

## 4. Fichiers modifiés

- `web/src/lib/anthropicFluxBorne.guard.test.ts`
- `changelog.d/2026-11-17-garde-flux-borne-leger.md`
- ce handoff

## 5. Validations exécutées

- `npx vitest run src/lib/anthropicFluxBorne.guard.test.ts` : 3 tests sur 3 verts, en 85 ms contre 1 561 ms avant le correctif.
- T1 complet (`npm run check`) : code 0, aucun échec. `check_no_secrets` OK.

## 6. Problèmes ouverts

- La partie 5 du lot reste à faire : les pièges suivants du titre, selon le motif du carnet.
- Après le merge, il faudra reconstater que `wn-controle-fusion` ne juge plus la garde instable sur `main`.

## 7. Prochaine action exacte

1. Commit, push, PR (`--body-file`), `wn-attendre-ci` en fond, puis la preuve PR-Agent (`wn-revue-pr-agent.mjs`).
2. Donner un verdict à chaque commentaire, puis déclarer « prête @<sha> » sur la PR et dans le registre (boîte `integrateur`). Passer le signalement `20261117-0040-integrateur-d-garde-flux` à `traite`.
3. Partie 5 de `autonomie-pieges-restes`.

## 8. Interdits encore actifs

- Ne pas allonger le délai à la place de traiter la cause, et pas de `retries`.
- Rien dans `web/src/lib/clinical/`, aucune migration, pas de `prisma format`.
- Aucune écriture en production.
