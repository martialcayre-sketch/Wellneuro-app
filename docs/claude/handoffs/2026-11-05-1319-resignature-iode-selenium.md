# Handoff — 2026-11-05 — Re-signature iode et sélénium de la structure des fiches d'usage (D-446)

## Branche et état du dépôt

- La branche `b-fiche-usage-iode-selenium` est rebasée sur `origin/main` bdba7eb5 (#1880), par arbitrage du responsable (rebase + force-with-lease).
- Worktree `.claude/worktrees/b-fiche-usage-iode-selenium` : session concurrente de la file B, cycle en `git`/`gh` direct.
- **Chemin de release-db** : `web/src/lib/fiches-usage/ficheUsageBesoin2V1.ts` ([[D-416]]).
  - Le déploiement reste retenu jusqu'à une release-db approuvée par le responsable ([[D-044]]).
  - Un constat par conteneur suit.
  - Aucune migration, aucun changement de `schema.prisma`.
- Essai `D-373` : la PR est déclarée « prête @<sha> » et cette session ne la merge pas ; l'intégrateur merge. La session suit ensuite la release-db jusqu'au constat (chemin release-db).

## Objectif

Re-signer la structure des fiches d'usage du besoin 2 pour l'iode et le sélénium ([[D-417]] §4).

- Huit fiches neuves, une par position signée du dossier clos le 2026-11-05.
- Les valeurs sont pré-remplies par une règle écrite sur la surface privée, puis corrigées et déclarées par le responsable (D-195).

## Décisions prises

- D-446, réservée par `wn-reserver-decision.mjs`, applique D-417 §4 et précise D-434 §3 :
  - §1 : 46 fiches ; les 38 de D-434 sont inchangées à la case près ;
  - §2 : les claims épinglés sont la liste de sources de chaque position plus trois renvois du corps. Les écarts déclarés sont épinglés ; le claim hors parcours et les cinq claims en attente ne le sont pas ;
  - §3 : aucun acte de nomenclature ⇒ exploration fonctionnelle, pour les huit fiches ;
  - §4 : six fiches en « information contributive » (nature déjà présente dans la structure), deux en « mesure directe ». Une seule case est corrigée : P1 passe en « départager des options », avec marqueur de sécurité ;
  - §5 : 467 claims, contrat de fraîcheur et négatif. Aucun texte ni libellé en base, donc rien ne passe « à relire » ;
  - §6 : release-db approuvée, puis constat.
- Arbitrages du responsable du 2026-11-05 :
  - exploration fonctionnelle pour les huit fiches ;
  - trois renvois du corps épinglés ;
  - contre-revue Codex avant la déclaration ;
  - P1 en « départager des options », avec sécurité « oui » ;
  - rebase sur `origin/main`.
- Déclaration rendue le 2026-11-05 et recopiée :
  - `dateValidation` : 2026-11-05T12:07:26.000Z ;
  - `shaPerimetre` : `116fbf9c0c5be66d0c047f0692ef329e2c7feacdd1b7b037f6c1ed48400b8c1c`.
- La surface de signature, les pièces et le rapport de contre-revue restent privés : document Claude et dépôt privé des revues. Rien n'est versé ici.

## Fichiers modifiés

- `web/src/lib/fiches-usage/ficheUsageBesoin2V1.ts` :
  - huit fiches `FU_IODE_SE_P1`…`P8` ;
  - `claimsSource` à 467 paires ;
  - métadonnées signées ;
  - commentaires d'en-tête et de l'axe du niveau.
- `web/src/lib/fiches-usage/ficheUsageBesoin2V1.test.ts` : empreinte épinglée, 46 fiches, `structureSignee()` vrai.
- `web/prisma/checks/rag_claim_fraicheur_tables_signees_v1.sql` et `…_v1_negatif.sql` : bloc `fiches_usage` à 467 paires, comptes du négatif.
- Docs :
  - `docs/decisions/D-446.md` (registre en un fichier par décision, D-418) ;
  - `changelog.d/2026-11-05-d446-resignature-iode-selenium.md` ;
  - `docs/claude/plan-journal/F05/2026-11-05-01-resignature-iode-selenium.md` ;
  - `docs/claude/PLAN_WELLNEURO.md` (§8, ligne des fiches d'usage) ;
  - `docs/FEATURE_FLAGS.md` (état des verrous) ;
  - ce handoff.

## Validations exécutées

- Banc des fiches d'usage : 115 tests passés, 3 sautés.
- Tests des consommateurs (constats de biologie, relecture, bio-parcours, garde de fraîcheur) : 164 passés.
- T1 complet : vert.
- Contrat négatif : vert sur la base locale (15 ruptures détectées, corpus sain à 467).
- Production, en lecture seule par conteneur, le 2026-11-05 :
  - les 96 claims cités sont `VALIDE`, actifs, non remplacés, en v1.0 ;
  - le contrat positif passe sans exception ;
  - aucune version de texte, aucun libellé en base ;
  - les cinq claims exclus sont `EN_ATTENTE_VALIDATION`.
- Contre-revue Codex de la surface, sur l'empreinte provisoire :
  - verdict NO-GO, pour un P1 (usage de P1) et deux P2 documentaires ;
  - les trois ont été traités avant la déclaration.
- T3 : voir la PR.

## Problèmes ouverts

- Cinq claims en attente de validation restent hors de la structure. Ils entreront à une re-signature après leur relecture.
- Les libellés des populations restent à rédiger et à valider en base.

## Prochaine action exacte

1. CI (`node scripts/wn-attendre-ci.mjs <N>`).
2. Revue sur la tête avec un verdict par constat : CodeRabbit, sinon PR-Agent si `wn-revue-pr-agent.mjs` rend 0 (D-393 §2), sinon `wn-reviewer` (dérogation permanente du responsable).
3. Commentaire « prête @<sha> ».
4. Après le merge par l'intégrateur : release-db **approuvée par le responsable**.
5. Constat par conteneur : empreinte `116fbf9c…` déployée, verrou posé.

## Interdits encore actifs

- Pas de merge par cette session (essai D-373). Une seule PR structurelle à la fois en file B.
- Pas de migration ni de `schema.prisma`. Production en lecture seule.
- Aucune valeur clinique sans déclaration du responsable (D-195). Aucune pièce privée dans ce dépôt public.
