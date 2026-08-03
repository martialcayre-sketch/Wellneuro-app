# Handoff — 2026-08-03

## Git

- Branche `main`, arbre propre. Dernier commit : PR **#541** (squash), mergée
  et branche distante supprimée depuis cette session.
- Campagne `2026-08-03-packs-moteur-d-intervention-et-corpus-consommable`
  **inchangée par ce lot** : LOT-00, LOT-03, LOT-04 restent livrés. Ce lot est
  orthogonal à la campagne — documentaire, hors périmètre packs/moteur.

## Objectif de ce lot

Repurposer `docs/ROADMAP_TECHNIQUE.md`, qui servait de suivi de chantiers
(historique R0→R10, dette technique), en documentation d'architecture
technique système (stack, routes App Router, modèle de données, sous-systèmes
`lib/`, auth, pipeline RAG, déploiement) — décision explicite de l'utilisateur,
périmètre = toute l'application. **Livré et mergé** (#541).

## Décisions prises, et pourquoi

- **Contenu archivé avant réécriture** : l'ancien `ROADMAP_TECHNIQUE.md` est
  recopié tel quel dans le nouveau `docs/HISTORIQUE_CHANTIERS_TECHNIQUES.md`
  — rien n'est perdu, l'historique R0→R10 reste consultable.
- **Résumer et renvoyer plutôt que dupliquer** : chaque section du nouveau
  document renvoie vers le doc détaillé existant quand il y en a un
  (`RAG_PGVECTOR_PRODUCTION.md`, `VALIDATION_CLAIMS_DEUX_VITESSES.md`,
  `ARCHITECTURE_CLINIQUE_3_2.md`…) ; description complète seulement là où
  aucun doc ne couvrait déjà le sujet (cartographie des routes, sous-systèmes
  `lib/`, comparatif des 3 modèles d'auth).
- **Section déploiement documentée comme transitoire, pas comme tranchée** :
  `vercel-build.sh` porte encore `migrate deploy` inline en parallèle du
  workflow `release-db.yml` plus récent — vérifié dans le code avant
  d'écrire, pour ne pas recopier aveuglément l'un des deux documents source.
- **Compte de modèles Prisma jamais figé en dur** : renvoi à
  `grep -c '^model ' web/prisma/schema.prisma` (66 au 2026-08-03) plutôt qu'un
  chiffre écrit dans le texte, qui aurait dérivé au premier modèle ajouté.
- **Pas de promotion `docs/DECISIONS.md`** : réorganisation documentaire, pas
  une décision structurante d'architecture/sécurité/clinique.

## Fichiers livrés

- `docs/ROADMAP_TECHNIQUE.md` — réécriture complète (12 sections).
- `docs/HISTORIQUE_CHANTIERS_TECHNIQUES.md` — nouveau, archive de l'ancien contenu.
- `CLAUDE.md`, `README.md`, `docs/PROJECT_STATE.md`, `docs/claude/README.md`,
  `docs/claude/PROJET_CONTEXTE.md`, `docs/ROADMAP_PRODUIT.md` — renvois mis à jour.

## Validations exécutées

- Changement purement documentaire : pas de `npm run check` requis.
- Existence vérifiée de tous les fichiers renvoyés par le nouveau document
  (aucun lien mort).
- `grep -rn "ROADMAP_TECHNIQUE" --include="*.md" .` (hors archive/campagnes/
  CHANGELOG) cohérent avec le nouveau rôle.
- CI de la PR #541 : `verify` présent et vert, checks Vercel verts.

## Problèmes ouverts

- Hérité de ce lot : le « lot de bascule » qui doit alléger `vercel-build.sh`
  de sa logique `migrate deploy` inline (au profit exclusif de
  `release-db.yml`) n'a pas eu lieu — documenté tel quel, pas dans mon
  périmètre.
- Hérité de la campagne packs/moteur (LOT-04, non retouché ici) : LOT-05 devra
  trancher si `signauxAlerte` peut porter une décision de sécurité malgré son
  filtrage silencieux ; `estAdministrableParLaRoute` ne vérifie pas `actif`
  contrairement à `IDS_ASSIGNABLES` ; 10 des 16 packs de doctrine n'existent
  pas en base (décision produit).

## Prochaine action exacte

La priorité reste celle de la campagne packs/moteur, non affectée par ce lot :
**LOT-05** (table de règles d'orientation, dépend de LOT-03 et LOT-04, tous
deux livrés) ou **LOT-01** (validation praticien des 755 claims d'intervention,
sans dépendance).

## Interdits encore actifs

- **Pas de migration Prisma** sauf demande explicite distincte.
- **Pas de branchement de `extraireDrapeauxAnamnese`** dans une route sans
  cadrer d'abord la question de sécurité LOT-05 (héritée, inchangée).
- **Repartir de `main`** pour le prochain lot.
- **Ne pas merger sans avoir lu `verify`** — les seuls checks Vercel ne
  prouvent rien.
