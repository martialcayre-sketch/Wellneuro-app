---
id: "LOT-00-audit-arbitrages"
titre: "Audit réel, classification et arbitrages"
statut: "à_faire"
dépend_de: []
---

# LOT-00 — Audit réel, classification et arbitrages

## But

Établir la source de vérité avant tout code : écrans, composants, tokens, incohérences d'alignement, profils de questionnaires et contraintes psychométriques.

## Périmètre

- shell praticien ;
- dashboard, patients, fiche patient, synthèse ;
- portail patient : gate, consentement, fiche, anamnèse, hub, saisie, lecture seule, correction ;
- catalogue de questionnaires et types ;
- tests Playwright/Vitest existants ;
- design system D1 et tokens historiques.

## Fichiers probables

- `web/src/components/NavBar.tsx`
- `web/src/components/ui/SidebarRail.tsx`
- `web/src/components/ui/MobileBottomNav.tsx`
- `web/src/app/globals.css`
- `web/tailwind.config.ts`
- `web/src/app/dashboard/**`
- `web/src/app/portail/[token]/**`
- `web/src/components/patient/**`
- `web/src/lib/questionnaire-types.ts`
- `web/src/lib/questions.ts`
- `web/e2e/**`
- `docs/design-system-d1.md`

## Interdits

- aucun code applicatif ;
- aucune dépendance ;
- aucune migration ;
- aucune modification de questionnaire ;
- aucune activation automatique de campagne.

## Étapes

1. Lire la dernière entrée de `docs/claude/SESSION_LOG.md`.
2. Vérifier l'état réel de `ACTIVE_CAMPAIGN.md` et signaler toute désynchronisation sans la corriger hors instruction.
3. Cartographier routes, composants et responsabilités.
4. Mesurer la géométrie réelle du shell : largeur du rail, padding, dimensions d'icônes, lignes et breakpoints.
5. Recenser les couleurs directes et tokens historiques encore consommés.
6. Classifier les pages praticien par priorité de migration.
7. Construire l'inventaire des questionnaires : longueur, sections, types de réponses, caractère validé/interne, sensibilité, risque de fatigue.
8. Affecter provisoirement une politique psychométrique, avec `strict` par défaut en cas d'incertitude.
9. Choisir trois questionnaires pilotes : court, long répétitif, interne flexible.
10. Trancher les questions ouvertes de `CAMPAGNE.md`.
11. Produire un wireframe et une matrice de migration validables.

## Livrables

- `AUDIT_UI_REEL.md` ;
- `MATRICE_ECRANS_MIGRATION.md` ;
- `INVENTAIRE_QUESTIONNAIRES_UX.md` ;
- `ARBITRAGES_LOT_00.md` ;
- captures de référence avant changement.

## Tests / validations

- aucune donnée réelle détectée ;
- routes et composants confirmés contre le dépôt ;
- mesures d'alignement documentées ;
- chaque questionnaire pilote possède un niveau de liberté ;
- validation utilisateur des arbitrages avant LOT-01.

## Done

- [ ] Audit approuvé.
- [ ] Écrans pilotes sélectionnés.
- [ ] Questionnaires pilotes sélectionnés.
- [ ] Politiques psychométriques provisoires documentées.
- [ ] Aucun code modifié.
- [ ] LOT-01 autorisé explicitement.
