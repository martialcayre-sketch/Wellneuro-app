# Workflow Developpement (Claude + Humain)

## Etape 1 - Cadrer la demande

- Identifier le besoin exact.
- Verifier si la tache touche le clinique, la securite ou les secrets.
- Limiter le perimetre des fichiers modifies.

## Etape 2 - Explorer le code

- Lire les fichiers cibles avant modification.
- Reutiliser les conventions existantes (noms, structure, style).
- Eviter les refactors non demandes.

## Etape 3 - Implementer

- Faire des changements minimaux et explicites.
- Garder les textes UI en francais.

## Etape 4 - Verifier

Checklist rapide:
- pas de secret introduit,
- pas de SHEET_ID ou DATABASE_URL en dur,
- pas de donnee patient reelle,
- pas de changement clinique involontaire.

Commande de controle:

```bash
bash scripts/check_no_secrets.sh
cd web && npm run type-check
```

## Etape 5 - Documenter

- Expliquer pourquoi le changement est necessaire.
- Lister les fichiers modifies.
- Ajouter les tests manuels effectues/restants.
- Mettre a jour `CHANGELOG.md` si impact notable.

## Etape 6 - Livraison

- Proposer un resume orienté risque.
- Mentionner explicitement les limites et hypotheses.
- Laisser des prochaines etapes concretes si utile.

## Etape 7 - Deploiement en production (automatique depuis 2026-07-16)

- Merge d'une PR sur `main` (CI verte) => build et deploiement Vercel
  automatiques (integration Git).
- Le build de production execute `web/scripts/vercel-build.sh` : il genere le
  client Prisma et construit Next. Il N'ECRIT PLUS EN BASE.
- Les migrations Prisma committees (relues en PR) et l'import NABM s'appliquent
  HORS du build, via le workflow GitHub Actions `release-db` (declenche a la
  main, gate par l'environnement protege `production` = second gate humain, en
  plus de la revue de PR). Voir `docs/DEPLOIEMENT_RELEASE_DB.md`.
- Prerequis du workflow : secret d'environnement `MIGRATE_DATABASE_URL` (URL
  Supabase en session mode, port 5432 — le pooler transaction ne convient pas a
  `migrate deploy`).
- Ordre expand/contract : appliquer la migration via `release-db` AVANT le
  deploiement du code qui en depend. Le code tolere une base « en avance ».
- Le registre canonique des migrations reste `_prisma_migrations` (Prisma).
  Ne jamais appliquer de SQL en parallele (`supabase db push`, dashboard,
  MCP) : double comptabilite garantie.
