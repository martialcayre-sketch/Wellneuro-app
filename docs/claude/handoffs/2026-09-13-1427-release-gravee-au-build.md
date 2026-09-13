# Handoff — la release gravée dans l'image (2026-09-13 14:27)

Troisième fragment du fil « accueil praticien » du 2026-09-13, après
`…-1226-accueil-moins-de-defilement.md` et
`…-1330-accueil-correction-rail-et-mise-en-ligne.md`. Il **referme le problème
ouvert** que le second laissait : `WN_RELEASE_SHA` absente côté Scalingo.

## Branche et état Git

- **Mergé sur `main`** : `47c1d233` (PR #1084). Branche et worktree supprimés.
- **Déployé et constaté en ligne** : déploiement `e567a012`, statut `success`,
  git ref `47c1d233` — la release qui tourne contient le correctif.

## Le problème, et pourquoi la réponse évidente était la mauvaise

`releaseSha()` retombait sur `'local'` **en production** : en-tête « build
local », et Sentry taguait toutes les erreurs sur une release nommée `local`.

La réponse évidente — poser `WN_RELEASE_SHA` à la main sur Scalingo — est **la
mauvaise**, et c'est le cœur de ce fragment. Une variable figée serait juste une
fois, puis **mentirait à chaque déploiement suivant**. Un SHA périmé est PIRE que
`'local'` : `local` n'affirme rien, un faux SHA envoie chercher un défaut dans la
mauvaise version. Elle aurait de plus demandé un redémarrage de la production.

## Ce qui a été fait — une ligne, rien à maintenir

`web/scripts/build.sh` exporte `NEXT_PUBLIC_APP_VERSION` depuis
`SOURCE_VERSION`, avant `next build`. Deux propriétés du code EXISTANT rendent ce
geste suffisant, et c'est pour cela que `deploymentEnv.ts` n'est pas touché :

1. Next **inline** les `NEXT_PUBLIC_*` à la compilation — le SHA part dans
   l'image, là où un `export` de script ne survivrait pas au build.
2. `NEXT_PUBLIC_APP_VERSION` était **déjà** le dernier repli des DEUX chaînes :
   `releaseSha()` (serveur) et `clientReleaseSha()` (navigateur). Quelqu'un avait
   préparé la place ; il manquait de quoi la remplir.

## Les trois maillons, lus et non supposés

1. **Journal de build Scalingo** : `Release gravée dans le build : 47c1d23` —
   `SOURCE_VERSION` existe côté plateforme (documenté au build ; au runtime la
   variable documentée est `CONTAINER_VERSION`, qui porte la version du
   CONTENEUR et non le SHA du commit — elle ne répondrait donc pas à la
   question).
2. **Bundle serveur compilé** :
   `process.env.WN_RELEASE_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "<sha>" ?? "local"`.
   Aucune des deux premières n'existe sur l'app (`scalingo env` ne porte que
   `WN_DEPLOY_ENV=production`) : c'est le SHA gravé qui sort.
3. **Déploiement** : `success` sur le git ref `47c1d233`, constaté par
   contenance.

## Le cas hors Scalingo

`SOURCE_VERSION` est absente en CI et en build local : rien n'est exporté, le
repli `'local'` reste. **Jamais de variable vide** — elle court-circuiterait `??`
et afficherait « build » suivi de rien. Le build imprime lequel des deux cas
s'est produit : c'est ce qui a permis de LIRE le maillon 1 au lieu de le
supposer, et ce qui permettra de le relire si un jour il change.

## Fichiers modifiés

- `web/scripts/build.sh` — la gravure et son diagnostic.
- `changelog.d/2026-09-13-release-gravee-au-build.md`.

## Validations exécutées

- **T2 verte avec `SOURCE_VERSION` posée** : 9024 unitaires (1 skipped) + 196
  e2e, 3 min 44 s — le build a imprimé « Release gravée ».
- Branche `else` exercée à part.
- CI `verify` réellement joué et vert (`wn-attendre-ci` = 0).

## Problèmes ouverts

- **Non constaté à l'écran** : l'en-tête doit afficher `build 47c1d23`. Il est
  derrière l'authentification ; seule une lecture humaine sur
  `app.wellneuro.fr` le confirmera.
- Hors lot, inchangés : clôture de l'agenda alimentaire (`a_transmettre` sans
  CTA), second `T0`, lettre DPA, trois trous du § 7 RGPD.
- La branche par défaut LOCALE diverge d'`origin` (ahead 0 / behind 47) : ne pas
  s'en servir comme base.

## Prochaine action exacte

Regarder l'en-tête de `app.wellneuro.fr/dashboard` : « build local » doit avoir
cédé la place au SHA. Puis vérifier, au prochain incident, que Sentry tague bien
la release sur ce SHA.

## Interdits encore actifs

Inchangés : aucune identité patient réelle dans le dépôt ; production en lecture
par `scalingo run -d`, écriture par migration relue puis `release-db` approuvée ;
pas de `schema.prisma` ni de clinique/scoring sans demande explicite.

## Un piège d'outillage rencontré ici

`wn-cycle` a rendu « PR #1088 ouverte SANS la clôture » alors que #1088
appartient à une AUTRE session (branche `wn-orientation-fraicheur-et-rang`). Le
bloc de phase lit l'état du DÉPÔT, pas celui de la session : vérifier à qui
appartient la PR qu'il nomme avant de lui obéir.
