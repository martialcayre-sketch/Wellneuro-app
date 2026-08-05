### Le build Vercel n'écrit plus en base ; l'écriture passe par release-db (2026-07-28)

Bascule de la section 3. `web/scripts/vercel-build.sh` ne fait plus que générer le
client Prisma et construire Next : il **n'applique plus** les migrations ni l'import
NABM. Ces écritures passent désormais **hors du build**, par le workflow GitHub
Actions `release-db` (déclenché à la main, gaté par l'environnement protégé
`release-db` — nom dédié, `production` étant déjà pris par l'intégration Vercel),
livré par cette même release.

Un défaut disparaît, un autre change de nature. Disparaît : la fenêtre « build
rouge mais données écrites » du contrat post-import (le contrat structurel est
joué in-transaction depuis le lot précédent). Change de nature : l'alignement
code↔schéma. Avant, `migrate deploy` tournait avant `next build` et un échec
rendait le build rouge — l'alignement était garanti **par construction**.
Désormais il repose sur un humain qui pense à déclencher `release-db`, et
**rien ne détecte aujourd'hui une release oubliée** : du code peut être servi
contre une base en retard sans qu'aucun signal ne l'annonce. Le défaut n'est pas
fermé, il est déplacé du mécanique vers le procédural — c'est le prix assumé du
chemin unique et gaté, et il reste à outiller.

La doctrine « chemin unique » suit la réalité : `CLAUDE.md`,
`docs/claude/WORKFLOW_DEVELOPPEMENT.md`, `docs/claude/REGISTRE_FRONTIERES.md`,
`docs/RAG_PGVECTOR_PRODUCTION.md` et le hook Scalingo `web/scripts/db-deploy.sh`
nomment `release-db` comme chemin d'écriture prod (plus « le build applique les
migrations »). Les runbooks d'import (C5, NABM) portent un bandeau de redirection.
Le contrat de données (dont la barrière D-003, peuplée par d'autres lots) n'est
plus rejoué sur le chemin d'import ; il reste un contrat de catalogue joué en CI
**sur base éphémère**. La revue de ce lot a montré que cela ne date pas de la
bascule : ce contrat n'a jamais rencontré les données de production, et sur une
base vide ses invariants sont vrais par vacuité. Réserve ouverte, nommée ici
faute d'être fermable dans ce périmètre.

Les checklists d'activation de campagne qui affirmaient « migrate deploy au
build » (`GATES_VAGUE2_G1_G3_G4`, `PREPARATION_PRODUCTION_C5`,
`CHECKLIST_ACTIVATION_G_TRUST_04`) ont été soldées avec cette bascule.

**Prérequis de mise en service (étapes ops, hors code)** : créer l'environnement
GitHub `release-db` — et non `production`, déjà pris par l'intégration Vercel :
le protéger gèlerait les déploiements — avec required reviewers distincts du
déclencheur et branches de déploiement restreintes à `main`, y poser ses secrets,
puis retirer `MIGRATE_DATABASE_URL` et les jetons d'import du scope Production
Vercel.
Runbook : `docs/DEPLOIEMENT_RELEASE_DB.md`. À ne merger qu'une fois ces étapes
faites — sinon plus aucun chemin n'applique les migrations en production, et la
base fige.
