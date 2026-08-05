# 2026-08-05 08:59 — LOT-00 : un seul chemin d'écriture en base

Campagne `2026-08-05-cloture-des-dettes-wellneuro-5-0`, lot LOT-00.
Branche `worktree-pr3-build-allege-doctrine`, PR **#435** (brouillon à sortir).
Statut : **code prêt, merge bloqué sur une dépendance ops externe.**

## Où en est le lot

T3 vert dans le worktree de la branche (séquence CI complète, E2E inclus). Deux
passes de revue adversariale : la première a rendu NO-GO sur trois points, la
seconde GO conditionné sur trois autres, tous traités.

`web/scripts/vercel-build.sh` passe de 157 à 23 lignes — corps exécutable réduit
à `set -euo pipefail`, `npm run prisma:generate`, `next build`.

## Ce qui vous attend avant de merger

Ces gestes sont dans l'interface GitHub, pas dans le dépôt :

1. **Settings → Environments → New environment → `release-db`** (minuscules).
   *Pas* `production` : ce nom est déjà celui de l'intégration Vercel, les noms
   sont insensibles à la casse, et y poser des reviewers mettrait chaque
   déploiement de production en attente d'approbation.
2. **Required reviewers.** Avec un seul compte humain, « reviewer distinct du
   déclencheur » n'est pas honorable : laisser *Prevent self-review* décoché et,
   en compensation, un *wait timer*. À trancher, pas à laisser flou.
3. **Deployment branches and tags → Selected branches → `main`.** Ce n'est pas
   cosmétique : c'est l'une des trois clés du garde de branche (§ ci-dessous).
4. **Deux secrets d'environnement** : `MIGRATE_DATABASE_URL` (mode session, port
   `5432` — pas `6543`) et `WN_CB_NABM_IMPORT_CONFIRMATION`
   (`CB-02A-IMPORT-NABM-V105-MC-2026-07-26-v1`).

**Ne rien retirer de Vercel avant le merge** : tant que le script de build
applique encore les migrations sur `main`, `MIGRATE_DATABASE_URL` doit y rester.

## Les trois choses que ce lot a apprises

### 1. Une doctrine mécanique devenue déclarative au moment où elle devient unique

`release-db` se déclenche par `workflow_dispatch`, avec la ref du dispatch, et un
environnement GitHub accepte **toutes** les branches par défaut. En devenant le
chemin unique, il cessait donc d'être attaché à `main` : le SQL d'une branche
jamais relue pouvait atteindre la production, approuvé par quelqu'un à qui
l'interface Actions ne montre pas la ref.

Fermé par trois clés indépendantes : `if: github.ref == 'refs/heads/main'` sur le
job (évalué **avant** les règles d'environnement, donc sans consommer
d'approbation) ; un job frère `ref-refusee` qui échoue bruyamment, parce qu'un job
non éligible est *skipped* et qu'un run terminé sans un mot se lit comme « rien à
faire » ; et la restriction de branche côté plateforme, qui survit à une
réécriture du fichier.

### 2. Un défaut déclaré fermé qui était seulement déplacé

Le lot annonçait fermer le fail-open « base en retard ». Il le **déplace** :
`migrate deploy` tournait avant `next build`, un échec rendait le build rouge et
la production restait sur le déploiement précédent — l'alignement code↔schéma
était garanti *par construction*. Il repose désormais sur un humain qui pense à
déclencher la release. Runbook et changelog le disent maintenant tous deux, avec
le même mot.

C'est le bon geste — l'ancienne mécanique écrivait sans approbation — mais il
fallait l'écrire, sinon la prochaine session lit « défaut fermé » et ne le rouvre
jamais.

### 3. Un balayage rate toujours par la forme, jamais par le fond

Trois passes sur le **même** renommage, trois angles morts, tous de forme :

- le motif accentué ne voyait pas `environnement protege` écrit sans accents ;
- le balayage ligne à ligne ne voyait pas « l'environnement protégé\n`production` »,
  coupé par un repli Markdown ;
- une commande lancée **en tâche de fond** repart du cwd de session, pas du
  répertoire accumulé : un T3 lancé ainsi a validé le checkout principal en
  annonçant `Worktree : …/Wellneuro-app`. Le sous-agent est tombé dans le même
  piège et son `cd "$(git rev-parse --show-toplevel)"` ne l'en a pas protégé —
  une ancre dérivée de l'endroit où l'on se trouve ne corrige pas le fait d'être
  au mauvais endroit.

Le motif qui a fini par tenir : partir du mot dans les deux sens, en multi-lignes,
et trier les faux positifs à la lecture.

## Ce qui reste ouvert

- **Rien n'interdit une PR mêlant une migration et le code qui en dépend.** Le
  merge déploie le code tout de suite ; la migration attend un geste humain.
- **Rien ne détecte une release oubliée** : aucun lecteur de `_prisma_migrations`
  hors CI.
- **La barrière D-003 n'a jamais rencontré les données de production.** Le contrat
  `cb_biologie_catalogue_v1.sql` n'a que deux appelants, tous deux en CI sur base
  éphémère, où ses invariants sont vrais par vacuité. Révélé par ce lot, pas causé
  par lui.
- **« Le code tolère une base en avance » n'est vrai que si la migration est
  additive** — `c4_composition_dose` (`RENAME COLUMN`) est le contre-exemple, et
  sa fenêtre estimée « 1 à 2 minutes » supposait le modèle build-migre. Elle n'est
  plus bornée par rien.
- **`CLAUDE.md:30` dit « Aucun autre chemin »** alors que `setup_supabase_prisma.sh`
  et `ingest-devlocal.mjs --force-non-local` en ouvrent deux, manuels.
- **Le `if:` ne consomme pas d'approbation** : comportement de plateforme, non
  prouvable depuis le dépôt. À vérifier une fois, par un dispatch depuis une
  branche jetable.

## Après le merge

1. Retirer de Vercel (scope Production) `MIGRATE_DATABASE_URL` et les jetons
   d'import.
2. Lecture `execute_sql` de `_prisma_migrations`, **agrégée par nom** : aucune
   migration ne doit être restée en arrière.
3. Un déclenchement à blanc de `release-db` en `migrate-only` : doit demander une
   approbation, puis être un no-op.
