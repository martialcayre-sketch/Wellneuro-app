# 2026-08-06 16:14 — LOT-00 packs-personnalises : seed du pack de base

**Campagne** : `2026-08-06-packs-personnalises` (primaire, lot_courant LOT-00).

## Statut

Volet **code livré et validé** : `web/prisma/seed.ts` aligné sur l'état réel de
production — 5 qids, ordre exact `Q_MOD_03, Q_MOD_01, Q_INF_03, Q_SOM_09,
Q_ALI_01` — commentaire remis à jour. T2 vert (120 E2E passés, 2 skippés,
5 min 11, worktree isolé). Revue indépendante : GO.

Volet **production en attente** : le registre relationnel du pack de base est
toujours à **4 lignes** (ordres 0,1,2,4 — vérifié par lecture SQL à 16 h 14).

## Prochaine action exacte

1. **Geste praticien** (2 clics, aucun code) : Questionnaires & packs → éditer
   « Base de consultation » → réenregistrer. Le `PATCH` rejoue
   `syncPackToRegistry` en transaction.
2. Constat par lecture SQL : 5 lignes, ordres 0..4 sans trou. Attention, la
   jointure passe par l'id **interne** du registre
   (`questionnaire_packs.id` = `cmreseb0v003p99qmpbp1gcin` →
   `pack_questionnaires.pack_id`), pas par l'`id_pack` public.
3. Clore le statut du lot, puis ouvrir LOT-01 (inventaire des surfaces +
   décision D-0xx).
4. Repli si le geste UI ne suffit pas : `npm run backfill:pack-registry:apply`
   — **écrit en production, autorisation explicite obligatoire**.

## À savoir

- **Décision de plan** : le seed n'écrit pas le registre relationnel — il ne
  crée aucune `QuestionnaireDefinition`, `syncPackToRegistry` produirait un
  registre vide ; le repli legacy est le filet prévu hors production (raison
  journalisée réelle : `registre_absent`).
- **L'alignement du seed ne vaut que pour les bases neuves** : une base
  dev/CI déjà seedée garde ses 4 qids (garde `parDefautExistant` +
  `update: {}`). Pas de migration, par conception.
- **Risque latent E2E** : `Q_SOM_09` a un chemin UI dédié et est refusé par
  `POST /api/patient/submit` ; le remplisseur générique de
  `portail-parcours.spec.ts` casserait le jour où l'E2E itérera sur toutes les
  assignations du pack seedé (aujourd'hui il n'en prend que deux).
- La dédup des assignations (LOT-A/B/C, #588/#589/#592) est vérifiée en
  production : index `assignations_unicite_ouverte_idx` présent, migration
  appliquée en une tentative.
