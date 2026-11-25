# Handoff — 2026-11-25 14:30 — E2E du rail latéral : pied d'urgence vérifié jusqu'à stabilité

## Branche et état Git

- Branche `fix/e2e-rail-pied-urgence`, worktree
  `.claude/worktrees/e2e-rail-pied-urgence`, tirée d'`origin/main` à
  `8c86fed7`.
- Lot hors carnet. Le responsable l'a demandé en session de l'intégrateur
  (« Corrige e2e », 2026-11-25), après le signalement des rouges du jour. La
  demande de lot envoyée à l'orchestrateur
  (`20261125-1425-integrateur-orchestrateur-e2e-instable`) est donc servie
  ici.

## Objectif

Rendre stable le test « jamais sur le pied d'urgence ; le lien d'évitement
passe le rail » (`web/e2e/portail-rail-lateral.spec.ts`), sans affaiblir ce
qu'il interdit.

## Décisions prises

- **Ce qui faisait rougir le test** : une mesure unique de
  `document.elementFromPoint`, prise juste après `window.scrollTo`. Le rail est
  `lg:sticky lg:top-4 self-start`, dans la ligne au-dessus du pied : aucun
  recouvrement durable n'est démontré dans le code. Cinq rouges le 2026-11-25
  et un le 2026-11-24, tous sur des diffs sans rapport avec le portail.
  Constat : *démontré dans le code sans occurrence observée* d'un vrai
  recouvrement. *Inconnu faute de preuve* : l'élément exact qui recouvrait le
  numéro, car le rapport Playwright du CI n'a ni capture ni instantané.
- **Correctif** : la mesure passe par `expect.poll(...).toBe('')`, jusqu'à
  stabilité, avec le délai par défaut de `expect`. Ce n'est pas un `retries`,
  qui reste interdit : le test lui-même n'est pas rejoué, seule l'attente d'un
  état est bornée.
- **Message d'échec** : il nomme l'élément qui recouvre le numéro (balise et
  classes), ou « hors de la fenêtre ». Un vrai recouvrement à venir sera donc
  instruit sur pièce.

## Fichiers modifiés

- `web/e2e/portail-rail-lateral.spec.ts` : la mesure du pied d'urgence.
- `changelog.d/2026-11-25-e2e-rail-pied-urgence-stable.md`.
- Ce handoff.

## Validations exécutées

- T1 complet (`npm run check`) : code 0.
- T2 `--fast` (`npm run test:worktree -- --fast`) : vert en 12 min 18 s, 479 E2E passés, 0 échec ; le test corrigé passe sur Desktop Chromium (162 ms).

## Problèmes ouverts

- Si le test rougit encore, le message nommera l'élément qui recouvre le
  numéro. Ce serait alors un vrai recouvrement, à instruire, et non plus un
  aléa de mesure.

## Prochaine action exacte

Merge par l'intégrateur après « prête », puis surveiller les prochains CI de
`main` sur ce test.

## Interdits encore actifs

- Pas de `retries` Playwright.
- Un rouge WebKit du CI ne se relance jamais.
- Les E2E tournent sur le Mac seul, jamais deux en parallèle.
