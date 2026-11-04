# Handoff — 2026-11-05 — Besoin 2, iode et sélénium : dossier clos (H15)

## Branche et état Git

Branche `docs/h15-iode-selenium-clos`, partie de `origin/main` 1000c5b0, dans le
worktree `.claude/worktrees/iode-selenium-etape5`. Documentation seule : aucune
migration, aucun `schema.prisma`, aucun code. La PR #1861 (registre
`WN-SRC-0631` à `0638`) est déclarée prête à part ; elle n'est pas fusionnée.

## Objectif

Consigner au plan, en forme opaque (D-251 §4), la clôture du dernier dossier
de preuve des minéraux et vitamines du besoin 2, l'iode et le sélénium
(ordre H15 du 2026-10-16).

## Décisions prises

- Le responsable a signé les positions d'expert du dossier le 2026-11-05
  (v0.2, au dossier privé).
- Les trois questions d'application ont été tranchées le 2026-11-04.
- La contre-revue Codex de la v0.1 a rendu « GO avec corrections ». Ses six
  constats ont été vérifiés et intégrés à la v0.2.
- Le contenu clinique (verdicts, arbitrages, positions, revues) reste au
  dossier privé du responsable et au dépôt privé des revues ; rien n'en est
  versé ici.

## Fichiers modifiés

- `docs/claude/plan-journal/H15/2026-11-05-01-dossier-iode-et-selenium-clos.md`
  (nouveau fragment)
- `docs/claude/PLAN_WELLNEURO.md` : état des lignes « dossiers du besoin 2 »
  et « fiches d'usage du besoin 2 » dans la fiche H15
- `changelog.d/2026-11-05-besoin2-iode-selenium-dossier-clos.md`
- ce handoff

## Validations exécutées

- En base, par conteneur, en lecture seule, au fil des étapes du dossier :
  - 96 claims étiquetés au besoin 2 sur 96 attendus ;
  - 749 claims `VALIDE` portent le besoin 2 ;
  - 13 claims remis en attente ;
  - cinq rejets appliqués.
- Sources de la v0.2 contrôlées par script : exactement les 96 claims
  étiquetés.
- `bash scripts/check_no_secrets.sh`, `cd web && npm run check`.

## Problèmes ouverts

- Câblage des positions signées dans le code : la fiche d'usage du dossier
  fera l'objet d'un lot à part, non cadré.
- Filtre de la recherche praticien sur les claims hors parcours : question
  générale versée à la liste commune.
- Relecture des claims de la DGCCRF, pour y porter la base journalière des
  teneurs : notée en révision des positions.
- Page « Audit des 12 besoins » (artefact privé) : mise à jour hors dépôt.

## Prochaine action exacte

Le responsable arbitre les deux sous-dossiers candidats restants du besoin 2,
ou cadre la fiche d'usage de l'iode et du sélénium.

## Interdits encore actifs

- Aucune migration ni `schema.prisma`.
- Aucune écriture en base hors de la route d'ingestion et de l'atelier.
- Aucun seuil ni dose inventés.
- Ni `BESOIN_SOURCES`, ni `versionScore`, ni logique clinique.
- Forme opaque au dépôt.
- Essai D-373 : déclarer « prête », ne pas merger.
