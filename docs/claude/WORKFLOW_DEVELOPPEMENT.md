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
- Le build de production execute `web/scripts/vercel-build.sh` : les
  migrations Prisma committees (et donc relues en PR) sont appliquees sur la
  base Supabase AVANT `next build`. Le gate humain est la revue de PR.
- Prerequis : variable Vercel `MIGRATE_DATABASE_URL` (scope Production
  uniquement), URL Supabase en session mode (port 5432) — l'URL runtime du
  pooler en mode transaction ne convient pas a `migrate deploy`.
- Les previews de PR n'appliquent jamais de migration (garde stricte sur
  `VERCEL_ENV=production`).
- Si la variable est absente, le build avertit bruyamment et deploie sans
  migrer (tolere par degradation gracieuse) : creer la variable puis
  redeployer.
- Le registre canonique des migrations reste `_prisma_migrations` (Prisma).
  Ne jamais appliquer de SQL en parallele (`supabase db push`, dashboard,
  MCP) : double comptabilite garantie.
