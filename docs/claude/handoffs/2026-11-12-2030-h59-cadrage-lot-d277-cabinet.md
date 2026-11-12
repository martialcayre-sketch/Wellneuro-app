# Handoff — 2026-11-12 — H59 (J2-base) : cadrage du lot à part D-277 des instruments du cabinet

## Branche et état Git

- Worktree `.claude/worktrees/h59-nf7-lot3`, réutilisé une troisième fois.
- Branche `feat/h59-d277-cadrage`, partie d'`origin/main` (`a84e5a69`), qui contient #2035 (`7b322374`).
- PR de documentation seule, déclarée « prête @<sha> » à l'intégrateur.

## Objectif

Placer le lot D-277 dans le plan, comme l'a répondu `20261111-2148-a`, et le cadrer sans code. Il couvre :
- le message sur réponse positive ;
- le courriel au praticien ;
- le constat sur les `CAB_`.

## Décisions prises

- `20261111-2148-a` est répondue par le responsable (option 1). Le lot devient une ligne de la fiche H59 : hors NF-7, sans date, AVANT l'allumage.
- Aucune D-xxx n'est réservée et aucun texte n'est écrit. Trois questions d'arbitrage sont ouvertes :
  - `20261112-2023-a` (clinique) : la règle du constat ;
  - `20261112-2024-a` (clinique) : les effets du constat ;
  - `20261112-2025-a` (migration) : où figer la désignation.
- Par défaut, le lot passe derrière le même drapeau.

## Fichiers modifiés

- `docs/claude/PLAN_WELLNEURO.md` : une phrase dans « Identifiant, piste » de H59.
- `docs/claude/plan-journal/H59/2026-11-12-05-cadrage-lot-d277-cabinet.md`.

## Validations exécutées

- Constats faits sur le code de `origin/main` (lecture seule) :
  - `safetyQuestionnaireV1.ts` ;
  - `safetyFindings.ts:237-291` ;
  - `alerteSecuritePraticien.ts:59-69` ;
  - `patient/submit/route.ts:334-460` ;
  - `instruments/route.ts` (effacement de la déclaration sur une modification du contenu) ;
  - `envoyer/route.ts:249` (copie booléenne seule) ;
  - `signauxSecurite.ts:61`.
- T1 sur la PR.

## Problèmes ouverts

- Les trois questions ci-dessus. Les deux cliniques se répondent dans la session qui agit.
- Le compte des copies NULL est à refaire juste avant l'allumage.
- La porte 24 (`20261109-1354-c`) n'est pas tranchée.

## Prochaine action exacte

Après les réponses :
1. rédiger la D-xxx clinique (numéro réservé à la rédaction) et la faire valider ;
2. si l'option 1 de `2025-a` est retenue, faire le lot migration (copie de la désignation sur l'assignation) avec sa release-db ;
3. faire le lot de code derrière le drapeau, avec sa release-db (chemin clinique).

## Interdits encore actifs

- Pas de migration ni de modification de `schema.prisma` sans demande explicite.
- Rien sous `web/src/lib/clinical/` sans la D-xxx clinique.
- Les textes signés de D-275 et de D-277 restent inchangés. La table `SAF-QUEST-01` et sa signature restent intactes, sauf si l'option 2 de `2023-a` est retenue.
- Ne pas reposer :
  - D-303, D-493 ;
  - les réponses 0027-a à 0030-a et 2148-a ;
  - les arbitrages P2-1, P2-3 et P2-4 ;
  - le choix B.
- La production se lit seulement, par conteneur, en agrégats. L'allumage est un geste du responsable.
