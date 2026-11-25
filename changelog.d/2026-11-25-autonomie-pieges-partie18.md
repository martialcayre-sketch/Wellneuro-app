### `wn-attendre-ci` : un e2e lent n'est plus « jamais créé », et l'attente juge la tête qu'on vient de pousser (autonomie-pieges-restes, partie 18, 2026-11-25)

Deux pièges du script dont le code `0` seul autorise « prête ».

- **E2E lent** : `verify` a `needs: [controles, typage-tests, e2e]` et
  n'existe qu'à la fin de ces jobs. Quand l'e2e traînait (#1649, installation
  de Playwright, 20 à 45 min), le script sortait à l'expiration en `2`
  (« JAMAIS créé, non diagnosticable »), lu comme un dispatch manqué. Il lit
  désormais, à ce moment-là seulement, les jobs non conclus des runs CI
  (`ci.yml` seul : un PR-Agent en cours ne prouve rien) du commit de tête :
  s'il y en a, il sort en `3` en nommant chaque job, son statut et son
  étape en cours (« relancer l'attente seule, sans pousser »). Même règle pour
  un `verify` annulé dont le remplaçant tourne. Une cause qui empêche le run
  (conflit, Copilot, branche squashée) reste le diagnostic ; jobs illisibles
  ou aucun en cours : `2` inchangé.
- **Tête périmée** : lancé dans la foulée du `git push`, le script pouvait
  lire l'ANCIENNE tête de la PR et rendre un verdict sur elle (#1338 : `2`
  CONFLICTING). Lancé depuis la branche de la PR, il attend que GitHub porte
  le HEAD local avant tout verdict (PR du dépôt même, jamais d'une fourche ;
  avertit si ce HEAD n'est pas poussé) ; ailleurs, `--sha <7 à 40 hex>` (ou
  `--sha=`) le demande, mal formé : usage, code `4`. Atteinte, ou dépassée
  par un commit qui en descend (poussée du handoff pendant l'attente, commit
  de tiers), la tête attendue tombe et la tête GitHub refait foi. À
  l'expiration : `3`, les deux sha nommés. Sans l'un ni l'autre (copie
  principale sur `main`) : inchangé.
- **`0` n'est atteignable par aucun chemin neuf** : les deux correctifs
  ajoutent une attente ou changent un `2` en `3`.
- **Banc** `scripts/wn-attendre-ci.test.mjs` : 58 cas (18 neufs), plus
  `headRefName` gardé au banc de `scripts/lib/gh-rest.mjs` ; mutations
  nommées au handoff. `REGLES_PR_MERGE.md` (table des codes, tête
  attendue) et `.claude/rules/pr-revue-et-release-db.md` suivent.
