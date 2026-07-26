#!/usr/bin/env bash
# Build Vercel — applique les migrations Prisma en production avant le build.
#
# Chaîne : PR relue et CI verte → merge sur main → build Vercel → ce script.
# `migrate deploy` n'invente jamais de SQL : il applique uniquement les
# migrations committées (relues en PR). Le gate humain reste la revue de PR.
#
# MIGRATE_DATABASE_URL (variable Vercel, scope Production uniquement) : URL
# Supabase en session mode (port 5432) — l'URL runtime passe par le pooler en
# mode transaction, que `migrate deploy` ne supporte pas.
#
# Ce script porte aussi deux imports de données de référence (C5 CIQUAL, CB-02a
# NABM), chacun désarmé par défaut et armé par une variable Vercel dédiée. Ce
# ne sont pas des migrations : ils n'entrent pas dans `migrate deploy` et ne
# sont pas rejoués par le hook Scalingo (`scripts/db-deploy.sh`).
#
# Sécurité :
# - Jamais en preview : garde stricte sur VERCEL_ENV=production.
# - Variable absente : on avertit bruyamment mais on ne bloque pas le
#   déploiement (le code tolère une base en retard — dégradation gracieuse) ;
#   l'écart est visible dans les logs de build.
# - Migration en échec : build en échec → la production reste sur le
#   déploiement précédent.
set -euo pipefail

if [ "${VERCEL_ENV:-}" = "production" ]; then
  c5_ciqual_import_ref="C5-LOT02-IMPORT-MC-2026-07-18-v1"

  # CB-02a — nomenclature NABM. Trois faits épinglés ICI, donc modifiables
  # seulement par une PR relue ; voir le bloc d'import plus bas pour le pourquoi.
  cb_nabm_import_ref="CB-02A-IMPORT-NABM-V105-MC-2026-07-26-v1"
  cb_nabm_version="V105"
  cb_nabm_sha256="3a9c289f081d293e7655de709a295bc6da9ece3f2301b86f1ea9625d1c7aed0f"

  if [ -n "${WN_C5_CIQUAL_IMPORT_CONFIRMATION:-}" ] && [ -z "${MIGRATE_DATABASE_URL:-}" ]; then
    echo "❌ Import C5 LOT-02 demandé sans MIGRATE_DATABASE_URL : déploiement refusé." >&2
    exit 1
  fi
  if [ -n "${WN_CB_NABM_IMPORT_CONFIRMATION:-}" ] && [ -z "${MIGRATE_DATABASE_URL:-}" ]; then
    echo "❌ Import CB-02a demandé sans MIGRATE_DATABASE_URL : déploiement refusé." >&2
    exit 1
  fi

  if [ -n "${MIGRATE_DATABASE_URL:-}" ]; then
    echo "→ Préflight C5 LOT-02 en lecture seule…"
    DATABASE_URL="$MIGRATE_DATABASE_URL" npx prisma db execute \
      --file prisma/checks/c5_ciqual_production_preflight.sql
    echo "→ Application des migrations sur la base de production (migrate deploy)…"
    DATABASE_URL="$MIGRATE_DATABASE_URL" npx prisma migrate deploy

    if [ -n "${WN_C5_CIQUAL_IMPORT_CONFIRMATION:-}" ]; then
      if [ "$WN_C5_CIQUAL_IMPORT_CONFIRMATION" != "$c5_ciqual_import_ref" ]; then
        echo "❌ Confirmation d'import C5 LOT-02 invalide : import refusé." >&2
        exit 1
      fi

      echo "→ Advisors Supabase avant import C5 LOT-02…"
      npx --yes supabase@2.109.1 db advisors \
        --db-url "$MIGRATE_DATABASE_URL" \
        --type all \
        --level warn \
        --fail-on warn \
        --output-format json

      echo "→ Import append-only C5 LOT-02 confirmé…"
      npm run c5:ciqual:apply -- \
        --confirmation "$c5_ciqual_import_ref"
    fi

    # ── CB-02a — import de la nomenclature NABM ──────────────────────────────
    #
    # Deux preuves côté Vercel, trois faits épinglés côté code relu.
    #
    # Variables Vercel (scope Production) :
    #   WN_CB_NABM_IMPORT_CONFIRMATION  arme l'import ;
    #   WN_CB_NABM_IMPORT_BASE          NOMME l'hôte visé. L'import refuse si ce
    #                                   nom ne se retrouve pas dans
    #                                   MIGRATE_DATABASE_URL. Les deux variables
    #                                   sont posées par la même personne, au même
    #                                   moment : armer l'import oblige donc à
    #                                   savoir sur quelle base il va écrire, et ce
    #                                   contrôle ne dépend d'aucune variable de
    #                                   plateforme — il vaut encore si la
    #                                   connexion change d'hôte.
    #
    # Constantes du script (donc : une PR pour les changer) : le jeton, le
    # MILLÉSIME attendu et l'EMPREINTE de son contenu. Épingler les deux
    # dernières est ce qui rend la variable inoffensive si on l'oublie en
    # place — le jour où l'ANS publiera le millésime suivant, le build ÉCHOUERA
    # au lieu d'importer en silence une nomenclature que personne n'a relue.
    # Un import silencieux déplacerait le catalogue servi, donc ce qui est
    # proposé au patient et ce qui part au médecin traitant.
    #
    # Le jeton NOMME le millésime, et l'import refuse s'il ne le nomme pas.
    # Sans ce lien, incrémenter les deux épingles ci-dessus aurait suffi à
    # relancer un import sur la seule autorité de cette PR, la variable étant
    # restée posée. Le modèle annonce deux clés indépendantes ; il en faut donc
    # deux qui bougent. Bump de millésime = les TROIS constantes changent.
    #
    # Volontairement PAS câblés : --remplace-pointeur, --accepte-orphelines,
    # --allow-shrink. Ce sont des forçages qui demandent un jugement humain. Si
    # l'un devient nécessaire, ce build doit échouer et quelqu'un doit reprendre
    # l'import à la main.
    #
    # L'import est transactionnel et idempotent : un échec (réseau, refus d'un
    # garde, build interrompu par la limite de durée Vercel) n'écrit rien et
    # laisse la production sur le déploiement précédent.
    #
    # NUANCE À CONNAÎTRE AVANT DE DÉCIDER QUOI FAIRE D'UN BUILD ROUGE : le
    # contrat qui suit s'exécute APRÈS le commit de l'import. Un échec du
    # contrat laisse donc l'import écrit, et le build en échec. C'est le seul
    # cas où « build rouge » ne veut pas dire « rien n'a été écrit ».
    if [ -n "${WN_CB_NABM_IMPORT_CONFIRMATION:-}" ]; then
      if [ "$WN_CB_NABM_IMPORT_CONFIRMATION" != "$cb_nabm_import_ref" ]; then
        echo "❌ Confirmation d'import CB-02a invalide : import refusé." >&2
        exit 1
      fi
      if [ -z "${WN_CB_NABM_IMPORT_BASE:-}" ]; then
        echo "❌ Import CB-02a armé sans WN_CB_NABM_IMPORT_BASE : import refusé." >&2
        echo "   Cette variable doit nommer l'hôte de MIGRATE_DATABASE_URL." >&2
        exit 1
      fi

      echo "→ Advisors Supabase avant import CB-02a…"
      npx --yes supabase@2.109.1 db advisors \
        --db-url "$MIGRATE_DATABASE_URL" \
        --type all \
        --level warn \
        --fail-on warn \
        --output-format json

      echo "→ Import NABM CB-02a confirmé (millésime $cb_nabm_version épinglé)…"
      npm run cb:nabm:apply -- \
        --confirmation "$cb_nabm_import_ref" \
        --base "$WN_CB_NABM_IMPORT_BASE" \
        --version "$cb_nabm_version" \
        --sha256 "$cb_nabm_sha256"

      # Le contrat du catalogue, joué là où il y a enfin des DONNÉES. En CI il
      # ne rencontre qu'une base vide : ses invariants de données y sont muets.
      # C'est donc ici, sur la production, qu'ils disent enfin quelque chose —
      # une seule fois, puisque la variable d'armement se retire ensuite.
      echo "→ Contrat du catalogue biologie sur les données importées…"
      DATABASE_URL="$MIGRATE_DATABASE_URL" npx prisma db execute \
        --file prisma/checks/cb_biologie_catalogue_v1.sql
    fi
  else
    echo "⚠️  MIGRATE_DATABASE_URL absente : migrations NON appliquées." >&2
    echo "⚠️  La base de production peut être en retard sur le code déployé." >&2
    echo "⚠️  Créer la variable (scope Production) puis redéployer." >&2
  fi
else
  echo "→ Environnement ${VERCEL_ENV:-local} : pas d'application de migrations."
fi

npm run prisma:generate
next build
