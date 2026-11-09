# Handoff — 2026-11-09 — H95 part A : le bloc des besoins dans la synthèse (D-462, r5_07)

## Branche et état Git

`worktree-h95-part-a-besoins`, worktree `.claude/worktrees/h95-part-a-besoins`, un commit de code sur `origin/main` à `f7745b0c0` (#1943), suivi du commit de ce handoff. Deux rebases autorisés par le responsable ; un troisième reste autorisé jusqu'à l'ouverture de la PR si la simulation est propre et sans fichier commun. Après l'ouverture, aucun sans arbitrage.

## Objectif

Donner au modèle de synthèse un bloc déterministe des besoins, mesurés et non mesurés, avec provenance, sans aucun chiffre côté patient. La convergence reste à H98 (`D-450` §4), la biologie à la part B (file B, rang 6).

## Décisions prises

- `D-462` (questions `20261108-2303-a` à `2305-a`, `2352-a` à `2354-a` de la liste commune) : le bloc ne transmet aucune valeur par besoin ; la valeur reste au cockpit.
- Texte patient : ni score, ni total calculé, ni pourcentage, ni nombre de besoins, même en toutes lettres ; aucune dose, même déclarée. Permis : noms de nutriments, repères de parcours, quantités brutes déclarées.
- `D-333` §1 : cinquième famille d'exceptions, après celles de `D-355` §3 et `D-357` §4, que le §1 renvoie.
- Consigne `synthese-v32`, textes validés mot pour mot par le responsable, épinglés par empreinte. **Toute retouche lui revient.** Son déploiement au merge est approuvé.
- Signalement `SYNTHESE_IA.NARRATIF.FORME_DE_SCORE` : codes de forme seuls, ni texte, ni blocage, ni correction.
- Écartés après revue : le drapeau de validité éteint (`WN_ENABLE_VALIDITE_PASSATIONS=1` en production, question `20261107-1748-b`) ; une comparaison directe au cockpit (mêmes fonctions appelées, banc d'égalité sur « mesuré »).

## Fichiers modifiés

- Neufs : `web/src/lib/synthese/blocBesoins.ts`, `narratifFormesDeScore.ts`, leurs bancs ; `web/src/app/api/praticien/synthese/promptBesoins.guard.test.ts`, `besoins.generation.test.ts`.
- `web/src/lib/synthese/generation.ts`, `web/src/lib/anthropic.ts`, `web/src/lib/observability/eventCodes.ts`.
- Gardes : `promptAlimentaire.guard.test.ts`, `anthropic.corpusActif.guard.test.ts` (empreintes v32), `frontierePortail.guard.test.ts`, `scripts/specs-drapeau-ali01.test.mjs` (entrée motivée).
- `docs/decisions/D-462.md`, `docs/decisions/D-333.md`, `changelog.d/2026-11-08-d462-bloc-besoins-synthese-v32.md`, `docs/claude/plan-journal/H95/2026-11-08-01-part-a-bloc-besoins-d462.md`, ce handoff.

## Validations exécutées

- T1 complet (`npm run check`) : vert avant le commit de code.
- T3 (`npm run test:worktree`) sur le commit de code, base `f7745b0c0` : vert en entier, 10 min 56 s. Vitest 16 557 passés et 49 ignorés, forme courte 1 718 passés et 21 ignorés, 357 E2E passés et 23 ignorés, aucune dérive schéma ↔ migrations. Le rouge de la passe précédente (deux délais de 5 s dans `ProtocolMiniBuilder.test.tsx`, fichier non touché, machine très chargée) ne s'est pas reproduit.
- Textes de la consigne et de `D-333` §1 comparés par script aux textes validés, au mot près : conformes.
- `wn-reviewer`, deux passes : GO, aucun P0 ni P1. Les quatre P2 de la seconde sont corrigés (motif d'allowlist, commentaire et portée du détecteur, banc de restitution qui recopie le bloc réel, positions du drapeau par rechargement des modules). Cette seconde passe n'a pas relu ces correctifs.

## Problèmes ouverts

- Ce que le modèle écrit n'est prouvé par aucun banc : c'est le rôle du signalement. Aucune synthèse v32 n'est encore observée en production.
- Les limites du détecteur sont nommées dans `D-462` §4 ; effet : une ligne de journal, rien d'autre. Trois ont été trouvées après la validation du responsable et lui sont signalées dans la PR.
- À horodatage strictement égal, le cockpit et le bloc peuvent retenir deux passations différentes (`D-462` §2) : limite nommée, non corrigée.
- Dettes hors lot : t61 monte la consigne en v33 après ce merge ; t62 attend ce merge ; `D-438` fera rougir le banc du registre quand `Q_SOM_07` entrera au besoin 5.
- Hors filtre `release-db` : déploiement au merge.

## Prochaine action exacte

CI et revue sur le sha de tête, verdict sur chaque commentaire, puis déclaration « prête @<sha> » en commentaire sur la PR. Au merge par l'intégrateur : constat de déploiement, puis ligne `r5_07` de la page de la file A à « fait ».

## Interdits encore actifs

- Pas de merge par la file (`D-454`), jamais d'auto-merge.
- Aucune retouche de texte validé sans resoumission.
- Ni migration, ni `schema.prisma`, ni `web/src/lib/clinical/**`, ni seuil, poids, borne ou source.
- Convergence (H98) et biologie (part B) hors périmètre.
- Production en lecture seule par conteneur ; aucun identifiant de dossier avec métrique dans le dépôt.
- Un rouge WebKit du CI ne se relance pas.
