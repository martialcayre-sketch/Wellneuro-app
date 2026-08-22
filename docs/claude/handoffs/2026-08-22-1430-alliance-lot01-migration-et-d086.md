# 2026-08-22 14:30 — Alliance LOT-01 : la migration du dossier à deux voix, et D-086

## Ce qui a changé

- **Cinq tables** (`20260822153000_alliance_dossier_deux_voix_v1`, confirmée
  par plan approuvé) : `objectifs_negocies`, `ce_qui_compte_entrees`,
  `syntheses_comprehension`, `desaccords_comprehension`,
  `ratifications_objectif` — événement append-only, deux dates, FK patient
  `RESTRICT`, RLS deny-all, **aucun champ de score/seuil/bande**. Contrat
  liste-blanche câblé au CI, **vu rouge sous trois mutations** (policy,
  colonne `score`, FK CASCADE) ; parité `migrate diff` propre.
  `effacement.ts` + banc complétés ; 5 back-relations `Patient` (ajout pur).
- **`D-086`** : le cadrage a démontré que `release-db` visait la base Supabase
  **gelée** (secret du 2026-08-05) pendant que l'auto-deploy Scalingo applique
  les migrations **au merge**. Arbitrage : **le gate humain d'une migration
  est la revue + le go explicite avant merge** ; secret à repointer
  (responsable) ; vérification post-release par conteneur
  (`scalingo run -d`), plus jamais par MCP. `CLAUDE.md`, `db-prisma.md`,
  `DEPLOIEMENT_RELEASE_DB.md` alignés dans la PR.

## À savoir pour la suite

- **MERGER LA PR DU LOT = APPLIQUER LA MIGRATION EN PRODUCTION** (auto-deploy
  puis postdeploy). Merge uniquement sur go explicite du responsable.
- Après merge : `scalingo run -d "npx prisma migrate status"` (+ contrat
  `alli_` depuis le conteneur) — le MCP lit la base gelée, ne rien conclure
  de lui.
- LOT-02/03/04 gatés sur l'application constatée ; LOT-05 (EVA) décidé en
  parallèle : relâcher la garde par type dédié « sans interprétation »
  (D-xxx propre), moteur `sum_no_interpretation` recyclé + item `number` —
  verdict d'instruction complet au transcript, PR séparée.
- Deux migrations portent le 2026-08-22 : `..._purge_access_token_dormant`
  (#746, mergée pendant le lot — avance rapide propre, stash du seul fichier
  recouvrant) puis la nôtre renommée `20260822153000_...`.
- Gestes responsables pendants : repointage `MIGRATE_DATABASE_URL`, sort des
  deux runs `release-db` en attente (base gelée), go au merge.

## Ouvert

- T3 complet VERT (2 min 23 s — migrate deploy/diff, contrats dont `alli_`,
  build, 142 E2E Chromium+WebKit). Revue `wn-reviewer` : GO avec corrections,
  toutes appliquées — ré-ancrage DC-19/DC-20 (DC-27 ne porte pas « un
  objectif n'est jamais un score »), DC-30 nuancé « dans l'esprit de »,
  D-086 précisé (l'approbation release-db subsiste mais ne garde plus la
  première écriture), résidus Vercel de CLAUDE.md/db-prisma.md corrigés.
- **Dus nommés par la revue, sans lot d'accueil** : garde structurelle
  append-only (aucun update/upsert sur les 5 modèles — à poser au plus tard
  aux lots 02-06) ; banc d'effacement niveau base (dû au LOT-06) ;
  `DOSSIER_RGPD.md` §5 en retard sur le schéma (dette antérieure, étendue
  ici) ; question du trou §8 (durées données de santé) posée au responsable.
- **Question au responsable AVANT merge** : l'ordre du repointage — repointer
  AVANT le merge prive le filet de rollback Supabase des cinq tables (un
  retour arrière casserait `effacerDossier` en P2021) ; APRÈS, le run
  release-db en file s'appliquerait à la base gelée (faux vert nommé par
  D-086). Choix à consigner.
- Session parallèle : travail synthèse non commité toujours dans l'arbre —
  jamais stagé ici.
