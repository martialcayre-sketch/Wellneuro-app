---
id: "LOT-01-tokens-modes-couleur"
titre: "Tokens Hybrid Clinical et contrôleur Auto/Jour/Nuit"
statut: "à_faire"
dépend_de: ["LOT-00"]
---

# LOT-01 — Tokens Hybrid Clinical et contrôleur Auto/Jour/Nuit

## But

Créer le socle de thème Hybrid Clinical sans flash de mauvais thème, sans collision avec les tokens historiques et sans migration de base.

## Périmètre

- tokens praticien Jour ;
- tokens praticien Nuit ;
- tokens patient clair fixe ;
- préférence `auto | light | dark` ;
- persistance locale ;
- écoute de `prefers-color-scheme` ;
- script pré-hydratation ;
- documentation du design system.

## Fichiers probables

- `web/src/app/globals.css`
- `web/tailwind.config.ts`
- `web/src/app/layout.tsx`
- `web/src/app/dashboard/layout.tsx`
- nouveau composant ou utilitaire de thème dans `web/src/components/**` ou `web/src/lib/**`
- `docs/design-system-d1.md` ou document canonique successeur
- tests unitaires du résolveur de mode

## Interdits

- ne pas ajouter `next-themes` sans justification et validation ;
- ne pas modifier les valeurs historiques `--primary` / `--accent` avant audit complet de leurs consommateurs ;
- ne pas activer le mode sombre patient ;
- ne pas stocker la préférence en base ;
- ne pas changer la logique métier.

## Contrat cible

```ts
type ColorModePreference = 'auto' | 'light' | 'dark';
type ResolvedColorMode = 'light' | 'dark';
```

Attributs :

```html
<div data-theme="praticien" data-color-mode="light|dark">
<div data-theme="patient" data-color-mode="light">
```

## Étapes

1. Auditer tous les usages de tokens historiques et classes directes.
2. Définir la matrice de tokens sémantiques par rôle/mode.
3. Créer une fonction pure de résolution `préférence + système -> mode`.
4. Définir la clé `localStorage` versionnée.
5. Ajouter l'écoute du système uniquement lorsque la préférence vaut `auto`.
6. Prévenir le flash de thème avant hydratation.
7. Prévoir `prefers-reduced-motion` indépendamment du mode de couleur.
8. Ajouter le contrôle Auto/Jour/Nuit dans une zone non intrusive, idéalement profil ou préférences d'affichage.
9. Documenter le comportement en navigation privée, stockage indisponible et SSR.
10. Mettre à jour les tokens sans refondre encore les composants métier.

## Tests

- fonction de résolution pure ;
- préférence absente -> `auto` ;
- système clair/sombre ;
- changement système réactif en `auto` ;
- changement système ignoré en choix forcé ;
- préférence persistée ;
- stockage indisponible sans crash ;
- pas de flash visible sur chargement ;
- contraste AA minimum ;
- thème patient toujours clair.

## Done

- [ ] Tokens validés.
- [ ] Auto/Jour/Nuit fonctionnel.
- [ ] Aucun flash de mauvais thème.
- [ ] Aucune migration.
- [ ] Patient clair fixe préservé.
- [ ] Documentation canonique mise à jour.
- [ ] LOT-02 et LOT-04 autorisés.
