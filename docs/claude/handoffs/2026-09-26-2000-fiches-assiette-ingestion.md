# Handoff — 2026-09-26 — Fiche d'assiette, lot 4 : voie d'ingestion des brouillons

## 1. Branche et état Git

`wn-fiche-assiette-ingestion`, worktree `.claude/worktrees/deploy-anti-recul-lot1`,
partie de `origin/main` à `6fe840d5` (#1233, migration M1).

## 2. Objectif

Lot 4 sur 11 de `D-251` : la route interne par laquelle l'outil hors ligne
(lot 5) déposera les adaptations de Fiches MY, en brouillons.

Préalable tenu : la migration M1 est appliquée en production. `release-db` a
tourné (run 36262802752, sentinelle `WN_RELEASE_DB_OK` au journal), puis un
conteneur en lecture seule a constaté :

- les deux tables, vides ;
- la RLS active, sans policy ;
- 6 triggers actifs ;
- 10 + 5 CHECK ;
- EXECUTE retiré à `public` sur les 3 fonctions ;
- la migration terminée, non annulée.

## 3. Décisions prises

- **Le secret du corpus** (`isAuthorizedRagRequest`, `getRagConfig`), comme le
  prévoyait le cadrage. Aucune variable d'environnement nouvelle.
- **Un contrat fermé à chaque niveau.** Le contenu est rebâti champ par champ.
  - Les champs d'acte et de validation sont refusés nommément, en citant
    DC-16 ; ceux que pose le serveur le sont aussi.
  - Un second modèle distinct est exigé pour la contre-lecture (§5).
- **Les claims cités doivent être VALIDE**, lus par `claimsValidesAuCorpus`
  (mêmes prédicats que la récupération). Ensuite seulement, le texte des claims
  valides est lu pour le contrôle des nombres. Il n'est jamais rendu.
- **Le numéro de version se lit sous le verrou du trigger.** Le verrou est pris
  avant la lecture du maximum. Sans lui, deux dépôts concurrents échoueraient au
  trigger.
- **L'idempotence porte sur la dernière version seulement.** Un rejeu identique
  rend `BROUILLON_INCHANGE`.
- **`sourceSha256` est l'empreinte du PDF** tenue par le manifeste local du
  snapshot. Le serveur la porte sans pouvoir la recalculer, et la relecture du
  lot 6 la confronte au manifeste.
- **Aucun texte dans les journaux ni dans une erreur 500.** Seuls le nom et le
  code d'erreur sont journalisés, parce qu'un message Prisma peut recopier les
  arguments.

Vérification faite en production par agrégat : les 212 claims des sources
0284-0307 sont au format `vX.Y`, tous VALIDE, et leur préfixe correspond à leur
source. Le contrôle `claim_mal_forme` du lot 2 ne bloquera donc pas une fiche
légitime.

## 4. Fichiers modifiés

- `web/src/lib/fiches-assiette/contrat.ts` (+ `contrat.test.ts`)
- `web/src/lib/fiches-assiette/ingestion.ts` (+ `ingestion.test.ts`)
- `web/src/lib/fiches-assiette/catalogue.guard.test.ts`
- `web/src/app/api/internal/fiches-assiette/ingest/route.ts` (+ `route.test.ts`)
- `docs/claude/MATRICE_CONSOMMATION.md` (régénérée : une surface indirecte de
  plus pour la table d'indications)
- `changelog.d/2026-09-26-fiches-assiette-ingestion.md`
- `docs/claude/SESSION_LOG.md`
- ce handoff

## 5. Validations exécutées

- Bancs ciblés (7 fichiers, 71 tests) verts.
- T1 vert.
- T2 vert : 604 fichiers Vitest (10 108 tests), build de production, 213 E2E.

## 6. Problèmes ouverts

- **La route ne se prouve pas en production avant le lot 5**, puisque aucun
  brouillon réel n'existe encore.
- **La bascule `rightsStatus: verified`** se fera notice par notice, au dépôt
  réel de chaque fiche (D-251 §2), et non dans ce lot.

## 7. Prochaine action exacte

Merge, puis constat du déploiement (un merge à la fois). Ensuite, lot 5 :
l'outil d'adaptation hors ligne `tools/corpus/fiches/`.

## 8. Interdits encore actifs

- Aucun texte de Fiche MY au dépôt : tous les bancs sont en texte synthétique.
- « Un merge à la fois » (D-248).
