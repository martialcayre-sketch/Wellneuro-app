---
id: "LOT-00"
titre: "Resynchroniser le pack de base — la question des questionnaires"
statut: "livré (#596, 2026-08-06) — dérive fermée en production, 8/8 packs en MATCH exact"
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

**2026-08-06 — volet code livré, volet production en attente.**

- **État avant, prouvé en production** (lecture SQL du 2026-08-06) : legacy 5 qids
  (`Q_MOD_03, Q_MOD_01, Q_INF_03, Q_SOM_09, Q_ALI_01`), registre relationnel
  **4 lignes** aux ordres 0, 1, 2, 4 — le trou de l'ordre 3 est `Q_SOM_09`. La
  jointure registre passe par l'id **interne** (`questionnaire_packs.id` →
  `pack_questionnaires.pack_id`), pas par l'`id_pack` public.
- **Code** : `web/prisma/seed.ts` aligné sur l'état réel (5 qids, ordre exact de
  production), commentaire remis à jour. T2 vert (120 E2E passés, 2 skippés,
  5 min 11). Revue indépendante : GO.
- **Question ouverte tranchée** : le seed n'écrit **pas** le registre
  relationnel — il ne crée aucune `QuestionnaireDefinition`, donc
  `syncPackToRegistry` produirait un registre vide ; le repli legacy est le
  filet prévu pour les environnements seedés.
- **Trois constats de revue, non bloquants** : (a) l'alignement ne vaut que
  pour les bases provisionnées à neuf — une base de dev/CI déjà seedée garde
  ses 4 qids (garde `parDefautExistant` + `update: {}`), cohérent avec « pas de
  migration » ; (b) en environnement seedé la raison journalisée est
  `registre_absent`, pas `registre_vide` ; (c) **risque latent E2E** :
  `Q_SOM_09` a un chemin UI dédié et est refusé par `POST /api/patient/submit`
  — le remplisseur générique de `portail-parcours.spec.ts` casserait le jour où
  l'E2E itérera sur toutes les assignations du pack (aujourd'hui il n'en prend
  que deux).
- **Cause racine — le diagnostic d'origine était faux.** Le geste UI a bien
  tourné (lignes du registre recréées le 2026-08-06 à 14:19 UTC) et n'a rien
  changé : `Q_SOM_09` n'avait **aucune ligne `QuestionnaireDefinition`**
  (table `questionnaires`), et `syncPackToRegistry` filtre silencieusement
  tout qid sans définition — le trou se recréait à chaque synchronisation.
  Ce n'était pas un « oubli de synchronisation » mais une **définition
  manquante** : un trou d'ordre (0,1,2,4) dans un registre dérivé désigne un
  filtrage silencieux, pas une écriture oubliée.
- **Fermeture** : `backfill:pack-registry` (dry-run puis apply), **autorisé
  explicitement par l'utilisateur** le 2026-08-06 — 15 catégories et 67
  définitions upsertées depuis le catalogue (aucune donnée patient),
  **8/8 packs en MATCH exact**. Constat final par lecture SQL : 5 lignes,
  ordres 0..4 sans trou, `Q_SOM_09` à l'ordre 3.
- **Règle promue** : toute entrée ajoutée au catalogue d'affichage après le
  backfill initial n'a pas de `QuestionnaireDefinition` tant que le backfill
  n'est pas rejoué — et tout pack qui la référence perdra cette entrée au
  registre, silencieusement, à chaque sauvegarde.
