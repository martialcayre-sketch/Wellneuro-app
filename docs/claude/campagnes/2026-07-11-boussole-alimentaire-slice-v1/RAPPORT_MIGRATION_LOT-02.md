# C5 LOT-02 — rapport de migration

Date : 2026-07-18

Référence de confirmation : `C5-LOT02-MIGRATION-MC-2026-07-18-v1`

Preuve Git de la migration :
`9538b78f346204c1b71091d21b669e0a99230088`

État : migration créée, vérifiée et déployée en production ; import non
autorisé.

## Autorisation

Confirmation humaine reçue : « Je confirme la migration C5 LOT-02 selon le
plan documenté. »

Cette confirmation couvre le schéma et la migration LOT-02. Elle ne couvre ni
l'import Ciqual, ni l'activation C5, ni le déploiement des surfaces LOT-03 à
LOT-07.

## Contenu de la migration

- `CiqualNutrientValue` → `ciqual_nutrient_values` ;
- `value` en `numeric(14,6)` nullable ;
- statuts fermés : `exact`, `trace`, `below_limit`, `missing` ;
- unités fermées : `g/100 g`, `mg/100 g` ;
- une valeur numérique uniquement pour le statut `exact` ;
- valeur numérique non négative ;
- unicité `(datasetVersion, ciqualCode, nutrientCode)` ;
- index `(datasetVersion, ciqualCode)` ;
- identité `NeuroAxis` unique par `(axisCode, versionMapping)` ;
- poids unique par `(axisCode, versionMapping, nutrientCode)` et clé étrangère
  composite vers l'axe ;
- transaction globale, verrou des deux tables de mapping et refus préalable
  de toute ligne historique incompatible, sans correction implicite ; attente
  du verrou limitée à 10 secondes ;
- RLS active, aucune policy et révocation de tous les privilèges de table pour
  `anon` et `authenticated` lorsqu'ils existent.

La migration appartient exclusivement à l'historique
`web/prisma/migrations`. Le dépôt contient un ancien fichier vide de 0 octet
dans `web/supabase/migrations`; il n'est pas exécutable, n'est appelé par aucun
pipeline et n'est pas complété. Aucun nouvel historique Supabase n'est créé.

## Vérification PostgreSQL éphémère

Deux bases PostgreSQL 17 vierges ont été initialisées puis arrêtées après test.

| Cas | Résultat |
|---|---|
| Rôles `anon` et `authenticated` présents | 14/14 migrations appliquées |
| PostgreSQL nu, sans rôles Supabase | 14/14 migrations appliquées |
| `prisma migrate status` | base à jour |
| dérive schéma/migrations | aucune différence |
| RLS `ciqual_nutrient_values` | active |
| policies | 0 |
| grants Data API | 0 |
| lecture sous rôle `anon` | refusée (`permission denied`) |

Les essais SQL ont également prouvé :

- insertion d'une valeur `exact` et d'une `trace` sans valeur ;
- rejet d'un statut `exact` sans valeur ;
- rejet d'une valeur négative ;
- rejet d'une unité inconnue ;
- rejet d'une clé dataset/aliment/constituant dupliquée ;
- coexistence de deux versions d'un même axe et rattachement correct de leurs
  poids respectifs.

## Vérifications Prisma

- Prisma 7.8.0 ;
- `prisma format` : exécuté ;
- `prisma validate` : conforme ;
- `prisma generate` : conforme ;
- `prisma migrate deploy` depuis une base vide : conforme ;
- `prisma migrate diff --exit-code` : dérive nulle.
- contrat SQL `prisma/checks/c5_ciqual_reference_v1.sql` : conforme et ajouté
  à la CI après le contrôle de dérive ; toutes ses fixtures sont annulées.
- préflight cible `prisma/checks/c5_ciqual_production_preflight.sql` : lecture
  seule des versions historiques, doublons, volumes, verrous et état de la
  migration ; exécuté par `vercel-build.sh` avant `prisma migrate deploy` avec
  la connexion de migration interne à Vercel.

## Vérifications applicatives

- type-check TypeScript : conforme ;
- Vitest : **77 fichiers, 435 tests réussis** ;
- lint : conforme, avec deux avertissements historiques
  `react-hooks/exhaustive-deps` dans `GenericQuestionnaire.tsx` hors périmètre ;
- build Next.js de production : conforme, artefact `BUILD_ID` produit ;
- audit des campagnes : conforme pour les erreurs bloquantes, avec un
  avertissement historique de LOT-00 dupliqué dans la campagne UX shell ;
- anti-secrets : conforme ;
- `git diff --check` : conforme.

## Revue indépendante

Verdict : **GO commit et lancement CI**. La revue en lecture seule confirme
l'atomicité, le préflight fail-closed, le `lock_timeout`, les contraintes,
RLS/grants et le contrat CI. Le déploiement reste conditionné à la CI
PostgreSQL 15 verte ; l'import et l'activation restent hors périmètre.

Avant déploiement, la séquence du pipeline a été simulée depuis un historique
antérieur : préflight avant migration, migration, préflight après migration,
puis dérive nulle. Avant migration la table Ciqual est absente et la migration
non enregistrée ; après migration la table est présente et l'historique vaut 1.

## Déploiement de production

- PR : `#117`, fusionnée le 2026-07-18 ;
- commit `main` : `3c0019989cae3ed2b76d8b57de1a61a5a2348374` ;
- déploiement Vercel Production : `dpl_BrJGmRwcteZDSK3xPdZcV9XDPPoj`, état
  `Ready`, alias `https://app.wellneuro.fr` ;
- préflight C5 LOT-02 : exécuté avec succès avant la migration ;
- Prisma : 14 migrations reconnues, migration
  `20260718100010_c5_ciqual_reference_v1` appliquée, puis confirmation
  `All migrations have been successfully applied.` ;
- smoke test : réponse HTTP 200 sur la destination attendue `/login`.

Ce déploiement n'exécute aucun import Ciqual et ne modifie pas le flag
`WN_C5_ENABLED`.

## Sécurité et limites

- aucune donnée patient manipulée ;
- aucune donnée brute Ciqual ajoutée au dépôt ;
- seule la migration confirmée a écrit sur Supabase Production ;
- aucune policy Data API ;
- aucune valeur manquante transformée en zéro ;
- C5 reste inactive à `2/8`.

Le CLI Supabase 2.109.1 se connecte à la base PostgreSQL éphémère, mais son
advisor ne peut pas exécuter ses lints hors d'une plateforme Supabase complète
(`LegacyDbAdvisorsQueryError`). Le contrôle `supabase db advisors` reste donc
obligatoire sur le projet lié après déploiement de la migration. L'environnement
de travail ne possède ni liaison CLI au projet ni `SUPABASE_ACCESS_TOKEN` ; le
contrôle n'est pas présenté comme acquis dans ce rapport.

Le prochain acte est la préparation contrôlée de l'outil d'import, en dry-run
par défaut. Sa création et son exécution feront l'objet du gate d'import et
d'une confirmation humaine distincte avant toute écriture.
