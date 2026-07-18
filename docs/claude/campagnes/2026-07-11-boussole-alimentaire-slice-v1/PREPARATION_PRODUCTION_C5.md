# C5 — Préparation de la mise en production

Date du préflight : 2026-07-18.

Ce document décrit le chemin de livraison observé dans le dépôt. Il ne vaut ni
confirmation de migration, ni confirmation d'import, ni activation C5.

## État observé

- C5 est inactive à `2/8` ; LOT-02 attend la confirmation de migration.
- Les commits documentaires C5 sont actuellement portés par la branche locale
  `feat/c2b-lot-09-trajectoire`, dont la branche distante n'existe plus.
- Cette branche est en avance de 10 commits et en retard de 2 commits sur
  `origin/main` au moment du contrôle.
- L'arbre de travail contient également des modifications C2 et JA en cours.
  Elles doivent rester hors de toute branche et de tout commit C5.
- Aucun usage de `WN_C5_ENABLED` n'existe encore dans le code applicatif ; le
  verrou n'est pour l'instant qu'une exigence documentaire.
- La CI fournit PostgreSQL 15, rejoue toutes les migrations Prisma, contrôle la
  dérive schéma/migrations, puis exécute type-check, tests, lint, build et E2E.
- Le merge sur `main` déclenche Vercel. En production,
  `web/scripts/vercel-build.sh` exécute `prisma migrate deploy` avant le build
  lorsque `MIGRATE_DATABASE_URL` est définie.
- Le nom `MIGRATE_DATABASE_URL` est bien présent dans l'environnement Vercel
  Production ; sa valeur chiffrée n'a pas été lue ni consignée.
- `WN_C5_ENABLED` est absent de l'environnement Vercel Production, ce qui doit
  rester équivalent à `false` dans l'implémentation.
- La dernière CI `main` observée est verte pour le commit
  `9d12edcf1a3ca6d1ef2fd547f3dfee36ffee87a3`.
- Le smoke HTTP de `https://app.wellneuro.fr/` redirige vers `/login`, qui
  répond HTTP 200 ; l'application existante est disponible avant travaux C5.
- Un worktree propre a ensuite été créé depuis le dernier `origin/main` dans
  `/tmp/wellneuro-c5`, sur la branche
  `campaign/c5-wellneuro-5-0/integration`. Les 11 commits documentaires C5 y
  sont isolés ; l'arbre est propre et aucun commit C2/JA n'est présent dans la
  différence avec `origin/main`.

## Décisions de livraison

1. Ne jamais pousser, fusionner ou déployer directement l'ancienne branche
   locale C2B.
2. Utiliser exclusivement le worktree et la branche C5 propres créés depuis
   `origin/main` pour la suite de la campagne.
3. Créer et tester la migration LOT-02 uniquement après confirmation explicite
   du gate migration.
4. Faire valider la migration par PostgreSQL éphémère et le contrôle de dérive
   de la CI avant toute application à la production.
5. Déployer le schéma par le pipeline Prisma/Vercel existant, jamais avec
   `supabase db push`, le dashboard SQL ou un second historique.
6. Exécuter l'import append-only comme une opération séparée, après sa propre
   confirmation et après vérification de la migration cible.
7. Implémenter `WN_C5_ENABLED` en fail-closed : absent, vide ou différent de
   `true` signifie désactivé. Aucune surface, route ou action C5 ne doit être
   diffusée lorsque le flag est désactivé.
8. Livrer LOT-03 à LOT-07 derrière ce flag, obtenir les trois verdicts C5A,
   C5B praticien et C5B patient, puis seulement demander l'activation.
9. Activer explicitement C5 en production et redéployer après contrôle
   d'intégrité du référentiel. Le rollback applicatif remet le flag à `false` ;
   aucun `DROP` ou `DELETE` n'est autorisé par cette procédure.

## Gates successifs

| Gate | Preuve minimale | État |
|---|---|---|
| Migration LOT-02 | confirmation humaine, migration relue, PostgreSQL éphémère et dérive nulle | en attente de confirmation |
| Import LOT-02 | confirmation distincte, MD5 source, dry-run 55 744 lignes, cible vide pour la version | non demandé |
| C5A | référentiel intègre, moteurs déterministes, clinique et provenance vérifiées | non commencé |
| C5B praticien | ownership, insertion manuelle, workflow de validation et absence de diffusion automatique | non commencé |
| C5B patient | protocole diffusé, isolation 404, aucun score numérique, accessibilité | non commencé |
| Activation production | CI/PR vertes, trois GO, flag encore false, intégrité production puis instruction explicite | non demandé |

## Vérifications obligatoires avant merge final

- branche C5 à jour de `origin/main`, sans commit C2/JA étranger ;
- `WN_C5_ENABLED=false` ou absent sur le premier déploiement ;
- variable de migration Vercel présente, sans en exposer la valeur ;
- migration Prisma appliquée avec succès et import Ciqual intègre ;
- audits RLS/grants/advisors sans alerte bloquante ;
- matrice CI complète et E2E des trois patients fictifs autorisés ;
- smoke tests production avec C5 désactivée, puis après activation explicite ;
- procédure de retour arrière par flag testée et documentée.

## Situation actuelle

**NO-GO déploiement et activation.** Le prochain acte autorisable est uniquement
la migration LOT-02. L'import et l'activation restent deux décisions humaines
ultérieures et distinctes.
