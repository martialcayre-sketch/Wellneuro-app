# Handoff — BIO-PARCOURS : table de campagne rapprochée de l'état réel (2026-11-20)

## Branche et état Git

- Branche `docs/bio-parcours-reconciliation` du worktree
  `b-besoin4-decision-guide`, partie d'`origin/main` (`ecd94548`).
  Documentation seulement.
- La branche précédente du worktree, `docs/bp27-cadrage`, a été mergée
  (#2269, 2026-11-20).

## Objectif

Demande du responsable du 2026-11-20 : « réconcilie la campagne bio parcours
avec la réalité ». Le handoff du lot `bp27-cadrage` signalait deux tableaux
périmés (BP-05 « en_cours », LOT-12 « à_faire »). Le rapprochement couvre
toute la table.

## Décisions prises

- Aucune décision nouvelle. Chaque statut vient d'une source au dépôt :
  - fiche `lots/` (BP-05 : déjà « terminé ») ;
  - journal du plan (F09 close le 2026-11-10 ; F20 constatée le
    2026-11-13 ; F05) ;
  - critère de fin de la fiche du plan, comparé aux PR mergées (F08 :
    #1642, #1644, #1650, #1653 ; F11 : PR 2 à 7, signature due) ;
  - PR #2244 et #2269 pour BP-27.
- BP-15 passe « terminé » par son critère de fin de F08, atteint le
  2026-10-23. Sa clôture n'avait jamais été écrite : elle est inscrite au
  journal de F08 (`2026-11-20-01`), sans constat nouveau, après le constat
  de PR-Agent sur la date rétroactive. C'est le seul statut qui n'est pas
  recopié d'une clôture déjà écrite. Le suivi BioFlow, hors dépôt, revient
  au responsable.
- La campagne reste `en_pause`, sans lot courant (une campagne `en_cours`
  sans lot courant fait échouer l'audit des campagnes). Le plan conduit
  l'ordre (`D-285` §1).

## Fichiers modifiés

- `docs/claude/campagnes/2026-10-04-bio-parcours/CAMPAGNE.md` (en-tête,
  paragraphe du rapprochement, six lignes de la table)
- `docs/claude/campagnes/2026-10-04-bio-parcours/lots/LOT-12-fiches-usage.md`,
  `LOT-15-decisions-parcours.md`, `LOT-17-bibliotheque-options.md`,
  `LOT-28-positions-expert.md` (statut seul)
- `docs/claude/plan-journal/F08/2026-11-20-01-cloture-par-rapprochement.md`
- `changelog.d/2026-11-20-bio-parcours-rapprochement.md`
- ce handoff

## Validations exécutées

- `node scripts/wn-campaign-audit.mjs` : aucune erreur, avant et après.
- `cd web && npm run check:rapide`.

## Problèmes ouverts

- Les renvois du plan vers la table par numéro de ligne
  (`CAMPAGNE.md:124`, `:140`…) étaient déjà décalés avant ce rapprochement.
  Ils ne sont pas corrigés ici.
- Constat sans arbitrage, hors du lot : `PLAN_WELLNEURO.md` attribue
  toujours J3-12f à la file A, alors que la question `20261118-2130-b` l'a
  donné à la file B.

## Prochaine action exacte

Ouvrir la PR (doc seule), attendre le CI et la revue de PR-Agent, puis la
déclarer prête à l'intégrateur.

## Interdits encore actifs

- Aucune signature clinique à la place du responsable, et aucun avis collé
  pris pour son accord.
- Rien d'écrit en production : lecture seule par `scalingo run -d`.
- Forme opaque au dépôt (`D-251` §4).
- Aucun code clinique hors d'un lot désigné.
- La cible signée du 2026-10-18 n'est pas rouverte. Ne pas toucher au
  worktree `file-d1-suite`.
- L'auteur des 37 signatures du 2026-11-16 reste indéterminé : ne pas le
  rouvrir.
