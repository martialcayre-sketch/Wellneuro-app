# C5 LOT-02 — rapport d'import Ciqual

Date : 2026-07-18

Dataset : `ciqual-2025-v1`

Référence de confirmation : `C5-LOT02-IMPORT-MC-2026-07-18-v1`

État : importeur vérifié hors production ; import Production non encore
exécuté.

## Autorisation

Confirmation humaine reçue : « Je confirme l'import C5 LOT-02 de
ciqual-2025-v1, append-only, 55 744 lignes, selon le dry-run documenté. »

Cette autorisation est bornée au dataset, au volume et au mode append-only
ci-dessus. Elle ne couvre aucun UPDATE, DELETE, DROP, changement clinique,
activation C5 ou déploiement des surfaces LOT-03 à LOT-07.

## Sources officielles

- dataset : `doi:10.57745/RDMHWY`, version 1 ;
- composition : `compo_2025_11_03.xml`, fichier Dataverse `666249`, MD5
  `2da725585946434df320d8041631998b` ;
- constituants : `const_2025_11_03.xml`, fichier Dataverse `666246`, MD5
  `d8f2f25fdacb887bc993a6eeaf80f203` ;
- fichiers téléchargés dans un répertoire temporaire et jamais ajoutés au
  dépôt.

## Contrat de l'importeur

- dry-run par défaut, sans connexion PostgreSQL ;
- écriture possible uniquement avec `--apply`, la référence CLI exacte, la
  même référence dans `WN_C5_CIQUAL_IMPORT_CONFIRMATION` et
  `MIGRATE_DATABASE_URL` ;
- hors Vercel Production, une exception explicite
  `--allow-non-production` est requise pour les replays éphémères ;
- transaction unique, verrou advisory et verrou de table borné à 10 secondes ;
- insertions par lots de 500, sans UPDATE, DELETE, UPSERT ni imputation ;
- cible vide exigée, sauf dataset déjà complet et strictement conforme, qui
  produit alors un no-op idempotent ;
- toute cible partielle ou étrangère est refusée avant insertion ;
- validation ligne par ligne de l'identité et de tous les champs métier, puis
  contrôle des volumes, statuts, unités, hash, RLS, policies et grants
  `anon`/`authenticated`/`PUBLIC` avant COMMIT ;
- advisors Supabase exécutés avant l'import par le déclencheur Production ;
  tout niveau `warn` ou `error` bloque l'opération.

## Dry-run officiel

| Contrôle | Résultat |
|---|---:|
| aliments | 3 484 |
| constituants | 16 |
| lignes | 55 744 |
| doublons aliment/constituant | 0 |
| hashes composition | 1 |
| précision maximale | 6 décimales |
| unités | `g/100 g`, `mg/100 g` |

Les volumes exacts par constituant et statut reproduisent la matrice du fichier
LOT-02. Les valeurs `traces`, `<x` et absentes restent nulles avec leur statut ;
elles ne sont jamais converties en zéro. Seules les teneurs numériques exactes,
y compris les zéros publiés comme tels, portent une valeur.

## Replay PostgreSQL 17

- 14 migrations Prisma appliquées sur une base vierge avec rôles `anon` et
  `authenticated` ;
- première exécution : 55 744 insertions ;
- cible après COMMIT : 3 484 aliments, 16 constituants, un hash source ;
- RLS active, zéro policy, zéro grant Data API ;
- seconde exécution : 0 insertion, `idempotentNoop = true` ;
- cible volontairement partielle d'une ligne : import refusé, volume resté à
  une ligne ;
- tests unitaires : cinq cas couvrant nombres exacts, statuts non numériques,
  précision, unités et volumes verrouillés.
- contrat d'intégration CI versionné : cible partielle refusée, 55 744
  insertions, no-op strict puis valeur corrompue refusée ; nettoyage limité à
  la base PostgreSQL éphémère.

## Déploiement prévu

1. Fusionner l'importeur après CI et revue du diff.
2. Ajouter temporairement la référence confirmée au scope Production Vercel.
3. Redéployer le commit fusionné : préflight, migrations, advisors, import,
   build.
4. Vérifier le rapport d'intégrité dans les logs et le smoke test public.
5. Retirer immédiatement le déclencheur d'import.
6. Consigner le commit, le déploiement et le résultat Production dans une
   seconde passe documentaire.

Le rollback applicatif demeure sans objet tant que C5 est inactive. Toute
suppression des lignes importées nécessiterait une nouvelle confirmation
destructive et n'est pas couverte par le présent gate.
