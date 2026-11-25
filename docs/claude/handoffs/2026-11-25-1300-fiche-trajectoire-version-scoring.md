# Handoff — 2026-11-25 — Fiche-trajectoire : cartes « version de scoring inconnue » (D-561, DOC-19)

## Branche et état du dépôt

- Worktree `.claude/worktrees/fiche-trajectoire-version-scoring`, branche
  `worktree-fiche-trajectoire-version-scoring`, partie d'`origin/main`
  15ba9fe8, avancée par `--ff-only` sur b39c140e avant le commit.
- Un seul commit de lot, poussé avec la PR ; rien d'autre en cours.

## Objectif

Demande du responsable sur une capture de la fiche-trajectoire praticien :
retirer le « bruit » des cartes « Ce que nous ne savons pas encore — La
version de scoring de la réponse est inconnue », répétées une fois par
questionnaire répondu, sans action possible.

## Décisions prises

- Cause établie dans le code : `runtimeFromPrisma.ts` (`adaptRuntimeInputs`)
  pose `scoreVersion: null` en dur pour toute réponse ; `clinicalReview.ts`
  en fait un constat par réponse. Tous les dossiers sont concernés : aucune
  lecture de production n'était nécessaire.
- Question `20261125-1217-d` (liste commune, nature clinique, `DC-25`), avis
  Codex à l'aveugle joint (option B, confiance forte). Réponse du
  responsable : **B, texte accepté** mot pour mot.
- [[D-561]] (numéro réservé, `refs/tags/reserve/D-561`) : les cartes quittent
  la colonne « Données manquantes » ; une ligne unique T-80 dans l'instrument
  « Détail des réponses » ; moteur inchangé (empreinte de la carte de
  décision intacte, aucun protocole diffusé interrompu).
- [[D-488]] amendement DOC-19 (T-80) ; registre des textes §2.13.
- Écartés : suppression dans le moteur (interromprait les protocoles
  diffusés) ; retrait de toutes les cartes « Ce que nous ne savons pas
  encore » (contraire à `DC-25`) ; retrait sans ligne de remplacement
  (réserve Codex sur `DC-25`).

## Fichiers modifiés

- `web/src/components/patient-cockpit/MissingDataPanel.tsx` : filtre
  `estVersionScoringInconnue`, constante `LIGNE_VERSION_SCORING_NON_CONSERVEE`.
- `web/src/components/FichePatientPanel.tsx` : ligne T-80 dans « Détail des
  réponses », dès qu'au moins une réponse est affichée.
- `web/src/components/patient-cockpit/MissingDataPanel.test.tsx` : trois
  bancs (filtre, panneau vide, garde de la cause §3).
- `docs/decisions/D-561.md`, `docs/decisions/D-488.md` (DOC-19),
  `docs/claude/propositions/2026-11-11-refonte-lien-etape2/registre-textes.md`,
  `changelog.d/2026-11-25-fiche-trajectoire-version-scoring.md`.

## Validations exécutées

- Banc `MissingDataPanel.test.tsx` : 27/27.
- T1 complet (`npm run check`) : 0.
- T2 `--fast` (`npm run test:worktree -- --fast`) : 0 — 18 564 Vitest,
  471 E2E (sur la base 15ba9fe8 ; la branche a ensuite avancé par
  `--ff-only` sur b39c140e, qui n'ajoute que COM-1, fichiers neufs sans
  recouvrement).
- Constat à l'écran local (build de production, base du worktree seedée,
  Desktop Chromium, spec local non versé), fixtures `PAT_SEED_01` à
  `PAT_SEED_03` : la ligne T-80 paraît une fois dans « Détail des
  réponses », au-dessus du tableau ; aucune carte « version de scoring » à
  l'écran. **Non vu à l'écran** : le filtre de la colonne « Données
  manquantes » sur une revue prête — aucune fixture ne confirme de T0
  ([[D-052]]), la colonne y dit « non évaluées ». Le filtre est prouvé par
  les bancs de `MissingDataPanel.test.tsx` seulement.

## Problèmes ouverts

- La cause reste : aucune version de scoring n'est conservée par réponse.
  La stocker (le champ `AssessmentEpisode.versionScore` existe, rien par
  réponse) est un autre lot, avec migration ; le jour où elle est lue, le
  banc §3 rougit et [[D-561]] doit être retirée par une nouvelle décision.

## Prochaine action exacte

PR « prête @<sha> » après `wn-attendre-ci` 0 et `wn-revue-pr-agent` 0 ;
l'intégrateur merge. Question `20261125-1217-d` à passer `close` au merge.

## Interdits encore actifs

- Pas de merge par la session (l'intégrateur merge).
- Rien de clinique sans `D-xxx` et avis Codex ; aucun drapeau posé ou
  retiré.
- Identifiant du dossier de la capture jamais versé au dépôt.
