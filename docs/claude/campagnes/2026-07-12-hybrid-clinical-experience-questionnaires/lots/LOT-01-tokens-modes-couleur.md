---
id: "LOT-01-tokens-modes-couleur"
titre: "Tokens Hybrid Clinical clairs"
statut: "terminé"
dépend_de: ["LOT-00"]
---

# LOT-01 — Tokens Hybrid Clinical clairs

## But

Créer le socle de thème Hybrid Clinical **tout clair** (rail sombre structurel côté praticien, patient clair fixe), sans collision avec les tokens historiques et sans migration de base. Pas de mode Nuit, pas de contrôleur Auto/Jour/Nuit, pas de préférence de thème (décision actée dans `CAMPAGNE.md`).

## Périmètre

- tokens praticien clairs (rail sombre structurel + espace de travail clair) ;
- tokens patient clair fixe ;
- `data-color-mode="light"` fixe (extension future à coût nul, aucune logique de bascule à livrer) ;
- documentation du design system.

## Fichiers probables

- `web/src/app/globals.css`
- `web/tailwind.config.ts`
- `web/src/app/layout.tsx`
- `web/src/app/dashboard/layout.tsx`
- `docs/design-system-d1.md` ou document canonique successeur

## Interdits

- ne pas ajouter `next-themes` ni aucun contrôleur de thème ;
- ne pas modifier les valeurs historiques `--primary` / `--accent` avant audit complet de leurs consommateurs ;
- ne pas activer de mode sombre, praticien ou patient ;
- ne pas stocker de préférence de thème (ni localStorage, ni base) ;
- ne pas changer la logique métier.

## Contrat cible

```html
<div data-theme="praticien" data-color-mode="light">
<div data-theme="patient" data-color-mode="light">
```

## Étapes

1. Auditer tous les usages de tokens historiques et classes directes.
2. Définir la matrice de tokens sémantiques par rôle (praticien/patient), en mode clair uniquement.
3. Prévoir `prefers-reduced-motion` (sans rapport avec le mode de couleur).
4. Documenter le comportement en SSR (pas de flash possible sans logique de bascule).
5. Mettre à jour les tokens sans refondre encore les composants métier.

## Tests

- rendu clair praticien et patient stable au premier rendu (pas de flash, aucune logique conditionnelle à tester) ;
- contraste AA minimum ;
- thème patient toujours clair.

## Done

- [x] Tokens validés (`[data-theme='praticien']` aligné sur les valeurs déjà vérifiées AA de `patient` ; nouveau namespace `--rail-*` pour la navigation, reprise à l'identique des anciennes valeurs sombres praticien).
- [x] Aucune logique de bascule de thème introduite.
- [x] Aucune migration.
- [x] Patient clair fixe préservé (inchangé).
- [x] Documentation canonique mise à jour (`docs/design-system-d1.md` : thèmes, contrastes, traçabilité, nouvelle section « Rail de navigation »).
- [ ] LOT-02 et LOT-04 autorisés — en attente d'instruction explicite séparée.

## Résultats

- `SidebarRail.tsx`, `MobileBottomNav.tsx` et l'aside/tiroir de `NavBar.tsx` basculés sur les tokens `rail-*` (toujours sombres) ; le header et tout composant déjà migré D1 (`MetricsSection`, `PatientsPanel`, titres de pages, `login/page.tsx`) héritent automatiquement du praticien désormais clair, sans modification de code.
- Vérifié : `type-check`, `lint`, `check_no_secrets.sh` verts ; `e2e/dashboard-praticien.spec.ts` (4/4) vert ; vérification visuelle manuelle (captures desktop/tablette/mobile + tiroir/sheet ouverts) confirmant rail sombre lisible / reste clair, sans régression.
- Dette connue signalée, non corrigée dans ce lot : `SynthesePanel.tsx` reste sur les variables legacy `--primary`/`--accent` (hors périmètre) ; migration prévue en LOT-03.
