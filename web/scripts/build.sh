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

# L'environnement Scalingo porte NODE_OPTIONS=--max-old-space-size=384 : un
# plafond de tas dimensionné pour les conteneurs web de 512 MiB (incident du
# 2026-08-31). Le build, lui, tourne dans un conteneur de build aux limites
# bien plus larges, et `next build` dépasse largement 384 MB — les
# déploiements du 2026-08-31 23:29 ont tous échoué en OOM sur ce plafond
# hérité. Le build revient donc au réglage mémoire par défaut, éprouvé ;
# le plafond ne vaut que pour le runtime.
unset NODE_OPTIONS

npm run prisma:generate
next build

# LE CACHE WEBPACK NE PART PAS DANS L'IMAGE. `next build` écrit
# `.next/cache/webpack` — 812 Mo mesurés sur le conteneur de production le
# 2026-09-10 — et le buildpack empaquette `.next` en entier. Le runtime n'en
# lit rien : `next start` sert `.next/server`, `.next/static` et `.next/types`,
# 37 Mo à eux trois.
#
# Ce cache ne survit PAS d'un build à l'autre : le buildpack ne restaure et ne
# conserve que le cache npm (« Restoring cache — npm cache »). Il est donc
# reconstruit à chaque fois puis expédié pour rien. Le supprimer ne coûte pas
# une seconde de build.
#
# CE N'EST PAS UNE OPTIMISATION, C'EST CE QUI REND L'APPLICATION DÉPLOYABLE.
# Scalingo refuse une image au-delà de 2048 Mo. Le 2026-09-10 à 19:36 puis
# 20:07, deux déploiements ont échoué sur `image exceeds the limit of 2048MB -
# (2049MB)` : un mégaoctet. Tous les déploiements réussis d'avant affichaient
# déjà « 2.0 GiB » — la marge était nulle depuis longtemps, et le premier
# commit venu devait franchir la ligne. C'est une PR documentaire qui l'a fait.
#
# Ne pas retirer cette ligne sans avoir mesuré l'image : sans elle, elle repasse
# au-dessus de la limite et PLUS AUCUN déploiement ne réussit — donc plus aucune
# `release-db`, dont la garde exige que le commit approuvé soit déployé.
rm -rf .next/cache/webpack
