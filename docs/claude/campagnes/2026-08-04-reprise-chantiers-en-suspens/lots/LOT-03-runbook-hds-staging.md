---
id: "LOT-03"
titre: "Runbook HDS — verser l'état du staging Scalingo"
statut: "livré — runbook versé dans main, staging revérifié le 2026-08-05"
dépend_de: "aucun"
palier: "T1"
classe: "docs"
branche: "sauvegarde/runbook-scalingo-staging"
campagne: "2026-08-04-reprise-chantiers-en-suspens"
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

## Ce qui a été fait — 2026-08-05

**Livré par la première voie** : le runbook de `main` porte l'état réel, daté, avec ce
qui reste à poser.

**Le staging existe encore, et c'est vérifié, pas supposé.** Le travail n°1 demandait de
confronter les +85 lignes à la réalité — un runbook décrivant une infrastructure disparue
est pire qu'un runbook vide. `scalingo apps-info`, `addons` et `ps` rendent : app
`running`, `HDS: true`, add-on `postgresql-business-512` `running`, 2 containers `web`
taille `S`. Deux écarts notés sans être interprétés : stack `scalingo-26`, et une seconde
app `wellneuro` au statut `new`, non instruite ici. `scalingo env` **n'a pas été lu** —
il aurait exposé les secrets.

**La branche de sauvegarde n'a été ni mergée ni rebasée, et ce n'était pas un détail.**
Elle est forkée du 2026-07-24 : la merger aurait supprimé **28 332 lignes** de
documentation créée depuis, et son fichier seul aurait annulé deux PR déjà mergées : la
PR #356 (SSE questionnaire) et surtout la **PR #425, qui corrige la région `osc-fr1` /
`--hds-resource`, c'est-à-dire une partie de ce que la sauvegarde prétend apporter**. Le
versement s'est donc fait par retouches ciblées sur la version de `main`.

**Deux corrections que ni le lot ni la sauvegarde n'avaient vues :**

1. #425 avait corrigé la région **en tête du document seulement** ; l'étape 1 disait
   toujours « confirmer la syntaxe exacte du flag HDS ». Le lecteur qui suit la procédure
   suivait la version fausse.
2. La sauvegarde attribuait l'application des migrations à une branche `else` de
   `vercel-build.sh`. Ce script **n'écrit plus en base depuis #435**, sur aucun chemin —
   vérifié à la lecture. Sur Scalingo, c'est `postdeploy: npm run db:deploy` du `Procfile`
   qui les applique. Le compte est daté : 35 au 2026-07-24, **49 au 2026-08-05**.

**Reste ouvert, non fait ici** : la branche `sauvegarde/runbook-scalingo-staging` est
désormais redondante et **dangereuse à merger** (28 332 suppressions). Sa suppression
relève du ressort Copilot ; elle est nommée ici pour ne pas être oubliée.
