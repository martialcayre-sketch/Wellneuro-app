#!/usr/bin/env bash
# Build de production (Scalingo, CI) — construit l'application.
# N'ÉCRIT PLUS EN BASE DE PRODUCTION.
#
# Les migrations Prisma et l'import de nomenclature NABM (CB-02a) s'appliquent
# désormais HORS du build, via le workflow GitHub Actions `release-db` (proposé
# automatiquement dès qu'une migration atteint main, gaté par l'environnement
# protégé `release-db`). Chemin, runbook et
# étapes ops : docs/DEPLOIEMENT_RELEASE_DB.md.
#
# POURQUOI CE SCRIPT N'ÉCRIT PLUS. Il appliquait `migrate deploy` + imports au
# build. Deux défauts en découlaient : un build pouvait RÉUSSIR en laissant la
# base « en retard » (MIGRATE_DATABASE_URL absente → avertissement, pas échec) ;
# et le contrat CB-02a s'exécutait APRÈS le COMMIT de l'import (« build rouge »
# n'impliquait pas « rien écrit »). Sortir l'écriture du build ferme ces deux
# trous : l'écriture est un acte explicite, gaté par une approbation humaine.
#
# Le build ne dépend donc plus d'aucune connexion à la base de production. Il
# génère le client Prisma (types) et construit Next. L'ordre expand/contract —
# migration appliquée via `release-db` AVANT le déploiement du code qui en
# dépend — est décrit dans le runbook ; le code tolère une base « en avance ».
set -euo pipefail

npm run prisma:generate
next build
