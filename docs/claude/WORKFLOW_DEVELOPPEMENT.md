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

- Merge d'une PR sur `main` (CI verte) => build et deploiement Scalingo
  automatiques (integration Git).
- Le build de production execute `web/scripts/build.sh` : il genere le
  client Prisma et construit Next. Il N'ECRIT PLUS EN BASE.
- Les migrations Prisma committees (relues en PR) et l'import NABM s'appliquent
  HORS du build, via le workflow GitHub Actions `release-db` (gate par
  l'environnement protege `release-db` = second gate humain, en plus de la revue
  de PR). Voir `docs/DEPLOIEMENT_RELEASE_DB.md`.
- Le workflow est PROPOSE AUTOMATIQUEMENT des qu'une migration atterrit sur
  `main` (declencheur `push` filtre sur `web/prisma/migrations/**`), et reste
  declenchable a la main pour l'import NABM. L'automatisation porte sur le
  declenchement, JAMAIS sur l'approbation : le run attend un relecteur requis.
  Un job `resume`, sans environnement donc joue AVANT le gate, ecrit dans le
  Summary la liste des migrations apportees — de quoi approuver en sachant.
- Prerequis du workflow : secret d'environnement `MIGRATE_DATABASE_URL` (URL
  Supabase en session mode, port 5432 — le pooler transaction ne convient pas a
  `migrate deploy`).
- Ordre expand/contract : appliquer la migration via `release-db` AVANT le
  deploiement du code qui en depend. Le code tolere une base « en avance ».
- CETTE REGLE EST INTENABLE DANS UNE PR UNIQUE, et il faut le savoir avant de
  rediger le lot. `release-db` ne part que de `main` ; or le merge qui y pose la
  migration declenche AUSSI le deploiement Vercel. Si la migration et le code qui
  en depend voyagent ensemble, le code est en production avant que la release ait
  pu etre approuvee, et la surface concernee rend une erreur pendant ce temps.
  Deux facons de tenir l'ordre : SEPARER en deux PR (migration d'abord, release
  approuvee, puis le code), ou faire partir le code DERRIERE UN DRAPEAU eteint,
  allume une fois la colonne verifiee en base. Constate le 2026-08-05 sur #574
  (page « Mon bilan », sans drapeau).
- Le registre canonique des migrations reste `_prisma_migrations` (Prisma).
  Ne jamais appliquer de SQL en parallele (`supabase db push`, dashboard,
  MCP) : double comptabilite garantie.
