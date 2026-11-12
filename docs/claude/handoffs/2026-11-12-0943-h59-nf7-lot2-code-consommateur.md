# Handoff — 2026-11-12 — H59 (J2-base), NF-7 lot 2 : code consommateur derrière un drapeau éteint

## Branche et état Git

- Worktree `.claude/worktrees/h59-nf7-lot2`, branche
  `feat/h59-nf7-lot2-declaration-suicide-cab`, avancée en `--ff-only` sur
  `origin/main` 5823e961. Préalable : D-493 mergée (#2001, `d6957b86`) et en
  service.
- PR ordinaire (ni migration, ni authentification) : déclarée « prête @<sha> »
  à l'intégrateur, sans merger.

## Objectif

Lot 2 de NF-7 (D-303, amendée par D-493) : code consommateur sans migration,
sur demande explicite du responsable. Tout passe derrière
`WN_ENABLE_DECLARATION_SUICIDE_CAB`, éteint. Drapeau éteint, le comportement
reste strictement celui d'avant NF-7.

## Décisions prises

- Aucune D-xxx. D-303, D-493 et les réponses 20261111-0027-a à 0030-a font
  foi.
- « Oui » exige une désignation, vérifiée contre la définition relue en base :
  la question existe et propose des réponses au choix, et la valeur « non » est
  l'une d'elles, dans l'entier de la colonne. Une désignation vide est refusée.
  Cela tranche le P2 (1) routé par la revue de #2001.
- « Non » efface toute désignation envoyée (CHECK de cohérence du lot 1).
- Une modification des questions ou de la grille efface la déclaration
  (D-303 §2). Modifier le titre seul la garde.
- La copie est faite à l'envoi dans la transaction de `file-envoi/envoyer`.
  C'est le seul chemin `CAB_` : les packs et l'assignation unitaire ne servent
  que le catalogue.
- L'écran patient lit le verdict serveur `encartUrgenceCabinet`, présent
  seulement si le drapeau est allumé, l'instrument `CAB_` et la copie `true`.
  Rien ne se replie sur l'instrument.
- Libellés neufs à l'écran du praticien : « Question concernée », « Réponse
  qui signifie « non » », « Réponse obligatoire pour publier. », et le message
  quand aucune question n'est désignable. La question elle-même reprend
  D-303 §2.

## Fichiers modifiés

- `web/src/lib/securite/declarationSuicideCabinet.ts` (neuf) et son banc
  `declarationSuicideCabinet.guard.test.ts`
- `web/src/app/api/praticien/instruments/route.ts` et son banc
- `web/src/app/api/praticien/file-envoi/envoyer/route.ts` et son banc
- `web/src/app/api/patient/questionnaire/route.ts` et son banc
- `web/src/app/portail/[token]/questionnaires/[idAssignation]/page.tsx` et
  son banc
- `web/src/components/patient/GenericQuestionnaire.tsx`, banc
  `EncartUrgenceSuicide.test.tsx`
- `web/src/components/BibliothequePanel.tsx` et son banc
- `docs/FEATURE_FLAGS.md` (ligne du drapeau, section A)
- `changelog.d/2026-11-12-h59-nf7-lot2-code-consommateur.md`
- `docs/claude/plan-journal/H59/2026-11-12-01-nf7-lot2-code-consommateur.md`
- ce handoff

## Validations exécutées

- T1 (`check:rapide`) : vert après chaque série d'éditions.
- Les sept fichiers de banc touchés, joués à part : verts.
- T3 (`npm run test:worktree`) sur `b1347380` : **vert**, en 9 min 58 s : 16 967 tests unitaires, 366 E2E (Chromium et WebKit), « No difference detected » sur la dérive entre schéma et migrations. Le commit suivant ne touche que ce handoff.
- Revue `wn-reviewer` sur `697e7618` : **GO**, ni P0 ni P1.
  - Corrigés au commit `220804fc` : P2-2 (borne int4), P2-4 (message), P2-5
    (`<legend>`, `aria-describedby`), mutation 1 (banc de rendu de l'écran de
    relecture).
  - Revue de l'écart `697e7618..220804fc` : **GO**. Ses deux P2 sont corrigés
    au commit suivant : la bordure portée par une enveloppe (le `<legend>` la
    coupait), et la reprise documentée par migration et release-db (D-087).
- Encart, branches couvertes par un banc pour un `CAB_` déclaré « oui » :
  - page : consentement, période terminée, transmis, « Mon équilibre » et son
    détail, saisie ;
  - `GenericQuestionnaire` : chaque écran de saisie et le résumé.
  - Sans encart, comme pour le catalogue : chargement, erreur,
    `!data.questionnaire`, et le `return null` du composant.

## Problèmes ouverts (tous à régler AVANT l'allumage, aucun avant le merge)

- **Lot à part D-277** (`20261111-2148-a`) : le drapeau ne s'allume pas avant
  (routage de la revue de #2001).
- **P2-1, fenêtre entre l'allumage et la troisième migration.**
  - Un `CAB_` publié drapeau éteint reste `valide` avec une déclaration NULL :
    une fois le drapeau allumé, il est envoyé sans encart.
  - Même trou après une ré-extinction suivie d'un rallumage (avertissement
    écrit dans `FEATURE_FLAGS.md`).
  - Deux remèdes possibles : filtrer `poseQuestionSuicide` non NULL dans
    `idsAssignablesPour`, drapeau allumé ; ou faire la reprise au moment de
    l'allumage. Question d'arbitrage pour le responsable.
- **P2-3, courses.**
  - À l'envoi : `idsAssignablesPour` est lu hors transaction, et la copie ne
    revérifie pas `valide`. La course préexiste, mais NF-7 y ajoute la perte
    de l'encart.
  - À la publication : l'`update` n'est pas gardé sur le statut ni sur
    `updatedAt`.
  - Correctif proposé, drapeau allumé : `findFirst` sur
    `valide` + `actif` dans la transaction d'envoi, et `updateMany` gardé avec
    un 409 à la publication.
- **P2-4, arbitrage.** Un instrument fait seulement de saisies chiffrées (EVA,
  D-088) ne peut pas être publié en « oui » : 0027-a exige une valeur « non ».
  L'écran le dit désormais ; reste à décider ce qu'il faut faire d'un tel
  instrument.
- **Banc de garde `PASSAGE_VALIDE`.** Il ne voit que le littéral sous
  `web/src`. Un écrivain en SQL brut, par constante, ou sous `prisma/` ou
  `scripts/` lui échapperait. La troisième migration (CHECK en base) fermera
  ce trou.
- Porte 24 (`20261109-1354-c`) et `20261111-2148-a` restent ouvertes, non
  tranchées.

## Prochaine action exacte

PR, CI (`node scripts/wn-attendre-ci.mjs <N>` en fond), revue CodeRabbit sur
la tête (sinon Copilot, PR-Agent ou `wn-reviewer`, selon D-468, D-393 et
D-448), un verdict par remarque, puis « prête @<sha> » à l'intégrateur.
Ensuite, hors de cette session :
1. arbitrage de P2-1, P2-3 et P2-4 ;
2. lot à part D-277 ;
3. allumage, geste du responsable ;
4. troisième migration, avec sa reprise avant son `ADD CONSTRAINT`.

## Interdits encore actifs

- Ni migration ni `schema.prisma` dans ce lot ; rien sous
  `web/src/lib/clinical/`.
- Texte de l'encart D-275 inchangé. Pas de message D-277, de courriel ni de
  constat sur un `CAB_` (D-493) : un banc le tient.
- Aucun nom, valeur, seuil ni D-xxx nouveau sans arbitrage.
- Ne pas reposer D-303, D-306, D-463, D-493, 20261107-2125-d, ni les réponses
  0027-a à 0030-a.
- Production en lecture seule, par conteneur, en agrégats.
