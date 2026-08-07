# ADR — commentaires historiques déplacés des workflows CI (2026-08-07)

Les workflows `.github/workflows/ci.yml` et `release-db.yml` portaient ~52 % de
lignes de commentaires, dont plusieurs comptes-rendus historiques longs relus
par chaque agent qui ouvre le fichier. Les invariants gardent une raison courte
sur place ; le récit complet est ici. **Rien de fonctionnel n'a changé.**

## ci.yml — pourquoi trois fichiers sous `docs/` sont classés CODE

La matrice de mapping des questionnaires est classée CODE : la certification
scoring la vérifie contre le catalogue, et cette certification vit sur le
chemin code (elle transpile le TS du catalogue, donc a besoin de
`web/node_modules`).

Le REGISTRE DES INSTRUMENTS est classé CODE pour la même raison, plus
tranchante encore : il vit sous `docs/` mais il fait autorité — statut de
droits, barreau de certification, date de vérification. Une PR qui ne
toucherait que lui obtenait `docs_only`, donc un `verify` vert SANS qu'aucun
contrôle du registre ne s'exécute : les deux étapes qui le lisent
(`Scoring certification`, `Registre des instruments`) sont toutes deux gatées.
Deux merges de l'historique ont exactement cette forme, dont un qui éditait des
statuts de droits. Relevé en revue adversariale le 2026-07-29, quand le retrait
d'un banc ad hoc a laissé le fichier sans aucun filet.

Le FICHIER DE PREUVES psychométriques (`measurement_evidence.json`) rejoint le
registre depuis le 2026-08-04, pour la même raison : il commande le barreau
`psychometrie_revue`, donc il fait autorité, et il était classé « docs » alors
que les deux mêmes étapes gatées sont les seules à le lire.

## release-db.yml — pourquoi la release est sortie du build, et le motif « deux clés »

**Pourquoi ce workflow.** Historiquement, `web/scripts/vercel-build.sh`
appliquait les migrations et les imports AU BUILD. Deux défauts : un build
pouvait réussir en laissant la base « en retard » (`MIGRATE_DATABASE_URL`
absente → avertissement, pas échec) ; et le contrat post-import s'exécutait
après le COMMIT (« build rouge » ne voulait pas dire « rien écrit »). Le
workflow sort l'écriture du build : le build redevient un pur `next build`.
`migrate deploy` n'invente jamais de SQL : il applique uniquement les
migrations committées et relues en PR ; le gate humain est la revue de PR,
doublée de l'approbation d'environnement.

**Déclenchement automatique sans contourner le gate.** Une migration qui
atterrit sur `main` crée le run toute seule ; les required reviewers de
l'environnement `release-db` mettent le run en `waiting`. Ce qui change n'est
pas qui décide, c'est qui doit y penser — auparavant « rien ne détecte une
release oubliée » était une question ouverte. Le nom d'environnement est dédié
parce que `Production` appartient à l'intégration Vercel (noms insensibles à la
casse) : y attacher des required reviewers gaterait les déploiements Vercel.

**Motif « deux clés » sur l'import.** Sur un événement `push`, le contexte
`inputs` est vide, donc `inputs.mode == 'import-cb'` ne peut pas être vrai : un
déclenchement automatique EST un `migrate-only`. Ce raisonnement seul aurait
suffi, mais il repose sur une sémantique de plateforme qu'aucun lint de
workflow ne vérifie en CI ; les étapes d'import portent donc AUSSI
`github.event_name == 'workflow_dispatch'`. La seule chose qui ne doit JAMAIS
partir toute seule est l'import NABM ; il ne dépend pas d'un raisonnement,
même juste.

**Périmètre.** Deux modes seulement : `migrate-only` et `import-cb`. L'import
C5 CIQUAL n'est volontairement pas câblé : son garde repose sur
`VERCEL_ENV=production`, qui ne tient pas hors Vercel ; le brancher exigerait
de le refaire à la manière du garde `--base` de NABM. C5 est par ailleurs déjà
importé (append-only, idempotent) et re-semé par dump côté Scalingo
(`web/scripts/db-deploy.sh`).

**Filtre `paths`.** Un push qui ne touche pas `web/prisma/migrations/**` ne
crée aucun run — et une migration introduite autrement que par un fichier de ce
dossier n'est pas vue : il n'y a pas d'autre chemin légitime, c'est la doctrine
« registre canonique ».
