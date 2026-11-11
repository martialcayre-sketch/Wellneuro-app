# Handoff — t76, D-492 : claim fondateur contrôlé dans la Bibliothèque et à la signature d'une règle

## Branche et état Git

- Branche `feat/t76-catalogue-claims-admissibles`, worktree `.claude/worktrees/t76-cadrage`, avancée en
  `--ff-only` sur origin/main 9823912f (#1991), puis sur bdc03834, avant tout commit.
- Un commit unique : code, bancs, D-492, fragment, plan §8, matrice de consommation régénérée, ce handoff.
- La copie principale (autre session, branche t72) et le worktree t75 n'ont pas été touchés.

## Objectif

Dette t76 (§8), inscrite par t74 (D-479 §7). Trois points :
1. `listerCatalogue` servait les règles validées sans contrôler leur claim ;
2. la route de validation signait un brouillon sans relire son claim ;
3. l'en-tête de `validite.ts` était périmé, et `claimValideAuCorpus` n'avait plus d'appelant.

## Décisions prises

- Cadrage validé par le responsable le 2026-11-11, sur trois questions de la liste commune :
  `20261111-1643-a` (masquer et signaler), `20261111-1644-a` (refus 422), `20261111-1645-a` (retrait de la
  fonction). Textes de l'écran et de la justification de cumul validés au caractère près (D-492 §2).
- Filtre `claimsAdmissiblesAuCatalogue` dans `listerCatalogue`, avant la sentinelle et toute projection ;
  `reglesEcartees` (contrat `c4-catalogue-v5`) sur toutes les sorties ; une panne du corpus reste une erreur.
- Validation : couple lu en base avant la transaction, brouillon seul (un rejeu reste 409) ; aucune
  substitution de version.
- Aucune migration, aucune release-db, aucune re-signature. 0 règle en production (D-479 §1).

## Fichiers modifiés

- `web/src/lib/supplement-library/catalogue.ts`, `catalogueDecisionPrisma.ts` (commentaire)
- `web/src/components/complements/RayonComplementsPanel.tsx`
- `web/src/app/api/praticien/regles/validation/route.ts`
- `web/src/lib/rag/claims/validite.ts`
- Bancs : `catalogue.test.ts`, `RayonComplementsPanel.test.tsx`, `validation/route.test.ts`,
  `validite.test.ts`, fixtures v5 des deux bancs de `api/praticien/complements`
- `docs/decisions/D-492.md`, `changelog.d/2026-11-11-t76-bibliotheque-claims-admissibles.md`,
  `docs/claude/PLAN_WELLNEURO.md` §8 (t76 soldée), `docs/claude/MATRICE_CONSOMMATION.md` (régénérée)

## Validations exécutées

- Vitest ciblé après les corrections de revue : 508 tests verts sur 32 fichiers ; `tsc --noEmit` vert.
- T3 complet (`npm run test:worktree`) sur l'état final, base 9823912f : séquence CI verte en 9 min 56 s.
  Vitest 16 753 tests verts (50 ignorés), E2E 357 verts (23 ignorés) sur Chromium et WebKit, build de
  production.
- T1 complet (`npm run check`) sur l'état final : vert.
- Avance `--ff-only` ensuite sur origin/main bdc03834 (D-490, miroir Playwright) : aucun fichier commun
  avec le lot ; le CI de la PR rejoue sur cette base.
- `wn-reviewer` : GO, ni P0 ni P1 ; quatre P2 traités (D-492 §7).

## Problèmes ouverts

- P2-2 de la revue (et PR-Agent) : après une exclusion PARTIELLE, une fiche qui ne porte que l'ingrédient
  de la règle écartée peut lire « Compatible » et « Aucun cumul ». Accepté tel quel par le responsable
  (question 20261111-1853-a), écrit en D-492 §2 ; plus rien d'ouvert sur ce point.
- Branche remise à niveau par `git merge origin/main` (555bfd8e, #1976), sur arbitrage du responsable.
- Passe Codex manuelle due avant le merge (P0 clinique), geste du responsable.

## Prochaine action exacte

PR `--body-file`, puis CI attendu par `node <racine du worktree>/scripts/wn-attendre-ci.mjs <N>`. Revue
CodeRabbit sur la tête (sinon Copilot, puis PR-Agent), un verdict sur chaque sortie, puis « prête @<sha> »
à l'intégrateur. Après le merge : constat par conteneur (D-492 §6 : ascendance, puis « claims fondateurs ne
satisfont pas » dans `.next/server`), t76 → fait sur la page A, trois questions closes (`pr`, `merge_le`).

## Interdits encore actifs

- Ne pas toucher `web/src/lib/fiches-assiette/` ni la ligne t75 du §8 (t75, autre session).
- Ne pas faire de checkout ni de switch dans la copie principale.
- Ne pas écrire en base de production ; ne pas lancer d'E2E en parallèle d'une autre session.
