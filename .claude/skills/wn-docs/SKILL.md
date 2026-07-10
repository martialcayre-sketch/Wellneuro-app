---
description: Audite, nettoie et réaligne la documentation WellNeuro avec l’état réel du dépôt, sans toucher au code applicatif ni supprimer de fichier sans confirmation.
---

# WellNeuro — maintenance documentaire

Arguments reçus : `$ARGUMENTS`

## Modes

- Aucun argument ou `audit` : audit complet en lecture seule.
- `apply` : audit puis application des corrections documentaires sûres.
- `verify` : contrôle en lecture seule après une opération de nettoyage.
- Tout autre argument est traité comme un périmètre indicatif, en mode `audit` par défaut.

Le mode `apply` vaut autorisation explicite de modifier uniquement les fichiers documentaires autorisés ci-dessous. Il ne vaut jamais autorisation de supprimer, déplacer ou archiver un fichier.

## Contexte minimal injecté

Dernière trace de session :

!`test -f docs/claude/SESSION_LOG.md && tail -n 100 docs/claude/SESSION_LOG.md || true`

État Git :

!`git status --short`

Documentation récemment modifiée :

!`git log -n 12 --date=short --pretty='format:%h %ad %s' -- '*.md' '*.mdx' 2>/dev/null || true`

Présence des documents canoniques :

!`for f in README.md AGENTS.md CLAUDE.md CHANGELOG.md docs/roadmap.md docs/claude/PROJET_CONTEXTE.md docs/claude/REGLES_CRITIQUES.md docs/claude/WORKFLOW_DEVELOPPEMENT.md docs/claude/SESSION_LOG.md; do test -f "$f" && printf 'OK   %s\n' "$f" || printf 'MISS %s\n' "$f"; done`

Répartition des fichiers Markdown suivis par Git :

!`git ls-files '*.md' '*.mdx' | grep -Ev '(^|/)(node_modules|\.next|coverage|dist|build)/' | awk -F/ '{print ($1=="docs" && NF>1) ? $1"/"$2 : $1}' | sort | uniq -c | sort -nr`

## Objectif

Maintenir une base documentaire :

- fidèle à l’état réel du code et de la configuration ;
- organisée autour de documents canoniques clairement identifiés ;
- sans doublons inutiles ni liens cassés ;
- séparant l’état courant, la roadmap, les procédures et l’historique ;
- exploitable par Claude Code avec un minimum de contexte et de tokens.

Ce skill est un outil récurrent. Il ne remplace pas le lot ponctuel `/wn-r0`.

## Hiérarchie des sources de vérité

Pour vérifier une affirmation, utiliser cet ordre :

1. code, configuration et arborescence réellement présents dans le dépôt ;
2. tests, scripts de contrôle et schéma Prisma en lecture seule ;
3. `docs/claude/PROJET_CONTEXTE.md` pour l’état courant consolidé ;
4. `docs/roadmap.md` et les roadmaps actives pour les travaux futurs ;
5. `CHANGELOG.md` pour l’historique fonctionnel ;
6. `docs/claude/SESSION_LOG.md` pour la reprise chronologique ;
7. documents datés, comptes rendus et dossiers de reprise comme sources historiques seulement.

Ne jamais présenter une intention de roadmap ou une ancienne entrée de session comme une fonctionnalité déjà livrée sans vérification dans le dépôt.

## Périmètre de lecture

Commencer par les fichiers Markdown suivis par Git. Lire ensuite uniquement les fichiers nécessaires pour vérifier les affirmations douteuses.

Lecture autorisée si nécessaire :

- documents racine : `README.md`, `AGENTS.md`, `CLAUDE.md`, `CHANGELOG.md` ;
- `docs/**` et `.claude/skills/**` ;
- `web/package.json`, `web/prisma/schema.prisma`, fichiers de configuration ;
- routes, composants, bibliothèques et scripts strictement nécessaires à une vérification documentaire ;
- historique Git utile à l’identification d’un document obsolète.

Ne jamais lire ni afficher la valeur d’un fichier `.env*` ou d’un secret.

## Fichiers modifiables en mode `apply`

Uniquement :

- `README.md`, `AGENTS.md`, `CLAUDE.md`, `CHANGELOG.md` ;
- `docs/**/*.md` et `docs/**/*.mdx` ;
- `.claude/skills/**/SKILL.md` lorsqu’une référence de commande ou une règle documentaire doit être corrigée ;
- `README_AUTOMATISATION_CLAUDE_CODE.md`.

Ne pas modifier le code applicatif, les fichiers de configuration, le schéma Prisma, les migrations, les seeds, les données, les dépendances ou les scripts dans ce skill.

## Contrôles à effectuer

### 1. Inventaire et rôle des documents

Classer les documents utiles en quatre groupes :

- **canonique** : décrit l’état courant et doit rester à jour ;
- **procédure** : runbook, workflow, checklist ou règle durable ;
- **planification** : roadmap, backlog ou campagne future ;
- **historique** : compte rendu daté, reprise ancienne, migration terminée ou archive.

Signaler les documents sans rôle clair et les documents historiques placés parmi les références courantes.

### 2. Fidélité au dépôt

Rechercher les affirmations potentiellement périmées :

- routes, répertoires ou fichiers qui n’existent plus ;
- stack, versions, scripts npm, modèles Prisma ou variables d’environnement obsolètes ;
- fonctionnalités annoncées comme actives mais absentes du code ;
- fonctionnalités livrées encore décrites comme futures ;
- anciens flux GAS, Google Sheets ou routes patient présentés à tort comme flux principaux ;
- nombres figés susceptibles d’avoir changé : questionnaires, packs, modèles, migrations ou tests.

Chaque correction factuelle doit être appuyée par un fichier ou une commande vérifiable.

### 3. Qualité documentaire

Contrôler :

- liens relatifs cassés et ancres manifestement invalides ;
- chemins et commandes incorrects ;
- doublons exacts ou documents très proches ;
- contradictions entre documents canoniques ;
- titres, dates, statuts et mentions « à faire » devenus obsolètes ;
- documents orphelins qui ne sont référencés nulle part ;
- répétitions volumineuses qui pourraient être remplacées par un lien vers une source canonique.

Ne pas réécrire un document uniquement pour homogénéiser le style.

### 4. Sécurité et données patients

Vérifier sans afficher de valeur sensible :

- aucun secret, token, mot de passe, chaîne de connexion ou contenu `.env` ;
- aucune donnée patient réelle ;
- seuls les patients fictifs autorisés peuvent servir d’exemples : Sophie Nicola, Jennifer Martin, Michel Dogne ;
- aucune consigne clinique ou seuil de scoring modifié indirectement par un nettoyage documentaire.

## Règles de nettoyage

En mode `apply`, appliquer seulement les corrections à faible risque :

- corriger une information factuellement vérifiée ;
- réparer un lien ou un chemin ;
- retirer une répétition en conservant un lien vers la source canonique ;
- ajouter une mention explicite « historique », « archivé » ou « planifié » ;
- mettre à jour un index ou une table de navigation existante ;
- harmoniser une référence de commande slash devenue incorrecte.

Toujours préserver le sens métier et l’historique utile.

Ne jamais, sans confirmation distincte :

- supprimer un fichier ;
- déplacer ou renommer un fichier ;
- déplacer un document vers `archive/` ;
- réécrire ou compacter `SESSION_LOG.md` ;
- fusionner deux documents dont les responsabilités ne sont pas clairement équivalentes ;
- modifier une décision clinique, une règle de sécurité ou une roadmap stratégique.

Les suppressions, déplacements et fusions doivent être regroupés dans une section « Actions proposées nécessitant confirmation ».

## Déroulement

1. Déterminer le mode depuis `$ARGUMENTS`.
2. Vérifier l’état Git et ne jamais écraser un travail non commité.
3. Construire l’inventaire des fichiers Markdown suivis par Git, sans charger leur contenu en masse.
4. Identifier les documents canoniques et les candidats manifestes à l’obsolescence ou au doublon.
5. Vérifier chaque contradiction importante contre le dépôt réel.
6. En mode `audit`, produire le rapport et s’arrêter sans modification.
7. En mode `apply`, annoncer la liste précise des fichiers documentaires qui seront modifiés, puis effectuer uniquement les corrections sûres autorisées.
8. Relire le diff documentaire et annuler toute modification non justifiée.
9. Exécuter les validations disponibles :
   - `git diff --check` ;
   - contrôle des liens relatifs modifiés ;
   - `bash scripts/check_no_secrets.sh` si le script existe ;
   - vérification qu’aucun fichier hors périmètre n’a changé.
10. En mode `verify`, ne rien modifier et rendre un go/no-go.

## Sortie attendue

Toujours fournir :

- mode exécuté ;
- état global de la documentation ;
- documents canoniques identifiés ;
- contradictions ou informations périmées, avec preuves ;
- liens cassés, doublons et documents orphelins ;
- fichiers modifiés, si mode `apply` ;
- actions proposées nécessitant confirmation ;
- validations exécutées et résultat ;
- prochaine action documentaire prioritaire.

Rester synthétique : ne recopier ni les documents ni de longs extraits de code dans le rapport.