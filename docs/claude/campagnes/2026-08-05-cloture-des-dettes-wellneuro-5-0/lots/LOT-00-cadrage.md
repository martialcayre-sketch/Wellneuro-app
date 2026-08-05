---
id: "LOT-00"
titre: "Un seul chemin d'écriture en base"
statut: "à_faire"
dépend_de: "aucun (dépendance ops externe bloquante)"
---

# LOT-00 — Un seul chemin d'écriture en base (PR #435)

## But

Faire qu'il n'existe **qu'un** chemin d'écriture vers la base de production : le
workflow `release-db`, gaté par l'environnement GitHub protégé `production`.

L'audit d'entrée présentait ce lot comme « ne pas merger #435 avant les étapes
ops ». La formulation est exacte mais laisse croire que l'attente est sûre : elle
ne l'est pas. `release-db.yml` est **déjà sur `main`** (#517, 2026-08-01) ;
`web/scripts/vercel-build.sh` écrit **encore**. Deux chemins coexistent, dont un
non gaté. Attendre, c'est maintenir le défaut.

## Résultat observable

- `web/scripts/vercel-build.sh` ne contient plus ni `migrate deploy` ni appel
  d'import : il génère le client Prisma et lance `next build`, rien d'autre.
- Un déclenchement à blanc de `release-db` en mode `migrate-only` demande une
  approbation humaine avant d'écrire.
- Les épingles NABM (jeton, millésime `V105`, sha256) n'existent plus qu'à **un**
  endroit.

## Périmètre

- Reprendre la PR #435 (branche `worktree-pr3-build-allege-doctrine`, dernière
  activité 2026-07-28) : la rebaser sur `main` ou la refaire si le rebase coûte
  plus que la refaire — trancher en ouverture.
- Les étapes ops, à faire **avant** merge : créer l'environnement GitHub
  `production` avec required reviewers distincts du déclencheur, y poser
  `MIGRATE_DATABASE_URL` et les jetons d'import, puis retirer ces variables du
  scope Production Vercel.
- Solder les checklists qui nomment encore « migrate deploy au build » :
  `GATES_VAGUE2_G1_G3_G4`, `PREPARATION_PRODUCTION_C5`,
  `CHECKLIST_ACTIVATION_G_TRUST_04`.

## Hors périmètre

- Câbler l'import C5 CIQUAL dans `release-db` (garde `VERCEL_ENV` à refaire ;
  décision documentée dans `docs/DEPLOIEMENT_RELEASE_DB.md`).
- Toute migration nouvelle.
- Le hook Scalingo `web/scripts/db-deploy.sh` au-delà de son commentaire.

## Fichiers probables

- `web/scripts/vercel-build.sh`
- `.github/workflows/release-db.yml`
- `docs/DEPLOIEMENT_RELEASE_DB.md`, `docs/RAG_PGVECTOR_PRODUCTION.md`
- `docs/claude/WORKFLOW_DEVELOPPEMENT.md`, `docs/claude/REGISTRE_FRONTIERES.md`
- `CLAUDE.md` (règle « chemin unique »)
- `changelog.d/2026-08-05-chemin-unique-ecriture-base.md`

## Interdits

- Pas de secret en dur ni de valeur de connexion consignée dans le dépôt.
- Pas de donnée patient réelle.
- **Ne pas merger avant les étapes ops** : sans environnement ni secrets, plus
  aucun chemin n'applique les migrations et la base fige.
- Pas de `prisma migrate` ni d'écriture Supabase depuis la session.

## Étapes

- [ ] Vérifier l'état de #435 contre `main` (rebase ou refaire — trancher).
- [ ] Faire les étapes ops GitHub, et le confirmer explicitement en session.
- [ ] Retirer les écritures de `vercel-build.sh`.
- [ ] Aligner doctrine et checklists résiduelles.
- [ ] Revue adversariale `wn-reviewer` (lot touchant le chemin de migration).
- [ ] T3 `npm run test:worktree`.
- [ ] Après merge : lecture `execute_sql` de `_prisma_migrations` (agrégée par nom)
      pour vérifier qu'aucune migration n'est restée en arrière.

## Tests

- `bash web/scripts/test-cb-nabm-import.sh` (le contrat de données n'est plus
  rejoué sur le chemin d'import — vérifier que le test le dit).
- T3 complet.
- Déclenchement `release-db` en `migrate-only` sur une base sans migration en
  retard : doit être un no-op approuvé.

## Critères de done

- [ ] `grep -c "migrate deploy" web/scripts/vercel-build.sh` → 0.
- [ ] Environnement `production` créé, secrets posés, reviewers distincts.
- [ ] Variables retirées du scope Production Vercel.
- [ ] Épingles NABM présentes à un seul endroit.
- [ ] `CLAUDE.md` nomme `release-db` comme chemin unique.
- [ ] PR #435 fermée (mergée ou explicitement remplacée).

## Résultats

À compléter à la clôture.
