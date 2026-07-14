# Campagne : Assainissement documentaire

> Créée par : WN-0 (2026-07-11)
> Statut : Terminée (2026-07-11) — archivée le 2026-07-14
> Objectif : Clarifier hiérarchie roadmaps, archiver contenu obsolète, synchroniser liens

## Contexte

Après la migration GAS → Next.js et consolidation R0-R6, le dépôt contient plusieurs roadmaps :
- `docs/roadmap.md` : consolidation technique (R0-R10)
- `docs/claude/ROADMAP_AGENT_PLAN.md` : modules produit (séries D/R/E)
- `docs/claude/ROADMAP_R9_UPDATE.md` : mise à jour R9 (obsolète, à appliquer)

**Collision de numérotation** : Les deux roadmaps utilisent le préfixe « R » avec sens différents.

**SESSION_LOG surdimensionné** : 11 entrées actives (max 10 par spec).

## Phases

### Phase 1 : Split roadmaps (Nomenclature Option A)

- Renommer `docs/roadmap.md` → `docs/ROADMAP_TECHNIQUE.md` (conserve R0-R10 consolidation technique, trim à 70 lignes max)
- Renommer `docs/claude/ROADMAP_AGENT_PLAN.md` → `docs/ROADMAP_PRODUIT.md` (modules produit, ~150 lignes, acceptable)
- Archiver `docs/claude/ROADMAP_R9_UPDATE.md` → `docs/archive/roadmap-updates/ROADMAP_R9_UPDATE_2026-07-11.md`
- Mettre à jour `.wn/documentation.yml` pour pointer aux nouveaux chemins

### Phase 2 : Update links

- CLAUDE.md : pointer vers `docs/ROADMAP_PRODUIT.md` (au lieu de ROADMAP_AGENT_PLAN.md)
- AGENTS.md : mettre à jour références roadmap
- README.md : vérifier cohérence

### Phase 3 : Archive SESSION_LOG

- Archiver entrées 2026-07-04, 2026-07-05, 2026-07-06 → `docs/archive/sessions/`
- Garder 2026-07-07 → 2026-07-11 (6 entrées dans actif + 4 de reprise précédente = 10 max)
- Créer `docs/archive/sessions/index.md` (pointeurs historiques)

### Phase 4 : Archive documents exemples/templates

- Déplacer `docs/claude/SESSION_LOG_ENTRY_EXEMPLE.md` → `docs/archive/templates/SESSION_LOG_ENTRY_EXEMPLE.md`
- Déplacer `docs/claude/reprise/SESSION_LOG_ENTRY_2026-07-09.md` → `docs/archive/templates/SESSION_LOG_ENTRY_2026-07-09.md`
- Créer `.gitkeep` dans `docs/archive/templates/` si vide

## Critères d'acceptation

- [x] `docs/ROADMAP_TECHNIQUE.md` existe (~70 lignes, ex-roadmap.md)
- [x] `docs/ROADMAP_PRODUIT.md` existe (~150 lignes, ex-ROADMAP_AGENT_PLAN.md)
- [x] `docs/archive/roadmap-updates/` existe (archive ROADMAP_R9_UPDATE.md)
- [x] `docs/archive/sessions/` existe (archive 3 entrées SESSION_LOG)
- [x] Aucune référence cassée (grep `ROADMAP_AGENT_PLAN` etc.)
- [x] SESSION_LOG.md contient ≤10 entrées (vrai à la clôture du 2026-07-11 ; le journal a regrossi depuis avec les campagnes C1/QX — compaction via `/wn-compact-sessionlog`)
- [x] `.wn/documentation.yml` mis à jour
- [x] `bash scripts/check_no_secrets.sh` ✓
- [x] `cd web && npm run type-check` ✓
- [x] Git propre, 4 commits distincts (Phase 1-4 : `fcd1066`, `ffcf0d9`, `16e2b58`, `d01f696`)

## Notes

- Cette campagne suit WN-0E (adaptation Skills)
- Coordination avec WN-1 (campagne d'assainissement métier) si besoin
- Pas de changement de code applicatif, documentation pure

## Note d'archivage (2026-07-14)

Campagne livrée dans `main` le 2026-07-11 (phases 1→4 : `fcd1066`, `ffcf0d9`,
`16e2b58`, `d01f696` ; complétion `a6a10c6`, finalisation `401ae4a`). L'audit
du 2026-07-14 a constaté que le dossier était resté dans `active/` avec un
statut périmé, et que `docs/roadmap.md` et `docs/claude/ROADMAP_R9_UPDATE.md`
n'avaient pas été supprimés après remplacement (doublons). Corrigé par le lot
de clôture du 2026-07-14 : archivage de ce dossier, suppression des deux
doublons et mise à jour des références vivantes.
