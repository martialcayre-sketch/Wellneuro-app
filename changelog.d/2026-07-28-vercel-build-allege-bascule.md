### Le build Vercel n'écrit plus en base ; l'écriture passe par release-db (2026-07-28)

Bascule de la section 3. `web/scripts/vercel-build.sh` ne fait plus que générer le
client Prisma et construire Next : il **n'applique plus** les migrations ni l'import
NABM. Ces écritures passent désormais **hors du build**, par le workflow GitHub
Actions `release-db` (déclenché à la main, gaté par l'environnement protégé
`production`) livré précédemment.

Deux défauts du couplage build↔écriture disparaissent : le build ne peut plus
réussir en laissant la base « en retard » (il n'y touche plus), et la fenêtre
« build rouge mais données écrites » du contrat post-import n'existe plus (le
contrat structurel est joué in-transaction depuis le lot précédent).

La doctrine « chemin unique » suit la réalité : `CLAUDE.md`,
`docs/claude/WORKFLOW_DEVELOPPEMENT.md`, `docs/claude/REGISTRE_FRONTIERES.md`,
`docs/RAG_PGVECTOR_PRODUCTION.md` et le hook Scalingo `web/scripts/db-deploy.sh`
nomment `release-db` comme chemin d'écriture prod (plus « le build applique les
migrations »). Les runbooks d'import (C5, NABM) portent un bandeau de redirection.
Le contrat de données (dont la barrière D-003, peuplée par d'autres lots) n'est
plus rejoué sur le chemin d'import ; il reste un contrat de catalogue joué en CI.

Quelques checklists d'activation de campagne (`GATES_VAGUE2_G1_G3_G4`,
`PREPARATION_PRODUCTION_C5`, `CHECKLIST_ACTIVATION_G_TRUST_04`) mentionnent encore
« migrate deploy au build » : dette de cohérence à solder en suivi immédiat.

**Prérequis de mise en service (étapes ops, hors code)** : créer l'environnement
GitHub `production` (required reviewers distincts du déclencheur) et ses secrets,
retirer `MIGRATE_DATABASE_URL` et les jetons d'import du scope Production Vercel.
Runbook : `docs/DEPLOIEMENT_RELEASE_DB.md`. À ne merger qu'une fois ces étapes
faites — sinon aucun chemin n'applique les migrations sur Vercel.
