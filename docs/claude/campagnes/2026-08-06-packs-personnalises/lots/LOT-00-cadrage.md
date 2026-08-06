---
id: "LOT-00"
titre: "Resynchroniser le pack de base — la question des questionnaires"
statut: "à_faire"
dépend_de: "aucun"
---

# LOT-00 — Resynchroniser le pack de base

## But

Fermer la dérive 1/8 constatée en production le 2026-08-05 : le pack de base
« Base de consultation » (`parDefaut`) porte 5 qids en legacy
(`Q_SOM_09, Q_MOD_03, Q_MOD_01, Q_ALI_01, Q_INF_03`) mais 4 dans le registre
relationnel (`Q_SOM_09` absent — oubli de synchronisation). Tant que cette
dérive existe, le repli legacy ne peut pas se fermer, et c'est le pack le plus
emprunté du produit. Ce lot passe **en tête de campagne** sur décision
utilisateur du 2026-08-06.

## Résultat observable

- Le registre relationnel du pack de base égale sa liste legacy (5 qids).
- `npm run check:pack-registry` vert.
- Plus aucun log `PACK_REGISTRE_REPLI_LEGACY` en raison `ensembles_divergents`
  sur le pack de base.
- Le seed produit un pack de base aligné (5 qids) — et, si retenu, écrit aussi
  le registre relationnel pour cesser le repli `registre_absent` systématique
  hors production.

## Périmètre

- **Geste de production sans code ni SQL** (recommandé) : réenregistrer le pack
  « Base de consultation » dans l'UI « Questionnaires & packs » — le `PATCH`
  de `web/src/app/api/praticien/packs/route.ts` rejoue `syncPackToRegistry`
  (`web/src/lib/consultation/packRegistry.ts:12-67`) dans une transaction.
  Repli outillé si le geste UI ne suffit pas :
  `npm run backfill:pack-registry:dry-run` puis `:apply`
  (`web/prisma/backfillQuestionnaireRegistry.ts`) — à ne lancer que sur
  décision explicite, jamais depuis une session ordinaire.
- Code : aligner `web/prisma/seed.ts` (`PACK_SEED_BASE`, ajouter `Q_SOM_09`)
  et trancher la question ouverte « le seed écrit-il le registre ».
- Vérification en base de production **par lecture seule** (`execute_sql`).

## Hors périmètre

- Toute désactivation de pack (LOT-03).
- Toute modification des règles d'orientation (LOT-02).
- Toute migration.

## Fichiers probables

- `web/prisma/seed.ts`
- `web/src/lib/consultation/packRegistry.ts` (lecture seule probable)
- `web/prisma/checkPackRegistryConsistency.ts` (vérification)

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de migration ou écriture Supabase sans confirmation distincte — la
  resynchronisation passe par l'UI praticien ou le script backfill assumé,
  jamais par du SQL direct.
- Pas de refactor hors lot.

## Étapes

- [ ] Constater la dérive par lecture SQL (état avant).
- [ ] Geste UI praticien : réenregistrer le pack de base (ou backfill assumé).
- [ ] Vérifier par lecture SQL et `check:pack-registry` (état après).
- [ ] Aligner le seed (5 qids) et trancher l'écriture du registre par le seed.
- [ ] Documenter les résultats dans ce fichier.

## Tests

- `npm run check:pack-registry` (avant/après).
- T1 (`npm run check`) après toute édition de code.
- T2 si le seed change (les E2E reposent sur les fixtures seedées).

## Critères de done

- Dérive fermée en production, prouvée par lecture.
- Seed aligné, paliers verts.
- Aucun changement de comportement patient (le pack de base assigné à
  l'onboarding reste identique).

## Résultats

À compléter à la clôture.
