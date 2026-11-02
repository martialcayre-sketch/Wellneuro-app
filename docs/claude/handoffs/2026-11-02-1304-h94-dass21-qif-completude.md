# Handoff — 2026-11-02 — H94 (D-406 §7) : DASS-21 au registre de comparaison (D-420), complétude du QIF au moteur (D-421)

## Branche et état du dépôt

- Branche `feat/h94-d406-scores-globaux`, worktree
  `.claude/worktrees/d281-lot3-portail`, partie de `origin/main` b5862ee3
  (#1824).
- Commits 10800b28 (lot), f43f8e41 (revue `wn-reviewer`), c7aa61c2 (ce
  handoff), ae2f135f (revues CodeRabbit et Copilot sur #1826), 3b84709c
  (fusion de `origin/main`, #1825, sur accord du responsable ; conflit dans
  `docs/DECISIONS.md` seul), 9610647c (seconde revue CodeRabbit).
- PR du lot, une seule finalité : D-406 §7, première tranche.

## Objectif

Instruire le lot D-406 §7 (fiche H94) sur la recherche documentaire du
responsable du 2026-11-02 : vérifier chaque citation sur le document
d'origine, verser les sources lues, faire entrer au registre de comparaison
les instruments dont la source définit un total, consigner les absences.

## Décisions prises

- **D-420** : le DASS-21 (`Q_STR_04`) entre au registre `COMPARABLE_DEPUIS`
  depuis le 2026-08-11 ; total brut des trois sous-échelles (0-63), défini
  par la FAQ des auteurs (Q26) ; sept items sur sept par axe ; aucune ligne
  de moteur. Amende D-406 §2.
- **D-421** : le moteur `qif` publie `missing`/`missingIds` au grain des dix
  composantes de Bennett 2005 (item 1 mesuré dès qu'un sous-item est noté ;
  Q12-Q20 exigés ; une valeur non numérique manque, sous-item de l'item 1
  compris — un sous-item vide reste un retrait permis) ; maximum 100 maintenu
  (107 sans source) ; défaut du total incomplet sans correction 10/x
  consigné (§3), avec ses deux points pour la décision suivante.
- Arbitrages du responsable du 2026-11-02, quatre questions à options, tous
  sur la recommandation. Écartés : tolérance d'un manquant par axe du DASS
  (changerait le total), total doublé 0-126, vingt items sur vingt au QIF
  (contraire à la source), maximum 107, correction 10/x ou retrait de bande
  dans ce lot.
- `missing` compte des questions, non des composantes : sens imposé par la
  consigne de synthèse ; effet identique sur la comparaison.

## Fichiers modifiés

- `web/src/lib/questions.ts` (moteur `qif`) ;
  `web/src/lib/doctrine/seuilsCatalogue.instantane.json` (étape moteur
  D-421).
- `web/src/lib/scoring/comparaisonPassations.ts` et son banc ;
  `web/src/lib/scoring/qifCompletude.test.ts` (neuf).
- `docs/DECISIONS.md` (D-420, D-421) ; `docs/questionnaires-drive-mapping.md`
  (ligne `Q_FIB_02`).
- `docs/claude/corpus/source_registry.json` : WN-SRC-0601 (FAQ DASS), 0602
  (Bennett 2005), 0603 (Perrot 2003), sans extrait ingéré.
- `docs/claude/plan-journal/H94/2026-11-02-01-sources-dass-qif-absences.md` ;
  `changelog.d/2026-11-02-h94-dass21-registre-qif-completude.md`.

## Validations exécutées

- Citations relues sur l'original : FAQ DASS (page officielle, Q9, Q26,
  Q27) ; Bennett 2005 et Perrot 2003 (PDF des revues). Non versés faute de
  texte intégral lu : Henry & Crawford 2005, Osman 2012, Bennett 2009,
  Williams 2011, Gentile 2003, Westenberger 2022, Frontiers 2026.
- T1 complet (`npm run check`) vert avant chaque commit.
- Bancs ciblés : 16 fichiers, 246 tests verts (scoring, doctrine,
  promptSousScores, axeNonMesure, valeursDeRepli, bornesAtteignables).
- `wn-reviewer` sur 10800b28 : GO, aucun P0/P1 ; quatre P2 traités dans
  f43f8e41 (NaN, formulation de D-421 §4, deux points consignés en §3,
  tests d'intégration DASS et cas limites QIF).
- T3 (`npm run test:worktree`) vert sur f43f8e41 (7 min 26 s), puis sur
  ae2f135f (7 min 32 s) et sur 9610647c (8 min 39 s ; Vitest 1706 tests,
  E2E Chromium + WebKit 303).
- #1826 : CI vert sur c7aa61c2 ; revues CodeRabbit, Copilot et PR-Agent
  sur c7aa61c2 traitées dans ae2f135f (item 1 NaN, D-421 §3 précisé) ;
  drapeau `WN_*` demandé par PR-Agent écarté avec motif (praticien seul,
  badge et compte existants, précédent D-055).
- Seconde revue CodeRabbit (3b84709c) : sous-item non numérique de l'item 1
  et écriture exacte de `null`/`0` corrigés dans 9610647c ; validation de la
  chaîne brute (« 1abc ») écartée (`getVal` commun à tous les moteurs, le
  total lit la même valeur, la soumission la refuse). CodeRabbit a refusé
  une revue de 7b420cb8 pour quota.

## Problèmes ouverts

- Entrée du QIF au registre de D-406 §2 : décision à part, après le
  déploiement de D-421 (date = déploiement) ; elle devra traiter Q13/Q14
  vides chez une personne sans emploi (toujours incomplète sous D-421 §1).
- Défaut D-421 §3 (bande sur total incomplet, sans 10/x ; bande du zéro à
  vingt sur vingt) : décision clinique propre.
- Écart du facteur 3,3 (fiche du cabinet) contre 3,33 (Bennett) : consigné.
- MFI-20 : total 20-100 décrit par des sources secondaires ; à instruire sur
  texte intégral (Smets 1995, Gentile 2003), exclusion maintenue.
- `missingIds` non décrit par la consigne de synthèse (déjà envoyé par les
  moteurs `sum`) : question pour la prochaine version de la consigne.

## Prochaine action exacte

`@coderabbitai review` à chaque tête ; « prête @<sha> » seulement avec
`node scripts/wn-attendre-ci.mjs <N>` = 0 et
`node scripts/wn-revue-pr-agent.mjs <N>` = 0 sur le même sha ; chaque
commentaire reçoit un verdict. Après le merge : page de suivi de la file A
(r4_15 mise à jour ; prochain id r4_16 pour l'entrée du QIF au registre),
puis `/clear`.

## Interdits encore actifs

- Aucune migration, aucun `schema.prisma` ; rien n'est écrit en base.
- Aucun total inventé : DNST et mode de vie SIIN hors registre sauf fait
  nouveau ; MFI-20 exclu ; aucune bande ni « stable » avant la lettre v
  (porte 11).
- Aucun verbatim d'item SIIN dans le dépôt ni dans un service externe.
- Aucun seed ni E2E sur un dossier réel ; aucun identifiant de dossier
  accompagné de mesures dans un fichier durable.
