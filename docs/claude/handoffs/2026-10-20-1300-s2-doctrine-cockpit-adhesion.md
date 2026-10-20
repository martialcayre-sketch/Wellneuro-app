# Handoff — S-2 : doctrine du cockpit chiffré et de l'adhésion (D-333, D-334)

## Branche et état du dépôt

- Branche `lot/s2-doctrine-cockpit`, worktree `d281-lot3-portail`, partie de
  `origin/main` (f589fbc5). PR #1604 ; D-333 et D-334 acceptées telles
  quelles par le responsable le 2026-10-20.

## Objectif

Lot S-2 (fiche H01, rang 0, file A) : rédiger les lettres c (F59, cockpit
chiffré) et d (H32, doctrine d'adhésion), à relire par le responsable, avant
la signature M-2 (rang 2) qui lève la porte 6.

## Décisions prises

- D-333 et D-334, acceptées le 2026-10-20 ; sources : pièces 31, 33, 37 et 50 du
  dossier privé, séances du 2026-10-11, du 2026-10-12 et du 2026-10-12-bis.
- 2026-10-20 : E4 avec les constats par point d'étape (C2B), A8-4 intacte ;
  la progression d'un questionnaire est gardée au portail comme exception
  nommée.
- Contre-revue P0 : SP-MET garde « jamais un score » ; exceptions du portail
  en deux familles déjà au code ; dette « stable » de D-058 §3 nommée ;
  « toutes les bandes » du besoin ; tolérance bornée de la stabilité
  métabolique.

## Fichiers modifiés

- `docs/DECISIONS.md` (D-333, D-334), `docs/claude/REGISTRE_FRONTIERES.md`
  (A1, A6-R2, SP-MET), `docs/claude/PLAN_WELLNEURO.md` (H01),
  `web/src/lib/protocol/adhesion.ts` (commentaires seuls),
  `changelog.d/2026-10-20-s2-doctrine-cockpit-adhesion.md`, SESSION_LOG.

## Validations exécutées

- T1 rapide vert ; numérotation des décisions continue (D-334) ; T2 `--fast`
  joué sur la branche (voir la PR) ; contre-revue P0 `wn-reviewer` lue,
  correctifs intégrés.

## Problèmes ouverts

- Aucun dans ce lot. Tranchés le 2026-10-20 : groupe de la médiane = un
  point d'étape ; exceptions du portail en deux familles.
- Numéros D-333 et D-334 vérifiés libres sur main le 2026-10-20 (après
  fusion de c1a0d640) ; à revérifier au merge si main avance (N-5).

## Prochaine action exacte

CI, CodeRabbit, merge ;
r0_01 → fait sur la page de la file A ; M-2 au rang 2.

## Interdits encore actifs

- Rien ne s'ouvre au code avant la signature M-2 (porte 6) ; aucun seuil,
  poids, bande ni codage sans décision clinique avec fragment.
