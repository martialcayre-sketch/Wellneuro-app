---
paths:
  - "web/e2e/**"
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "web/playwright.config.*"
  - "scripts/wn-test-worktree.sh"
---

# Tests et validation — E2E, paliers, machines

- Une suite Vitest verte ne prouve rien sur les parcours : Playwright est dans
  `test:worktree` seulement.
- **Tout diagnostic de parcours étiquette ses constats** (`D-125`) : *observé sur
  un parcours réel*, *démontré dans le code sans occurrence observée*, ou
  *inconnu faute de preuve*. Un défaut démontré se corrige sans occurrence ; sa
  fréquence ne s'invente pas. Et un état incomplet n'est un défaut que si un
  geste était attendu à ce stade — sur une fixture, cette attente est
  artificielle.
- **T2 et T3 jouent tous deux les E2E contre le build de production** depuis le
  2026-08-11 : `--fast` ne saute plus le build. Sur `next dev`, les E2E étaient
  cinq fois plus lents et emportaient le test en cours à chaque recyclage
  mémoire du serveur — un `--fast` rouge se lisait alors comme une régression.
  L'écart entre les deux paliers est désormais le lint, l'anti-secrets, l'audit
  de campagnes et la certification scoring, pas le build.
- **T3 local est exigé EN ENTIER, segment E2E compris** (`D-233`, 2026-09-19).
  La dérogation qui renvoyait ce segment au CI — `D-049`, du 2026-08-12 au
  2026-09-19 — est **close** : la cause du blocage WebKit local est identifiée
  (2311 bloquait au rang 64 de **création de PAGE** — un bras à contexte unique
  et page neuve bloque au même rang, ce qui exclut le contexte —, sur mise en
  veille de l'écran), corrigée en amont (WebKit 2352) et en service ici
  (Playwright 1.63.0, WebKit 2359). Deux séquences T3 complètes vertes le
  2026-09-18, 101 pages iPhone 13 chacune. **Un test = une page**, d'où la
  signature « un seul test par run, jamais le même ».
- **Un rouge WebKit du CI ne se relance JAMAIS.** Règle posée par `D-155`,
  redomiciliée ici par `D-233` pour ne pas rester accrochée à une décision
  close. Elle ne dépend pas de la panne locale et lui survit : « WebKit
  encountered an internal error » est une erreur **rendue par le moteur**, pas
  une attente qui s'épuise, et aucune requête manquante n'y a jamais été
  constatée. Ni `D-049` ni sa clôture ne l'expliquent. Le relancer fabriquerait
  un vert sans avoir rien instruit.
- **`retries` reste interdit à Playwright**, `D-049` close ou non : un réessai
  transforme un blocage en succès silencieux et emporte avec lui les vrais
  échecs intermittents. C'est le contournement que l'amont recommande pour le
  défaut de WebKit 2359 (`didReceiveInvalidMessage`, « the retry passed ») et
  que ce dépôt refuse — voir `D-233` §5 : ce défaut-là, s'il paraît, est un fait
  **neuf**, pas le retour de `D-049`.
- **Un blocage de la signature `D-049` est désormais un fait NEUF.**
  `scripts/wn-diagnostic-e2e.mjs` le classe toujours (navigation expirée, aucune
  requête émise) et la séquence **reste rouge** — mais nous tournons sur le
  moteur corrigé : il s'instruit, il ne se classe plus.
- **Les E2E (`npm run test:e2e`) sont l'exclusivité du Mac** — base partagée,
  jamais deux runs en parallèle. Rôles : `docs/ROLES_MACHINES.md`.
- `test:worktree` provisionne son PostgreSQL éphémère et son secret de test.
  Prérequis et options : `web/e2e/README.md`.
