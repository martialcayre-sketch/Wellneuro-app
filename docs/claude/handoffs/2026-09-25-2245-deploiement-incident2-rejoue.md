# Handoff — 2026-09-25 — D-248 : l'incident 2 est rejoué, sans recul

## 1. Branche et état Git

`docs/d248-incident2-rejoue`, worktree `.claude/worktrees/deploy-anti-recul-lot1`,
partie de `origin/main` à `83143246` (#1224, en service).

## 2. Objectif

Consigner dans D-248 la répétition volontaire de l'incident 2 exigée par
l'arbitrage n° 3 avant le lot 4.

## 3. Décisions prises

- La répétition compte comme faite : deux merges à 2 min 09 s, le second
  pendant le build du premier — la configuration de l'incident 2 — et aucun
  chevauchement de builds, aucun recul.
- Le chemin « run dépassé » n'a pas été exercé en production (CI de
  documentation trop rapides) : noté, pas rejoué — les bancs le tiennent.

## 4. Fichiers modifiés

`docs/DECISIONS.md` (D-248 : statut, « Incident 2 rejoué, sans recul ») ·
`changelog.d/2026-09-25-deploiement-incident2-rejoue.md` (couvre aussi #1223
et #1224) · `docs/claude/SESSION_LOG.md` · ce handoff.

## 5. Validations exécutées

- Suivi continu pendant la répétition : CI de `main` par commit, runs du
  déployeur (36186176011, 36186399893 — verts, « Tête de `main` déployée »),
  lignes `scalingo deployments` (`e2810e22` puis `7b55a580`, `wellneuro`,
  aucun chevauchement), observation locale conforme à chaque relevé.
- Observations planifiées vertes à 20:30:49 et 20:42:46.
- `npm run check` (T1) vert.

## 6. Problèmes ouverts

- Décompte de l'arbitrage n° 3 : trois déploiements verts sur cinq, aucun avec
  migration — il en faut au moins un.
- Lot 4 : garde anti-recul de `release-db` et lecture de la « première ligne »,
  `.claude/rules/pr-revue-et-release-db.md` §3-4 et §5.6, écart C1.
- Le dispatch `action=deployer` ne lit pas le CI de la tête : option au lot 4.

## 7. Prochaine action exacte

1. Merger cette PR seule (quatrième déploiement) ; constater la tête en
   service.
2. Laisser venir les merges ordinaires, un à la fois, jusqu'à cinq
   déploiements dont une migration (retenue puis livrée par `release-db`).
3. Puis le lot 4, sur validation du responsable.

## 8. Interdits encore actifs

- « Un merge à la fois, constater le déploiement » jusqu'au lot 4.
- Retour arrière de la bascule : revert du code de #1222 d'abord,
  `--auto-deploy` ensuite, puis `action=deployer` (RUNBOOK, Rollback).
- Avant un dispatch `action=deployer` ou une approbation `release-db` :
  constater le CI de `main` vert sur la tête.
