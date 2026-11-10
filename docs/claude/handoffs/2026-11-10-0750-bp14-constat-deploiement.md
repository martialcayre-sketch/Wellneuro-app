# Handoff — 2026-11-10 — File C, place 8 : BP-14, constat du déploiement de la PR de code (F10, D-459 §5 deuxième temps)

## Branche et état du dépôt

- Branche `docs/bp14-constat-deploiement`, créée depuis `origin/main`
  (`2d4a3172`) dans le worktree `.claude/worktrees/bp14-code`. PR de doc
  seule, sans code, déclarée « prête @<sha> » et mergée par l'intégrateur
  (D-373, D-454).
- #1953 (PR de code) est mergée (`8c93c962`, 2026-11-09T22:02:42Z) après la
  passe Codex P0 du responsable (ACCEPTER, sans constat).

## Objectif

Inscrire l'instant du déploiement de #1953 au journal de F10 et à la fin de
D-459 (§5, deuxième temps), puis clore LOT-14.

## Décisions prises

- Premier déploiement qui contient le merge : `7af75e65` (#1952), vérifié
  par `git merge-base --is-ancestor`. La ligne d'avant (`51240b23`) ne le
  contient pas.
- Les heures de `scalingo deployments` sont en UTC : le déploiement de
  `7af75e65` est daté de 22:10:54, après le merge de #1952 à 22:08:21Z, ce
  qui exclut l'heure locale.
- L'instant s'inscrit en deux bornes, début `22:10:54Z` et fin vers
  `22:16:55Z` (durée 6 min 1 s). Entre les deux, la colonne fait foi.
- Statut « terminé », vocabulaire de la campagne. La fiche F10 du plan n'a
  pas de ligne d'état : elle n'est pas touchée.
- Les constats M1, M2, m3, m5 et m6 de la revue de l'écart de #1953 sont
  adressés à BP-18a dans le fragment F10.

## Fichiers modifiés

- `docs/claude/plan-journal/F10/2026-11-10-01-constat-deploiement-pr-code.md`
  (neuf).
- `docs/decisions/D-459.md` : constat ajouté à la fin.
- `changelog.d/2026-11-10-bp14-constat-deploiement.md` (neuf).
- Statut de LOT-14 et ligne BP-14 de `CAMPAGNE.md`.
- Ce handoff. Hors dépôt : lignes p28 (BioFlow) et a08 (file C).

## Validations exécutées

- Lecture de `scalingo --app wellneuro deployments` et de la chronologie de
  l'application (lecture seule, aucune requête en base).
- T1 complet : voir la PR.

## Problèmes ouverts

- Aucune lecture en base ne confirme encore qu'une ligne neuve porte
  l'auteur. Ce n'est pas demandé par D-459, et le banc nominatif le tient.
  Le premier lecteur (BP-18a ou BP-24) pourra le constater en agrégats.

## Prochaine action exacte

Après le merge de cette PR, `/clear`. BP-14 est clos. La suite de la file C
se lit dans la page a08.

## Interdits encore actifs

- Aucun écran, export, IA ni route de lecture des deux colonnes avant
  BP-18a ou BP-24, qui décideront de leur affichage (D-459 §7).
- Aucune seconde reprise : un nul ne se complète jamais (§5). Les fonctions
  `identite_auteur_*` ne sont pas appelées.
- Production en lecture seule, par conteneur, en agrégats. Aucun e-mail,
  aucune identité ni identifiant de dossier au dépôt.
- La D-xxx de BP-18a et la règle signée sont de la main du responsable.
