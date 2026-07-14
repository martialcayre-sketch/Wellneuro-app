---
id: "LOT-01"
titre: "audit-reconciliation-tokens"
statut: "fait"
dépend_de: "LOT-00"
---

# LOT-01 — Audit et réconciliation des tokens sémantiques

## But

Comparer les tokens sémantiques proposés en §11.1 de `sources/UX_WELLNEURO_3_0.md`
(`surface-app`, `surface-panel`, `surface-elevated`, `surface-patient`, `text-primary`, `text-secondary`,
`text-muted`, `accent-primary`, `accent-secondary`, `status-success/warning/danger/info`, `border-subtle`,
`focus-ring`) aux tokens réellement livrés par D1 (`docs/design-system-d1.md`,
`web/tailwind.config.ts`, `web/src/app/globals.css`), et décider comment les réconcilier.

## Résultat observable

Un tableau de correspondance (proposé/existant/décision) et, si nécessaire, un ajout **additif** et non
destructif de tokens manquants — jamais un renommage des tokens D1 existants sans audit complet de leurs
consommateurs.

## Périmètre

- Lecture de `web/tailwind.config.ts`, `web/src/app/globals.css`, `docs/design-system-d1.md`.
- Vérification explicite du garde-fou déjà documenté : `--primary`/`--accent` historiques encore consommés
  en dur par `SynthesePanel.tsx` (non migré D1) — ne pas les affecter.
- Si des tokens sont ajoutés : uniquement additifs (nouvelles variables CSS + entrées Tailwind), aucune
  valeur existante modifiée.

## Hors périmètre

- Migration de `SynthesePanel.tsx` vers le design system (hors périmètre D1 et de cette campagne).
- Introduction d'un theme-provider JS ou d'un toggle de thème (interdit D1).

## Fichiers probables

- Lecture : `web/tailwind.config.ts`, `web/src/app/globals.css`, `docs/design-system-d1.md`.
- Modification éventuelle (additive uniquement) : `web/tailwind.config.ts`, `web/src/app/globals.css`.

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de migration ou écriture Supabase sans confirmation distincte.
- Pas de renommage ou suppression d'un token existant sans audit complet des consommateurs.

## Étapes

- [x] Construire le tableau de correspondance token proposé ↔ token existant.
- [x] Décider, pour chaque écart, extension additive vs conservation du nom D1.
- [x] Si ajout de code : vérifier qu'aucun token existant n'est modifié.
- [x] Documenter la décision dans `docs/design-system-d1.md`.

## Tests

```bash
cd web && npm run type-check
```

Vérification visuelle : les pages déjà migrées D1 (`NavBar`, `dashboard/layout`, `login`, `MetricsSection`,
`PatientsPanel`) restent visuellement inchangées après l'ajout des tokens.

## Critères de done

- Tableau de correspondance complet et documenté.
- Aucun token D1 existant renommé ou supprimé.
- `docs/design-system-d1.md` mis à jour.
- `npm run type-check` sans régression.

## Résultats

Tableau de correspondance complet rédigé dans `docs/design-system-d1.md` (section 6,
« Réconciliation tokens UX 3.0 »). Sur 15 tokens proposés en §11.1 : 7 déjà couverts par un
équivalent D1 (pas d'ajout), 5 ajoutés en additif (`--color-surface-elevated`,
`--color-status-success/warning/danger/info`, `--color-focus-ring` + entrées Tailwind
correspondantes dans `web/tailwind.config.ts`), 2 écarts volontairement non ajoutés et justifiés
(`surface-patient` — redondant avec l'architecture par thème ; `text-secondary` — pas de
consommateur identifié, différé à LOT-02/03). Aucun token D1 existant modifié ; garde-fou
`--primary`/`--accent` historiques (`SynthesePanel.tsx`) vérifié intact.
