# Handoff — 2026-11-02 — File B, D-417 §3 : plafond nature ↔ statut des fiches d'usage

## Branche et état Git

Branche `b-d417-plafond-nature-statut`, dans le worktree
`.claude/worktrees/b-suite-inventaire`, partie de `origin/main` 845a900c.

Le lot ne touche ni migration, ni `schema.prisma`, ni
`ficheUsageBesoin2V1.ts` (chemin release-db de D-416). Il n'y a donc aucune
release-db à suivre.

## Objectif

Aligner `STATUTS_ADMIS_PAR_NATURE` sur D-266 §3, comme le demande D-417 §3 :
une information contributive admet au plus « preuves limitées ». C'est l'un
des deux préalables de la file A avant la re-signature des fiches B9 et B12
(plan §8).

## Décisions prises

- Le 2026-11-02, le responsable a confié à la file B les deux lots D-417 de
  la file A : le plafond (§3), puis l'axe « niveau de mesure » (§2). Aucun
  des deux n'était commencé, ni sur `main` ni dans une PR ou une branche.
- Pour l'axe (lot suivant, à part), arbitrages du même jour :
  - le champ est optionnel dans ce lot et devient obligatoire à la
    re-signature B9/B12, qui remplit les valeurs ;
  - les identifiants sont descriptifs : `mesure_standard`,
    `exploration_fonctionnelle`, `marqueur_experimental`.
- Aucune D-xxx nouvelle : D-417 §3 porte la règle.

## Fichiers modifiés

- `web/src/lib/fiches-usage/vocabulaire.ts` : `information_contributive`
  admet `preuves_limitees` et `non_valide`.
- `web/src/lib/fiches-usage/ficheUsageBesoin2V1.test.ts` : un test du plafond
  (`etaye_valide` refusé par `nature_statut`). La mesure directe garde ses
  trois statuts.
- `changelog.d/2026-11-02-fiches-usage-plafond-information-contributive.md`.
- `docs/claude/PLAN_WELLNEURO.md` §8 : ligne « plafond nature ↔ statut »
  marquée livrée.

## Validations exécutées

- Tests `src/lib/fiches-usage/` hors PostgreSQL : 113 verts. La structure
  signée reste cohérente : ses trente fiches sont en `preuves_limitees`.
- `npm run check` (T1 complet) : vert.
- `npm run test:worktree` (T3) : séquence complète verte en 7 min 41 s, E2E
  Chromium et WebKit compris.

## Problèmes ouverts

- Préalable (b) de la re-signature B9/B12, l'axe « niveau de mesure »
  (D-417 §2) : toujours ouvert. C'est le lot suivant de cette session.
- La ligne D/23 du plan §8 dit encore « lot à cadrer ». Le « pas
  maintenant » du responsable du 2026-11-02 n'est écrit nulle part.
- Les deux autres lignes file B du §8 attendent : bancs du processus de fond
  (la méthode est à trancher) et masquage au-delà de 20 pages (sur cas
  observé). La base locale `wn_g3_lot3_banc` n'existe plus.

## Prochaine action exacte

1. PR de ce lot : CI, revue sur la tête, lecture des commentaires, puis
   « prête @<sha> » (essai D-373), sans merger.
2. Lot de l'axe « niveau de mesure » sur une branche à part, depuis
   `origin/main`. Contenu : vocabulaire, champ optionnel, contrôle de valeur,
   tests. Il touche `ficheUsageBesoin2V1.ts`, donc la release-db sera à
   approuver par le responsable.

## Interdits encore actifs

- Aucun claim, usage, population, borne ou texte clinique inventé. Aucune
  règle croisée « niveau ↔ statut » sans décision.
- Aucune signature ni validation implicite. Les valeurs de l'axe entrent à la
  re-signature, après déclaration du responsable (D-195).
- Dépôt public, en forme opaque.
- Ni migration ni `schema.prisma` sans demande.
- Production en lecture seule, par conteneur.
- Aucun pull, merge ni rebase sans arbitrage.
- Release-db : approbation par le responsable seul (D-044).
- Essai D-373 : déclarer « prête », ne pas merger.
