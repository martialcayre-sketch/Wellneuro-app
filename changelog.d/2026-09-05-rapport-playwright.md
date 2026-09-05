### Le rapport Playwright existe enfin, au lieu d'être publié à vide (2026-09-05)

`ci.yml` publie un artefact `playwright-report` depuis toujours. Personne ne
l'écrivait : `playwright.config.ts` déclarait `reporter: 'list'`, qui n'émet
rien sur disque. L'étape n'avait pas `if-no-files-found`, dont le défaut est
`warn` : elle publiait le vide **sans rien dire**. Et `web/.gitignore` ignorait
déjà `playwright-report/`, ce qui achevait de rendre l'artefact crédible — trois
fichiers qui se désignent l'un l'autre sans que rien ne les confronte.

Conséquence, mesurée sur un cas réel : quand un E2E casse en CI, il n'y a **ni
image de diff, ni rapport**. Pour lire la mesure du seuil visuel le 2026-09-05,
il a fallu extraire le log brut du job par l'API — `gh run view --log` et
`--log-failed` tronquent avant l'étape E2E sans le signaler.

Le rapporteur `html` est ajouté à côté de `list`, avec `open: 'never'` : le
défaut `on-failure` ouvre un serveur et **attend**, ce qui suspendrait un run
local en échec et le CI avec. L'étape d'upload passe à `if-no-files-found:
error`.

Deux invariants dans `scripts/ci-invariants.test.mjs`, parce que le trou venait
de deux fichiers qui se citent sans se vérifier : le chemin publié par `ci.yml`
doit égaler le `outputFolder` du rapporteur `html`, et l'absence du dossier doit
faire rougir. Prouvés rouges sur trois mutations — le retour à `reporter: 'list'`
(soit exactement l'état d'avant), un `outputFolder` désaccordé du chemin publié,
et le retrait de `if-no-files-found`.

Vérifié par T2 : `web/playwright-report/index.html` est écrit, et le run ne se
suspend pas.
