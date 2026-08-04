---
lot: "LOT-03"
campagne: "2026-08-04-reprise-chantiers-en-suspens"
titre: "Runbook HDS — verser l'état du staging Scalingo"
statut: "à instruire"
classe: "docs"
branche: "sauvegarde/runbook-scalingo-staging"
---

# LOT-03 — Runbook HDS : verser l'état du staging

## But

Faire entrer dans `main` les faits opérationnels du staging Scalingo, aujourd'hui absents
du runbook qui y vit. Le lot le moins cher de la campagne, et le plus daté.

## Ce qui existe déjà, et où

Branche **`sauvegarde/runbook-scalingo-staging`**, commit `0c43779`. Le texte vivait sur
un **HEAD détaché non committé** : le worktree supprimé, il disparaissait et rien n'y
pointait.

`RUNBOOK_MIGRATION_SCALINGO.md` passe de **106 à 191 lignes**. Les +85 documentent le
staging **provisionné et validé de bout en bout le 2026-07-24**, avec des faits
vérifiables :

- app `wellneuro-staging`, région **`osc-fr1`** — et non `osc-secnum-fr1` ;
- `HDS: true`, add-on `postgresql-business-512` ;
- **2 containers `web` taille S** — le minimum HDS, non configurable en dessous ;
- déploiement de `main` réussi : build compilé, **35 migrations Prisma appliquées sur base
  vierge**, postdeploy accepté, URL qui répond (`/login` → 200,
  `/api/internal/rag/health` → 503 attendu, secrets pas encore posés).

## Pourquoi ça compte, et pourquoi c'est daté

La dérogation **G-TRUST-04 court jusqu'au 2026-10-21**. L'hébergement HDS a été instruit
le 2026-07-21 et le verdict est négatif : Supabase et Vercel sont absents de l'annuaire
ANS. L'orientation arrêtée le 2026-07-22 est de rester sur l'hébergement actuel et de
borner la phase de test — donc de ne **pas** migrer pour l'instant.

Le jour où cette orientation change, ces faits sont le point de départ. Les redécouvrir
coûterait le provisionnement une seconde fois ; les écrire coûte une relecture.

## Périmètre

`docs/claude/propositions/2026-07-24-audit-migration-hds/RUNBOOK_MIGRATION_SCALINGO.md`
seul. Aucun code.

## Travaux

1. Relire les +85 lignes contre la réalité : le staging existe-t-il encore ? l'add-on
   tourne-t-il ? Un runbook qui décrit une infrastructure disparue est pire qu'un runbook
   vide, parce qu'on le croit.
2. Vérifier que le texte ne porte **aucun secret** — le fichier nomme ce qui reste à
   poser, il ne doit pas porter les valeurs.
3. Rebaser sur `main` et fusionner proprement : le runbook de `main` a pu bouger.
4. Livrer, ou verser le contenu dans le document d'audit HDS et clore la branche.

## Interdits

- **Aucun secret** dans le texte.
- Ne pas transformer ce lot en décision de migration : documenter un staging n'est pas
  décider d'y aller. L'arbitrage du 2026-07-22 tient jusqu'à ce qu'il soit repris.

## Tests

**T1** suffit (`npm run check`) — changement documentaire. Plus
`bash scripts/check_no_secrets.sh` sur le dépôt entier, vu la nature du fichier.

## Critères de fin

- Le runbook de `main` porte l'état réel du staging, daté, avec la mention de ce qui reste
  à poser ;
- ou une note dit où ces faits ont été versés à la place, et la branche est supprimée.
