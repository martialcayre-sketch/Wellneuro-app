# Handoff — 2026-11-06 — File D, d61 : les huit arbitrages sur le moteur de synthèse versés au plan

## Branche et état du dépôt

- Branche `docs/plan-d61-arbitrages`, depuis `origin/main` 8673a4ba (#1887).
- Worktree `.claude/worktrees/audit-orientation-d58` : session concurrente, cycle en `git`/`gh` direct.
- PR de documentation seule : `docs/claude/PLAN_WELLNEURO.md`, un fragment de journal, un fragment `changelog.d/`, ce handoff. Ni code, ni `schema.prisma`, ni D-xxx, ni consigne.
- **Pas de release-db attendue** : aucun chemin déclencheur touché.
- Essai `D-373` : la PR est déclarée « prête @<sha> », l'intégrateur la merge.

## Objectif

Verser au plan les huit questions de l'audit d61, closes par le responsable le 2026-11-06 (liste commune de « Suivi de la file D », `20261105-0930-d` à `0938-d`). Règle du §4 : aucune dette ne vit hors du plan.

## Décisions prises

- Aucune décision clinique : les D-xxx viennent avec les lots.
- Q1, Q2, Q3 : une fiche commune H95 (part B biologie, part A besoins et convergence), rang 5 au plus tôt [Hypothese]. Une seule fiche suffit : les trois blocs ouvrent le même canal.
- Q4 : H96 (détecteur `DC-03`), rang 6 au plus tôt, après la part B de H95. Q5 : H97 (carte du Fil), rang 6 au plus tôt, après la part B de H95.
- Q6 : fragment `plan-journal/H56/2026-11-06-01-…` ; ligne h3 du §4 close ; sort écrit pour la dette `AGA_*` du §8.
- Q7, Q8 : deux lignes du §8, pas de fiche. Ce sont deux dettes de code sans porte, sans rang ni décision ; une fiche n'aurait que des champs vides.
- D/45 : le lot de code de D-443 produit les objets de convergence ; leur injection dans la synthèse revient à H95. Ajouts au §5 (ordre des release-db du rang 5) et au §10 (décisions à écrire).
- Une question ouverte dans la liste commune, `20261106-1200-d` : le contexte de lecture de la part B est-il celui de BP-05 (F20, porteur de `DC-46`) ? H95 dit les deux rangs possibles et ne tranche pas.

## Fichiers modifiés

- `docs/claude/PLAN_WELLNEURO.md` : tables des rangs 5 et 6, fiches H95 à H97, §4 h3, §5, D/45, §8 (une ligne amendée, deux ajoutées), §10.
- `docs/claude/plan-journal/H56/2026-11-06-01-consigne-versionnee-clause-agenda.md`.
- `changelog.d/2026-11-06-plan-arbitrages-d61-synthese.md`, ce handoff.

## Validations exécutées

- Bancs du journal du plan : 39 passés. `wn-plan-fiche` lit H56, H95, H96 et H97.
- T1 rapide : 16 étapes vertes. T1 complet (`npm run check`) : code 0. T2 non joué : aucun fichier d'UI ni d'API.
- Contre-revue adverse en trois angles (fidélité, forme, cohérence) : sept constats, tous traités. Rang de H95 et lot de D-443 sans rang ; double porteur de Q3 ; rapport à BP-05 ; référence D-333 ; D-044 §3 au lieu de D-389 §5 ; chemins de Q7 ; porteur de Q7.

## Problèmes ouverts

- `20261106-1200-d` attend le responsable. Selon sa réponse, la part B de H95 passe au rang 6 et la migration du contexte disparaît.
- Le lot de code de D-443 n'a ni rang ni fiche (D/45). Son cadrage peut repousser la part A de H95.
- Le décompte du §0 n'est pas recompté : H93 à H97 n'y figurent pas.

## Prochaine action exacte

1. CI (`node scripts/wn-attendre-ci.mjs <N>`, code 0), revue sur la tête, commentaires lus, « prête @<sha> ».
2. Ligne d61 de « Suivi de la file D » : « arbitrages versés au plan, PR #N ».
3. Suite d61 : cadrer le lot de code de D-443, puis H95.

## Interdits encore actifs

- Pas de merge par cette session (essai D-373). Pas de pull, merge ou rebase sans arbitrage.
- Ne pas reposer les huit questions ni refaire l'audit.
- Aucune valeur, aucun seuil, aucun texte de consigne au dépôt public (forme opaque, D-251 §4).
