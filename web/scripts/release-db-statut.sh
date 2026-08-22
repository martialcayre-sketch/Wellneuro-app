#!/usr/bin/env bash
# Contre-épreuve de la release (workflow release-db) : `migrate status` dans
# un one-off NEUF, qui n'exporte RIEN — la résolution d'URL est celle de
# l'image (web/prisma.config.ts → add-on Scalingo), pas celle du script de
# release. Sortie par sentinelles liées au run : le texte de `migrate
# status` ne peut pas porter d'identifiant, le workflow ne lit donc que CES
# lignes-ci. C'est le code de sortie de `prisma migrate status` qui fait
# foi (non-zéro s'il reste des migrations en attente ou en échec), pas son
# texte.
set -euo pipefail

ID="${WN_RELEASE_ID:-inconnu}"

if npx prisma migrate status; then
  echo "WN_STATUT_DB_OK id=$ID"
else
  echo "WN_STATUT_DB_ECHEC id=$ID"
  exit 1
fi
