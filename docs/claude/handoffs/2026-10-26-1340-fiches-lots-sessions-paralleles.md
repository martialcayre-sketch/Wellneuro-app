# Handoff — 2026-10-26 — Fiches H86 à H92 : lots de la séquence « Quatre files en parallèle » (D-370 à D-375)

## Branche et état du dépôt

- Branche `docs/fiches-lots-sessions-paralleles`, worktree `wt-audit`,
  partie de `origin/main` (32c0da8f). Session concurrente, cycle en
  `git`/`gh` direct. Documentation seule : aucun code, aucune migration,
  aucun chemin clinique, aucune décision nouvelle.

## Objectif

Poser au plan une fiche par lot de la séquence (étapes 2 et 5 à 10), les
décisions D-370 à D-375 renvoyant chacune à « une fiche à poser à
l'ouverture du lot » ; constater le déploiement de 91f53ad7 (étape 1, H85).

## Décisions prises

- Sept fiches au rang 1, une ligne de table chacune après H85 : H86
  (libération dès le merge, journal du crochet, mesure de référence), H87
  (numéro réservé), H88 (sonde par phases, lève le gel intégral), H89
  (intégrateur en essai, quatre PR ordonnées), H90 (journal du plan), H91
  (CI : `controles` en deux, puis cache de compilation), H92 (tolérance du
  crochet, bilan des trois essais).
- Mesure de référence : tenue par la session principale, écrite dans H86
  (puis dans le journal du plan une fois H90 livrée), jamais dans
  `SESSION_LOG.md` ; elle sert de « avant » à H88, H89 et H92.
- Journal du crochet : fichier persistant hors suivi Git, distinct du
  marqueur, parce que le dossier temporaire du marqueur se purge.
- Les numéros de fiche de la page d'audit ne sont pas repris : F03, F04,
  F15, F18 et F20 désignent d'autres fiches au plan. Les lots optionnels
  sont nommés en mots dans H92.
- Étape 4 (D-372) sans fiche neuve : H23 amendée la porte déjà.
- H85 renvoie à H88 pour la sonde ; « déploiement constaté » écrit sur H85,
  sa ligne de table et le statut de D-374.

## Fichiers modifiés

- `docs/claude/PLAN_WELLNEURO.md` (table du rang 1, H85, H86 à H92).
- `docs/DECISIONS.md` (statut de D-374, une ligne).
- Fragment de changelog, ce handoff. Aucune entrée `SESSION_LOG.md` :
  retirée sur arbitrage du responsable du 2026-10-26 (voir Problèmes
  ouverts).

## Validations exécutées

- Déploiement : run 40322732625 (`workflow_run`, tête 91f53ad7) vert,
  « Tête de `main` déployée », déploiement Scalingo 773aa42f en service.
  Porteur de la retenue : d645bfd8 (t45), run release-db 40309999072 vert,
  lu « appliquée » par la retenue (état du run, D-374 §2 phase 3 : ce n'est
  pas un constat de la base, qui reste celui de la session t45) ; aucune
  ligne de retenue au journal du run.
- `node scripts/lib/decisions-numerotation.mjs` : OK sur la tête ;
  `check_no_secrets --staged` : vert ; CI de la PR vert (`wn-attendre-ci`,
  code 0) ; revues CodeRabbit lues à chaque tête, un verdict par remarque
  dans la PR.

## Problèmes ouverts

- Hôte de la liste commune de questions (H89, part d) : page de suivi
  tenue hors dépôt, à désigner par le responsable.
- Retenue clinique étendue aux descendants (H85) : toujours à confirmer.
- #1709 (autre session) mergée sous D-377 à D-379. Cette branche a été
  recréée quatre fois sur la tête de `main` (conflit du journal de session,
  dont le pilote « union » ne vaut pas sur GitHub), sans pull ni merge ni
  rebase. Main y ajoutant une entrée toutes les trente minutes environ, le
  responsable a tranché le 2026-10-26 : l'entrée sort de la PR (D-372 ne
  l'exige plus, une PR de doc en est dispensée) ; ce handoff en tient lieu.
- Décompte du §0 : Fnn, Hnn, total, rang 1 et lignes de table corrigés par
  les ajouts constatés (F80 et H85 n'y figuraient pas). Une recomptée
  naïve des lignes de table ne retrouve pas la base (définition non écrite) :
  non refaite.

## Prochaine action exacte

Merger cette PR (gel intégral : aucun run release-db non conclu). Puis H86
(consigne `CLAUDE.md`, journal du crochet, mesure de référence) et H23
(D-372) en parallèle ; ensuite H88, qui lève le gel intégral.

## Interdits encore actifs

- Aucun merge tant qu'un run release-db n'est pas conclu (gel intégral,
  D-374 §5) ; pas de merge sans revue CodeRabbit sur la tête ; pas de pull,
  merge ni rebase sans arbitrage ; production en lecture seule par
  conteneur ; aucun lien vers le dossier privé ni identifiant interne de la
  page d'audit dans le dépôt.
