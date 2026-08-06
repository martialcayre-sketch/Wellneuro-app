---
id: "LOT-00"
titre: "Un seul chemin d'écriture en base"
statut: "livré (#435, 2026-08-05) — environnement release-db en place, le build Vercel n'écrit plus en base"
dépend_de: "aucun (dépendance ops externe bloquante)"
---

# LOT-00 — Un seul chemin d'écriture en base (PR #435)

## But

Faire qu'il n'existe **qu'un** chemin d'écriture vers la base de production : le
workflow `release-db`, gaté par l'environnement GitHub protégé `release-db` —
nom dédié, parce que `Production` appartient déjà à l'intégration Vercel.

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
  `release-db` (et non `production`, qui existe déjà côté intégration Vercel et
  dont la protection gaterait les déploiements) avec required reviewers distincts
  du déclencheur, y poser `MIGRATE_DATABASE_URL` et les jetons d'import, puis
  retirer ces variables du scope Production Vercel.
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

- [ ] `grep -v '^[[:space:]]*#' web/scripts/vercel-build.sh | grep -c "migrate deploy"` → 0.
      Le critère comptait d'abord toutes les lignes du fichier ; il rendait 1 sur
      l'artefact réel, à cause du commentaire d'en-tête « POURQUOI CE SCRIPT
      N'ÉCRIT PLUS » qui cite l'expression. Tel quel, il poussait à supprimer la
      phrase qui porte la raison : un critère qui ne distingue pas le code du
      commentaire mesure autre chose que ce qu'il croit.
- [ ] Environnement `release-db` créé, secrets posés, reviewers distincts, et
      **branches de déploiement restreintes à `main`** — cette dernière clause
      ajoutée en cours de lot : sans elle, un dispatch depuis n'importe quelle
      branche appliquait à la production un SQL jamais relu.
- [ ] Variables retirées du scope Production Vercel.
- [x] Épingles NABM — **critère amendé**. Millésime et empreinte n'ont bien qu'un
      lieu opérationnel (`release-db.yml`). Le **jeton en a deux** par
      conception : le littéral du workflow et la constante faisant autorité
      `NABM_IMPORT_CONFIRMATION` (`web/prisma/nabmImport.ts`), qui est le second
      terme du modèle « deux clés qui bougent ensemble ». Le critère visait la
      duplication `vercel-build.sh` ↔ workflow, qui est supprimée ; le
      commentaire du workflow, qui prétendait « UNIQUE source de vérité » pour
      les trois, est corrigé.
- [x] `CLAUDE.md` nomme `release-db` comme chemin unique.
- [ ] PR #435 fermée (mergée ou explicitement remplacée).

## Résultats

**Code prêt, merge bloqué sur les étapes ops.** T3 vert (séquence CI complète,
E2E inclus). PR #435 reprise plutôt que refaite : la question « rebaser ou
refaire » se tranchait par la mesure — sur les cinq fichiers qui comptent, seul
`CLAUDE.md` avait bougé depuis la base de la PR, et `git merge-tree` annonçait un
arbre propre. Une fusion, pas un rebase : ni conflit, ni push forcé.

### Trois écarts entre le lot et le dépôt

1. **L'étape ops était infaisable telle qu'écrite.** L'environnement GitHub
   `production` existe déjà — c'est celui de l'intégration Vercel — et les noms
   sont insensibles à la casse. Y poser des reviewers aurait gaté les
   déploiements. L'environnement s'appelle donc `release-db`, ce qui a coûté une
   clé YAML et le renommage d'une quinzaine de textes.
2. **Un critère de done était faux** et rejetait le bon travail (détail ci-dessus).
3. **Quatre documents affirmaient encore « le build migre »**, dont un seul était
   dans le diff de la PR.

### Ce que la revue adversariale a trouvé, et que le plan n'avait pas vu

**Le défaut de conception (NO-GO n°2).** En devenant le chemin *unique*,
`release-db` cessait d'être attaché à `main` : `workflow_dispatch` prend la ref du
dispatch, et un environnement GitHub accepte toutes les branches par défaut. La
doctrine « migration committée → PR relue → merge sur `main` » était **mécanique**
tant que le build de `main` était le seul écrivain ; elle devenait déclarative au
moment précis où elle devenait unique. Fermé par trois clés : `if:` sur le job,
job frère qui échoue bruyamment hors `main`, restriction de branche côté
plateforme (étape ops).

**Le défaut déplacé, pas fermé (NO-GO n°3).** Le lot déclarait fermer le fail-open
« base en retard ». Il le déplace : `migrate deploy` tournait avant `next build`,
un échec rendait le build rouge et l'alignement code↔schéma était garanti par
construction. Il repose désormais sur un humain qui pense à déclencher la release.
Runbook et changelog le disent maintenant tous deux, avec le même mot — *déplacé*,
pas *corrigé*.

### Réserves ouvertes, nommées faute d'être fermables ici

- **Rien n'interdit une PR mêlant une migration et le code qui en dépend.** Le
  merge déploie le code immédiatement ; la migration attend un geste humain. Garde
  CI à construire.
- **Rien ne détecte une release oubliée.** Aucun lecteur de `_prisma_migrations`
  hors CI.
- **La barrière D-003 n'a jamais rencontré les données de production.** Le contrat
  de données `cb_biologie_catalogue_v1.sql` n'a que deux appelants, tous deux en
  CI sur base éphémère — où ses invariants sont vrais par vacuité. Ce n'est pas
  cette bascule qui l'a causé ; c'est elle qui l'a révélé.
- **« Le code tolère une base en avance » n'est vrai que si la migration est
  additive.** Le dépôt porte un contre-exemple (`c4_composition_dose`, `RENAME
  COLUMN`). La règle additive de `CLAUDE.md` porte désormais seule la sûreté du
  modèle, sans garde exécutable.
- **`CLAUDE.md:30` dit « Aucun autre chemin »** alors que deux scripts manuels en
  ouvrent d'autres (`setup_supabase_prisma.sh`, `ingest-devlocal.mjs
  --force-non-local`). Hors périmètre, non introduit par ce lot.
- **Le `if:` ne consomme pas d'approbation** — comportement de plateforme non
  prouvable depuis le dépôt. À vérifier une fois par un dispatch réel depuis une
  branche jetable.
