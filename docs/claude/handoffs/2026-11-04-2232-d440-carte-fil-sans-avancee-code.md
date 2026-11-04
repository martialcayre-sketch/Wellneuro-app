# Handoff — 2026-11-04 — D-440 §8 : la carte du Fil « Sans avancée » (H07, audit 2 QB)

## Branche et état Git
- Branche `feat/fil-carte-sans-avancee`, partie d'`origin/main@c5fa8304`, avancée par `--ff-only` à `9f8100cd` avant le commit. Worktree `.claude/worktrees/audit2-parcours` (session concurrente, cycle en git/gh direct). La branche de #1852, mergée, n'est plus utilisée.
- Une PR de code, squash. **La session ne merge pas** : elle déclare « prête @<sha> » à l'intégrateur (essai D-373).

## Objectif
Livrer la carte « Sans avancée » décidée par D-440 : trois situations, plus de 30 jours sans pas du parcours, exclusions du §4, clé du §5, textes du §6 et ligne « Ce qui retient le T0 » du §7.

## Décisions prises
- Deux arbitrages du responsable du 2026-11-04, liste commune (page de suivi de la file D), au statut `repondue` :
  - `20261104-2159-d` : la carte se place entre le retard et la reprise ;
  - `20261104-2200-d` : si l'évaluation des préconditions échoue, la ligne devient « Ce qui retient le T0 : non vérifié, voir la fiche. ».
- Choix d'implémentation :
  - la carte se calcule après le refus des autres cartes, car seule une carte de geste présente dans le Fil servi retient un dossier (§4) ;
  - ses propres refus s'appliquent avant le plafond de 5 ;
  - la lecture des refus couvre aussi les dossiers de la carte, puisqu'un dossier sans réponse ni échéance n'entre dans aucune autre lecture du Fil.
- Quand aucune condition dure ne manque, la ligne est omise : il n'y a rien à lister.
- Un échec de la lecture d'ensemble fait tomber le Fil (500), comme le retard et la reprise. Seule l'évaluation des préconditions est isolée, dossier par dossier.
- Accord au singulier de la situation 3, non écrit dans D-440 §6 : « 1 questionnaire assigné reste sans réponse ; il date du … », « Il n'a pas d'échéance. ». Signalé dans la PR, à relire.

## Fichiers modifiés
- `web/src/lib/fil/cartes.ts` contient le module pur : `cartesSansAvancee`, `SEUIL_SANS_AVANCEE_JOURS`, `SOURCES_PAS_DU_PARCOURS`, `TYPES_CARTE_DE_GESTE`, `ligneCeQuiRetientT0`, `placerSansAvancee`, et le résumé.
- `web/src/lib/fil/sansAvanceeServeur.ts` est nouveau : il porte les lectures d'ensemble et `ceQuiRetientT0`.
- Autres fichiers modifiés :
  - `web/src/app/api/praticien/fil/route.ts` ;
  - `web/src/lib/fil/refus.ts` ;
  - `web/src/components/fil/FilDuJour.tsx`.
- Bancs :
  - `web/src/lib/fil/cartes.sansAvancee.test.ts` et `web/src/lib/fil/sansAvanceeServeur.test.ts` sont nouveaux ;
  - `web/src/app/api/praticien/fil/route.test.ts` est complété.
- Fragments :
  - `changelog.d/2026-11-04-d440-carte-fil-sans-avancee-code.md` ;
  - `docs/claude/plan-journal/H07/2026-11-04-02-carte-livree.md` ;
  - ce handoff.

## Validations exécutées
- T1 `npm run check:rapide` vert : 1713 tests, type-check compris.
- T2 `npm run test:worktree -- --fast` vert en 8 min 34 s : E2E Chromium et WebKit sur le build de production. Joué sur `c5fa8304` plus le lot. L'avance jusqu'à `9f8100cd` ne touche que six fichiers du portail, sans recouvrement.
- Aucune lecture de production dans ce lot.

## Problèmes ouverts
- Constat en conteneur après le déploiement : nombre de cartes servies, en agrégats masqués sous 5 dossiers (D-298). D-440 attendait au plus 13 dossiers avant le plafond.
- D-440 §6 ne prévoit pas le singulier : à confirmer par le responsable en relecture.

## Prochaine action exacte
CI vert (`wn-attendre-ci` en fond), revue de la tête (CodeRabbit, sinon PR-Agent, D-393), verdict sur chaque commentaire, puis déclaration « prête @<sha> » avec les lignes `20261104-2159-d` et `20261104-2200-d`. L'intégrateur merge, puis passe les deux lignes à `close`.

## Interdits encore actifs
- Ni migration ni `schema.prisma`. Aucun seuil hors D-440.
- Production en lecture seule, par conteneur `scalingo run -d`. Agrégats masqués sous cinq dossiers (D-298). Aucun identifiant de dossier couplé à des mesures dans le dépôt.
- Fixtures Sophie Nicola, Jennifer Martin, Michel Dogné seulement.
- Ne pas merger (essai D-373).
