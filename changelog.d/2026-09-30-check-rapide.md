### T1 : `check:rapide` après chaque édition, `check` complet avant chaque commit (2026-09-30)

- **Mesure** (`npm run check`, 61 s) : trois postes font 46 s et ne regardent
  qu'une partie du dépôt — bancs d'outillage (21 s), banc des hooks (16 s),
  anti-secrets du dépôt entier (9 s). Type-check (2,6 s, incrémental), lint,
  Vitest ciblé, scoring et certification restent sous 5 s.
- **`npm run check:rapide`** (`scripts/wn-check-rapide.mjs`) lit la liste
  dans le script `check` — une étape ajoutée à `check` y entre d'office — et
  ne rend conditionnels que les trois postes lourds : bancs d'outillage si le
  diff touche `scripts/` ou `.github/`, banc des hooks s'il touche
  `.claude/hooks`, `.claude/agents` ou `.claude/settings.json`, anti-secrets
  du dépôt entier jamais (sa passe `--staged` reste jouée). Aucun garde
  clinique ne dépend du diff. Base `origin/main` illisible : check complet.
- `CLAUDE.md` § Validation : T1 = `check:rapide` après chaque édition,
  `check` complet avant chaque commit.
