# Handoff — J3-12f, lot de code de D-565 : le besoin 12 lit « Relation aux autres » (2026-11-25)

## 1. Branche et état Git

- Branche `feat/j312f-besoin12-relation-aux-autres-d565`, tirée d'`origin/main` (97e0d72db, après le merge de #2356) dans le worktree
  `.claude/worktrees/agent-a81c34a8d1130b0ce`. Commit tardif avant le push (`D-518`). PR déclarée « prête » par la session une fois les vérifications à 0 (consigne du coordinateur).

## 2. Objectif

Appliquer `D-565` (acceptée le 2026-11-25) : la source du besoin 12 devient `RELATION_AUX_AUTRES` de `Q_MOD_01` (niveau B), `ME` quitte le besoin ; un seul changement de version (`D-548` §4 amendée).

## 3. Décisions prises

- Version : `VERSION_SCORE_EQUILIBRE` v18/v19 -> v20/v21 ; `VERSION_MAPPING_BESOINS` besoins-v4 et `VERSION_OBJETS_CLINIQUES` objets-cliniques-v4 (précédent de la vague 1 : mêmes motif et coût, aucune extinction de plus).
- Provenance du niveau B : `D-424` §2 et §3 avec la table de `constants.ts` (confirmé par le coordinateur) ; citée dans le code et le changelog.
- `inverser: false`, `max: 20` : l'axe va de 0 à 20, plus haut vaut mieux, comme l'activité physique du besoin 5.
- Aucune version pour les besoins 3, 6, 7, 8, 10, 11 (`D-564`, `D-566` à `D-570`).

## 4. Fichiers modifiés

- `web/src/lib/equilibre/constants.ts` (source du besoin 12, note de version, étiquette), `web/src/lib/clinical-engine/types.ts` (étiquettes de mapping).
- Tests : `bumpVersionScore.guard.test.ts` (entrées v20/v21, cas de la source), `score.test.ts`, `formeAlimentaireServie.guard.test.ts`, `safetyQuestionnaire.integration.test.ts` (empreintes des deux positions du drapeau).
- Documentation : `docs/claude/GUIDE_12_BESOINS_NEURONUTRITION.md` (sections 10 et 12), `docs/questionnaires-drive-mapping.md`.
- Fragments : `changelog.d/2026-11-25-j312f-besoin12-relation-aux-autres.md`, journal H15 (`2026-11-25-05`), ce handoff.

## 5. Validations exécutées

- `npm run check:rapide` vert ; vitest ciblé (equilibre, clinical-engine, synthese, cockpit, api praticien) vert, dans les deux positions du drapeau alimentaire.
- Impact rejoué par le moteur (conteneur de production, lecture seule, agrégats, code déployé en v19) : 25 dossiers avec réponses ; total présent avant et après sur 22 ; besoin 12 mesuré 20 -> 22 (2 gagnés, 0 perdu) ; aucun autre besoin touché ; total qui bouge 19, de plus d'un point 14, de plus de cinq points 1 (écart 23, dossier à un seul besoin mesuré qui en gagne un second) ; 2 protocoles diffusés, tous deux dans des dossiers où le besoin 12 bouge.
- `npm run check` vert. T3 (`npm run test:worktree`) vert (code 0), seconde passe sans charge concurrente : la première passe avait deux E2E rouges (pied d'urgence du rail latéral, clôture de l'agenda), sans rapport avec le lot et lancée pendant d'autres tests ; non relancés « pour voir », la passe seule est verte.
- Contre-revue Codex P0 (`wn-codex-avis.mjs`, mode revue, à l'aveugle, paquet = consigne et diff de code) : aucun constat. `wn-reviewer` : go, aucun point bloquant ni clinique ; deux « à corriger » traités (commentaire de test périmé corrigé ; trace de l'écart +23 portée au changelog, au journal et au handoff) et trois tests ajoutés (besoins 5 et 12 jugés indépendamment sur `Q_MOD_01`, motif « recueil incomplet » du besoin 12, re-passation ciblée du besoin 12).
- Liste de réapprobation préparée en lecture seule : 2 approbations de diffusion en tête de chaîne, sur 2 dossiers ; jamais exécutée.
- Sonde release-db et preuve PR-Agent : consignées sur la PR.

## 6. Problèmes ouverts

- Écart de +23 sur un dossier à un seul besoin mesuré (`D-548` §2.8) : accepté par le responsable (`20261125-1710-b`), ainsi que l'extinction des 2 protocoles diffusés (`20261125-1711-b`).
- Réapprobation des 2 protocoles (`D-548` §5.4, `D-329` §4) : geste du praticien après le déploiement ; liste préparée en lecture seule, jamais exécutée.
- P25 du besoin 8 : amendement de `D-567` à sa signature, hors de ce lot.

## 7. Prochaine action exacte

Intégrateur : merge de la PR déclarée « prête @sha ». Après le déploiement : constat de la version servie, puis réapprobation des 2 protocoles par le praticien.

## 8. Interdits encore actifs

Aucune signature ni rejet ; aucune écriture en production ; aucun texte de claim ni identité au dépôt ; un merge à la fois et la session ne merge pas ; la réapprobation des protocoles est un geste du responsable.
