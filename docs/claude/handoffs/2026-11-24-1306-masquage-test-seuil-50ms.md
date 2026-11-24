# Handoff — 2026-11-24 — Masquage : stabiliser le seuil de 50 ms du test de linéarité

Lot `masquage-test-seuil-50ms` (file D, P2, lieu cloud), mené par la passe
de l'orchestrateur cloud `20261124-1301-orch` (`D-540`).

## Branche et état Git

- Branche `claude/clever-mayer-kyrfc1`, tirée d'`origin/main` à `53d01c8d`.
- Un commit de lot (test, fragment de changelog, ce handoff), poussé ; PR en
  brouillon ouverte sur `main`.

## Objectif

Le test « reste linéaire sur « ( » suivi de 80 000 blancs : moins de 50 ms »
(`web/src/lib/export-dossier/masquage.test.ts`) a rougi sous charge le
2026-11-16 (79 ms, handoff `2026-11-16-1408-licences-hors-graphe.md`).
Stabiliser la mesure sans affaiblir la garde anti-emballement.

## Décisions prises

- Meilleure de cinq passes par blanc, arrêt dès qu'une passe tient sous
  50 ms. Seuil inchangé. Écarté : l'étalonnage par une mesure de référence
  (plus de code, plus de surface, pour un gain nul à ce seuil).
- Le texte d'entrée (`'(' + blanc.repeat(N)`) se construit hors de la zone
  mesurée : il n'y a plus que l'appel au masqueur dans la mesure.
- Une régression quadratique (~80 000² opérations) dépasse 50 ms à chaque
  passe : la garde rougit toujours (démontré par le calcul, non rejoué sur
  une régression injectée).
- Ce n'est pas un `retries` : l'assertion est jouée une fois, sur la
  meilleure mesure ; un comportement fautif ne peut pas passer.

## Fichiers modifiés

- `web/src/lib/export-dossier/masquage.test.ts` (bloc des lignes 658-676)
- `changelog.d/2026-11-24-masquage-test-seuil-50ms.md`
- `docs/claude/handoffs/2026-11-24-1306-masquage-test-seuil-50ms.md`

## Validations exécutées

- `npx vitest run src/lib/export-dossier/masquage.test.ts` → 170/170 verts.
- `npm run check:rapide` → 0 (17 étapes vertes, 3 sautées).
- `npm run check` (T1 complet) → 0 (test:changed : 1726 verts, 21 sautés).
- T2/T3 non joués : interdits à la passe cloud, et non exigés (test seul,
  ni UI ni API).

## Problèmes ouverts

- Aucun dans le lot. Hors lot : les autres seuils de durée du même fichier
  (200 ms, 500 ms, 1,5 s) n'ont pas été constatés rouges ; non touchés.

## Prochaine action exacte

CI (`node scripts/wn-attendre-ci.mjs <N>`), revue PR-Agent
(`node scripts/wn-revue-pr-agent.mjs <N>` → 0), un verdict par remarque,
puis « prête @<sha> » et ligne `prete` à la boîte `integrateur`. Merge par
l'intégrateur.

## Interdits encore actifs

- Ne pas relever le seuil de 50 ms ni retirer la garde.
- Aucun code de production dans ce lot.
- Passe cloud : ni merge, ni T2/T3, ni second lot.
