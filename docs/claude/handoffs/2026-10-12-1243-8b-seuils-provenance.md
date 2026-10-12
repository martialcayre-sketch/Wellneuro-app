# Handoff — 2026-10-12 — Lot 8B : des seuils dont la source est écrite (D-280)

## Branche et état Git

`feat/8b-seuils-agenda-sommeil`, dans le worktree
`.claude/worktrees/bio-ingest-cloture`, partie de `origin/main` (`34ba253a`,
#1403 mergée et déployée). La copie principale n'a pas été touchée. Le lot
tient en une PR : ni migration, ni drapeau de déploiement.

## Objectif

BP-26, décision 8B : les drapeaux de l'agenda du sommeil sont gardés, et la
source de leurs seuils est établie. Le lot porte aussi les paliers 70/40 de
« Mon équilibre », qui n'avaient pas de provenance non plus.

## Décisions prises

- Constat de provenance. La source primaire est Spielman, Yang & Glovinsky
  (2011), chapitre « Sleep Restriction Therapy », section « Specific
  indication », lue dans son texte : efficacité < 85 %, ou < 80 % chez la
  personne âgée, sans âge précisé ni condition de temps au lit. Les 540 min
  n'ont aucune source. Pour la fréquence, Lichstein 2003 (PMID 12643966),
  dont le résumé a été relevé par E-utilities.
- Constat en production, par conteneur et en agrégats : 11 agendas, dont
  1 scoré ; aucun drapeau jamais émis ; aucun temps au lit moyen ≥ 540 min.
- Arbitrages du responsable du 2026-10-12, sur questions fermées :
  « Critère publié » et « « Peu couvert » sous 34 ».
- Le drapeau de restriction se lève à efficacité < 85 %, sur un axe couvert
  (7 nuits). La variante « personne âgée » n'est pas appliquée, faute d'âge
  dans la source.
- « Peu couvert » commence sous 34, la valeur de `SEUIL_EFFONDREMENT`
  (`D-106`), recopiée dans le composant et gardée par un banc. Le palier de
  70 reste un repère du cabinet.
- Un agent l'a constaté : seule la synthèse IA lit les drapeaux du sommeil,
  sous leur forme stockée. Aucun écran ne les affiche. C'est écrit dans
  `D-280` §5, sans être tranché.

## Fichiers modifiés

- `web/src/lib/questions.ts` : le drapeau de restriction et la citation
  Lichstein.
- `web/src/lib/agenda-sommeil/scoring.test.ts` : les bornes 84/85, le temps
  au lit court, l'axe non couvert.
- `web/src/components/agenda-sommeil/AgendaSommeilPraticienPanel.tsx` : la
  mention de la source.
- `web/src/components/patient/MonEquilibreDetail.tsx` et son test : les
  paliers exportés et le banc d'égalité.
- `docs/DECISIONS.md` (`D-280`), `docs/questionnaires-drive-mapping.md` et
  `changelog.d/2026-10-12-8b-seuils-provenance.md`.

## Validations jouées

- Vitest ciblé : agenda du sommeil, 212 tests ; `MonEquilibreDetail`,
  5 tests. Tous verts.
- `check:rapide` vert, puis `check` complet vert.
- Après la revue : scoring du sommeil rejoué (28 tests), puis `check` complet,
  tous deux verts.
- T2 (`test:worktree -- --fast`) vert en 4 min 45 s, avec 271 E2E.
- Revue `wn-reviewer` : GO sous réserve. Deux P1 :
  - P1-1 corrigé : le texte nomme la variante « < 80 % chez la personne
    âgée » (`DC-14`) ;
  - P1-2 consigné dans `D-280` §5 et routé ci-dessous : le drapeau arrive au
    prompt sans filtre, par un chemin qui existait déjà.
  P2 corrigés : plancher qualifié de technique, tests de la borne à 7 nuits et
  de l'agenda sans compteur, arrondi de l'efficacité écrit, 70 dit « repère
  d'affichage ». P2-3 (arrondi de la couverture) était déjà écrit. P2-6 (fins
  de ligne CRLF→LF de `MonEquilibreDetail.tsx`) est signalé dans la PR. P2-7
  (`DC-26`) relève d'une dette existante.

## Problèmes ouverts

- Les drapeaux du sommeil n'ont aucun affichage praticien. Leur seul lecteur
  est la synthèse IA, qui les reçoit sans filtre ni description dans la
  consigne (P1-2 de la revue). Une question produit reste à poser : les
  afficher, et les filtrer ou les décrire au prompt, dans un lot à part avec
  sa version de consigne.
- Les axes de l'indice /100 du sommeil (240/420 min, 65/85 %, 30/120 min)
  n'ont pas été instruits par ce lot.

## Prochaine action exacte

Ouvrir la PR, attendre le CI, lire les commentaires de revue, merger, puis
constater le déploiement. Ensuite `/clear`, et passer au lot suivant de la
file BP-26.

## Interdits encore actifs

- Aucun âge n'est posé pour la variante « personne âgée » sans source qui le
  fixe.
- Le seuil d'effondrement ne bouge pas sans `D-106` : le banc d'égalité le
  rendrait rouge.
- La base de production se lit par conteneur, en agrégats ; aucun identifiant
  de dossier n'accompagne une métrique dans un fichier durable.
