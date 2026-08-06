### Import du skill tiers webapp-testing (anthropics/skills) (2026-08-06)

Le skill `webapp-testing` (pilotage Playwright d'une application locale :
vérification visuelle d'un changement d'UI, captures, logs console) entre dans
`.claude/skills/`, copié depuis `anthropics/skills` épinglé au commit audité
`b29e7cf65e5cb78a5ac33d582270551bc74a14eb` (audit `/wn-tiers` du 2026-08-06,
verdict SOUS RÉSERVE). Licence Apache 2.0, conservée dans le dossier.

**Adaptation 1** : la consigne amont « ne pas lire la source avant d'exécuter »
est inversée aux deux emplacements du `SKILL.md` — sur cette machine, tout
script tiers se lit intégralement avant sa première exécution.

**Adaptation 2**, née d'une revue adversariale multi-agents de cette PR :
`scripts/with_server.py` a été réécrit. Constat d'origine, confirmé par
reproduction — la sonde de readiness validait « un port répond », pas « notre
serveur répond ». Sur ce dépôt multi-worktrees, où `npm run dev` (Next.js)
prend `:3000` par défaut, un serveur qui échouait à binder en silence
(port déjà pris par une autre session) laissait l'automatisation piloter l'UI
d'une autre branche. Trois versions successives du correctif ont été
rejetées par autant de contre-revues indépendantes avant la version retenue,
la quatrième :

- 1ère version (refuser un port déjà occupé *avant* lancement) : fermait
  l'instant du démarrage, pas les ~30 s d'attente suivantes — un serveur
  mourant pendant cette fenêtre laissait la sonde valider le port du voisin.
- 2ᵉ version (+ détection de la mort du processus pendant l'attente) : la
  détection était juste, mais le nettoyage d'un `--server "cd X && cmd"` ne
  tuait que le shell intermédiaire — le vrai serveur restait en vie, gardait
  le port, et le lancement suivant accusait à tort « un autre worktree ».
  Prouvé par reproduction avec un serveur à arrêt non instantané (ignore
  SIGTERM 2 s avant de sortir) : le script annonçait « stopped » alors que le
  port restait tenu.
- 3ᵉ version (signal au groupe entier, attente de sa disparition réelle) :
  corrigeait la fuite ci-dessus mais recalculait `pgid` via
  `os.getpgid(process.pid)` **après coup**, au moment du nettoyage — sur
  macOS, cet appel lève `PermissionError` (pas `ProcessLookupError`) quand le
  chef du groupe est un zombie non encore récolté, ce qui déclenchait une
  fausse alarme sur un arrêt pourtant propre ; et si le process direct avait
  déjà été récolté ailleurs (mort détectée par la sonde), `os.getpgid`
  échouait purement et simplement, laissant un serveur orphelin fuir — la
  même classe de défaut que la 2ᵉ version, déplacée. Prouvé par reproduction
  isolée du comportement de `killpg` sur un zombie macOS non récolté.
- Version retenue : `pgid` est capturé **une seule fois**, immédiatement
  après le lancement (`start_new_session=True` en fait l'égal de `pid`),
  jamais recalculé. Chaque signal envoyé au groupe récolte d'abord le
  processus direct (`process.poll()`) avant d'appeler `killpg` — y compris le
  tout premier SIGTERM, pas seulement dans la boucle de sondage — pour éviter
  le piège macOS ci-dessus ; en cas de blocage résiduel, repli sur le PID
  direct sans privilège de groupe. `with_server.py` refuse par ailleurs un
  port déjà occupé avant lancement ; échoue dès que le processus meurt
  pendant l'attente de disponibilité, sans attendre le timeout complet, et
  capture sa sortie (stdout/stderr) dans le message d'erreur — avec un repli
  explicite si un petit-fils détaché garde les tubes ouverts plus d'une
  seconde, plutôt que de laisser `TimeoutExpired` remonter et effacer le
  diagnostic ; attend la disparition réelle du groupe (escalade SIGKILL après
  le délai de grâce) avant d'annoncer l'arrêt — sinon il le signale
  explicitement ; rejette des `--port` dupliqués ; isole l'arrêt de chaque
  serveur pour qu'une exception sur l'un n'empêche pas le nettoyage des
  suivants.

Les exemples du `SKILL.md` sont alignés sur la doctrine qui en découle (le
port passé à la commande serveur et à `--port` doit être identique) et
signalent de ne **pas** réutiliser le port E2E dédié à ce worktree
(`worktreePort()` dans `web/playwright.config.ts`, `3100 + index`) : le
réutiliser collisionnerait avec un run E2E en cours plutôt que de l'éviter —
erreur présente dans une version intermédiaire du texte, corrigée avant
merge. Douze scénarios cumulés (port occupé, chemin nominal, mort du processus
détectée sans attendre le timeout, absence de fuite après un arrêt non
instantané, ports dupliqués rejetés, zombie macOS non récolté avant
nettoyage, shell qui backgrounde puis sort avant son petit-fils réel, petit-
fils détaché gardant les tubes ouverts, et leurs variantes) ont été vérifiés
par un banc jetable exécuté en session, non committé, sur chacune des quatre
versions — écart connu : aucune couverture automatisée ne protège ces
correctifs d'un futur rebase sur l'amont, et le front matter du `SKILL.md`
porte un avertissement explicite à ce sujet. Une revue par mutation
(suppression ciblée du `poll()` avant `killpg`, recalcul tardif de `pgid`) a
confirmé que le banc distingue bien la version corrigée de ses régressions.

Réserve connue et assumée : `scripts/with_server.py` lance la commande
serveur via `shell=True`, les arguments venant de l'agent, pas du contenu
tiers. Réserve héritée de l'amont, non introduite par cette PR : `stdout`/
`stderr` du serveur sont redirigés vers des tubes jamais drainés pendant sa
vie — un serveur qui écrit plus de ~64 Ko de logs avant la fin de
l'automatisation se fige (tube plein), sans message. `npm run dev` en mode
verbeux peut l'atteindre sur une session longue ; non corrigé ici (défaut
amont, hors du périmètre des trois régressions ci-dessus), à garder à l'œil.
La grille de routage (`wn-route`) gagne une ligne vers ce skill.

Écarté : les skills documents `pdf`, `docx` et `xlsx` du même dépôt, pourtant
audités, portent une licence propriétaire Anthropic interdisant copie hors des
Services, œuvre dérivée et redistribution — ils ne peuvent être ni vendorés ni
corrigés localement (le correctif `accept_changes.py` exigé par l'audit serait
une œuvre dérivée). Voie conforme si le besoin se présente : la marketplace
officielle (`/plugin marketplace add anthropics/skills`, puis
`/plugin install document-skills@anthropic-agent-skills`), en sachant qu'elle
sort du périmètre projet du verdict `/wn-tiers` et suit l'amont sans épinglage.
