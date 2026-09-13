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

# LA RELEASE SE GRAVE ICI, PARCE QU'ELLE N'EXISTE QU'ICI.
#
# `releaseSha()` retombait sur `'local'` EN PRODUCTION : l'en-tête affichait
# « build local » et Sentry taguait toutes les erreurs sur une release nommée
# `local` — impossible de dire quelle version avait produit un défaut
# (constaté le 2026-09-13 sur une capture de production).
#
# POURQUOI AU BUILD ET NON EN VARIABLE SCALINGO. Une variable posée à la main
# est figée : elle serait juste une fois, puis MENTIRAIT à chaque déploiement
# suivant — pire que `'local'`, qui au moins n'affirme rien. `SOURCE_VERSION`
# est posée par Scalingo pour la durée du build et vaut le commit réellement
# déployé : la graver dans l'image est le seul geste qui reste vrai sans
# entretien, et il ne redémarre rien.
#
# POURQUOI `NEXT_PUBLIC_APP_VERSION` ET NON `WN_RELEASE_SHA`. Un export de ce
# script ne survit pas au build : le runtime `next start` ne le verrait pas.
# Les variables `NEXT_PUBLIC_*` sont INLINÉES par Next à la compilation — elles
# partent dans l'image. Et ce nom précis est déjà le dernier repli des deux
# chaînes existantes, `releaseSha()` (serveur) comme `clientReleaseSha()`
# (navigateur) : une seule ligne renseigne les deux, sans toucher à
# `deploymentEnv.ts`.
#
# Hors Scalingo — CI, build local — `SOURCE_VERSION` est absente : rien n'est
# exporté, le repli `'local'` reste en place. Jamais de variable vide, qui
# court-circuiterait `??` et afficherait « build » suivi de rien.
if [ -n "${SOURCE_VERSION:-}" ]; then
  export NEXT_PUBLIC_APP_VERSION="$SOURCE_VERSION"
  printf 'Release gravée dans le build : %s\n' "${SOURCE_VERSION:0:7}"
else
  printf "SOURCE_VERSION absente — release non gravée, l'application dira « build local ».\n"
fi

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
