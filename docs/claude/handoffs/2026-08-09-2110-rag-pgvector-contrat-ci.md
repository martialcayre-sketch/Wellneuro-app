# Handoff — 2026-08-09 — Contrat SQL pgvector : le socle RAG tenu en CI et en préflight de release

## Branche et état Git

- Branche `claude/reprise-apres-pr-629-bzh1jm`, repartie d'`origin/main`
  `7a8b8db` après le squash-merge de la PR #634 (le lot lui-même). Ce handoff
  arrive en PR de doc séparée — la fenêtre de clôture sur la branche vivante
  était fermée au moment de l'écriture.
- Session distante (claude.ai/code) : pas de worktree local, pas de `gh`.

## Objectif

Fermer la dette nommée par le handoff `2026-08-09-1010` : « Aucun contrat CI
ne couvre pgvector — extension `vector`, deux index HNSW, signatures
`match_*` : un index perdu dégraderait le RAG en scan séquentiel sans
qu'aucune suite ne rougisse. »

## Livré (PR #634, mergée)

- `web/prisma/checks/rag_pgvector_structure_v1.sql` — contrat structurel en
  lecture seule (`BEGIN READ ONLY … ROLLBACK`, ERRCODE `WN001`) : extension
  `vector` dans le schéma `extensions` ; les deux index HNSW (bonne table,
  méthode, colonne `embedding`, opclass `vector_cosine_ops`, `indisvalid`) ;
  signatures exactes des deux `match_wellneuro_rag_*`, STABLE et
  set-returning ; `EXECUTE` refusé à PUBLIC — `proacl` NULL lève aussi, donc
  la leçon de `20260721230000` mord dès la base du CI — et à
  `anon`/`authenticated` là où ces rôles existent.
- Câblé dans `ci.yml` (le palier local `wn-test-worktree.sh` dérive sa liste
  de ce fichier) et en préflight **fail-closed** de `release-db.yml`, avant
  `migrate deploy`.
- Fragment `changelog.d/2026-08-09-rag-pgvector-contrat-structure.md`.

## Validations exécutées

- **Production lue avant le câblage fail-closed** (MCP Supabase, lecture
  seule) : conforme sur toutes les assertions — le préflight ne bloquera pas
  la prochaine release en l'état.
- **Base éphémère** (PostgreSQL 16 + pgvector, `migrate deploy` rejoué) : le
  contrat passe ; trois dérives provoquées lèvent avec un message nominatif
  (index supprimé, rebuild en `vector_l2_ops`, `GRANT EXECUTE TO PUBLIC`) ;
  les seize autres contrats de `ci.yml` restent verts.
- T1 vert. **T2 injouable dans l'environnement distant** : le proxy refuse le
  téléchargement des navigateurs Playwright (`ensure_playwright` meurt avant
  l'étape des contrats). La boucle des contrats du palier a été rejouée à
  l'identique à la main — même extraction `sed` depuis `ci.yml`.

## Pièges rencontrés

- `wn-attendre-ci.mjs` ne rend aucun verdict sans `gh` ; la surveillance de
  la PR est passée par l'abonnement webhook de la session.
- Les démons lancés dans un appel Bash de cette plateforme ne survivent pas à
  l'appel : le PostgreSQL éphémère doit vivre et mourir dans une seule
  commande.

## Problèmes ouverts (inchangés, hors de ce lot)

- Rollback sans critère ni fenêtre ; aucun GO/NO-GO de migration.
- `osc-secnum-fr1` inaccessible sur le compte ; réponse Scalingo attendue
  (ticket du 2026-08-09, revue D-037).
- Les secrets et flags du staging se posent par le responsable, jamais en
  transitant par l'assistant.

## Prochaine action exacte

**Mardi 2026-08-12 — recette staging** (décision du responsable, consignée ce
jour) : une fois les secrets et flags posés sur `wellneuro-staging` par le
responsable, dérouler la recette — boot, parcours de base, contrôle de santé
RAG — sans donnée réelle tant que les conditions (a) et (b) de D-006 ne sont
pas levées.
