# Handoff — J3-collecte : migration des documents déposés (D-330)

## Branche et état Git

`feat/j3-collecte-migration` (worktree `cc8-migration`), fusionnée avec `origin/main` 7ac7ba7c. PR de migration seule (D-087) : migration, schéma, contrat négatif et sa ligne de CI, effacement nommé, banc des écrivains, D-330, déclaration RGPD, plan H62, fragment.

## Objectif

Poser les tables de la collecte documentaire (H62), sans code qui dépose ; le dépôt s'ouvre à ACT-4.

## Décisions prises

- D-330, sur sept arbitrages du responsable du 2026-10-18 : le patient propose une catégorie et le praticien la corrige (historique daté) ; le retrait efface le document et garde la ligne ; les dépôts apparaissent sous « Transmis » dans « Mes échanges » (code à l'ouverture) ; bornes du compte rendu ; doublon refusé ; seule la première consultation est tracée ; un retrait ne désigne pas la demande de droit.
- D-328 puis D-329 ont été pris par d'autres sessions (#1565, #1566) pendant le lot, d'où la renumérotation en D-330.
- Après la relecture `wn-reviewer`, le trigger de modification ne verrouille plus le dossier, pour éviter un interblocage avec l'effacement. Le classement prend le document `FOR NO KEY UPDATE`. Le dépôt prend un verrou consultatif du dossier, sous lequel se lisent le doublon (et plus tard les plafonds).

## Fichiers modifiés

- `web/prisma/migrations/20261018200000_documents_deposes_patient_v1/migration.sql`, `web/prisma/schema.prisma`, `web/prisma/checks/documents_deposes_patient_v1_negatif.sql`, `.github/workflows/ci.yml`.
- `web/src/lib/patient/effacement.ts` (+ test), `web/src/lib/collecte/documentsDeposes.guard.test.ts`.
- `docs/DECISIONS.md` (D-330), `docs/DOSSIER_RGPD.md` (rubriques 2, 5 et 8), `docs/claude/PLAN_WELLNEURO.md` (H62), `changelog.d/2026-10-18-j3-collecte-migration.md`, `docs/claude/SESSION_LOG.md`.

## Validations exécutées

- Base locale neuve : `migrate deploy` vert, `migrate diff` sans différence, contrat vert. 34 mutations de la migration, toutes tuées par le contrat (dont le refus hors READ COMMITTED, ajouté sur la revue CodeRabbit).
- Tests de l'effacement (26), banc des écrivains, T1 rapide : verts.
- T3 complet vert : dérive « No difference detected », contrat joué, E2E 282 verts. Un premier passage avait été interrompu à Vitest par la charge de la machine (trois délais dépassés, verts seuls).

## Problèmes ouverts

- Déclaration RGPD validée par le responsable le 2026-10-19 (telle quelle ; métadonnées des PDF non retirées, dit franchement).
- Après le merge : release-db approuvée, sentinelle liée au run, `migrate status` par conteneur.
- PR du code, sous drapeau éteint. Elle reprend les prescriptions de D-330 §4 : plafonds sous le verrou du dossier, listes sans `contenu`, consultation conditionnelle, aucun message de contrainte journalisé tel quel.

## Prochaine action exacte

Merger sur CI vert et revue CodeRabbit de la tête, faire approuver release-db, puis constater par conteneur.

## Interdits encore actifs

- Aucun code ne dépose, ne consulte, ne classe ni ne retire avant l'application constatée (le banc le tient).
- Aucune règle clinique ; aucune fenêtre J7/J14/J21 changée ; fixtures neutres seulement.
- Production lue par conteneur seulement ; agrégats seuls dans les fichiers durables.
