### Corrigé

- **Les 32 blocs `!` de skills qui désignaient un chemin du dépôt sont ancrés à la
  racine** (`cd "$(git rev-parse --show-toplevel)" &&`). Ils étaient écrits comme si
  la session tournait depuis la racine ; lancée depuis `web/`, **27 d'entre eux
  rendaient une sortie vide avec un code de retour 0** — mesuré, pas estimé — et 5
  seulement échouaient bruyamment. `/wn-route`, `/wn`, `/wn-lot`, `/wn-finish`,
  `/wn-ultra` et les six `/wn-rN` croyaient lire l'état du dépôt, ne lisaient rien,
  et planifiaient sur du vide.
- **`/wn-auto` lisait `docs/roadmap.md`, qui n'existe pas** — le bloc serait resté
  muet même ancré. Il lit désormais `docs/ROADMAP_PRODUIT.md` et
  `docs/ROADMAP_TECHNIQUE.md`, les deux fichiers réels.

### Ajouté

- **`scripts/lib/skill-bang-cwd.mjs`** — contrôle bloquant du CI : un bloc `!` dont
  un jeton désigne un chemin **existant à la racine du dépôt** doit être ancré. La
  détection interroge le dépôt plutôt qu'une liste de préfixes — une première
  version listait six marqueurs et laissait passer `./scripts/`, `web/`,
  `changelog.d/`, `tools/`, `CHANGELOG.md`, c'est-à-dire des blocs muets sous un CI
  vert. Banc de 17 cas (`skill-bang-cwd.test.mjs`), câblé dans le job `verify`
  **hors filtre `docs_only`** — une PR qui ne touche que des `SKILL.md` est classée
  documentaire, et gater ce contrôle reviendrait à ne jamais l'exécuter sur les PR
  qu'il vise.
