# Handoff — 2026-09-26 — Fiche d'assiette, lot 3 : migration M1 (catalogue)

## 1. Branche et état Git

`wn-fiche-assiette-migration-catalogue`, worktree
`.claude/worktrees/deploy-anti-recul-lot1`, partie de `origin/main` à
`0eeeddcc` (#1232, lot 2).

## 2. Objectif

Lot 3 sur 11 de `D-251` : la migration M1, seule dans sa PR (`D-087`). Elle crée
le catalogue des versions de fiches et des actes du responsable. Migration
autorisée explicitement par le responsable le 2026-09-26.

## 3. Décisions prises

- Deux tables, parce que deux gestes (`DC-16`) : une version ne porte aucun
  champ d'état ; son état est son dernier acte.
- Append-only par triggers (UPDATE, DELETE, TRUNCATE), sur le patron du journal
  des décisions de claims. Limite assumée : le rôle propriétaire peut désactiver
  un trigger.
- Triggers d'insertion : instants posés par la base ; numéro de version contigu
  par fiche ; empreinte de l'acte égale à celle de sa version.
- CHECK : formats fermés, non-vide en `~ '\S'`, acte fermé, validation qui exige
  la relecture intégrale, retrait qui exige un motif.
- Empreintes en `TEXT` + CHECK, comme le reste du schéma (aucun `Char(64)`).
- DDL de table généré par `prisma migrate diff` depuis le schéma, pour que le
  contrôle de dérive du CI tienne ; contraintes et triggers ajoutés à la main.

## 4. Fichiers modifiés

`web/prisma/migrations/20260926150000_fiches_assiette_catalogue_v1/migration.sql`
· `web/prisma/schema.prisma` (modèles `FicheAssietteVersion`,
`FicheAssietteActe`) · `web/prisma/checks/fiches_assiette_catalogue_v1_negatif.sql`
(12 promesses éprouvées) · `.github/workflows/ci.yml` (étape du contrat) ·
`changelog.d/2026-09-26-fiches-assiette-migration-catalogue.md` ·
`docs/claude/SESSION_LOG.md` · ce handoff.

## 5. Validations exécutées

- `prisma validate` ; T1 vert.
- T3 vert : migration appliquée sur base éphémère, « No difference detected »
  au contrôle de dérive, contrat `fiches_assiette_catalogue_v1_negatif.sql`
  exécuté sans exception, 600 fichiers Vitest (10 068 tests), build, 213 E2E.

## 6. Problèmes ouverts

- Merger n'applique pas la migration : il faut le release-db approuvé par le
  responsable, puis le constat par conteneur (tables, triggers, RLS) avant le
  lot 4.

## 7. Prochaine action exacte

Après le merge : le responsable approuve `release-db` ; constat par conteneur ;
puis lot 4, la route interne d'ingestion des brouillons.

## 8. Interdits encore actifs

- Aucun texte de Fiche MY au dépôt : le contrat SQL n'emploie que du texte
  synthétique.
- « Un merge à la fois » (D-248).
