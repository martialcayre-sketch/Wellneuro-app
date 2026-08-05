# Handoff — Runbook HDS, versement de l'état du staging (LOT-03)

- Date : 2026-08-05, 14:50
- Campagne : `docs/claude/campagnes/2026-08-04-reprise-chantiers-en-suspens/`
- Lot : `lots/LOT-03-runbook-hds-staging.md` — **livré**. Ce lot **clôt la campagne**.
- Branche : `worktree-lot03-runbook-hds`
- Fragment de changelog : `changelog.d/2026-08-05-runbook-hds-staging.md`
- Périmètre : un seul fichier. Aucun code, aucune migration.

## Ce que le lot livre

`RUNBOOK_MIGRATION_SCALINGO.md` passe de **106 à 197 lignes** : l'état du staging
Scalingo provisionné le 2026-07-24, neuf gestes opérationnels appris en le
provisionnant, et trois pièges qui coûtent une app à refaire ou un secret exposé.

Ces faits vivaient sur un **HEAD détaché non committé** ; le worktree supprimé, ils
disparaissaient.

## Les quatre choses à savoir avant de toucher à ce dossier

1. **La branche `sauvegarde/runbook-scalingo-staging` ne se merge pas.** Elle est
   forkée du 2026-07-24 et supprimerait **28 332 lignes** de documentation créée
   depuis. Même son fichier seul, repris tel quel, annulerait deux PR mergées —
   la PR #356 et surtout la **PR #425, qui corrige exactement la région
   `osc-fr1` / `--hds-resource` que la sauvegarde prétend apporter**. Le
   versement s'est fait par **retouches ciblées sur la version de `main`**, jamais
   par copie de fichier. Cette branche est maintenant redondante ; sa suppression
   relève du ressort Copilot.
2. **Une correction appliquée à un seul endroit n'est pas appliquée.** La PR #425
   avait corrigé la région dans les *Prérequis* et laissé l'*étape 1* dire
   « confirmer la syntaxe exacte du flag HDS ». Le lecteur qui suit la procédure
   suivait la version fausse. Les deux endroits concordent désormais.
3. **Le runbook décrivait un mécanisme de build disparu.** Il attribuait
   l'application des migrations à une branche `else` de `vercel-build.sh` ; ce
   script **n'écrit plus en base depuis la PR #435**, sur aucun chemin. Sur
   Scalingo, seule l'entrée `postdeploy: npm run db:deploy` du `Procfile` les
   applique. Compte daté : 35 au 2026-07-24, **49 au 2026-08-05**.
4. **`scalingo env` n'a pas été lu, et ne doit pas l'être** pour vérifier un
   runbook : il rend les valeurs. `apps-info`, `addons` et `ps` suffisent à
   confirmer la configuration sans jamais toucher aux secrets. Le runbook
   avertit en outre que `env-set` **réaffiche la valeur posée** — rediriger la
   sortie.

## Ce que la vérification du 2026-08-05 a rendu

| | |
|---|---|
| `wellneuro-staging` | `running`, `HDS: true`, stack `scalingo-26` |
| Add-on | `postgresql-business-512`, `running` |
| Containers | 2 × `web`, taille `S` |
| Écart noté | une seconde app `wellneuro` au statut `new`, **non instruite ici** |

## Ce que le lot ne fait pas, délibérément

**Il ne décide pas de migrer.** L'orientation du 2026-07-22 — rester sur
l'hébergement actuel, borner la phase de test — tient, et le runbook le dit en
tête plutôt que de laisser le lecteur le déduire. La dérogation G-TRUST-04 court
jusqu'au **2026-10-21** ; c'est cette échéance, pas ce document, qui rouvrira la
question.

## Validation

- **T1 verte** (`npm run check`), et `bash scripts/check_no_secrets.sh` sur le
  dépôt entier — exigé par le lot vu la nature du fichier.
- Piège de worktree neuf à connaître : le premier T1 a échoué sur ~60 erreurs
  TypeScript sans rapport avec le diff. Cause — `src/generated/prisma` absent
  d'un worktree fraîchement créé. `npx prisma generate` suffit ; ce n'est pas
  une régression de `main`.
