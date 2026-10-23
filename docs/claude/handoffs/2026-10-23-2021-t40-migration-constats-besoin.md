# Handoff — t40 : constat du praticien sur un besoin sans score, PR 1 (migration seule)

## Branche et état du dépôt

- Branche `lot/t40-migration-constats-besoin`, worktree `d281-lot3-portail`,
  partie de `origin/main` (18981bd0, #1661). Session concurrente, cycle en
  `git`/`gh` direct. PR 1 sur 2 du lot t40 : la migration ; le code
  consommateur suit après release-db et constat. La décision est mergée à
  part (#1661).

## Objectif

H84, rang 1 : un véhicule unique pour consigner ce que le praticien décide
d'un besoin sans score (2, 6, 7, 11), acte daté en ajout seul, motif fermé,
sans valeur (D-338 §4, cadré par D-347).

## Décisions prises

- La liste fermée n'était écrite ni dans D-338 ni dans D-331 : arrêt, puis
  cinq arbitrages du responsable (2026-10-23, questions à options) consignés
  par D-347 (#1661) — proposition puis décision ; quatre verdicts cadrés sur
  la cible (`a_soutenir`, `non_retenu`, `non_evaluable`, `sans_objet`) ;
  neuf motifs retenus tels quels ; pièces FACULTATIVES (contre la
  recommandation « aucune pièce ») ; base fermée aux besoins 2, 6, 7, 11.
- Paragraphe RGPD validé par le responsable le 2026-10-23 (question à
  options), inscrit dans cette PR.
- Retenu sans question, au patron de D-331 : tête par besoin sous verrou
  (dossier `FOR KEY SHARE`, puis espace consultatif 347), REPEATABLE READ
  refusé, `transaction_pose` 64 bits, suppression réservée à l'effacement,
  RLS deny-all ; pas de trigger « pièces requises ».

## Fichiers modifiés

- `web/prisma/migrations/20261023160000_constats_besoin_praticien_v1/migration.sql` (neuf).
- `web/prisma/schema.prisma` (deux modèles, relations inverses).
- `web/prisma/checks/constats_besoin_praticien_v1_negatif.sql` (neuf),
  `web/scripts/banc-constats-besoin-deux-sessions.test.mjs` (neuf),
  `.github/workflows/ci.yml`, `scripts/wn-test-worktree.sh`.
- `web/src/lib/patient/effacement.ts` et son test.
- `docs/DOSSIER_RGPD.md`, `changelog.d/2026-10-23-t40-migration-constats-besoin.md`,
  SESSION_LOG.

## Validations exécutées

- T1 rapide et T1 complet verts ; test d'effacement vert (30 tests).
- T3 (`npm run test:worktree`) vert en 7 min 42 s : dérive schéma ↔
  migrations nulle, contrat et banc (huit courses) verts ; rejoué après les
  retouches de revue.
- `wn-reviewer` (P1) : GO avec réserves, aucun P0. Corrigés : clôture
  (handoff, SESSION_LOG) ; cas « retrait avec motif » isolé ; cas 12 sous
  `SET CONSTRAINTS ALL IMMEDIATE`. Écarté : la course 7 ne distingue pas
  l'ordre des verrous (patron D-331 ; le cas 15 relit l'ordre). Routé à la
  PR 2 : garde des lecteurs des deux tables (patron
  `lecteursConstats.guard.test.ts`).

## Problèmes ouverts

- Fenêtre entre déploiement et release-db : `effacerDossier` échoue en
  entier sur les tables absentes (seul appelant : la route praticien
  `cycle-de-vie`, manuelle). Remède : approuver dans la foulée du merge.
- PR 2 : emplacement de l'écran à décider avec le responsable, hors des
  panneaux de J1-cockpit-a et des lots Q2 à Q4 (D-347 §9).

## Prochaine action exacte

CI (`wn-attendre-ci`), CodeRabbit sur la tête, aucune release-db d'une autre
session en attente, merge `--match-head-commit` ; release-db approuvée par le
responsable ; sentinelle liée au run ; `prisma migrate status` par conteneur ;
puis PR 2 (route, lecture, écran, garde des lecteurs, drapeau
`WN_CONSTAT_BESOIN` éteint).

## Interdits encore actifs

- Un merge à la fois ; aucun auto-merge ; aucune image antérieure à 257807e3
  redéployée ; rien de clinique hors D-347 ; aucun code consommateur avant le
  constat ; ni portail, ni scoring, ni orientation, ni re-passation, ni IA ne
  lisent un constat sur un besoin ; les PR et release-db des autres sessions
  ne sont pas à cette session ; t36 et m38 sont des gestes du responsable ;
  t41 et J1-cockpit-a s'ouvrent dans leur propre session.
