# 2026-08-06 16:14 — LOT-00 packs-personnalises : seed du pack de base

**Campagne** : `2026-08-06-packs-personnalises` (primaire, lot_courant LOT-00).

## Statut — lot entièrement livré (mis à jour 16 h 50)

Volet **code** : `web/prisma/seed.ts` aligné sur l'état réel de production —
5 qids, ordre exact `Q_MOD_03, Q_MOD_01, Q_INF_03, Q_SOM_09, Q_ALI_01` —
commentaire remis à jour. T2 vert (120 E2E passés, 2 skippés, 5 min 11,
worktree isolé). Revue indépendante : GO.

Volet **production** : dérive fermée. **Le diagnostic d'origine était faux** —
le geste UI praticien a tourné (lignes recréées à 14:19 UTC) sans rien changer,
car `Q_SOM_09` n'avait aucune `QuestionnaireDefinition` et
`syncPackToRegistry` filtre en silence tout qid sans définition (le trou
d'ordre 0,1,2,4 en était la signature). Fermé par
`backfill:pack-registry` dry-run puis apply, **sur autorisation explicite
utilisateur** : 15 catégories + 67 définitions upsertées, **8/8 packs en MATCH
exact**, constat final SQL 5 lignes ordres 0..4 sans trou.

## Prochaine action exacte

Ouvrir **LOT-01** (inventaire des surfaces consommatrices + décision D-0xx
dans `docs/DECISIONS.md`) via `/wn-lot` — lot documentaire, aucun code.
`lot_courant` avancé à LOT-01 dans cette même PR ; état machine synchronisé.

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
