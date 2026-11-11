# Handoff — t74, D-479 : supplantation au catalogue décisionnel des compléments

## Branche et état Git

- Branche `feat/t74-catalogue-supplantation`, worktree `.claude/worktrees/t74-catalogue-supplantation`,
  avancée en `--ff-only` sur origin/main a085b1d4 (aucun commit propre à ce moment-là).
- Un commit unique (amendé avant le premier push) : code, bancs, D-479, fragment, plan §8, matrice de
  consommation régénérée, ce handoff. PR à ouvrir.

## Objectif

Dette t74 (§8), inscrite par t73 (D-476 §5). `lireClaimsValides` ne lisait que `claimsValidesAuCorpus` :
un claim encore `VALIDE` mais supplanté fondait toujours une règle de la Bibliothèque des compléments.

## Décisions prises

- Cadrage validé par le responsable le 2026-11-11, en trois questions de la liste commune :
  - `20261111-1007-a` : refus `claims_non_valides`, motif aligné sur D-472/D-476, sans cause nouvelle ;
  - `20261111-1008-a` : la création et la révision appliquent le même critère ;
  - `20261111-1045-a` : la Bibliothèque par intention (`listerCatalogue`), qui ne contrôle aucun claim,
    est inscrite au §8 sous t76, sans être tranchée.
- Critère : `claimsAdmissiblesAuCatalogue`, valide ∩ non supplanté, lectures parallèles sur les mêmes
  couples ; un échec se propage ; aucune substitution de version. `validite.ts` n'est pas touché.
- Aucune release-db : aucun fichier sous les chemins de `release-db.yml`.
- Production (one-off-3603, agrégats, lecture seule) : 0 ligne dans `clinical_rules`.

## Fichiers modifiés

- `web/src/lib/supplement-library/catalogueDecisionPrisma.ts`, `decisionAvantBiologie.ts` (motif, commentaire)
- `web/src/app/api/praticien/regles/route.ts`, `revision/route.ts`
- Bancs : `catalogueDecisionPrisma.test.ts`, `decisionAvantBiologie.test.ts`, les deux `route.test.ts`
- `docs/decisions/D-479.md`, `changelog.d/2026-11-11-t74-catalogue-supplantation.md`,
  `docs/claude/PLAN_WELLNEURO.md` §8 (t74 soldée, t76 ajoutée ; ligne t75 intacte),
  `docs/claude/MATRICE_CONSOMMATION.md` (régénérée : les deux routes consomment le module C4)

## Validations exécutées

- Vitest ciblé : vert (148 tests, 11 fichiers).
- T1 complet : un premier passage rouge sur la seule garde de fraîcheur de la matrice de consommation,
  corrigée par régénération ; le passage final est consigné dans la PR.
- T3 : consigné dans la PR (lancé après la fin du run E2E d'une autre session, base partagée).
- `wn-reviewer` : GO sur d0182768 et 912b6867, ni P0 ni P1 ; verdicts en D-479 §8.

## Problèmes ouverts

- t76 (§8) : `listerCatalogue` sert les règles validées sans contrôler leur claim ; la route de validation
  d'un brouillon ne relit pas le claim ; `validite.ts` garde un en-tête périmé (`claimValideAuCorpus` sans
  appelant). Comportement à cadrer, D-xxx.
- Passe Codex manuelle due avant merge (P0 clinique), geste du responsable.

## Prochaine action exacte

PR `--body-file`, CI attendu par `node <racine du worktree>/scripts/wn-attendre-ci.mjs <N>`, revue
CodeRabbit sur la tête (sinon Copilot, puis PR-Agent), verdict sur chaque sortie, puis « prête @<sha> »
à l'intégrateur. Après merge : constat par conteneur (D-479 §6 : ascendance, puis « et non supplant »
dans `.next/server`), t74 → fait sur la page A, questions closes (`pr`, `merge_le`).

## Interdits encore actifs

- Ne pas toucher `web/src/lib/fiches-assiette/`, la ligne t75 du §8 ni `rag/claims/validite.ts` (t75, autre session).
- Ne pas merger (intégrateur, D-454). Aucune migration. Aucun E2E ni seed sur un dossier réel.
