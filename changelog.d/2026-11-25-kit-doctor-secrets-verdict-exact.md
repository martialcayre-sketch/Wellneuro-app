### `wn-kit-doctor` : verdict secrets par répertoire (2026-11-25)

Le bloc SECURITY de `scripts/wn-kit-doctor.mjs` recopiait un unique booléen
sur ses lignes « No secrets in … » : une occurrence documentaire de
`DATABASE_URL=` sous `docs/` rougissait aussi `.wn/` et `.claude/`, sans
nommer le fichier dans le verdict (40/43 constaté sur `main` le 2026-11-07
comme le 2026-11-25). Chaque ligne ne juge désormais que ses propres racines
et nomme, quand elle rougit, le fichier et le motif — jamais la valeur. Une
quatrième ligne, `.github/prompts/`, porte la racine que le doctor lisait
déjà sans l'attribuer ; une racine absente est nommée (« absent »). Les
répertoires et fichiers exemptés suivent `GREP_EXCLUDES` de
`scripts/check_no_secrets.sh` ; les motifs, les extensions lues (`.md`,
`.yml`, `.json`) et les racines (pour `.claude/` : `skills` et `agents`) sont
inchangés, et le garde réel, `check_no_secrets.sh`, qui lit tout fichier,
n'est pas touché.

Au passage, défaut voisin qui masquait le bloc : le total s'évaluait par
`every`, qui cessait d'imprimer au premier bloc rouge — SECURITY disparaissait
dès que GIT était sale. Chaque bloc s'imprime désormais.

Sur `main` : `.wn/`, `.claude/`, `.github/prompts/` verts ; `docs/` rouge,
nommant un prompt de contre-revue de campagne qui cite `DATABASE_URL=<url>`.
Banc neuf `scripts/wn-kit-doctor.test.mjs` (fixtures en dossier temporaire,
9 tests, tous rouges sur l’ancien doctor), inscrit à `bancs-outillage-check`
et au CI.
