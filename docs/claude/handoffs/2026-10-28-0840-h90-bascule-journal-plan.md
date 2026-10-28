# Handoff — H90, PR 2 : bascule du journal du plan jouée, règle d'écriture changée

## Branche et état Git

`lot/h90-bascule`, depuis `origin/main` (avance rapide sur d0626e05). Copie
principale. Créneau accordé par le responsable : #1749 mergée par cette
session, #1752 et #1753 mergées par leurs sessions avant la bascule ; aucune
PR ouverte ne touchait le plan au moment d'écrire.

## Objectif

Fiche H90, PR 2 sur 2 (D-371) : jouer la bascule une fois, changer la règle
d'écriture des « Mise à jour ». Aucune décision neuve.

## Décisions prises

- Arbitrages du responsable : les quatre fiches écartées (F44, H26, H49, F79)
  restent en ligne, intactes ; les puces « Constat », « Clôture »,
  « Correction » existantes restent dans la fiche ; rang = plus grand du même
  jour plus un, sinon `01`, jamais renommé ; renvoi posé à la création d'une
  fiche.
- Choix par défaut de la session, à corriger si le responsable tranche
  autrement : une fiche écartée reçoit sa ligne de renvoi à sa prochaine mise
  à jour, juste après la dernière en ligne et ses lignes de suite ; un
  constat neuf s'écrit en fragment, libellé « Mise à jour (date, constat…) ».
- Le banc « plan réel » bloque une mise à jour en ligne (il ne retire rien :
  la tolérance du garde, D-371 §3, ne le vise pas).

## Fichiers modifiés

`docs/claude/PLAN_WELLNEURO.md` (bascule + point 3 de l'en-tête),
`docs/claude/plan-journal/` (254 fragments + H90 du 2026-10-28),
`.claude/rules/docs-changelog.md`, `.claude/rules/pr-revue-et-release-db.md`,
`.claude/skills/wn-finish/SKILL.md`, `.claude/skills/wn-merge/SKILL.md`,
`scripts/lib/plan-journal.mjs` (titre refusé dans un fragment) et son banc,
`changelog.d/2026-10-28-h90-bascule-journal-plan.md`, ce handoff.

## Validations exécutées

- À blanc puis `--ecrire` (code 0) : 254 fragments sur 103 fiches,
  546 184 → 394 850 octets, aller-retour exact en mémoire et depuis le disque ;
  seconde exécution refusée (renvoi déjà posé).
- Diff contrôlé à part : ajouts = 168 renvois, retraits = lignes des
  fragments (multiensemble égal). `wn-plan-fiche` identique avant/après sur
  H90, H49, F44, F08, H70, F52, H86, F34.
- Revue `wn-reviewer` : GO avec réserves ; reconstruction indépendante du
  module, deux seules différences voulues. P1 (mise à jour en ligne
  invisible) corrigé par banc ; P2 a, b, c, d, e (titre), f corrigés ; P2-e
  second point (`lireFiche` inclut le paragraphe de groupe suivant) écarté :
  antérieur, lecture seule, même plage que la bascule.
- Revue CodeRabbit (926bf410), deux remarques en ligne, corrigées : couple
  date-rang unique par fiche (banc, mutation vérifiée) ; nombre de mises à
  jour en ligne des fiches écartées gelé à la bascule (F44 4, H26 9, H49 6,
  F79 3).
- Bancs du journal verts ; T1 complet vert (rc 0, 707 tests) après les
  correctifs.

## Problèmes ouverts

- Réexamen D-371 §4 au bilan (H92).

## Prochaine action exacte

1. Commit, push, PR (`--body-file`), `wn-attendre-ci` en fond.
2. CodeRabbit sur la tête, un verdict par remarque (synthèse, corps, en ligne).
3. `node scripts/wn-sonde-release-db.mjs <N>` à 0.
4. Merge `--squash --delete-branch --match-head-commit --subject`, puis `/clear`.

## Interdits encore actifs

- Aucune PR touchant le plan ne s'ouvre jusqu'au merge.
- Ne jamais rejouer `--ecrire` ; ne pas remettre en ordre les fiches écartées.
- Hors lot : clôture de la semaine de H86 et temps 2 de H91 (à partir du
  2026-11-03).
